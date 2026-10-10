// Capture real command output, with explicit editorial pauses. Does not simulate
// commands or model output. Existing agent artifacts are labeled as recorded.
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = resolve(process.argv[2] ?? "outputs/mcp-walkthrough");
await mkdir(output, { recursive: true });
const start = performance.now();
const events = [];
let stage = "";
function capture(text, kind = "output") {
  events.push({ seconds: (performance.now() - start) / 1000, stage, kind, text });
  process.stdout.write(text);
}
function section(title) { stage = title; capture(title + "\n", "stage"); }
const pause = seconds => new Promise(done => setTimeout(done, seconds * 1000));
async function command(args) {
  capture("$ node " + args.map(arg => arg.startsWith(root) ? arg.slice(root.length) : arg).join(" ") + "\n", "command");
  const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", data => capture(data.toString()));
  child.stderr.on("data", data => capture(data.toString()));
  const code = await new Promise(done => child.on("close", done));
  capture("[observed exit code: " + code + "]\n");
  if (code !== 0) throw new Error("Recorded command failed");
}
section("01 / THE TASK");
capture("Prepare a three-bullet Atlas kickoff agenda.\nAll personal data is invented. Nothing is sent to another person.\n\nTwo independent model agents used a shell bridge to a real MCP tool.\nThe transport is real; native MCP host integration is not claimed.\n");
await pause(10);
section("02 / LIVE PROTOCOL RUN");
await command([resolve(root, "examples/mcp-agent-demo/protocol-demo.mjs"), resolve(output, "protocol")]);
await pause(15);
for (const mode of ["baseline", "scoped"]) {
  section(mode === "baseline" ? "03 / BEFORE: RECORDED AGENT RESULT" : "04 / AFTER: RECORDED AGENT RESULT");
  const dir = resolve(root, "docs/demo/evidence/agent-" + mode);
  const data = JSON.parse(await readFile(resolve(dir, "mcp-tool-call.json"), "utf8"));
  const provenance = JSON.parse(await readFile(resolve(dir, "provenance.json"), "utf8"));
  capture("Actual MCP payload: " + data.payload.disclosed_fields + " fields.\n");
  capture("Delivered: " + data.payload.context.map(item => item.predicate).join(", ") + "\n");
  if (mode === "scoped") capture("Personal sentinel values absent from the entire client trace.\n");
  capture("\nAgent-generated agenda, captured " + provenance.agenda_generated_at_utc + ":\n");
  capture(await readFile(resolve(dir, "agenda.txt"), "utf8"));
  capture("\nThe answer need not repeat private data for disclosure to have occurred.\n");
  await pause(mode === "baseline" ? 18 : 20);
}
section("05 / LIVE NEGATIVE + REGRESSION TESTS");
await command(["--test", resolve(root, "examples/mcp-agent-demo/demo.test.mjs")]);
await pause(12);
section("06 / WHAT THIS PROVES");
capture("Observed: real MCP stdio + actual model agents through a bridge.\nSame useful meeting facts; 6 fields before, 3 after.\n\nNot claimed: native host integration, provider deletion, remote identity,\nproduction security, or a general model-quality result.\n\nReproduce: examples/mcp-agent-demo/README.md\nEvidence: docs/demo/README.md\n");
await pause(10);
await writeFile(resolve(output, "terminal-recording.json"), JSON.stringify({
  captured_at: new Date().toISOString(), duration_seconds: (performance.now() - start) / 1000,
  recording_type: "actual timed stdout capture; model artifacts from earlier independently recorded agent sessions",
  events,
}, null, 2) + "\n");
