import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Ajv2020 from "ajv-formats/node_modules/ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  canonicalStringify,
  containsForbiddenRawMaterial,
  createHmacBundleAuthority,
  createLocalAgentConsumer,
  createOperationReceipt,
  digestJson,
  evaluatePolicy,
  finalizeCanonicalRecord,
  isValidPurposeCode,
  issueScopedBundle,
  openReceiptLog,
  serializeScopedBundle,
  validateMemoryUpdateProposal as validateLocalMemoryUpdateProposal,
  validateScopedBundle,
  verifyCanonicalRecord,
} from "../packages/local-core/index.mjs";
import {
  digestValue,
  validateContextRequest,
  validateMemoryUpdateProposal as validatePublicMemoryUpdateProposal,
  validatePolicyDecision,
} from "../public/implementation/context-layer-reference.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const vectorRoot = join(projectRoot, "test-vectors", "v0.2");
const implementationRoot = join(projectRoot, "public", "implementation");

const manifest = await readVector("manifest.json");
const canonicalization = await readVector("canonicalization.json");
const policyVectors = await readVector("policy-cases.json");
const exchangeVectors = await readVector("exchange-security.json");
const receiptMemoryVectors = await readVector("receipt-memory-isolation.json");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateBundleSchema = ajv.compile(await readImplementation("scoped-context-bundle.schema.json"));
const validateDecisionSchema = ajv.compile(await readImplementation("policy-decision.schema.json"));
const validateMemorySchema = ajv.compile(await readImplementation("memory-update-proposal.schema.json"));
const validateReceiptSchema = ajv.compile(await readImplementation("receipt.schema.json"));

test("manifest binds every synthetic vector by content and coverage", async () => {
  assert.equal(manifest.spec_version, "context-layer/0.2-draft");
  assert.equal(manifest.classification, "synthetic-test-only");
  assert.equal(manifest.runner, "tests/test-vectors.test.mjs");

  const covered = new Set();
  for (const entry of manifest.files) {
    assert.equal(isAbsolute(entry.path), false);
    assert.doesNotMatch(entry.path, /(?:^|[\\/])\.\.(?:[\\/]|$)/);
    const source = await readFile(join(vectorRoot, entry.path));
    const digest = createHash("sha256").update(source).digest("hex");
    assert.equal(digest, entry.sha256, entry.path);
    const parsed = JSON.parse(source.toString("utf8"));
    assert.equal(parsed.classification, "synthetic-test-only", entry.path);
    for (const item of entry.coverage) covered.add(item);
  }

  assert.deepEqual(covered, new Set([
    "canonicalization",
    "digests",
    "purpose_code",
    "four_policy_states",
    "approval_authentication",
    "approval_expiry",
    "minimum_bundle_expiry",
    "hmac_tamper_rejection",
    "hmac_forgery_rejection",
    "raw_vault_isolation",
    "receipt_anchor_required",
    "receipt_rollback_rejection",
    "pending_memory_proposal",
    "direct_write_rejection",
  ]));
});

test("canonical JSON and digests agree across public and local runtimes", () => {
  for (const vector of canonicalization.cases) {
    assert.equal(canonicalStringify(vector.value), vector.expected_canonical_json, vector.id);
    assert.equal(digestJson(vector.value), vector.expected_digest, vector.id);
    assert.equal(digestValue(vector.value), vector.expected_digest, vector.id);
  }

  const vector = canonicalization.record_case;
  const record = finalizeCanonicalRecord(vector.unsigned, vector.id_prefix);
  assert.equal(canonicalStringify(vector.unsigned), vector.expected_canonical_json);
  assert.equal(record.id, vector.expected_id);
  assert.equal(record.integrity.digest, vector.expected_digest);
  assert.equal(verifyCanonicalRecord(record, vector.id_prefix), true);
});

test("purpose-code vectors distinguish registered, namespaced, and invalid codes", () => {
  for (const vector of policyVectors.purpose_code_cases) {
    assert.equal(
      isValidPurposeCode(vector.code),
      vector.expected_syntax_valid,
      String(vector.code),
    );
    const request = clone(policyVectors.base_request);
    request.purpose_code = vector.code;
    assert.equal(
      validateContextRequest(request).valid,
      vector.expected_syntax_valid,
      String(vector.code),
    );
  }
});

