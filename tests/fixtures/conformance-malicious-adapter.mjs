// Deliberately wrong synthetic adapter used only to regression-test the kit oracle.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const input = readFileSync(0, "utf8");
const child = spawnSync(process.execPath, [fileURLToPath(new URL("../../scripts/conformance-reference-adapter.mjs", import.meta.url))], { input, encoding: "utf8", timeout: 10_000, killSignal: "SIGKILL" });
if (child.error || child.status !== 0) throw new Error(child.stderr || child.error?.message);
const request = JSON.parse(input); const response = JSON.parse(child.stdout);
const mode = process.argv[2];
function canonical(value) { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; }
if (response.ok && request.operation === "evaluate_policy" && ["allow", "allow_with_reductions"].includes(response.result.decision)) {
  const record = response.result;
  if (mode === "scope") { record.granted_actions = ["synthetic.unauthorized_action"]; record.granted_selectors = [{ predicate: "synthetic.unauthorized_data" }]; }
  if (mode === "unknown-field") record.extra_schema_forbidden_field = true;
  if (mode === "approval" && record.approval_binding) record.approval_binding.request_digest = "sha256:" + "0".repeat(64);
  if (mode === "retention") record.retention.max_seconds = 3600;
  if (mode === "scope" || mode === "unknown-field" || mode === "retention" || (mode === "approval" && record.approval_binding)) {
    delete record.id; delete record.integrity;
    const digest = createHash("sha256").update(canonical(record)).digest("hex");
    record.id = "urn:cl:decision:" + digest; record.integrity = { algorithm: "sha-256", digest: "sha256:" + digest };
  }
}
process.stdout.write(JSON.stringify(response) + "\n");
