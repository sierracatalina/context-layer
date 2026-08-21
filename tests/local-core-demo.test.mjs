import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";

const DEMO_PATH = fileURLToPath(new URL("../examples/local-core-demo.mjs", import.meta.url));
const PRIVATE_SENTINEL = "SYNTHETIC_DEMO_SENTINEL";

function runDemo() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [DEMO_PATH],
      {
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        timeout: 20_000,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

test("synthetic demo runs end to end and emits only its minimized summary", async () => {
  const before = new Set(
    (await readdir(tmpdir())).filter((name) => name.startsWith("context-layer-synthetic-demo-")),
  );
  const { stdout, stderr } = await runDemo();
  const after = new Set(
    (await readdir(tmpdir())).filter((name) => name.startsWith("context-layer-synthetic-demo-")),
  );
  assert.deepEqual(after, before);
  assert.equal(stderr, "");
  const lines = stdout.trimEnd().split(/\r?\n/);
  assert.equal(lines.length, 1);
  const summary = JSON.parse(lines[0]);

  assert.deepEqual(summary, {
    demo: "context-layer-local-core-synthetic",
    synthetic: true,
    spec_version: "context-layer/0.2-draft",
    policy_states_observed: [
      "allow",
      "allow_with_reductions",
      "needs_approval",
      "deny",
    ],
    authenticated_approval_state: "allow",
    encrypted_at_rest: true,
    captured_claim_count: 1,
    bundle_context_count: 1,
    capability_count: 2,
    envelope_authenticated: true,
    handler_context_count: 1,
    action_completed: true,
    memory_proposal_status: "pending_validation",
    receipt_count: 4,
    receipt_anchor_authenticated: true,
    raw_vault_resolution: "forbidden",
  });

  for (const forbidden of [
    PRIVATE_SENTINEL,
    "approved context stays private",
    "vault://",
    "payload_ref",
    "original_path",
    "input_digest",
    "output_digest",
    "user_summary",
    "bundle_ref",
    "authentication",
    "key_id",
    "\"mac\"",
  ]) {
    assert.equal(stdout.includes(forbidden), false, forbidden);
  }
  assert.doesNotMatch(stdout, /(?:[A-Za-z]:[\\/]|\/(?:tmp|mnt|home|var)\/)/);
});