test("policy vectors produce all four states with fail-closed grants", async () => {
  const seen = new Set();
  for (const vector of policyVectors.state_cases) {
    const request = applyPatch(policyVectors.base_request, vector.request_patch);
    const decision = await evaluatePolicy({
      request,
      policy: policyVectors.base_policy,
      clock: fixedClock(policyVectors.fixed_time),
    });
    seen.add(decision.decision);
    assert.equal(decision.decision, vector.expected.decision, vector.id);
    assert.deepEqual(decision.reason_codes, vector.expected.reason_codes, vector.id);
    assert.equal(decision.retention.max_seconds, vector.expected.retention_seconds, vector.id);
    assert.equal(
      decision.approval_verification,
      vector.expected.approval_verification,
      vector.id,
    );
    assert.equal(validateDecisionSchema(decision), true, formatAjvErrors(validateDecisionSchema));
    assert.deepEqual(validatePolicyDecision(decision), { valid: true, errors: [] });
    if (["deny", "needs_approval"].includes(decision.decision)) {
      assert.deepEqual(decision.granted_selectors, [], vector.id);
      assert.deepEqual(decision.granted_actions, [], vector.id);
      assert.equal(decision.retention.max_seconds, 0, vector.id);
    }
  }
  assert.deepEqual(seen, new Set([
    "allow",
    "allow_with_reductions",
    "needs_approval",
    "deny",
  ]));
});

test("approval vectors require an authenticated binding and reject expiry", async () => {
  const request = applyPatch(
    policyVectors.base_request,
    policyVectors.approval.request_patch,
  );
  const policy = policyVectors.base_policy;
  const requestDigest = digestJson(request);
  const policyDigest = digestJson(policy);

  for (const vector of policyVectors.approval.cases) {
    const expiresAt = vector.mode === "expired"
      ? policyVectors.approval.expired_candidate_expires_at
      : policyVectors.approval.candidate.expires_at;
    const approval = {
      ...clone(policyVectors.approval.candidate),
      request_digest: requestDigest,
      policy_digest: policyDigest,
      expires_at: expiresAt,
    };
    const approvalVerifier = vector.mode === "authenticated"
      ? async ({ approval: supplied, request_digest, policy_digest }) =>
        supplied.id === approval.id
        && request_digest === requestDigest
        && policy_digest === policyDigest
      : null;
    const decision = await evaluatePolicy({
      request,
      policy,
      approval,
      approvalVerifier,
      clock: fixedClock(policyVectors.fixed_time),
    });

    assert.equal(decision.decision, vector.expected_decision, vector.id);
    assert.ok(decision.reason_codes.includes(vector.expected_reason), vector.id);
    assert.equal(decision.approval_verification, vector.expected_verification, vector.id);
    assert.equal(validateDecisionSchema(decision), true, formatAjvErrors(validateDecisionSchema));
    assert.deepEqual(validatePolicyDecision(decision), { valid: true, errors: [] });
    if (vector.expected_expires_at) {
      assert.equal(decision.expires_at, vector.expected_expires_at, vector.id);
      assert.equal(decision.approval_binding.request_digest, requestDigest, vector.id);
      assert.equal(decision.approval_binding.policy_digest, policyDigest, vector.id);
    } else {
      assert.equal(decision.approval_binding, null, vector.id);
    }
  }
});

