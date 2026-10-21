import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { callContext } from "./client.mjs";
const started = performance.now();
const output = resolve(process.argv[2] ?? "outputs/mcp-protocol-demo");
await mkdir(output, { recursive: true });
console.log("CONTEXT LAYER / real MCP stdio / synthetic data only");
console.log("This automated protocol client is not itself an AI agent.");
const baseline = await callContext("baseline");
console.log(`BEFORE: ${baseline.payload.disclosed_fields} fields disclosed, including 3 unrelated personal fields.`);
const scoped = await callContext("scoped");
console.log(`AFTER: ${scoped.payload.disclosed_fields} fields disclosed; ${scoped.payload.decision}.`);
const denied = await callContext("scoped", ["private.journal"]);
console.log(`NEGATIVE: private.journal-only request -> ${denied.payload.decision}; ${denied.payload.disclosed_fields} fields.`);
assert.equal(baseline.payload.disclosed_fields, 6);
assert.equal(scoped.payload.disclosed_fields, 3);
assert.ok(!JSON.stringify(scoped).includes("SYNTHETIC_JOURNAL_SENTINEL"));
assert.equal(denied.payload.disclosed_fields, 0);
assert.equal(denied.payload.decision, "deny");
const report = {
  recorded_at: new Date().toISOString(), scope: "official-sdk-protocol-client; no model generation in this command",
  node: process.version, sdk: "@modelcontextprotocol/sdk@1.32.1", protocol_version: scoped.protocol_version,
  baseline_fields: 6, scoped_fields: 3, unrelated_values_disclosed_after: 0,
  receipt_operations: scoped.payload.receipts.map(receipt => receipt.operation),
  negative_result: denied.payload.decision, elapsed_seconds: (performance.now() - started) / 1000,
};
for (const [name, value] of Object.entries({ baseline, scoped, denied, report })) {
  await writeFile(resolve(output, `${name}.json`), JSON.stringify(value, null, 2) + "\n");
}
console.log(`MCP ${report.protocol_version}; Ed25519 verified; receipts: ${report.receipt_operations.join(", ")}.`);
console.log(`PASS in ${report.elapsed_seconds.toFixed(2)}s. Evidence: ${output}`);
