import {
  cloneJson,
  containsForbiddenRawMaterial,
  deepFreeze,
  digestJson,
  digestText,
  finalizeCanonicalRecord,
  isPlainObject,
  nowIso,
  requireDate,
  requirePlainObject,
  secureEqualText,
  uniqueStrings,
  verifyCanonicalRecord,
} from "./canonical.mjs";
import {
  validateAuthenticatedBundleEnvelope,
  validateScopedBundle,
} from "./bundle.mjs";
import { LocalCoreError, fail } from "./errors.mjs";
import { createOperationReceipt } from "./receipt-log.mjs";

const SPEC_VERSION = "context-layer/0.2-draft";
const PROPOSAL_PREFIX = "urn:cl:proposal:";
const MAX_SERIALIZED_BUNDLE_BYTES = 2 * 1024 * 1024;

export async function createLocalAgentConsumer({
  principal,
  receiptLog,
  bundleVerifier,
  trustedKeyId,
  revocationProvider = null,
  clock = () => new Date(),
  legacyHmac = false,
} = {}) {
  requiredString(principal, "principal");
  requiredString(trustedKeyId, "trustedKeyId");
  requireBundleVerifier(bundleVerifier, trustedKeyId, { legacyHmac });
  requireReceiptLog(receiptLog);
  if (
    revocationProvider !== null
    && typeof revocationProvider !== "function"
    && typeof revocationProvider.isRevoked !== "function"
  ) {
    fail("INVALID_REVOCATION_PROVIDER", "revocation provider must be callable");
  }

  await requirePreflight(receiptLog);
  const consumedBundles = new Set();
  for (const receipt of await receiptLog.receipts()) {
    if (
      receipt.operation === "bundle.consume"
      && receipt.outcome === "success"
      && receipt.actor === principal
      && typeof receipt.bundle_ref === "string"
    ) {
      consumedBundles.add(receipt.bundle_ref);
    }
  }

  let openQueue = Promise.resolve();
  function serializeOpen(work) {
    const operation = openQueue.then(work, work);
    openQueue = operation.catch(() => undefined);
    return operation;
  }

  async function openBundle(serializedBundle) {
    return serializeOpen(async () => {
      if (typeof serializedBundle !== "string") {
        fail("SERIALIZED_BUNDLE_REQUIRED", "local agent accepts only a serialized bundle");
      }
      if (Buffer.byteLength(serializedBundle, "utf8") > MAX_SERIALIZED_BUNDLE_BYTES) {
        fail("BUNDLE_TOO_LARGE", "serialized bundle exceeds the local consumer limit");
      }
      let authenticatedEnvelope;
      try {
        authenticatedEnvelope = JSON.parse(serializedBundle);
      } catch {
        fail("INVALID_BUNDLE_JSON", "serialized bundle is not valid JSON");
      }
      validateAuthenticatedBundleEnvelope(authenticatedEnvelope, {
        clock,
        enforceExpiry: false,
        legacyHmac,
      });
      const authenticationKid = authenticatedEnvelope.authentication.kid
        ?? authenticatedEnvelope.authentication.key_id;
      if (!secureEqualText(authenticationKid, trustedKeyId)) {
        fail("UNTRUSTED_BUNDLE_AUTHORITY", "bundle was not authenticated by the trusted authority");
      }
      let authenticated = false;
      try {
        authenticated = await bundleVerifier.verify(
          authenticatedEnvelope.bundle,
          authenticatedEnvelope.authentication,
        );
      } catch {
        authenticated = false;
      }
      if (authenticated !== true) {
        fail("BUNDLE_AUTHENTICATION_FAILED", "bundle issuer authentication could not be verified");
      }
      const bundle = authenticatedEnvelope.bundle;
      validateScopedBundle(bundle, { recipient: principal, clock, enforceExpiry: true });
      await assertNotRevoked(revocationProvider, bundle);
      if (consumedBundles.has(bundle.id)) fail("BUNDLE_REPLAY", "single-use bundle was already consumed");
      await requirePreflight(receiptLog);

      const consumeReceipt = createOperationReceipt({
        operation: "bundle.consume",
        actor: principal,
        subjectRef: bundle.subject_alias,
        requestRef: bundle.request_ref,
        decisionRef: bundle.decision_ref,
        bundleRef: bundle.id,
        outcome: "success",
        policySnapshot: bundle.policy_snapshot.digest,
        inputDigest: bundle.integrity.digest,
        outputDigest: digestJson({ consumer: principal, state: "opened" }),
        userSummary: "Local agent opened an authorized scoped context bundle.",
        clock,
      });
      try {
        await receiptLog.append(consumeReceipt);
      } catch (error) {
        if (error instanceof LocalCoreError && error.code === "RECEIPT_REPLAY_CONFLICT") {
          fail("BUNDLE_REPLAY", "single-use bundle was already consumed");
        }
        fail("BUNDLE_CONSUME_RECEIPT_FAILED", "bundle consumption receipt could not be made durable");
      }
      consumedBundles.add(bundle.id);
      return createSession(deepFreeze(cloneJson(bundle)));
    });
  }

  function createSession(bundle) {
    async function assertActive() {
      if (requireDate(bundle.expires_at, "bundle.expires_at") <= Date.parse(nowIso(clock))) {
        fail("BUNDLE_EXPIRED", "bundle has expired");
      }
      await assertNotRevoked(revocationProvider, bundle);
    }

    async function execute(capability, handler) {
      requiredString(capability, "capability");
      if (!bundle.capabilities.includes(capability)) {
        fail("CAPABILITY_NOT_GRANTED", "bundle does not grant the requested capability");
      }
      if (!bundle.receipt_contract.required_operations.includes(capability)) {
        fail("CAPABILITY_RECEIPT_NOT_AUTHORIZED", "bundle receipt contract does not cover the capability");
      }
      if (typeof handler !== "function") fail("INVALID_ACTION_HANDLER", "action handler must be a function");
      await assertActive();
      await requirePreflight(receiptLog);
      const startedAt = nowIso(clock);
      const handlerInput = deepFreeze({
        subject_alias: bundle.subject_alias,
        purpose_code: bundle.purpose_code,
        ...(Object.hasOwn(bundle, "purpose") ? { purpose: cloneJson(bundle.purpose) } : {}),
        task: cloneJson(bundle.task),
        context: cloneJson(bundle.context),
        instructions: [...bundle.instructions],
        capability,
        expires_at: bundle.expires_at,
      });
      let result;
      try {
        result = await handler(handlerInput);
      } catch (error) {
        const failureReceipt = createOperationReceipt({
          operation: capability,
          actor: principal,
          subjectRef: bundle.subject_alias,
          requestRef: bundle.request_ref,
          decisionRef: bundle.decision_ref,
          bundleRef: bundle.id,
          startedAt,
          outcome: "failure",
          policySnapshot: bundle.policy_snapshot.digest,
          inputDigest: digestJson(handlerInput),
          outputDigest: digestJson({ error_type: safeErrorType(error) }),
          userSummary: "Authorized local-agent action failed.",
          metadata: { capability },
          clock,
        });
        try {
          await receiptLog.append(failureReceipt);
        } catch {
          fail("ACTION_FAILURE_RECEIPT_PERSIST_FAILED", "failed action could not be receipted");
        }
        throw new LocalCoreError(
          "ACTION_FAILED",
          "authorized local-agent action failed",
          { capability, bundle_ref: bundle.id },
        );
      }

      let outputDigest;
      try {
        outputDigest = digestResult(result);
      } catch {
        const indeterminateReceipt = createOperationReceipt({
          operation: capability,
          actor: principal,
          subjectRef: bundle.subject_alias,
          requestRef: bundle.request_ref,
          decisionRef: bundle.decision_ref,
          bundleRef: bundle.id,
          startedAt,
          outcome: "indeterminate",
          policySnapshot: bundle.policy_snapshot.digest,
          inputDigest: digestJson(handlerInput),
          outputDigest: digestJson({
            state: "indeterminate",
            reason: "output_not_serializable",
          }),
          userSummary: "Authorized local-agent action completed with an indeterminate durable outcome.",
          metadata: { capability, reason: "output_not_serializable" },
          clock,
        });
        let receiptPersisted = false;
        try {
          await receiptLog.append(indeterminateReceipt);
          receiptPersisted = true;
        } catch {
          receiptPersisted = false;
        }
        throw new LocalCoreError(
          "INDETERMINATE_OUTCOME",
          "action succeeded but its output could not be represented for a completion receipt",
          { capability, bundle_ref: bundle.id, receipt_persisted: receiptPersisted },
        );
      }
      const successReceipt = createOperationReceipt({
        operation: capability,
        actor: principal,
        subjectRef: bundle.subject_alias,
        requestRef: bundle.request_ref,
        decisionRef: bundle.decision_ref,
        bundleRef: bundle.id,
        startedAt,
        outcome: "success",
        policySnapshot: bundle.policy_snapshot.digest,
        inputDigest: digestJson(handlerInput),
        outputDigest,
        userSummary: "Authorized local-agent action completed.",
        metadata: { capability },
        clock,
      });
      try {
        await receiptLog.append(successReceipt);
      } catch {
        throw new LocalCoreError(
          "INDETERMINATE_OUTCOME",
          "action succeeded but its completion receipt could not be made durable",
          { capability, bundle_ref: bundle.id },
        );
      }
      return result;
    }

    async function readContext() {
      await assertActive();
      return deepFreeze({
        subject_alias: bundle.subject_alias,
        purpose_code: bundle.purpose_code,
        ...(Object.hasOwn(bundle, "purpose") ? { purpose: cloneJson(bundle.purpose) } : {}),
        task: cloneJson(bundle.task),
        context: cloneJson(bundle.context),
        instructions: [...bundle.instructions],
        capabilities: [...bundle.capabilities],
        expires_at: bundle.expires_at,
      });
    }

    async function proposeMemoryUpdate({
      operation = "add_or_contradict",
      proposedClaims,
      provenanceHandles = [],
      rationale,
    } = {}) {
      if (!bundle.capabilities.includes("memory.propose")) {
        fail("CAPABILITY_NOT_GRANTED", "bundle does not grant memory proposal capability");
      }
      await assertActive();
      await requirePreflight(receiptLog);
      if (!["add", "add_or_contradict", "retract"].includes(operation)) {
        fail("INVALID_MEMORY_OPERATION", "memory proposal operation is unsupported");
      }
      if (!Array.isArray(proposedClaims) || proposedClaims.length === 0) {
        fail("PROPOSED_CLAIMS_REQUIRED", "memory proposal requires at least one candidate claim");
      }
      const proposed = proposedClaims.map((claim, index) => {
        requirePlainObject(claim, "proposedClaims[" + index + "]");
        return cloneJson(claim);
      });
      const handles = uniqueStrings(provenanceHandles, "provenanceHandles");
      const provenanceRefs = handles.map((handle) => {
        const record = bundle.provenance[handle];
        if (!record || typeof record.ref !== "string") {
          fail("UNKNOWN_PROVENANCE_HANDLE", "memory proposal references unknown provenance");
        }
        return record.ref;
      });
      const createdAt = nowIso(clock);
      const proposal = finalizeCanonicalRecord({
        spec_version: SPEC_VERSION,
        type: "memory_update_proposal",
        created_at: createdAt,
        issuer: { id: principal },
        subject_ref: bundle.subject_alias,
        bundle_ref: bundle.id,
        operation,
        proposed_claims: proposed,
        provenance_refs: provenanceRefs,
        rationale: requiredString(rationale, "rationale"),
        submitted_by: principal,
        status: "pending_validation",
        approval_requirement: provenanceRefs.length === 0
          ? ["source_required", "user_confirm"]
          : ["user_confirm"],
        expires_at: bundle.expires_at,
      }, PROPOSAL_PREFIX);
      validateMemoryUpdateProposal(proposal);
      const receipt = createOperationReceipt({
        operation: "memory.propose",
        actor: principal,
        subjectRef: bundle.subject_alias,
        requestRef: bundle.request_ref,
        decisionRef: bundle.decision_ref,
        bundleRef: bundle.id,
        outcome: "success",
        policySnapshot: bundle.policy_snapshot.digest,
        inputDigest: digestJson({ operation, proposed_claim_count: proposed.length }),
        outputDigest: proposal.integrity.digest,
        userSummary: "Created a pending memory update proposal for review.",
        metadata: { proposal_ref: proposal.id, status: "pending_validation" },
        clock,
      });
      try {
        await receiptLog.append(receipt);
      } catch {
        fail("MEMORY_PROPOSAL_RECEIPT_FAILED", "memory proposal receipt could not be made durable");
      }
      return deepFreeze(proposal);
    }

    return Object.freeze({
      bundle_id: bundle.id,
      subject_alias: bundle.subject_alias,
      capabilities: deepFreeze([...bundle.capabilities]),
      expires_at: bundle.expires_at,
      readContext,
      execute,
      proposeMemoryUpdate,
    });
  }

  return Object.freeze({
    principal,
    openBundle,
  });
}

