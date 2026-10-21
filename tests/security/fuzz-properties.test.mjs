import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createEd25519BundleAuthority, createLocalAgentConsumer, createOperationReceipt,
  evaluatePolicy, issueScopedBundle, openReceiptLog, validateReceipt,
  finalizeCanonicalRecord,
} from "../../packages/local-core/index.mjs";

const vector = JSON.parse(await readFile(new URL("../../test-vectors/v0.2/exchange-security.json", import.meta.url), "utf8"));
const seed = Number(process.env.CONTEXT_FUZZ_SEED ?? "12648430");
const cases = Number(process.env.CONTEXT_FUZZ_CASES ?? "256");
if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("CONTEXT_FUZZ_SEED must be uint32");
if (!Number.isSafeInteger(cases) || cases < 1 || cases > 4096) throw new Error("CONTEXT_FUZZ_CASES must be 1..4096");
const clock = () => new Date(vector.fixed_time);
const clone = (value) => structuredClone(value);
function random(initial) { let state = initial >>> 0; return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0x100000000; }; }
const prng = random(seed || 1);
function generated(depth = 0) {
  const choice = Math.floor(prng() * (depth < 5 ? 7 : 5));
  if (choice === 0) return null;
  if (choice === 1) return prng() < 0.5;
  if (choice === 2) return Math.floor(prng() * 100000) - 50000;
  if (choice === 3) return "synthetic-" + Math.floor(prng() * 1e6) + "\n\u0000";
  if (choice === 4) return "😀\"\\";
  if (choice === 5) return Array.from({ length: Math.floor(prng() * 5) }, () => generated(depth + 1));
  return Object.fromEntries(Array.from({ length: Math.floor(prng() * 5) }, (_, index) => ["field" + index, generated(depth + 1)]));
}
function coded(error) { return typeof error?.code === "string" && /^[A-Z][A-Z0-9_]+$/.test(error.code); }
function memoryStore() {
  const records = [];
  return { records, preflight: async () => ({ ok: true }), receipts: async () => clone(records), append: async (receipt) => { records.push(clone(receipt)); } };
}
async function exchange(receipts, suffix = "") {
  const authority = await createEd25519BundleAuthority({ keyId: vector.authority_key_id, keyProvider: async () => Buffer.from(vector.synthetic_test_only_ed25519_material_hex, "hex") });
  const request = clone(vector.request); request.id += suffix;
  const decision = await evaluatePolicy({ request, policy: vector.policy, receiptStore: receipts, clock });
  const envelope = await issueScopedBundle({ request, decision, claims: vector.claims, receiptStore: receipts, clock, bundleAuthority: authority });
  return { authority, envelope };
}
async function consumer(receipts, authority, extra = {}) {
  return createLocalAgentConsumer({ principal: vector.request.recipient.principal, receiptLog: receipts, bundleVerifier: authority.createVerifier(), trustedKeyId: authority.kid, clock, ...extra });
}
function unsigned(record) { const value = clone(record); delete value.id; delete value.integrity; return value; }

test("seeded bundle JSON/shape mutations reject without releasing context", { timeout: 30_000 }, async (t) => {
  t.diagnostic(`seed=${seed}; cases=${cases}; generator=xorshift32-v1; bounded-depth=5`);
  const receipts = memoryStore(); const { authority, envelope } = await exchange(receipts);
  t.after(() => authority.close()); const agent = await consumer(receipts, authority);
  const initialReceipts = receipts.records.length;
  for (let index = 0; index < cases; index++) {
    const mutation = clone(envelope); let source;
    switch (index % 8) {
      case 0: source = JSON.stringify(generated()); break;
      case 1: source = JSON.stringify(mutation).slice(0, -1); break;
      case 2: mutation.envelope_version = index + 2; source = JSON.stringify(mutation); break;
      case 3: mutation.authentication.sig = "A".repeat(86); source = JSON.stringify(mutation); break;
      case 4: mutation.bundle.context[0].value = generated(); source = JSON.stringify(mutation); break;
      case 5: mutation.authentication.untrusted_extension = generated(); source = JSON.stringify(mutation); break;
      case 6: mutation.bundle = finalizeCanonicalRecord({ ...unsigned(mutation.bundle), capabilities: ["email.send"] }, "urn:cl:bundle:"); source = JSON.stringify(mutation); break;
      default: mutation.bundle = finalizeCanonicalRecord({ ...unsigned(mutation.bundle), raw_vault_object: { ref: "vault://synthetic-only/forbidden" } }, "urn:cl:bundle:"); source = JSON.stringify(mutation);
    }
    await assert.rejects(agent.openBundle(source), coded, `seed=${seed} case=${index}`);
  }
  assert.equal(receipts.records.length, initialReceipts, "invalid input must not consume or release a bundle");
  await assert.rejects(agent.openBundle(" ".repeat(2 * 1024 * 1024 + 1)), { code: "BUNDLE_TOO_LARGE" });
});

