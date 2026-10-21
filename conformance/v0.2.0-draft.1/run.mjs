#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, createHmac, createPrivateKey, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// This harness intentionally imports no implementation or repository module.
const root = dirname(fileURLToPath(import.meta.url));
const version = "context-layer-conformance/0.2.0-draft.1";
const started = Date.now();
const results = [];
const args = process.argv.slice(2);
const split = args.indexOf("--");
const command = split === -1 ? [] : args.slice(split + 1);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
};
const digest = (value) => "sha256:" + hash(canonical(value));
const unsigned = (record) => { const value = structuredClone(record); delete value.id; delete value.integrity; return value; };
const finalize = (value, prefix) => ({ ...value, id: prefix + digest(value).slice(7), integrity: { algorithm: "sha-256", digest: digest(value) } });
const clone = (value) => structuredClone(value);

function check(id, run) {
  try { run(); results.push({ id, status: "passed" }); }
  catch (error) { results.push({ id, status: "failed", detail: String(error.message).slice(0, 2000) }); }
}
function call(operation, input = {}) {
  const remaining = 120_000 - (Date.now() - started);
  assert.ok(remaining > 0, "whole-run 120-second runtime bound exceeded");
  const child = spawnSync(command[0], command.slice(1), {
    input: JSON.stringify({ adapter_version: "context-layer-conformance-adapter/1", operation, ...input }) + "\n",
    encoding: "utf8", timeout: Math.min(10_000, remaining), maxBuffer: 4 * 1024 * 1024,
    windowsHide: true, shell: false, killSignal: "SIGKILL",
  });
  assert.equal(child.error, undefined, "adapter failed: " + child.error?.message);
  assert.equal(child.status, 0, "adapter exited nonzero: " + child.stderr.slice(0, 1000));
  const lines = child.stdout.trim().split("\n");
  assert.equal(lines.length, 1, "adapter must emit exactly one JSON response");
  const response = JSON.parse(lines[0]);
  assert.equal(typeof response.ok, "boolean", "adapter response must have Boolean ok");
  return response;
}
function ok(operation, input) {
  const response = call(operation, input);
  assert.equal(response.ok, true, "unexpected protocol rejection: " + JSON.stringify(response.error));
  return response.result;
}
function rejects(operation, input, code) {
  const response = call(operation, input);
  assert.equal(response.ok, false, "expected rejection " + code);
  assert.equal(response.error?.code, code);
}
function verifyRecord(record, prefix) {
  const expected = finalize(unsigned(record), prefix);
  assert.equal(record.id, expected.id);
  assert.deepEqual(record.integrity, expected.integrity);
}
function publicKeyFromSeed(hex) {
  const seed = Buffer.from(hex, "hex");
  assert.equal(seed.length, 32);
  return createPublicKey(createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]), format: "der", type: "pkcs8" }));
}

try {
  if (!command.length) throw new Error("Usage: node run.mjs -- <adapter-command> [arguments...]");
  const manifest = read("manifest.json");
  assert.equal(manifest.kit_version, version);
  for (const file of manifest.files) {
    const path = resolve(root, file.path);
    const local = relative(root, path);
    assert.ok(local && !local.startsWith("..") && !isAbsolute(local), "unsafe manifest path");
    assert.equal(hash(readFileSync(path)), file.sha256, "kit integrity: " + file.path);
  }
  const original = read("vectors/manifest.json");
  assert.equal(original.files.length, 4, "original corpus contains exactly four vector sets");
  for (const file of original.files) assert.equal(hash(readFileSync(resolve(root, "vectors", file.path))), file.sha256, file.path);
} catch (error) {
  process.stdout.write(JSON.stringify({ kit_version: version, status: "setup_failed", error: error.message }) + "\n");
  process.exit(2);
}