test("bundle vectors enforce minimum expiry, HMAC authenticity, and raw-vault isolation", async (t) => {
  const exchange = await createExchange();
  t.after(() => exchange.authority.close());
  const { decision, envelope, receiptStore } = exchange;
  const expected = exchangeVectors.expected;

  assert.equal(decision.decision, expected.decision);
  assert.equal(envelope.bundle.expires_at, expected.bundle_expires_at);
  assert.equal(envelope.envelope_version, expected.envelope_version);
  assert.equal(envelope.authentication.algorithm, expected.authentication_algorithm);
  assert.equal(validateBundleSchema(envelope.bundle), true, formatAjvErrors(validateBundleSchema));

  const innerWithAuthentication = {
    ...clone(envelope.bundle),
    authentication: clone(envelope.authentication),
  };
  assert.equal(validateBundleSchema(innerWithAuthentication), false);
  assert.equal(expected.inner_bundle_rejects_authentication, true);

  const serialized = serializeScopedBundle(envelope);
  for (const fragment of expected.forbidden_serialized_fragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }

  const consumer = await createLocalAgentConsumer({
    principal: exchangeVectors.request.recipient.principal,
    receiptLog: receiptStore,
    bundleVerifier: exchange.authority.createVerifier(),
    trustedKeyId: exchange.authority.key_id,
    clock: fixedClock(exchangeVectors.fixed_time),
  });

  const tampered = clone(envelope);
  tampered.bundle.context[0].value = "SYNTHETIC_TEST_ONLY_TAMPERED_VALUE";
  await assert.rejects(
    consumer.openBundle(JSON.stringify(tampered)),
    hasCode(expected.tampered_record_error),
  );

  const forgedUnsigned = unsignedRecord(envelope.bundle);
  forgedUnsigned.capabilities = [...forgedUnsigned.capabilities, "email.send"].sort();
  forgedUnsigned.receipt_contract.required_operations = [
    ...forgedUnsigned.receipt_contract.required_operations,
    "email.send",
  ].sort();
  const forgedBundle = finalizeCanonicalRecord(forgedUnsigned, "urn:cl:bundle:");
  const forgedEnvelope = {
    ...clone(envelope),
    bundle: forgedBundle,
  };
  await assert.rejects(
    consumer.openBundle(serializeScopedBundle(forgedEnvelope)),
    hasCode(expected.forged_capability_error),
  );

  const forgedMac = clone(envelope);
  forgedMac.authentication.mac = "A".repeat(43);
  await assert.rejects(
    consumer.openBundle(serializeScopedBundle(forgedMac)),
    hasCode(expected.forged_mac_error),
  );

  const rawUnsigned = unsignedRecord(envelope.bundle);
  rawUnsigned.raw_vault_object = {
    ref: "vault://synthetic-test-only/objects/forbidden",
  };
  const rawBundle = finalizeCanonicalRecord(rawUnsigned, "urn:cl:bundle:");
  assert.equal(containsForbiddenRawMaterial(rawBundle), true);
  assert.throws(
    () => validateScopedBundle(rawBundle, { clock: fixedClock(exchangeVectors.fixed_time) }),
    hasCode(expected.raw_material_error),
  );
  assert.equal(validateBundleSchema(rawBundle), false);
});

test("receipt vectors require an anchor and detect authenticated rollback", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "context-layer-vector-receipts-"));
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "receipts.jsonl");
  const anchor = {
    filePath: join(directory, "receipt-anchor.jsonl"),
    key: Buffer.from(
      receiptMemoryVectors.synthetic_test_only_anchor_material_hex,
      "hex",
    ),
  };

  await assert.rejects(
    openReceiptLog({ filePath: join(directory, "unanchored.jsonl") }),
    hasCode(receiptMemoryVectors.expected.missing_anchor_error),
  );

  const log = await openReceiptLog({ filePath, anchor });
  for (const operation of receiptMemoryVectors.receipt_operations) {
    const receipt = createOperationReceipt({
      operation,
      actor: "urn:agent:synthetic-receipt-vector",
      subjectRef: "urn:cl:alias:synthetic-receipt-vector",
      outcome: "success",
      userSummary: "Synthetic test-only receipt vector.",
      clock: fixedClock(receiptMemoryVectors.fixed_time),
    });
    assert.equal(receipt.payload_included, receiptMemoryVectors.expected.payload_included);
    assert.equal(validateReceiptSchema(receipt), true, formatAjvErrors(validateReceiptSchema));
    await log.append(receipt);
  }
  await log.close();

  const lines = (await readFile(filePath, "utf8")).trimEnd().split("\n");
  assert.equal(lines.length, 2);
  await writeFile(filePath, lines[0] + "\n", "utf8");
  await assert.rejects(
    openReceiptLog({ filePath, anchor }),
    hasCode(receiptMemoryVectors.expected.rollback_error),
  );
});