test("seeded receipt shapes and canonical rehash mutations reject", { timeout: 30_000 }, (t) => {
  t.diagnostic(`seed=${seed}; cases=${cases}`);
  const base = createOperationReceipt({ operation: "synthetic.operation", actor: "urn:agent:synthetic", subjectRef: "urn:cl:alias:synthetic", outcome: "success", userSummary: "Synthetic parser test.", clock });
  for (let index = 0; index < cases; index++) {
    const value = unsigned(base); let candidate;
    switch (index % 8) {
      case 0: candidate = generated(); break;
      case 1: value.payload_included = true; candidate = finalizeCanonicalRecord(value, "urn:cl:receipt:"); break;
      case 2: value.metadata = { raw_vault_write: "synthetic" }; candidate = finalizeCanonicalRecord(value, "urn:cl:receipt:"); break;
      case 3: value.completed_at = "2029-01-01T00:00:00Z"; candidate = finalizeCanonicalRecord(value, "urn:cl:receipt:"); break;
      case 4: value.created_at = "2030-02-30T12:00:00Z"; candidate = finalizeCanonicalRecord(value, "urn:cl:receipt:"); break;
      case 5: value.extra = generated(); candidate = finalizeCanonicalRecord(value, "urn:cl:receipt:"); break;
      case 6: value.input_digest = "sha256:" + "g".repeat(64); candidate = finalizeCanonicalRecord(value, "urn:cl:receipt:"); break;
      default: value.user_summary = "x".repeat(501); candidate = finalizeCanonicalRecord(value, "urn:cl:receipt:");
    }
    assert.throws(() => validateReceipt(candidate), coded, `seed=${seed} case=${index}`);
  }
});

test("seeded receipt-log byte corruption and anchor truncation fail closed", { timeout: 30_000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "context-layer-fuzz-log-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "receipts.jsonl");
  const anchor = { filePath: join(directory, "anchor.jsonl"), key: Buffer.alloc(32, 0x7c) };
  const log = await openReceiptLog({ filePath, anchor }); t.after(() => log.close());
  await log.append(createOperationReceipt({ operation: "synthetic.operation", actor: "urn:agent:synthetic", subjectRef: "urn:cl:alias:synthetic", outcome: "success", userSummary: "Synthetic mutation baseline.", clock }));
  const source = await readFile(filePath); const originalAnchor = await readFile(anchor.filePath);
  const count = Math.min(cases, 128);
  for (let index = 0; index < count; index++) {
    const bytes = Buffer.from(source); const offset = Math.floor(prng() * bytes.length);
    bytes[offset] = bytes[offset] === 33 ? 34 : 33;
    await writeFile(filePath, bytes);
    await assert.rejects(log.verify(), coded, `seed=${seed} byte-case=${index} offset=${offset}`);
  }
  await writeFile(filePath, source);
  for (const cut of [0, 1, originalAnchor.length - 1]) {
    await writeFile(anchor.filePath, originalAnchor.subarray(0, cut));
    await assert.rejects(log.verify(), coded, `anchor cut=${cut}`);
  }
  await writeFile(anchor.filePath, originalAnchor);
  assert.equal((await log.verify()).entries, 1);
});

test("generated concurrent single-use and restart properties use durable shared storage", { timeout: 30_000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "context-layer-fuzz-replay-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const count = Math.min(16, Math.max(2, Math.ceil(cases / 32)));
  for (let index = 0; index < count; index++) {
    const options = { filePath: join(directory, `receipts-${index}.jsonl`), anchor: { filePath: join(directory, `anchor-${index}.jsonl`), key: Buffer.alloc(32, 0x7c) } };
    const logA = await openReceiptLog(options); const logB = await openReceiptLog(options);
    const { authority, envelope } = await exchange(logA, `-${index}-${Math.floor(prng() * 1e6)}`);
    try {
      const agents = await Promise.all([consumer(logA, authority), consumer(logB, authority)]);
      const outcomes = await Promise.allSettled(Array.from({ length: 4 }, (_, n) => agents[n % 2].openBundle(JSON.stringify(envelope))));
      assert.equal(outcomes.filter((value) => value.status === "fulfilled").length, 1, `seed=${seed} replay-case=${index}`);
      assert.ok(outcomes.filter((value) => value.status === "rejected").every((value) => value.reason.code === "BUNDLE_REPLAY"));
      const restarted = await consumer(logB, authority);
      await assert.rejects(restarted.openBundle(JSON.stringify(envelope)), { code: "BUNDLE_REPLAY" });
      assert.equal((await logA.receipts()).filter((receipt) => receipt.operation === "bundle.consume").length, 1);
    } finally { authority.close(); await logA.close(); await logB.close(); }
  }
});

test("generated revocation/expiry rechecks prevent handler invocation after open", { timeout: 30_000 }, async (t) => {
  const count = Math.min(cases, 32);
  for (let index = 0; index < count; index++) {
    const receipts = memoryStore(); const { authority, envelope } = await exchange(receipts, `-revocation-${index}`);
    let state = false; let now = vector.fixed_time; let calls = 0;
    const agent = await consumer(receipts, authority, { clock: () => new Date(now), revocationProvider: async () => { if (state === "throw") throw new Error("synthetic outage"); return state; } });
    try {
      const session = await agent.openBundle(JSON.stringify(envelope));
      const expected = index % 4 === 0 ? "BUNDLE_REVOKED" : index % 4 === 3 ? "BUNDLE_EXPIRED" : "REVOCATION_CHECK_FAILED";
      state = [true, "throw", null, false][index % 4];
      if (index % 4 === 3) now = envelope.bundle.expires_at;
      await assert.rejects(session.readContext(), { code: expected });
      await assert.rejects(session.execute("model.generate_text", async () => { calls++; return "forbidden"; }), { code: expected });
      await assert.rejects(session.proposeMemoryUpdate({ proposedClaims: [{ predicate: "synthetic.fact", value: true }], rationale: "Synthetic." }), { code: expected });
      assert.equal(calls, 0);
    } finally { authority.close(); }
  }
  t.diagnostic(`seed=${seed}; scenarios=${count}; revocation, malformed status, outage, exact expiry`);
});