export function validateMemoryUpdateProposal(proposal) {
  requirePlainObject(proposal, "proposal");
  verifyCanonicalRecord(proposal, PROPOSAL_PREFIX);
  if (
    proposal.spec_version !== SPEC_VERSION
    || proposal.type !== "memory_update_proposal"
    || proposal.status !== "pending_validation"
  ) {
    fail("INVALID_MEMORY_PROPOSAL", "memory update must remain a pending proposal");
  }
  if (containsForbiddenRawMaterial(proposal)) {
    fail("MEMORY_PROPOSAL_CONTAINS_FORBIDDEN_MATERIAL", "memory proposal contains raw vault material");
  }
  if (!Array.isArray(proposal.approval_requirement) || !proposal.approval_requirement.includes("user_confirm")) {
    fail("MEMORY_PROPOSAL_APPROVAL_REQUIRED", "memory proposal must require user confirmation");
  }
  return true;
}

function requireReceiptLog(receiptLog) {
  if (
    !receiptLog
    || typeof receiptLog.preflight !== "function"
    || typeof receiptLog.append !== "function"
    || typeof receiptLog.receipts !== "function"
  ) {
    fail("RECEIPT_STORE_UNAVAILABLE", "local agent requires a durable receipt store");
  }
}

async function requirePreflight(receiptLog) {
  try {
    const status = await receiptLog.preflight();
    if (!isPlainObject(status) || status.ok !== true) throw new Error("unavailable");
  } catch {
    fail("RECEIPT_PREFLIGHT_FAILED", "required receipt store failed preflight");
  }
}

