import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Ajv2020 from "ajv-formats/node_modules/ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  ContextLayerReferenceError,
  assertNoSecretFields,
  decideContextRequest,
  digestValue,
  findSecretFields,
  issueScopedBundle,
  validateContextRequest,
  writeReceipt,
} from "../public/implementation/context-layer-reference.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const implementationRoot = join(projectRoot, "public", "implementation");

const fixture = await readJson("valid-exchange.json");
const invalidSecretReceipt = await readJson("invalid-secret-receipt.json");
const requestSchema = await readJson("context-request.schema.json");
const bundleSchema = await readJson("scoped-context-bundle.schema.json");
const receiptSchema = await readJson("receipt.schema.json");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateRequestSchema = ajv.compile(requestSchema);
const validateBundleSchema = ajv.compile(bundleSchema);
const validateReceiptSchema = ajv.compile(receiptSchema);

test("valid fixture request passes runtime and JSON Schema validation", () => {
  assert.deepEqual(validateContextRequest(fixture.request), {
    valid: true,
    errors: [],
  });
  assert.equal(validateRequestSchema(fixture.request), true, formatAjvErrors(validateRequestSchema));
});

test("request validation rejects unknown and secret-bearing fields", () => {
  const unknown = {
    ...fixture.request,
    ambient_access: true,
  };
  const unknownResult = validateContextRequest(unknown);
  assert.equal(unknownResult.valid, false);
  assert.match(unknownResult.errors.join("\n"), /ambient_access is not allowed/);

  const secretBearing = {
    ...fixture.request,
    requester: {
      ...fixture.request.requester,
      api_key: "synthetic-placeholder",
    },
  };
  const secretResult = validateContextRequest(secretBearing);
  assert.equal(secretResult.valid, false);
  assert.match(secretResult.errors.join("\n"), /forbidden secret-bearing fields/);
  assert.deepEqual(findSecretFields(secretBearing), ["$.requester.api_key"]);
});

test("policy evaluation deterministically grants, reduces, and denies", () => {
  const reduced = decideContextRequest(fixture.request, fixture.policy);
  const reducedAgain = decideContextRequest(fixture.request, fixture.policy);
  assert.deepEqual(reducedAgain, reduced);
  assert.equal(reduced.decision, fixture.expected.decision);
  assert.deepEqual(
    reduced.granted_selectors.map((selector) => selector.predicate),
    fixture.expected.granted_selectors,
  );
  assert.deepEqual(
    reduced.denied_selectors.map((selector) => selector.predicate),
    fixture.expected.denied_selectors,
  );
  assert.deepEqual(reduced.granted_actions, fixture.expected.granted_actions);
  assert.deepEqual(reduced.denied_actions, fixture.expected.denied_actions);
  assert.equal(reduced.retention.max_seconds, fixture.expected.retention_seconds);
  assert.equal(reduced.onward_disclosure, fixture.expected.onward_disclosure);

  const grantPolicy = {
    ...fixture.policy,
    id: "urn:cl:policy:grant-all",
    version: "grant-all/1",
    allowed_selectors: fixture.request.selectors.map((selector) => selector.predicate),
    denied_selectors: [],
    allowed_actions: [...fixture.request.requested_actions],
    max_retention_seconds: fixture.request.retention.max_seconds,
    allow_onward_disclosure: true,
    transform_requirements: [],
  };
  const granted = decideContextRequest(fixture.request, grantPolicy);
  assert.equal(granted.decision, "allow");
  assert.deepEqual(granted.reason_codes, ["REQUEST_ALLOWED"]);

  const denyPolicy = {
    ...fixture.policy,
    id: "urn:cl:policy:deny",
    version: "deny/1",
    allowed_selectors: ["unrelated_context"],
    denied_selectors: fixture.request.selectors.map((selector) => selector.predicate),
  };
  const denied = decideContextRequest(fixture.request, denyPolicy);
  assert.equal(denied.decision, "deny");
  assert.deepEqual(denied.granted_selectors, []);
  assert.equal(denied.retention.max_seconds, 0);
  assert.ok(denied.reason_codes.includes("NO_SELECTORS_GRANTED"));
});

