import test from "node:test";
import assert from "node:assert/strict";
import { callContext } from "./client.mjs";
import { createBoundary } from "./boundary.mjs";
import { ALLOWED, CLAIMS } from "./fixture.mjs";

test("official MCP client negotiates stdio and invokes discoverable tool", async () => {
  const result = await callContext("baseline");
  assert.equal(result.server.name, "context-layer-meeting-demo");
  assert.deepEqual(result.tools, ["get_meeting_context"]);
  assert.ok(result.protocol_version);
  for (const method of ["initialize", "notifications/initialized", "tools/list", "tools/call"]) {
    assert.ok(result.wire.some(item => item.message.method === method), method);
  }
  assert.equal(result.payload.disclosed_fields, 6);
  for (const claim of CLAIMS) assert.ok(JSON.stringify(result.payload).includes(claim.value));
});

test("scoped MCP payload removes unrelated values before the client receives them", async () => {
  const result = await callContext("scoped");
  assert.equal(result.payload.decision, "allow_with_reductions");
  assert.equal(result.payload.disclosed_fields, 3);
  assert.deepEqual(result.payload.context.map(item => item.predicate).sort(), [...ALLOWED].sort());
  for (const sentinel of ["SYNTHETIC_HEALTH_SENTINEL", "SYNTHETIC_FINANCE_SENTINEL", "SYNTHETIC_JOURNAL_SENTINEL"]) {
    assert.equal(JSON.stringify(result).includes(sentinel), false);
  }
  assert.equal(result.payload.signature_algorithm, "Ed25519");
  assert.deepEqual(result.payload.receipts.map(receipt => receipt.operation), ["bundle.issue", "bundle.consume", "context.disclose"]);
  assert.ok(result.payload.receipts.every(receipt => receipt.payload_included === false));
});

test("private-only selector is denied through actual MCP transport", async () => {
  const result = await callContext("scoped", ["private.journal"]);
  assert.equal(result.is_error, true);
  assert.equal(result.payload.decision, "deny");
  assert.deepEqual(result.payload.context, []);
  assert.equal(JSON.stringify(result).includes("SYNTHETIC_JOURNAL_SENTINEL"), false);
});

test("agent-controlled selectors cannot override policy", async () => {
  const result = await callContext("scoped", ["meeting.goal", "finance.balance", "made.up"]);
  assert.equal(result.payload.disclosed_fields, 1);
  assert.deepEqual(result.payload.context.map(item => item.predicate), ["meeting.goal"]);
});

test("wildcard request fails closed", async () => {
  const result = await callContext("scoped", ["*"]);
  assert.equal(result.payload.decision, "deny");
  assert.equal(result.payload.disclosed_fields, 0);
});

test("verified bundle cannot be consumed twice", async () => {
  const boundary = await createBoundary();
  try {
    const result = await boundary.disclose();
    await assert.rejects(result.test.consumer.openBundle(result.test.serialized), { code: "BUNDLE_REPLAY" });
  } finally { await boundary.close(); }
});

test("changing signed context is rejected before reconsumption", async () => {
  const boundary = await createBoundary();
  try {
    const result = await boundary.disclose();
    const forged = JSON.parse(result.test.serialized);
    forged.bundle.context[0].value = "tampered";
    await assert.rejects(result.test.consumer.openBundle(JSON.stringify(forged)));
  } finally { await boundary.close(); }
});

test("expired session cannot perform another disclosure", async () => {
  let now = new Date("2026-10-09T00:00:00Z");
  const boundary = await createBoundary({ clock: () => now });
  try {
    const result = await boundary.disclose();
    now = new Date(now.getTime() + 301000);
    let called = false;
    await assert.rejects(result.test.session.execute("context.disclose", () => { called = true; }), { code: "BUNDLE_EXPIRED" });
    assert.equal(called, false);
  } finally { await boundary.close(); }
});
