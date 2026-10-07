import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  canonicalStringify,
  digestJson,
  digestText,
  finalizeCanonicalRecord,
  verifyCanonicalRecord,
} from "../packages/local-core/canonical.mjs";
import {
  createOperationReceipt,
  openReceiptLog,
  RECEIPT_LOG_GENESIS_DIGEST,
  validateReceipt,
  verifyReceiptLog,
} from "../packages/local-core/receipt-log.mjs";

const BASE_TIME = "2026-08-20T12:00:00.000Z";
const RECEIPT_LOG_MODULE_URL = new URL("../packages/local-core/receipt-log.mjs", import.meta.url).href;
const RECEIPT_APPEND_WORKER = `
import { access } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

let log;
try {
  const receiptModule = await import(process.env.CL_RECEIPT_LOG_MODULE_URL);
  log = await receiptModule.openReceiptLog({
    filePath: process.env.CL_RECEIPT_LOG_PATH,
    anchor: {
      filePath: process.env.CL_RECEIPT_ANCHOR_PATH,
      key: Buffer.from(process.env.CL_RECEIPT_ANCHOR_KEY, "hex"),
    },
  });
  process.stdout.write("READY\\n");
  while (true) {
    try {
      await access(process.env.CL_RECEIPT_BARRIER_PATH);
      break;
    } catch {
      await delay(5);
    }
  }
  const receipt = receiptModule.createOperationReceipt({
    operation: process.env.CL_RECEIPT_OPERATION,
    actor: "urn:agent:child-process",
    subjectRef: "urn:cl:alias:child-process",
    outcome: "success",
    userSummary: "Cross-process receipt lock test.",
  });
  const entry = await log.append(receipt);
  await log.close();
  log = null;
  process.stdout.write("RESULT " + JSON.stringify({ sequence: entry.sequence }) + "\\n");
} catch (error) {
  process.stderr.write(JSON.stringify({ code: error?.code, message: error?.message }) + "\\n");
  process.exitCode = 1;
} finally {
  if (log) await log.close().catch(() => undefined);
}
`;

async function temporaryDirectory(t, label) {
  const directory = await mkdtemp(join(tmpdir(), "context-layer-receipt-" + label + "-"));
  t.after(async () => rm(directory, { recursive: true, force: true }));
  return directory;
}

function anchorConfig(directory, key, overrides = {}) {
  return {
    filePath: join(directory, "receipt-anchor.jsonl"),
    key,
    ...overrides,
  };
}

function receipt(operation, overrides = {}) {
  return createOperationReceipt({
    operation,
    actor: "urn:agent:receipt-hardening-test",
    subjectRef: "urn:cl:alias:receipt-hardening-test",
    bundleRef: "urn:cl:bundle:receipt-hardening-test",
    outcome: "success",
    userSummary: "Receipt hardening sentinel for " + operation + ".",
    clock: () => new Date(BASE_TIME),
    ...overrides,
  });
}

function refinalizeReceipt(source, mutate) {
  const unsigned = structuredClone(source);
  delete unsigned.id;
  delete unsigned.integrity;
  mutate(unsigned);
  return finalizeCanonicalRecord(unsigned, "urn:cl:receipt:");
}

function logEntry(sequence, previousEntryDigest, operation) {
  const unsigned = {
    log_version: 1,
    sequence,
    previous_entry_digest: previousEntryDigest,
    receipt: receipt(operation),
  };
  return { ...unsigned, entry_digest: digestJson(unsigned) };
}

function testPrivateKey(seed) {
  return createPrivateKey({
    key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]),
    format: "der",
    type: "pkcs8",
  });
}

function legacyMac(unsigned, key) {
  // Frozen pre-Ed25519 format from d064a22; never invoke the new anchor writer.
  return "hmac-sha256:" + createHmac("sha256", key)
    .update("context-layer/receipt-anchor/v1\0", "utf8")
    .update(canonicalStringify(unsigned), "utf8").digest("hex");
}