test("memory vectors remain pending and reject every direct-write surface", async (t) => {
  const exchange = await createExchange();
  t.after(() => exchange.authority.close());
  const vector = receiptMemoryVectors.memory_proposal;
  const consumer = await createLocalAgentConsumer({
    principal: exchangeVectors.request.recipient.principal,
    receiptLog: exchange.receiptStore,
    bundleVerifier: exchange.authority.createVerifier(),
    trustedKeyId: exchange.authority.key_id,
    clock: fixedClock(exchangeVectors.fixed_time),
  });
  const session = await consumer.openBundle(serializeScopedBundle(exchange.envelope));
  const proposal = await session.proposeMemoryUpdate({
    operation: vector.operation,
    proposedClaims: clone(vector.proposed_claims),
    provenanceHandles: clone(vector.provenance_handles),
    rationale: vector.rationale,
  });

  assert.equal(proposal.status, vector.expected_status);
  assert.deepEqual(proposal.approval_requirement, vector.expected_approval_requirements);
  assert.equal(validateLocalMemoryUpdateProposal(proposal), true);
  assert.equal(validateMemorySchema(proposal), true, formatAjvErrors(validateMemorySchema));
  assert.deepEqual(validatePublicMemoryUpdateProposal(proposal), { valid: true, errors: [] });
  assert.equal(JSON.stringify(proposal).includes("vault://"), false);

  for (const member of vector.forbidden_session_members) {
    assert.equal(member in session, false, member);
    assert.equal(member in consumer, false, member);
  }

  const directWriteUnsigned = unsignedRecord(proposal);
  directWriteUnsigned[vector.direct_write_field] = {
    operation: "synthetic-test-only-commit-attempt",
  };
  const directWrite = finalizeCanonicalRecord(directWriteUnsigned, "urn:cl:proposal:");
  assert.equal(containsForbiddenRawMaterial(directWrite), true);
  assert.throws(
    () => validateLocalMemoryUpdateProposal(directWrite),
    hasCode(vector.expected_direct_write_error),
  );
  assert.equal(validateMemorySchema(directWrite), false);
  assert.equal(validatePublicMemoryUpdateProposal(directWrite).valid, false);
});

test("vector sources contain no private workstation path or unlabeled key material", async () => {
  for (const entry of manifest.files) {
    const source = await readFile(join(vectorRoot, entry.path), "utf8");
    assert.doesNotMatch(source, /(?:[A-Za-z]:\\|\/Users\/|\/home\/)/);
    if (source.includes("material_hex")) {
      assert.match(source, /synthetic_test_only_[a-z_]+_material_hex/);
    }
  }
  assert.equal(exchangeVectors.synthetic_test_only_hmac_material_hex.length, 64);
  assert.equal(receiptMemoryVectors.synthetic_test_only_anchor_material_hex.length, 64);
});

async function createExchange() {
  const receiptStore = memoryReceiptStore();
  const authority = await createHmacBundleAuthority({
    keyId: exchangeVectors.authority_key_id,
    keyProvider: async () => Buffer.from(
      exchangeVectors.synthetic_test_only_hmac_material_hex,
      "hex",
    ),
  });
  const clock = fixedClock(exchangeVectors.fixed_time);
  const decision = await evaluatePolicy({
    request: exchangeVectors.request,
    policy: exchangeVectors.policy,
    receiptStore,
    clock,
  });
  const envelope = await issueScopedBundle({
    request: exchangeVectors.request,
    decision,
    claims: exchangeVectors.claims,
    bundleAuthority: authority,
    receiptStore,
    clock,
  });
  return { authority, decision, envelope, receiptStore };
}

function memoryReceiptStore() {
  const records = [];
  return {
    records,
    async preflight() {
      return { ok: true, entries: records.length };
    },
    async append(receipt) {
      records.push(receipt);
      return { sequence: records.length };
    },
    async receipts() {
      return [...records];
    },
  };
}

function applyPatch(base, patch) {
  const value = clone(base);
  for (const [key, entry] of Object.entries(patch)) value[key] = clone(entry);
  return value;
}

function unsignedRecord(record) {
  const value = clone(record);
  delete value.id;
  delete value.integrity;
  return value;
}

function fixedClock(timestamp) {
  return () => new Date(timestamp);
}

function hasCode(code) {
  return (error) => error?.code === code;
}

function clone(value) {
  return structuredClone(value);
}

function formatAjvErrors(validate) {
  return JSON.stringify(validate.errors || [], null, 2);
}

async function readVector(filename) {
  return JSON.parse(await readFile(join(vectorRoot, filename), "utf8"));
}

async function readImplementation(filename) {
  return JSON.parse(await readFile(join(implementationRoot, filename), "utf8"));
}