async function assertNotRevoked(provider, bundle) {
  if (provider === null) return;
  try {
    const revoked = typeof provider === "function"
      ? await provider({ bundleId: bundle.id, decisionId: bundle.decision_ref })
      : await provider.isRevoked({ bundleId: bundle.id, decisionId: bundle.decision_ref });
    if (revoked === true) fail("BUNDLE_REVOKED", "bundle has been revoked");
    if (revoked !== false) fail("REVOCATION_CHECK_FAILED", "bundle revocation status was malformed");
  } catch (error) {
    if (error instanceof LocalCoreError && error.code === "BUNDLE_REVOKED") throw error;
    fail("REVOCATION_CHECK_FAILED", "bundle revocation status could not be verified");
  }
}

function requireBundleVerifier(verifier, trustedKeyId, { legacyHmac = false } = {}) {
  const verifierKid = verifier?.kid ?? verifier?.key_id;
  const isEd25519 = (
    verifier
    && verifier.algorithm === "Ed25519"
    && typeof verifier.kid === "string"
    && typeof verifier.verify === "function"
  );
  const isLegacyHmac = (
    legacyHmac
    && verifier
    && verifier.algorithm === "hmac-sha256"
    && typeof verifier.key_id === "string"
    && typeof verifier.verify === "function"
  );
  if (!isEd25519 && !isLegacyHmac) {
    fail("BUNDLE_VERIFIER_REQUIRED", "local agent requires an Ed25519 bundle verifier");
  }
  if (!secureEqualText(verifierKid, trustedKeyId)) {
    fail("UNTRUSTED_BUNDLE_AUTHORITY", "bundle verifier does not match the trusted key ID");
  }
}

function digestResult(result) {
  if (result === undefined) return digestJson(null);
  if (result instanceof Uint8Array) return digestText(result);
  return digestJson(result);
}

function safeErrorType(error) {
  if (error && typeof error.name === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(error.name)) {
    return error.name;
  }
  return "Error";
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail("INVALID_STRING", label + " must be a non-empty string");
  return value;
}

export { MAX_SERIALIZED_BUNDLE_BYTES };