async function writeLegacyLog(filePath, anchor, count = 2) {
  const entries = [];
  const records = [];
  let source = "";
  let previousMac = "hmac-sha256:" + "0".repeat(64);
  let tail = RECEIPT_LOG_GENESIS_DIGEST;
  for (let index = 0; index <= count; index += 1) {
    if (index > 0) {
      const entry = logEntry(index, tail, index === 1 ? "bundle.consume" : "legacy.append");
      entries.push(entry);
      source += canonicalStringify(entry) + "\n";
      tail = entry.entry_digest;
    }
    const unsigned = {
      anchor_version: 1,
      log_id: digestJson({ receipt_log_path: filePath }),
      anchor_sequence: index,
      entries: index,
      tail_digest: tail,
      byte_length: Buffer.byteLength(source),
      file_digest: digestText(source),
      previous_mac: previousMac,
    };
    previousMac = legacyMac(unsigned, anchor.key);
    records.push({ ...unsigned, mac: previousMac });
  }
  await writeFile(filePath, source);
  await writeFile(anchor.filePath, records.map(canonicalStringify).join("\n") + "\n");
  return { entries, records, source };
}

test("version-1 HMAC logs verify read-only, migrate on open, and keep replay history", async (t) => {
  for (const count of [0, 2]) {
    await t.test("entries=" + count, async (t) => {
      const directory = await temporaryDirectory(t, "legacy-migrate");
      const filePath = join(directory, "receipts.jsonl");
      const key = Buffer.alloc(32, 19);
      const anchor = anchorConfig(directory, key);
      const fixture = await writeLegacyLog(filePath, anchor, count);
      const original = await readFile(anchor.filePath, "utf8");
      assert.equal((await verifyReceiptLog(filePath, { anchor })).entries, count);
      assert.equal(await readFile(anchor.filePath, "utf8"), original);
      const log = await openReceiptLog({ filePath, anchor });
      t.after(() => log.close());
      assert.deepEqual(await log.receipts(), fixture.entries.map((entry) => entry.receipt));
      assert.equal(await readFile(filePath, "utf8"), fixture.source);
      const migrated = (await readFile(anchor.filePath, "utf8")).trim().split("\n").map(JSON.parse);
      assert.equal(migrated.length, count + 1);
      const publicKey = createPublicKey(testPrivateKey(key));
      for (let index = 0; index < migrated.length; index += 1) {
        const { sig, ...unsigned } = migrated[index];
        assert.equal(unsigned.anchor_version, 2);
        assert.equal(Object.hasOwn(unsigned, "mac"), false);
        assert.equal(Object.hasOwn(unsigned, "previous_mac"), false);
        assert.equal(unsigned.entries, fixture.records[index].entries);
        assert.equal(unsigned.tail_digest, fixture.records[index].tail_digest);
        assert.equal(unsigned.file_digest, fixture.records[index].file_digest);
        assert.equal(verify(null, Buffer.from(canonicalStringify(unsigned)), publicKey, Buffer.from(sig.slice(8), "base64url")), true);
      }
      if (count) {
        await assert.rejects(log.append(fixture.entries[0].receipt), (error) => error.code === "RECEIPT_REPLAY_CONFLICT");
      }
      await log.append(receipt("after.migration"));
      await log.close();
      const reopened = await openReceiptLog({ filePath, anchor });
      assert.equal((await reopened.verify()).entries, count + 1);
      await reopened.close();
      assert.equal(key.every((byte) => byte === 19), true);
      assert.deepEqual((await readdir(directory)).sort(), ["receipt-anchor.jsonl", "receipts.jsonl"]);
    });
  }
});

test("HMAC anchors can migrate to a separate Ed25519 key", async (t) => {
  const directory = await temporaryDirectory(t, "legacy-separate-key");
  const filePath = join(directory, "receipts.jsonl");
  const legacyKey = Buffer.alloc(32, 20);
  const anchor = anchorConfig(directory, legacyKey);
  await writeLegacyLog(filePath, anchor);
  const signingKey = testPrivateKey(Buffer.alloc(32, 21));
  await assert.rejects(
    openReceiptLog({ filePath, anchor: { ...anchor, key: signingKey } }),
    (error) => error.code === "RECEIPT_ANCHOR_LEGACY_KEY_REQUIRED",
  );
  const log = await openReceiptLog({ filePath, anchor: { ...anchor, key: signingKey, legacyHmacKey: legacyKey } });
  await log.close();
  assert.equal(legacyKey.every((byte) => byte === 20), true);
  // The retired HMAC key is no longer needed once migration is complete.
  const reopened = await openReceiptLog({ filePath, anchor: { ...anchor, key: signingKey } });
  await reopened.append(receipt("separate.key"));
  await reopened.close();
});

