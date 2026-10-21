// Optional direct-host path. Requires an already installed/authenticated Codex CLI.
// No login, persistent MCP config, API key creation, or billing setup is performed.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TASK_PROMPT } from "./fixture.mjs";
const output = resolve(process.argv[2] ?? "outputs/codex-mcp-demo");
await mkdir(output, { recursive: true });
const server = fileURLToPath(new URL("./server.mjs", import.meta.url));
const status = { host: "codex exec", recorded_at: new Date().toISOString(), verified: false, runs: [] };
for (const mode of ["baseline", "scoped"]) {
  const args = ["exec", "--ephemeral", "--ignore-user-config", "--sandbox", "read-only", "--json",
    "-C", fileURLToPath(new URL("../../", import.meta.url)),
    "-c", "features.shell_tool=false", "-c", "features.apps=false", "-c", "features.in_app_browser=false",
    "-c", 'web_search="disabled"',
    "-c", `mcp_servers.context_demo.command=${JSON.stringify(process.execPath)}`,
    "-c", `mcp_servers.context_demo.args=${JSON.stringify([server, mode])}`,
    "-o", resolve(output, `${mode}-agenda.txt`), TASK_PROMPT];
  let stdout = "", stderr = "";
  const child = spawn("codex", args, { stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", chunk => { stdout += chunk; process.stdout.write(chunk); });
  child.stderr.on("data", chunk => { stderr += chunk; process.stderr.write(chunk); });
  const exit = await new Promise(done => {
    child.on("error", error => { stderr += error.message; done(1); });
    child.on("close", code => done(code ?? 1));
  });
  await writeFile(resolve(output, `${mode}-events.jsonl`), stdout);
  await writeFile(resolve(output, `${mode}-stderr.txt`), stderr);
  // A zero exit alone does not prove MCP use. Human review of actual tool events
  // and a model-generated agenda is required before marking direct-host success.
  status.runs.push({ mode, command: ["codex", ...args], exit_code: exit, review_required: true });
  if (exit !== 0) {
    status.blocker = stderr.trim();
    await writeFile(resolve(output, "status.json"), JSON.stringify(status, null, 2) + "\n");
    process.exitCode = exit; break;
  }
}
await writeFile(resolve(output, "status.json"), JSON.stringify(status, null, 2) + "\n");