for (const [file, schema_name, valid] of [
  ["valid-exchange.json", "context-request", true],
  ["valid-policy-decision.json", "policy-decision", true],
  ["invalid-policy-decision.json", "policy-decision", false],
  ["valid-memory-update-proposal.json", "memory-update-proposal", true],
  ["invalid-memory-update-proposal.json", "memory-update-proposal", false],
  ["invalid-secret-receipt.json", "receipt", false],
]) check("fixture/" + file, () => {
  const fixture = read("fixtures/" + file);
  assert.equal(ok("validate_schema", { schema_name, value: file === "valid-exchange.json" ? fixture.request : fixture }).valid, valid);
});
const expectedObjects = read("local-profile-expectations.json");
for (const item of expectedObjects.canonical_cases) check("canonical/" + item.id, () => {
  assert.deepEqual(ok("canonicalize", { value: item.value }), { canonical_json: item.canonical_json, digest: item.digest });
});
const c = read("vectors/canonicalization.json");
for (const item of c.cases) check("canonical/" + item.id, () => {
  const result = ok("canonicalize", { value: item.value });
  assert.equal(result.canonical_json, item.expected_canonical_json);
  assert.equal(result.digest, item.expected_digest);
});
check("canonical/finalized-record", () => {
  const result = ok("finalize_record", { unsigned: c.record_case.unsigned, id_prefix: c.record_case.id_prefix });
  assert.deepEqual(result, { ...c.record_case.unsigned, id: c.record_case.expected_id, integrity: { algorithm: "sha-256", digest: c.record_case.expected_digest } });
});
const p = read("vectors/policy-cases.json");
check("schema/invalid-timezone-offset", () => {
  for (const offset of ["+00:60", "+00:99", "-00:60", "-00:99", "+24:00"]) {
    assert.equal(ok("validate_schema", { schema_name: "context-request", value: { ...p.base_request, expires_at: "2030-01-01T00:00:00" + offset } }).valid, false, offset);
  }
});
for (const [index, item] of p.purpose_code_cases.entries()) check("policy/purpose-" + index, () => assert.equal(ok("purpose_code", { value: item.code }).valid, item.expected_syntax_valid));
for (const item of p.state_cases) check("policy/" + item.id, () => {
  const request = { ...clone(p.base_request), ...clone(item.request_patch) };
  const result = ok("evaluate_policy", { request, policy: p.base_policy, clock: p.fixed_time, approval_verifier: "absent", receipt_preflight: "absent" });
  assert.deepEqual(result, expectedObjects.decisions[item.id], "complete policy decision oracle");
  assert.equal(result.decision, item.expected.decision);
  assert.deepEqual(result.reason_codes, item.expected.reason_codes);
  assert.equal(result.retention.max_seconds, item.expected.retention_seconds);
  assert.equal(result.approval_verification, item.expected.approval_verification);
  if (item.id === "needs-approval") {
    assert.deepEqual(result.denied_selectors, [{ predicate: "sensitive.fact" }]);
    assert.deepEqual(result.denied_actions, ["email.send"]);
  }
  assert.equal(result.request_digest, digest(request));
  assert.equal(result.policy_snapshot.digest, digest(p.base_policy));
  verifyRecord(result, "urn:cl:decision:");
  if (["deny", "needs_approval"].includes(result.decision)) {
    assert.deepEqual(result.granted_selectors, []); assert.deepEqual(result.granted_actions, []);
  }
});
for (const item of p.approval.cases) check("approval/" + item.id, () => {
  const request = { ...clone(p.base_request), ...clone(p.approval.request_patch) };
  const approval = { ...p.approval.candidate, request_digest: digest(request), policy_digest: digest(p.base_policy), expires_at: item.mode === "expired" ? p.approval.expired_candidate_expires_at : p.approval.candidate.expires_at };
  const result = ok("evaluate_policy", { request, policy: p.base_policy, clock: p.fixed_time, approval, approval_verifier: item.mode === "authenticated" ? "authenticated" : "absent", receipt_preflight: "absent" });
  assert.deepEqual(result, expectedObjects.approvals[item.id], "complete approval decision oracle");
  verifyRecord(result, "urn:cl:decision:");
  assert.equal(result.decision, item.expected_decision);
  assert.ok(result.reason_codes.includes(item.expected_reason));
  assert.equal(result.approval_verification, item.expected_verification);
  if (item.expected_expires_at) {
    assert.equal(result.expires_at, item.expected_expires_at);
    assert.deepEqual(result.approval_binding, { approval_ref: approval.id, request_digest: approval.request_digest, policy_digest: approval.policy_digest, expires_at: approval.expires_at });
  } else assert.equal(result.approval_binding, null);
});
const e = read("vectors/exchange-security.json");
const key = publicKeyFromSeed(e.synthetic_test_only_ed25519_material_hex);
const publicKeyHex = key.export({ format: "der", type: "spki" }).subarray(-32).toString("hex");
let envelope;
check("exchange/issue-and-independent-signature", () => {
  envelope = ok("issue_bundle", { request: e.request, policy: e.policy, claims: e.claims, clock: e.fixed_time, key_id: e.authority_key_id, synthetic_seed_hex: e.synthetic_test_only_ed25519_material_hex });
  assert.deepEqual(envelope, expectedObjects.envelope, "complete issued envelope oracle");
  assert.deepEqual(Object.keys(envelope).sort(), ["authentication", "bundle", "envelope_version"]);
  assert.equal(envelope.envelope_version, e.expected.envelope_version);
  assert.deepEqual(Object.keys(envelope.authentication).sort(), ["algorithm", "kid", "sig"]);
  assert.equal(envelope.authentication.algorithm, e.expected.authentication_algorithm);
  assert.equal(envelope.authentication.kid, e.authority_key_id);
  assert.match(envelope.authentication.sig, /^[A-Za-z0-9_-]{86}$/);
  assert.equal(envelope.bundle.expires_at, e.expected.bundle_expires_at);
  const decision = ok("evaluate_policy", { request: e.request, policy: e.policy, clock: e.fixed_time, approval_verifier: "absent", receipt_preflight: "available" });
  assert.deepEqual(decision, expectedObjects.exchange_decision, "complete issuance decision oracle");
  assert.equal(decision.decision, e.expected.decision);
  verifyRecord(decision, "urn:cl:decision:");
  assert.equal(envelope.bundle.decision_ref, decision.id);
  assert.equal(envelope.bundle.decision_digest, decision.integrity.digest);
  assert.equal(envelope.bundle.request_digest, decision.request_digest);
  assert.deepEqual(envelope.bundle.policy_snapshot, decision.policy_snapshot);
  verifyRecord(envelope.bundle, "urn:cl:bundle:");
  assert.equal(verify(null, Buffer.from(canonical(envelope.bundle)), key, Buffer.from(envelope.authentication.sig, "base64url")), true);
  for (const fragment of e.expected.forbidden_serialized_fragments) assert.equal(JSON.stringify(envelope).includes(fragment), false, fragment);
});
function verificationInput(override = {}) {
  assert.ok(envelope, "issuance prerequisite failed");
  return { envelope: clone(envelope), clock: e.fixed_time, recipient: e.request.recipient.principal, key_id: e.authority_key_id, public_key_hex: publicKeyHex, revocation: "clear", ...override };
}
check("exchange/inner-bundle-schema", () => {
  assert.ok(envelope, "issuance prerequisite failed");
  assert.equal(ok("validate_schema", { schema_name: "scoped-context-bundle", value: envelope.bundle }).valid, true);
  assert.equal(ok("validate_schema", { schema_name: "scoped-context-bundle", value: { ...envelope.bundle, authentication: envelope.authentication } }).valid, false);
});
check("exchange/valid-public-key-open", () => assert.equal(ok("verify_envelope", verificationInput()).accepted, true));
check("exchange/tampered-record", () => {
  const input = verificationInput(); input.envelope.bundle.context[0].value = "SYNTHETIC_TEST_ONLY_TAMPERED_VALUE";
  rejects("verify_envelope", input, e.expected.tampered_record_error);
});
check("exchange/forged-capability", () => {
  const input = verificationInput(); const value = unsigned(input.envelope.bundle);
  value.capabilities = [...value.capabilities, "email.send"].sort();
  value.receipt_contract.required_operations = [...value.receipt_contract.required_operations, "email.send"].sort();
  input.envelope.bundle = finalize(value, "urn:cl:bundle:");
  rejects("verify_envelope", input, e.expected.forged_capability_error);
});
check("exchange/malformed-signature", () => {
  for (const sig of ["", null, 42, "A".repeat(85), "A".repeat(87), "=".repeat(86)]) {
    const input = verificationInput(); input.envelope.authentication.sig = sig;
    rejects("verify_envelope", input, "INVALID_BUNDLE_AUTHENTICATION");
  }
});
check("exchange/forged-signature", () => {
  const input = verificationInput(); input.envelope.authentication.sig = "A".repeat(86);
  rejects("verify_envelope", input, e.expected.forged_sig_error);
});
check("exchange/legacy-disabled", () => {
  const input = verificationInput(); input.envelope.authentication = { algorithm: "hmac-sha256", key_id: e.authority_key_id, mac: "A".repeat(43) };
  rejects("verify_envelope", input, "INVALID_BUNDLE_AUTHENTICATION");
});
check("exchange/legacy-explicit-opt-in", () => {
  const input = verificationInput({ legacy_hmac: true, synthetic_legacy_key_hex: e.synthetic_test_only_ed25519_material_hex });
  input.envelope.authentication = { algorithm: "hmac-sha256", key_id: e.authority_key_id, mac: createHmac("sha256", Buffer.from(input.synthetic_legacy_key_hex, "hex")).update(canonical(input.envelope.bundle)).digest("base64url") };
  assert.equal(ok("verify_envelope", input).accepted, true);
});
check("exchange/raw-material", () => {
  const input = verificationInput(); const value = unsigned(input.envelope.bundle);
  value.raw_vault_object = { ref: "vault://synthetic-test-only/objects/forbidden" };
  input.envelope.bundle = finalize(value, "urn:cl:bundle:");
  rejects("verify_envelope", input, e.expected.raw_material_error);
});
check("exchange/recipient", () => rejects("verify_envelope", verificationInput({ recipient: "urn:agent:other" }), "BUNDLE_RECIPIENT_MISMATCH"));
check("exchange/expiry-boundary", () => rejects("verify_envelope", verificationInput({ clock: e.expected.bundle_expires_at }), "BUNDLE_EXPIRED"));
check("exchange/revoked", () => rejects("verify_envelope", verificationInput({ revocation: "revoked" }), "BUNDLE_REVOKED"));
check("exchange/revocation-fails-closed", () => rejects("verify_envelope", verificationInput({ revocation: "error" }), "REVOCATION_CHECK_FAILED"));
check("exchange/replay-and-restart", () => assert.deepEqual(ok("replay", verificationInput()), { first_accepted: true, second_error: "BUNDLE_REPLAY", restart_error: "BUNDLE_REPLAY" }));