test("legacy migration preserves fail-closed authentication and log checks", async (t) => {
  const cases = [
    ["wrong-key", "RECEIPT_ANCHOR_AUTHENTICATION_FAILED"],
    ["tamper", "RECEIPT_ANCHOR_AUTHENTICATION_FAILED"],
    ["chain", "RECEIPT_ANCHOR_CHAIN_MISMATCH"],
    ["rollback", "RECEIPT_LOG_ROLLBACK"],
    ["rewrite", "RECEIPT_LOG_REWRITE"],
  ];
  for (const [kind, expectedCode] of cases) {
    await t.test(kind, async (t) => {
      const directory = await temporaryDirectory(t, "legacy-reject");
      const filePath = join(directory, "receipts.jsonl");
      const anchor = anchorConfig(directory, Buffer.alloc(32, 22));
      const { records, entries } = await writeLegacyLog(filePath, anchor);
      if (kind === "tamper") records[0].mac = "hmac-sha256:" + "f".repeat(64);
      if (kind === "chain") {
        const unsigned = { ...records[1] };
        delete unsigned.mac;
        unsigned.previous_mac = "hmac-sha256:" + "f".repeat(64);
        records[1] = { ...unsigned, mac: legacyMac(unsigned, anchor.key) };
      }
      if (kind === "rollback") await writeFile(filePath, canonicalStringify(entries[0]) + "\n");
      if (kind === "rewrite") await writeFile(filePath, entries.map((entry) => " " + canonicalStringify(entry)).join("\n") + "\n");
      await writeFile(anchor.filePath, records.map(canonicalStringify).join("\n") + "\n");
      const before = await readFile(anchor.filePath, "utf8");
      const config = kind === "wrong-key" ? { ...anchor, key: Buffer.alloc(32, 23) } : anchor;
      await assert.rejects(openReceiptLog({ filePath, anchor: config }), (error) => error.code === expectedCode);
      assert.equal(await readFile(anchor.filePath, "utf8"), before);
      assert.deepEqual((await readdir(directory)).sort(), ["receipt-anchor.jsonl", "receipts.jsonl"]);
    });
  }
});

