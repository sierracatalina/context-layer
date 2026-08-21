import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
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
  finalizeCanonicalRecord,
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

function logEntry(sequence, previousEntryDigest, operation) {
  const unsigned = {
    log_version: 1,
    sequence,
    previous_entry_digest: previousEntryDigest,
    receipt: receipt(operation),
  };
  return { ...unsigned, entry_digest: digestJson(unsigned) };
}

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