test("bundle issuance includes only granted claims and opaque provenance", () => {
  const decision = decideContextRequest(fixture.request, fixture.policy);
  const args = {
    request: fixture.request,
    decision,
    claims: fixture.claims,
    issuer: fixture.issuer,
  };
  const bundle = issueScopedBundle(args);
  const bundleAgain = issueScopedBundle(args);

  assert.deepEqual(bundleAgain, bundle);
  assert.equal(validateBundleSchema(bundle), true, formatAjvErrors(validateBundleSchema));
  assert.deepEqual(
    bundle.context.map((claim) => claim.predicate),
    fixture.expected.granted_selectors,
  );
  assert.doesNotMatch(JSON.stringify(bundle), /budget_delta|synthetic restricted amount/);
  assert.doesNotMatch(JSON.stringify(bundle.provenance), /vault:\/\/subjects\/primary/);
  assert.equal(bundle.restrictions.raw_vault_resolution, "forbidden");
  assert.equal(bundle.restrictions.memory_write, "proposal_only");
});

test("bundle issuance rejects secret fields before disclosure filtering", () => {
  const decision = decideContextRequest(fixture.request, fixture.policy);
  const unsafeClaims = fixture.claims.map((claim) => ({ ...claim }));
  unsafeClaims[0].api_key = "synthetic-placeholder";

  assert.throws(
    () => issueScopedBundle({
      request: fixture.request,
      decision,
      claims: unsafeClaims,
      issuer: fixture.issuer,
    }),
    (error) => error instanceof ContextLayerReferenceError
      && error.code === "SECRET_FIELD_REJECTED",
  );
});

test("receipts are deterministic, schema-valid, and payload-minimized", () => {
  const decision = decideContextRequest(fixture.request, fixture.policy);
  const bundle = issueScopedBundle({
    request: fixture.request,
    decision,
    claims: fixture.claims,
    issuer: fixture.issuer,
  });
  const args = {
    operation: "bundle.issue",
    request: fixture.request,
    decision,
    bundle,
  };
  const receipt = writeReceipt(args);
  const receiptAgain = writeReceipt(args);
  const serialized = JSON.stringify(receipt);

  assert.deepEqual(receiptAgain, receipt);
  assert.equal(validateReceiptSchema(receipt), true, formatAjvErrors(validateReceiptSchema));
  assert.equal(receipt.payload_included, false);
  assert.doesNotMatch(serialized, /requested_delivery_date|budget_delta|2026-08-14|launch lead/);
  assert.match(receipt.input_digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(receipt.output_digest, /^sha256:[0-9a-f]{64}$/);
});

test("invalid receipt fixture fails schema and secret-field checks", () => {
  assert.equal(validateReceiptSchema(invalidSecretReceipt), false);
  assert.match(formatAjvErrors(validateReceiptSchema), /additionalProperties/);
  assert.deepEqual(findSecretFields(invalidSecretReceipt), ["$.authorization"]);
  assert.throws(
    () => assertNoSecretFields(invalidSecretReceipt, "invalid fixture"),
    (error) => error instanceof ContextLayerReferenceError
      && error.code === "SECRET_FIELD_REJECTED",
  );
});

test("dependency-free digest implementation matches Node SHA-256", () => {
  const expected = createHash("sha256").update(JSON.stringify("abc")).digest("hex");
  assert.equal(digestValue("abc"), "sha256:" + expected);
});

async function readJson(filename) {
  return JSON.parse(await readFile(join(implementationRoot, filename), "utf8"));
}

function formatAjvErrors(validate) {
  return JSON.stringify(validate.errors || [], null, 2);
}