test("pre-release version-1 Ed25519 anchors upgrade without losing their chain", async (t) => {
  const directory = await temporaryDirectory(t, "prerelease-anchor");
  const filePath = join(directory, "receipts.jsonl");
  const anchor = anchorConfig(directory, Buffer.alloc(32, 24));
  const { records } = await writeLegacyLog(filePath, anchor);
  let previousSig = "ed25519:" + "0".repeat(86);
  const oldRecords = records.map((record) => {
    const fields = { ...record };
    delete fields.mac;
    delete fields.previous_mac;
    const unsigned = { ...fields, previous_sig: previousSig };
    previousSig = "ed25519:" + sign(null, Buffer.from(canonicalStringify(unsigned)), testPrivateKey(anchor.key)).toString("base64url");
    return { ...unsigned, sig: previousSig };
  });
  await writeFile(anchor.filePath, oldRecords.map(canonicalStringify).join("\n") + "\n");
  const log = await openReceiptLog({ filePath, anchor });
  assert.equal((await log.verify()).entries, 2);
  await log.append(receipt("prerelease.upgraded"));
  await log.close();
  const migrated = (await readFile(anchor.filePath, "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(migrated.every((record) => record.anchor_version === 2), true);
});

test("concurrent opens migrate an HMAC log once under the receipt lock", async (t) => {
  const directory = await temporaryDirectory(t, "legacy-concurrent");
  const filePath = join(directory, "receipts.jsonl");
  const anchor = anchorConfig(directory, Buffer.alloc(32, 25));
  await writeLegacyLog(filePath, anchor);
  const providerAnchor = { ...anchor, key: undefined, keyProvider: async () => anchor.key };
  const logs = await Promise.all([
    openReceiptLog({ filePath, anchor: providerAnchor }),
    openReceiptLog({ filePath, anchor: providerAnchor }),
  ]);
  t.after(() => Promise.all(logs.map((log) => log.close())));
  await Promise.all(logs.map((log, index) => log.append(receipt("concurrent.migration." + index))));
  assert.equal((await logs[0].verify()).entries, 4);
  const records = (await readFile(anchor.filePath, "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(records.length, 5);
  assert.equal(records.every((record) => record.anchor_version === 2), true);
});

function spawnAppendWorker({ filePath, anchorPath, barrierPath, key, operation }) {
  const child = spawn(
    process.execPath,
    ["--input-type=module", "--eval", RECEIPT_APPEND_WORKER],
    {
      env: {
        ...process.env,
        CL_RECEIPT_LOG_MODULE_URL: RECEIPT_LOG_MODULE_URL,
        CL_RECEIPT_LOG_PATH: filePath,
        CL_RECEIPT_ANCHOR_PATH: anchorPath,
        CL_RECEIPT_BARRIER_PATH: barrierPath,
        CL_RECEIPT_ANCHOR_KEY: key.toString("hex"),
        CL_RECEIPT_OPERATION: operation,
      },
      windowsHide: true,
    },
  );
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let stdout = "";
  let stderr = "";
  let readySettled = false;
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolvePromise, rejectPromise) => {
    resolveReady = resolvePromise;
    rejectReady = rejectPromise;
  });
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (!readySettled && stdout.includes("READY\n")) {
      readySettled = true;
      resolveReady();
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const completion = new Promise((resolvePromise, rejectPromise) => {
    child.once("error", (error) => {
      if (!readySettled) {
        readySettled = true;
        rejectReady(error);
      }
      rejectPromise(error);
    });
    child.once("close", (code) => {
      if (!readySettled) {
        readySettled = true;
        rejectReady(new Error("receipt append worker exited before the barrier"));
      }
      if (code !== 0) {
        rejectPromise(new Error("receipt append worker failed: " + stderr.trim()));
        return;
      }
      const resultLine = stdout.split(/\r?\n/).find((line) => line.startsWith("RESULT "));
      if (!resultLine) {
        rejectPromise(new Error("receipt append worker returned no result"));
        return;
      }
      resolvePromise(JSON.parse(resultLine.slice("RESULT ".length)));
    });
  });
  return { child, ready, completion };
}

test("durable receipt logs require an anchor and reject unsafe bootstrap", async (t) => {
  const directory = await temporaryDirectory(t, "bootstrap");
  const key = Buffer.alloc(32, 1);
  const unanchoredPath = join(directory, "unanchored.jsonl");
  await assert.rejects(
    openReceiptLog({ filePath: unanchoredPath }),
    (error) => error.code === "RECEIPT_ANCHOR_REQUIRED",
  );

  const existingPath = join(directory, "existing.jsonl");
  const entry = logEntry(1, RECEIPT_LOG_GENESIS_DIGEST, "existing.entry");
  await writeFile(existingPath, canonicalStringify(entry) + "\n", "utf8");
  await assert.rejects(
    openReceiptLog({
      filePath: existingPath,
      anchor: anchorConfig(join(directory, "existing-anchor"), key),
    }),
    (error) => error.code === "RECEIPT_ANCHOR_BOOTSTRAP_UNSAFE",
  );

  const emptyPath = join(directory, "empty.jsonl");
  const emptyAnchorDirectory = join(directory, "empty-anchor");
  const emptyAnchor = anchorConfig(emptyAnchorDirectory, key);
  await writeFile(emptyPath, "", "utf8");
  await mkdir(emptyAnchorDirectory, { recursive: true });
  await writeFile(emptyAnchor.filePath, "", "utf8");
  await assert.rejects(
    openReceiptLog({ filePath: emptyPath, anchor: emptyAnchor }),
    (error) => error.code === "RECEIPT_ANCHOR_EMPTY",
  );
});

test("local receipts declare and enforce payload exclusion", () => {
  const safe = receipt("payload.exclusion");
  assert.equal(safe.payload_included, false);
  const unsigned = structuredClone(safe);
  delete unsigned.id;
  delete unsigned.integrity;
  unsigned.payload_included = true;
  const forged = finalizeCanonicalRecord(unsigned, "urn:cl:receipt:");
  assert.throws(
    () => validateReceipt(forged),
    (error) => error.code === "RECEIPT_PAYLOAD_FORBIDDEN",
  );
});

test("receipt corrections use optional exact references covered by canonical integrity", () => {
  const original = receipt("correction.original");
  assert.equal(Object.hasOwn(original, "supersedes_ref"), false);

  const corrected = receipt("correction.replacement", {
    supersedesRef: original.id,
  });
  assert.equal(corrected.supersedes_ref, original.id);
  assert.equal(validateReceipt(corrected), true);
  const { id, integrity, ...unsigned } = corrected;
  const expectedDigest = digestJson(unsigned);
  assert.equal(integrity.digest, expectedDigest);
  assert.equal(id, "urn:cl:receipt:" + expectedDigest.slice("sha256:".length));

  const nullable = receipt("correction.nullable", { supersedesRef: null });
  assert.equal(Object.hasOwn(nullable, "supersedes_ref"), true);
  assert.equal(nullable.supersedes_ref, null);
  assert.equal(validateReceipt(nullable), true);

  const undefinedReference = receipt("correction.undefined", { supersedesRef: undefined });
  assert.equal(Object.hasOwn(undefinedReference, "supersedes_ref"), false);

  for (const invalidReference of [
    "urn:cl:decision:not-a-receipt",
    "urn:cl:receipt:",
    "urn:cl:receipt:invalid/path",
    42,
  ]) {
    assert.throws(
      () => receipt("correction.invalid", { supersedesRef: invalidReference }),
      (error) => error.code === "INVALID_RECEIPT",
      String(invalidReference),
    );
  }

  const canonicalButInvalid = refinalizeReceipt(corrected, (unsignedReceipt) => {
    unsignedReceipt.supersedes_ref = "urn:cl:decision:not-a-receipt";
  });
  assert.equal(verifyCanonicalRecord(canonicalButInvalid, "urn:cl:receipt:"), true);
  assert.throws(
    () => validateReceipt(canonicalButInvalid),
    (error) => error.code === "INVALID_RECEIPT",
  );

  const tampered = structuredClone(corrected);
  tampered.supersedes_ref = receipt("correction.other").id;
  assert.throws(
    () => validateReceipt(tampered),
    (error) => error.code === "RECORD_INTEGRITY_MISMATCH",
  );
});

test("receipt validation rejects nested metadata and non-string sentinel values", () => {
  const sentinel = "NESTED_RECEIPT_SENTINEL_MUST_NOT_PERSIST";
  const forged = refinalizeReceipt(receipt("metadata.nested"), (unsigned) => {
    unsigned.metadata = {
      audit: {
        sentinel,
      },
    };
  });
  assert.match(canonicalStringify(forged), new RegExp(sentinel));
  assert.throws(
    () => validateReceipt(forged),
    (error) => error.code === "INVALID_RECEIPT",
  );
});

test("receipt metadata enforces key, count, string, and length bounds", () => {
  const maximumMetadata = Object.fromEntries(
    Array.from({ length: 16 }, (_, index) => ["entry_" + index, "x".repeat(512)]),
  );
  const maximum = refinalizeReceipt(receipt("metadata.maximum"), (unsigned) => {
    unsigned.metadata = maximumMetadata;
  });
  assert.equal(validateReceipt(maximum), true);

  const omitted = refinalizeReceipt(receipt("metadata.omitted"), (unsigned) => {
    delete unsigned.metadata;
  });
  assert.equal(validateReceipt(omitted), true);

  const invalidMetadata = [
    { "Bad Key": "invalid property name" },
    Object.fromEntries(Array.from({ length: 17 }, (_, index) => ["entry_" + index, "value"])),
    { empty: "" },
    { oversized: "x".repeat(513) },
    { numeric: 42 },
  ];
  for (const metadata of invalidMetadata) {
    const forged = refinalizeReceipt(receipt("metadata.invalid"), (unsigned) => {
      unsigned.metadata = metadata;
    });
    assert.throws(
      () => validateReceipt(forged),
      (error) => error.code === "INVALID_RECEIPT",
      JSON.stringify(metadata),
    );
  }
});

test("receipt validation rejects invalid outcomes, names, lengths, and object references", () => {
  const mutations = [
    (unsigned) => { unsigned.outcome = "revoked"; },
    (unsigned) => { unsigned.operation = "Invalid Operation"; },
    (unsigned) => { unsigned.actor = "x"; },
    (unsigned) => { unsigned.issuer.id = "x"; },
    (unsigned) => { unsigned.user_summary = "x".repeat(501); },
    (unsigned) => { unsigned.subject_ref = "urn:cl:bundle:not-an-alias"; },
    (unsigned) => { unsigned.request_ref = "urn:cl:decision:not-a-request"; },
    (unsigned) => { unsigned.decision_ref = "urn:cl:request:not-a-decision"; },
    (unsigned) => { unsigned.bundle_ref = "urn:cl:request:not-a-bundle"; },
    (unsigned) => { delete unsigned.request_ref; },
  ];
  for (const mutate of mutations) {
    const forged = refinalizeReceipt(receipt("schema.invalid"), mutate);
    assert.throws(
      () => validateReceipt(forged),
      (error) => error.code === "INVALID_RECEIPT",
    );
  }
});

test("receipt timestamps require calendar-valid RFC 3339 date-times", () => {
  const invalidTimestamps = [
    "2026-08-20T12:00:00",
    "2026-08-20 12:00:00Z",
    "2026-08-20T12:00:00+0000",
    "2026-02-30T12:00:00Z",
    "2026-08-20T24:00:00Z",
  ];
  for (const timestamp of invalidTimestamps) {
    const forged = refinalizeReceipt(receipt("timestamp.invalid"), (unsigned) => {
      unsigned.completed_at = timestamp;
    });
    assert.throws(
      () => validateReceipt(forged),
      (error) => error.code === "INVALID_DATE_TIME",
      timestamp,
    );
  }

  const validOffset = refinalizeReceipt(receipt("timestamp.offset"), (unsigned) => {
    unsigned.started_at = "2026-08-20T07:00:00-05:00";
    unsigned.completed_at = "2026-08-20T07:00:00.500-05:00";
  });
  assert.equal(validateReceipt(validOffset), true);
});

test("receipt validation rejects extra top-level, issuer, and integrity keys after canonical finalization", () => {
  const base = receipt("keys.exact");
  const forgedRecords = [
    refinalizeReceipt(base, (unsigned) => {
      unsigned.debug = "must not be accepted";
    }),
    refinalizeReceipt(base, (unsigned) => {
      unsigned.issuer.key_id = "must-not-be-accepted";
    }),
  ];
  const extraIntegrity = refinalizeReceipt(base, () => undefined);
  extraIntegrity.integrity.key_id = "must-not-be-accepted";
  forgedRecords.push(extraIntegrity);

  for (const forged of forgedRecords) {
    assert.equal(
      verifyCanonicalRecord(forged, "urn:cl:receipt:"),
      true,
      "the forgery must have otherwise-valid canonical identity and integrity",
    );
    assert.throws(
      () => validateReceipt(forged),
      (error) => error.code === "INVALID_RECEIPT",
    );
  }
});

test("authenticated anchor survives reopen and contains no receipt material", async (t) => {
  const directory = await temporaryDirectory(t, "reopen");
  const filePath = join(directory, "receipts.jsonl");
  const key = Buffer.alloc(32, 2);
  const anchor = anchorConfig(directory, key);
  const log = await openReceiptLog({ filePath, anchor });
  const first = await log.append(receipt("operation.one"));
  const second = await log.append(receipt("operation.two"));
  assert.deepEqual(await log.verify(), {
    ok: true,
    authenticated_anchor: true,
    entries: 2,
    tail_digest: second.entry_digest,
  });
  await log.close();
  await assert.rejects(
    log.preflight(),
    (error) => error.code === "RECEIPT_LOG_CLOSED",
  );

  const anchorText = await readFile(anchor.filePath, "utf8");
  assert.equal(anchorText.includes("operation.one"), false);
  assert.equal(anchorText.includes("Receipt hardening sentinel"), false);
  assert.equal(key[0], 2, "the anchor must zero only its private key copy");

  const reopened = await openReceiptLog({ filePath, anchor });
  assert.equal((await reopened.receipts()).length, 2);
  const third = await reopened.append(receipt("operation.three"));
  assert.equal(third.sequence, 3);
  await reopened.close();
  assert.deepEqual(await verifyReceiptLog(filePath, { anchor }), {
    ok: true,
    authenticated_anchor: true,
    entries: 3,
    tail_digest: third.entry_digest,
  });
  assert.equal(first.sequence, 1);
});

test("authenticated anchor detects rollback, rewrite, and unanchored suffixes", async (t) => {
  const directory = await temporaryDirectory(t, "rollback");
  const filePath = join(directory, "receipts.jsonl");
  const key = Buffer.alloc(32, 3);
  const anchor = anchorConfig(directory, key);
  const log = await openReceiptLog({ filePath, anchor });
  await log.append(receipt("operation.one"));
  await log.append(receipt("operation.two"));
  await log.close();

  const original = await readFile(filePath, "utf8");
  const lines = original.trimEnd().split("\n");
  await writeFile(filePath, lines[0] + "\n", "utf8");
  await assert.rejects(
    openReceiptLog({ filePath, anchor }),
    (error) => error.code === "RECEIPT_LOG_ROLLBACK",
  );

  await writeFile(filePath, " " + lines.join("\n") + "\n", "utf8");
  await assert.rejects(
    verifyReceiptLog(filePath, { anchor }),
    (error) => error.code === "RECEIPT_LOG_REWRITE",
  );

  const first = JSON.parse(lines[0]);
  const replacement = logEntry(2, first.entry_digest, "operation.rewritten");
  await writeFile(
    filePath,
    canonicalStringify(first) + "\n" + canonicalStringify(replacement) + "\n",
    "utf8",
  );
  await assert.rejects(
    verifyReceiptLog(filePath, { anchor }),
    (error) => error.code === "RECEIPT_LOG_REWRITE",
  );

  const second = JSON.parse(lines[1]);
  const unanchored = logEntry(3, second.entry_digest, "operation.unanchored");
  await writeFile(filePath, original + canonicalStringify(unanchored) + "\n", "utf8");
  await assert.rejects(
    openReceiptLog({ filePath, anchor }),
    (error) => error.code === "RECEIPT_LOG_UNANCHORED_SUFFIX",
  );
});

test("wrong keys and anchor mutations fail authentication without repair", async (t) => {
  const directory = await temporaryDirectory(t, "authentication");
  const filePath = join(directory, "receipts.jsonl");
  const key = Buffer.alloc(32, 4);
  const anchor = anchorConfig(directory, key);
  const log = await openReceiptLog({ filePath, anchor });
  await log.append(receipt("operation.one"));
  await log.close();

  await assert.rejects(
    openReceiptLog({
      filePath,
      anchor: { ...anchor, key: Buffer.alloc(32, 5) },
    }),
    (error) => error.code === "RECEIPT_ANCHOR_AUTHENTICATION_FAILED",
  );

  const originalAnchor = await readFile(anchor.filePath, "utf8");
  const records = originalAnchor.trimEnd().split("\n").map((line) => JSON.parse(line));
  records.at(-1).tail_digest = "sha256:" + "f".repeat(64);
  await writeFile(
    anchor.filePath,
    records.map((record) => canonicalStringify(record)).join("\n") + "\n",
    "utf8",
  );
  await assert.rejects(
    openReceiptLog({ filePath, anchor }),
    (error) => error.code === "RECEIPT_ANCHOR_AUTHENTICATION_FAILED",
  );
  assert.equal(await readFile(anchor.filePath, "utf8"), records.map((record) => canonicalStringify(record)).join("\n") + "\n");
});

test("independent receipt-log instances serialize appends and replay checks", async (t) => {
  const directory = await temporaryDirectory(t, "concurrency");
  const filePath = join(directory, "receipts.jsonl");
  const key = Buffer.alloc(32, 6);
  const anchor = anchorConfig(directory, key);
  const first = await openReceiptLog({ filePath, anchor });
  const second = await openReceiptLog({ filePath, anchor });
  const entries = await Promise.all([
    first.append(receipt("operation.one")),
    second.append(receipt("operation.two")),
  ]);
  assert.deepEqual(entries.map((entry) => entry.sequence).sort(), [1, 2]);
  assert.equal((await first.verify()).entries, 2);
  await first.close();
  await second.close();

  const replayDirectory = join(directory, "replay");
  const replayPath = join(replayDirectory, "receipts.jsonl");
  const replayAnchor = anchorConfig(replayDirectory, key);
  const replayFirst = await openReceiptLog({ filePath: replayPath, anchor: replayAnchor });
  const replaySecond = await openReceiptLog({ filePath: replayPath, anchor: replayAnchor });
  const consumption = receipt("bundle.consume", {
    bundleRef: "urn:cl:bundle:single-use",
  });
  const results = await Promise.allSettled([
    replayFirst.append(consumption),
    replaySecond.append(consumption),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.equal(rejected.reason.code, "RECEIPT_REPLAY_CONFLICT");
  await replayFirst.close();
  await replaySecond.close();
});

test("exclusive receipt-log lock serializes real child processes", async (t) => {
  const directory = await temporaryDirectory(t, "process-lock");
  const filePath = join(directory, "receipts.jsonl");
  const anchorPath = join(directory, "receipt-anchor.jsonl");
  const barrierPath = join(directory, "append.barrier");
  const key = Buffer.alloc(32, 8);
  const first = spawnAppendWorker({
    filePath,
    anchorPath,
    barrierPath,
    key,
    operation: "process.operation.one",
  });
  const second = spawnAppendWorker({
    filePath,
    anchorPath,
    barrierPath,
    key,
    operation: "process.operation.two",
  });
  t.after(() => {
    first.child.kill();
    second.child.kill();
  });
  await Promise.all([first.ready, second.ready]);
  await writeFile(barrierPath, "go\n", "utf8");
  const results = await Promise.all([first.completion, second.completion]);
  assert.deepEqual(results.map((result) => result.sequence).sort(), [1, 2]);
  const verified = await verifyReceiptLog(filePath, {
    anchor: { filePath: anchorPath, key },
  });
  assert.equal(verified.entries, 2);
  await rm(filePath);
  await rm(anchorPath);
});

test("stale exclusive locks remain fail-closed until explicit recovery", async (t) => {
  const directory = await temporaryDirectory(t, "stale-lock");
  const filePath = join(directory, "receipts.jsonl");
  const lockPath = filePath + ".lock";
  const key = Buffer.alloc(32, 7);
  const anchor = anchorConfig(directory, key);
  const log = await openReceiptLog({ filePath, anchor });
  await log.close();

  const stale = "stale-lock-sentinel\n";
  await writeFile(lockPath, stale, "utf8");
  await assert.rejects(
    openReceiptLog({
      filePath,
      anchor: { ...anchor, lockTimeoutMs: 25, lockRetryMs: 5 },
    }),
    (error) => error.code === "RECEIPT_ANCHOR_LOCK_TIMEOUT",
  );
  assert.equal(await readFile(lockPath, "utf8"), stale);

  await unlink(lockPath);
  const recovered = await openReceiptLog({ filePath, anchor });
  assert.equal((await recovered.preflight()).authenticated_anchor, true);
  await recovered.close();
});
