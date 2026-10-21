// Integration-only: exercise both independent adapters against one frozen kit,
// then check byte agreement and feed each implementation the other's envelope.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, delimiter } from "node:path";
import { spawnSync } from "node:child_process";
import { createPrivateKey, createPublicKey, createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const independent = resolve(root, "implementations/python");
const python = process.env.PYTHON ?? "python";
const env = { ...process.env, PYTHONPATH: [independent, process.env.PYTHONPATH].filter(Boolean).join(delimiter), PYTHONDONTWRITEBYTECODE: "1" };
const js = [process.execPath, resolve(root, "scripts/conformance-reference-adapter.mjs")];
const py = [python, "-m", "context_layer_independent.adapter"];
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
};
const digest = (value) => "sha256:" + createHash("sha256").update(canonical(value)).digest("hex");
function execute(command, { input, cwd = root, timeout = 120_000 } = {}) {
  const child = spawnSync(command[0], command.slice(1), { cwd, env, input, timeout, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, windowsHide: true, shell: false, killSignal: "SIGKILL" });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, child.stdout + child.stderr);
  return child.stdout;
}
function call(command, operation, input) {
  const result = JSON.parse(execute(command, { input: JSON.stringify({ adapter_version: "context-layer-conformance-adapter/1", operation, ...input }) + "\n", timeout: 10_000 }));
  assert.equal(result.ok, true, JSON.stringify(result.error));
  return result.result;
}
const reports = {};
try {
  execute([python, "-m", "unittest", "discover", "-s", "tests", "-v"], { cwd: independent });
  for (const [name, command] of [["javascript", js], ["python", py]]) {
    reports[name] = JSON.parse(execute([process.execPath, resolve(root, "conformance/v0.2.0-draft.1/run.mjs"), "--", ...command]));
    assert.equal(reports[name].status, "passed");
  }
  const p = JSON.parse(readFileSync(resolve(root, "test-vectors/v0.2/policy-cases.json")));
  for (const item of p.state_cases) {
    const input = { request: { ...p.base_request, ...item.request_patch }, policy: p.base_policy, clock: p.fixed_time, approval_verifier: "absent", receipt_preflight: "absent" };
    assert.equal(canonical(call(js, "evaluate_policy", input)), canonical(call(py, "evaluate_policy", input)), "decision bytes: " + item.id);
  }
  const request = { ...p.base_request, ...p.approval.request_patch };
  const approvalInput = { request, policy: p.base_policy, clock: p.fixed_time, approval: { ...p.approval.candidate, request_digest: digest(request), policy_digest: digest(p.base_policy) }, approval_verifier: "authenticated", receipt_preflight: "absent" };
  assert.equal(canonical(call(js, "evaluate_policy", approvalInput)), canonical(call(py, "evaluate_policy", approvalInput)), "approved decision bytes");
  const e = JSON.parse(readFileSync(resolve(root, "test-vectors/v0.2/exchange-security.json")));
  const input = { request: e.request, policy: e.policy, claims: e.claims, clock: e.fixed_time, key_id: e.authority_key_id, synthetic_seed_hex: e.synthetic_test_only_ed25519_material_hex };
  const envelopes = [call(js, "issue_bundle", input), call(py, "issue_bundle", input)];
  assert.equal(canonical(envelopes[0]), canonical(envelopes[1]), "same-input canonical envelope bytes and deterministic Ed25519 signature");
  const publicKey = createPublicKey(createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), Buffer.from(e.synthetic_test_only_ed25519_material_hex, "hex")]), format: "der", type: "pkcs8" }));
  const public_key_hex = publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
  for (const [envelope, receiver] of [[envelopes[0], py], [envelopes[1], js]]) {
    assert.equal(call(receiver, "verify_envelope", { envelope, clock: e.fixed_time, recipient: e.request.recipient.principal, key_id: e.authority_key_id, public_key_hex, revocation: "clear" }).accepted, true);
  }
  const r = JSON.parse(readFileSync(resolve(root, "test-vectors/v0.2/receipt-memory-isolation.json")));
  const receiptInput = { clock: r.fixed_time, operations: r.receipt_operations, synthetic_seed_hex: r.synthetic_test_only_anchor_material_hex };
  assert.equal(call(js, "receipt_log", receiptInput).log_jsonl, call(py, "receipt_log", receiptInput).log_jsonl, "receipt log bytes; path-bound anchor bytes are separately verified by the kit");
  process.stdout.write(JSON.stringify({ status: "passed", node: process.version, python: execute([python, "--version"]).trim(), kit: reports.javascript.kit_version, assertions_per_implementation: reports.javascript.passed, cross_implementation_checks: 9, checks: ["four decision byte comparisons", "approved decision bytes", "canonical envelope bytes and signature", "JavaScript issuer to Python verifier", "Python issuer to JavaScript verifier", "receipt log bytes"], reports }, null, 2) + "\n");
} catch (error) {
  process.stdout.write(JSON.stringify({ status: "failed", error: error.message, reports }, null, 2) + "\n");
  process.exitCode = 1;
}