const r = read("vectors/receipt-memory-isolation.json");
check("receipt/anchor-bytes-chain-and-rollback", () => {
  const result = ok("receipt_log", { clock: r.fixed_time, operations: r.receipt_operations, synthetic_seed_hex: r.synthetic_test_only_anchor_material_hex });
  assert.equal(result.missing_anchor_error, r.expected.missing_anchor_error);
  assert.equal(result.rollback_error, r.expected.rollback_error);
  assert.equal(typeof result.log_path, "string");
  assert.ok(isAbsolute(result.log_path) || /^[A-Za-z]:[\\/]/.test(result.log_path), "absolute profile log path required");
  assert.ok(result.log_jsonl.endsWith("\n")); assert.ok(result.anchor_jsonl.endsWith("\n"));
  const lines = result.log_jsonl.slice(0, -1).split("\n");
  const anchors = result.anchor_jsonl.slice(0, -1).split("\n").map(JSON.parse);
  assert.equal(lines.length, 2); assert.equal(anchors.length, 3);
  const anchorKey = publicKeyFromSeed(r.synthetic_test_only_anchor_material_hex);
  let previous = "sha256:" + "0".repeat(64);
  for (const [index, line] of lines.entries()) {
    const entry = JSON.parse(line);
    assert.deepEqual(Object.keys(entry).sort(), ["entry_digest", "log_version", "previous_entry_digest", "receipt", "sequence"]);
    assert.deepEqual(entry.receipt, expectedObjects.receipts[index], "complete receipt oracle");
    const { entry_digest: supplied, ...value } = entry;
    assert.equal(canonical(entry), line); assert.equal(entry.sequence, index + 1); assert.equal(entry.log_version, 1);
    assert.equal(entry.previous_entry_digest, previous); assert.equal(supplied, digest(value));
    verifyRecord(entry.receipt, "urn:cl:receipt:");
    assert.equal(entry.receipt.operation, r.receipt_operations[index]); assert.equal(entry.receipt.payload_included, false);
    previous = supplied;
  }
  let priorSig = "ed25519:" + "0".repeat(86);
  for (const [index, anchor] of anchors.entries()) {
    const { sig, ...value } = anchor;
    assert.deepEqual(Object.keys(anchor).sort(), ["anchor_sequence", "anchor_version", "byte_length", "entries", "file_digest", "log_id", "previous_sig", "sig", "tail_digest"]);
    assert.equal(anchor.anchor_version, 2); assert.equal(anchor.anchor_sequence, index); assert.equal(anchor.entries, index);
    assert.equal(anchor.log_id, digest({ receipt_log_path: result.log_path })); assert.equal(anchor.previous_sig, priorSig);
    const bytes = index ? lines.slice(0, index).join("\n") + "\n" : "";
    assert.equal(anchor.byte_length, Buffer.byteLength(bytes)); assert.equal(anchor.file_digest, "sha256:" + hash(bytes));
    assert.equal(anchor.tail_digest, index ? JSON.parse(lines[index - 1]).entry_digest : "sha256:" + "0".repeat(64));
    assert.match(sig, /^ed25519:[A-Za-z0-9_-]{86}$/);
    assert.equal(verify(null, Buffer.from(canonical(value)), anchorKey, Buffer.from(sig.slice(8), "base64url")), true);
    priorSig = sig;
  }
});
let proposal;
check("memory/pending-proposal", () => {
  const candidate = r.memory_proposal;
  proposal = ok("memory_proposal", { ...verificationInput(), proposal: { operation: candidate.operation, proposed_claims: candidate.proposed_claims, provenance_handles: candidate.provenance_handles, rationale: candidate.rationale } });
  assert.deepEqual(proposal, expectedObjects.proposal, "complete proposal oracle");
  assert.equal(proposal.status, candidate.expected_status);
  assert.deepEqual(proposal.approval_requirement, candidate.expected_approval_requirements);
  assert.equal(JSON.stringify(proposal).includes("vault://"), false);
  verifyRecord(proposal, "urn:cl:proposal:");
});
check("memory/direct-write-rejected", () => {
  assert.ok(proposal, "proposal prerequisite failed");
  const value = unsigned(clone(proposal)); value[r.memory_proposal.direct_write_field] = { operation: "synthetic-test-only-commit-attempt" };
  rejects("validate_proposal", { proposal: finalize(value, "urn:cl:proposal:") }, r.memory_proposal.expected_direct_write_error);
});
const failed = results.filter((entry) => entry.status === "failed").length;
process.stdout.write(JSON.stringify({ kit_version: version, profile: "local-core/0.2-draft.1", original_vector_sets: 4, separate_fixture_files: 6, status: failed ? "failed" : "passed", passed: results.length - failed, failed, duration_ms: Date.now() - started, scope: "listed local-profile assertions; not CL-Core-Lite certification or outside security review", results }, null, 2) + "\n");
process.exitCode = failed ? 1 : 0;
