import {
  canonicalStringify,
  cloneJson,
  containsForbiddenRawMaterial,
  deepFreeze,
  digestJson,
  finalizeCanonicalRecord,
  isPlainObject,
  nowIso,
  requireDate,
  requirePlainObject,
  secureEqualText,
  uniqueStrings,
  verifyCanonicalRecord,
} from "./canonical.mjs";
import { fail } from "./errors.mjs";
import { isValidPurposeCode, verifyPolicyDecision } from "./policy.mjs";
import { createOperationReceipt } from "./receipt-log.mjs";

const SPEC_VERSION = "context-layer/0.2-draft";
const BUNDLE_PREFIX = "urn:cl:bundle:";

export async function issueScopedBundle({
  request,
  decision,
  claims,
  issuer = { id: "urn:cl:bundle-issuer:local" },
  bundleAuthority,
  receiptStore = null,
  clock = () => new Date(),
} = {}) {
  requirePlainObject(request, "request");
  requirePlainObject(decision, "decision");
  if (!Array.isArray(claims)) fail("INVALID_CLAIMS", "claims must be an array");
  requireSigningAuthority(bundleAuthority);
  verifyPolicyDecision(decision, { request });
  if (decision.decision !== "allow" && decision.decision !== "allow_with_reductions") {
    fail("DECISION_DOES_NOT_AUTHORIZE_BUNDLE", "policy decision does not authorize bundle issuance");
  }

  const issuedAt = nowIso(clock);
  const issuedTimestamp = Date.parse(issuedAt);
  const requestExpiry = requireDate(request.expires_at, "request.expires_at");
  const decisionExpiry = requireDate(decision.expires_at, "decision.expires_at");
  const retentionSeconds = decision.retention?.max_seconds;
  if (!Number.isSafeInteger(retentionSeconds) || retentionSeconds <= 0) {
    fail("INVALID_DECISION_RETENTION", "decision retention must be a positive number of seconds");
  }
  const expiry = Math.min(
    requestExpiry,
    decisionExpiry,
    issuedTimestamp + retentionSeconds * 1000,
  );
  if (expiry <= issuedTimestamp) fail("BUNDLE_AUTHORIZATION_EXPIRED", "bundle authorization has expired");

  const receiptRequired = decision.receipt_requirement?.required === true;
  if (receiptRequired) await requireReceiptPreflight(receiptStore);

  const grantedPredicates = new Set(
    decision.granted_selectors.map((selector) => selector.predicate),
  );
  const transforms = parseTransforms(decision.transform_requirements ?? []);
  const provenance = {};
  const context = [];
  for (const candidate of claims) {
    requirePlainObject(candidate, "claim");
    if (typeof candidate.predicate !== "string" || !grantedPredicates.has(candidate.predicate)) continue;
    if (transforms.redacted.has(candidate.predicate)) continue;
    const handles = readProvenance(candidate);
    if (handles.length === 0) {
      fail("CLAIM_PROVENANCE_REQUIRED", "every disclosed claim must preserve provenance");
    }
    const opaqueHandles = handles.map((handle) => {
      const digest = digestJson({ source: handle });
      const key = "prov_" + digest.slice("sha256:".length);
      provenance[key] = {
        kind: "opaque_vault_reference",
        ref: "urn:cl:provenance:" + digest.slice("sha256:".length),
      };
      return key;
    });
    const limit = transforms.truncation.get(candidate.predicate);
    const claimText = requiredString(candidate.claim, "claim.claim");
    const value = cloneJson(candidate.value);
    context.push({
      claim: transformText(claimText, limit, transforms.compressTaskFacts),
      predicate: candidate.predicate,
      value: transformValue(value, limit),
      confidence: normalizeConfidence(candidate.confidence),
      provenance_handles: [...new Set(opaqueHandles)].sort(),
    });
  }
  context.sort((left, right) => {
    const leftText = canonicalStringify(left);
    const rightText = canonicalStringify(right);
    return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
  });
  if (context.length === 0) fail("NO_CONTEXT_GRANTED", "no approved claims were available for the bundle");

  const recipient = normalizeRecipient(request.recipient);
  const subjectAliasDigest = digestJson({
    subject_ref: request.subject_ref,
    request_ref: request.id,
    recipient,
  });
  const subjectAlias = "urn:cl:alias:" + subjectAliasDigest.slice("sha256:".length);
  const capabilities = uniqueStrings(decision.granted_actions, "decision.granted_actions").sort();
  const requiredOperations = [...new Set(["bundle.consume", ...capabilities])].sort();

  const bundle = finalizeCanonicalRecord({
    spec_version: SPEC_VERSION,
    type: "scoped_context_bundle",
    created_at: issuedAt,
    issuer: cloneJson(issuer),
    subject_alias: subjectAlias,
    request_ref: request.id,
    request_digest: decision.request_digest,
    decision_ref: decision.id,
    decision_digest: decision.integrity.digest,
    policy_snapshot: cloneJson(decision.policy_snapshot),
    recipient,
    purpose_code: requiredString(request.purpose_code, "request.purpose_code"),
    ...(Object.hasOwn(request, "purpose") ? { purpose: cloneJson(request.purpose) } : {}),
    task: normalizeTask(request.task),
    issued_at: issuedAt,
    expires_at: new Date(expiry).toISOString(),
    single_use: true,
    context,
    provenance,
    instructions: uniqueStrings(decision.bundle_instructions ?? [], "decision.bundle_instructions"),
    capabilities,
    restrictions: {
      onward_disclosure: decision.onward_disclosure,
      memory_write: "proposal_only",
      raw_vault_resolution: "forbidden",
      retention_seconds: decision.retention.max_seconds,
    },
    retention: cloneJson(decision.retention),
    receipt_contract: {
      required: receiptRequired,
      required_operations: requiredOperations,
    },
  }, BUNDLE_PREFIX);

  validateScopedBundle(bundle, { clock, enforceExpiry: true });
  let authentication;
  try {
    authentication = await bundleAuthority.sign(bundle);
  } catch {
    fail("BUNDLE_AUTHENTICATION_FAILED", "bundle authority could not authenticate the issued bundle");
  }
  if (
    !isPlainObject(authentication)
    || authentication.algorithm !== "Ed25519"
    || authentication.kid !== bundleAuthority.kid
    || typeof authentication.sig !== "string"
    || !/^[A-Za-z0-9_-]{86}$/.test(authentication.sig)
    || Object.keys(authentication).some((key) =>
      !["algorithm", "kid", "sig"].includes(key))
  ) {
    fail("INVALID_BUNDLE_AUTHENTICATION", "bundle authority returned malformed authentication");
  }
  const authenticatedEnvelope = deepFreeze({
    envelope_version: 1,
    bundle,
    authentication: cloneJson(authentication),
  });
  validateAuthenticatedBundleEnvelope(authenticatedEnvelope, {
    clock,
    enforceExpiry: true,
  });
  if (receiptRequired) {
    const receipt = createOperationReceipt({
      operation: "bundle.issue",
      actor: requiredString(issuer.id, "issuer.id"),
      subjectRef: subjectAlias,
      requestRef: request.id,
      decisionRef: decision.id,
      bundleRef: bundle.id,
      outcome: "success",
      policySnapshot: decision.policy_snapshot.digest,
      inputDigest: decision.integrity.digest,
      outputDigest: bundle.integrity.digest,
      userSummary: "Issued a recipient-bound scoped context bundle.",
      clock,
    });
    try {
      await receiptStore.append(receipt);
    } catch {
      fail("BUNDLE_RECEIPT_PERSIST_FAILED", "bundle issuance receipt could not be made durable");
    }
  }
  return authenticatedEnvelope;
}

export function validateScopedBundle(bundle, {
  recipient = null,
  clock = () => new Date(),
  enforceExpiry = true,
} = {}) {
  requirePlainObject(bundle, "bundle");
  verifyCanonicalRecord(bundle, BUNDLE_PREFIX);
  if (bundle.spec_version !== SPEC_VERSION || bundle.type !== "scoped_context_bundle") {
    fail("INVALID_BUNDLE", "bundle type or version is unsupported");
  }
  if (!Array.isArray(bundle.context) || !Array.isArray(bundle.capabilities)) {
    fail("INVALID_BUNDLE", "bundle context and capabilities must be arrays");
  }
  if (!isValidPurposeCode(bundle.purpose_code)) {
    fail("INVALID_BUNDLE_PURPOSE_CODE", "bundle purpose_code is not registered or namespaced");
  }
  if (
    Object.hasOwn(bundle, "purpose")
    && (
      typeof bundle.purpose !== "string"
      || bundle.purpose.length < 3
      || bundle.purpose.length > 240
    )
  ) {
    fail("INVALID_BUNDLE_PURPOSE", "bundle purpose must be an informative string when present");
  }
  normalizeTask(bundle.task);
  if (bundle.single_use !== true) fail("INVALID_BUNDLE", "local-core bundles must be single use");
  if (
    bundle.restrictions?.raw_vault_resolution !== "forbidden"
    || bundle.restrictions?.memory_write !== "proposal_only"
    || bundle.restrictions?.retention_seconds !== bundle.retention?.max_seconds
  ) {
    fail("INVALID_BUNDLE_RESTRICTIONS", "bundle restrictions do not preserve the local trust boundary");
  }
  if (containsForbiddenRawMaterial(bundle)) {
    fail("BUNDLE_CONTAINS_FORBIDDEN_MATERIAL", "bundle contains raw vault material or a secret field");
  }
  const expiry = requireDate(bundle.expires_at, "bundle.expires_at");
  if (enforceExpiry && expiry <= Date.parse(nowIso(clock))) {
    fail("BUNDLE_EXPIRED", "bundle has expired");
  }
  if (typeof bundle.recipient !== "string" || bundle.recipient.length === 0) {
    fail("INVALID_BUNDLE_RECIPIENT", "bundle recipient must be a principal identifier");
  }
  if (recipient !== null && !secureEqualText(bundle.recipient, recipient)) {
    fail("BUNDLE_RECIPIENT_MISMATCH", "bundle is addressed to another recipient");
  }
  const provenanceKeys = new Set(Object.keys(bundle.provenance ?? {}));
  for (const entry of bundle.context) {
    requirePlainObject(entry, "bundle context entry");
    if (
      !Array.isArray(entry.provenance_handles)
      || entry.provenance_handles.length === 0
      || entry.provenance_handles.some((handle) => !provenanceKeys.has(handle))
    ) {
      fail("BUNDLE_PROVENANCE_INVALID", "bundle context entry has missing provenance");
    }
  }
  return true;
}

export function serializeScopedBundle(authenticatedEnvelope, {
  legacyHmac = false,
} = {}) {
  validateAuthenticatedBundleEnvelope(authenticatedEnvelope, { enforceExpiry: false, legacyHmac });
  return canonicalStringify(authenticatedEnvelope);
}

export function validateAuthenticatedBundleEnvelope(authenticatedEnvelope, {
  clock = () => new Date(),
  enforceExpiry = true,
  legacyHmac = false,
} = {}) {
  requirePlainObject(authenticatedEnvelope, "authenticated bundle envelope");
  if (
    authenticatedEnvelope.envelope_version !== 1
    || !isPlainObject(authenticatedEnvelope.bundle)
    || !isPlainObject(authenticatedEnvelope.authentication)
    || Object.keys(authenticatedEnvelope).some((key) =>
      !["envelope_version", "bundle", "authentication"].includes(key))
  ) {
    fail("INVALID_AUTHENTICATED_BUNDLE", "authenticated bundle envelope is malformed");
  }
  validateScopedBundle(authenticatedEnvelope.bundle, { clock, enforceExpiry });
  const authentication = authenticatedEnvelope.authentication;
  if (isEd25519BundleAuthentication(authentication)) {
    // current scheme: asymmetric issuer signature, independently verifiable.
  } else if (legacyHmac && isLegacyHmacBundleAuthentication(authentication)) {
    // retired shared-secret scheme: accepted only behind the explicit opt-in.
  } else {
    fail("INVALID_BUNDLE_AUTHENTICATION", "bundle authentication metadata is malformed");
  }
  if (containsForbiddenRawMaterial(authenticatedEnvelope)) {
    fail("BUNDLE_CONTAINS_FORBIDDEN_MATERIAL", "authenticated bundle contains forbidden material");
  }
  return true;
}

function isEd25519BundleAuthentication(authentication) {
  return (
    authentication.algorithm === "Ed25519"
    && typeof authentication.kid === "string"
    && authentication.kid.length > 0
    && typeof authentication.sig === "string"
    && /^[A-Za-z0-9_-]{86}$/.test(authentication.sig)
    && Object.keys(authentication).every((key) =>
      ["algorithm", "kid", "sig"].includes(key))
  );
}

function isLegacyHmacBundleAuthentication(authentication) {
  return (
    authentication.algorithm === "hmac-sha256"
    && typeof authentication.key_id === "string"
    && authentication.key_id.length > 0
    && typeof authentication.mac === "string"
    && /^[A-Za-z0-9_-]{43}$/.test(authentication.mac)
    && Object.keys(authentication).every((key) =>
      ["algorithm", "key_id", "mac"].includes(key))
  );
}

async function requireReceiptPreflight(receiptStore) {
  if (
    !receiptStore
    || typeof receiptStore.preflight !== "function"
    || typeof receiptStore.append !== "function"
  ) {
    fail("RECEIPT_STORE_UNAVAILABLE", "required receipt store is unavailable");
  }
  try {
    const result = await receiptStore.preflight();
    if (!isPlainObject(result) || result.ok !== true) throw new Error("unavailable");
  } catch {
    fail("RECEIPT_PREFLIGHT_FAILED", "required receipt store failed preflight");
  }
}

function parseTransforms(values) {
  if (
    !Array.isArray(values)
    || values.length > 64
    || new Set(values).size !== values.length
  ) {
    fail("UNSUPPORTED_TRANSFORM", "decision transform requirements must be a unique array of at most 64 entries");
  }
  const transforms = {
    redacted: new Set(),
    truncation: new Map(),
    compressTaskFacts: false,
  };
  for (const value of values) {
    let match;
    if ((match = /^redact:([a-z][a-z0-9]*(?:[._-][a-z0-9]+)*)$/.exec(value))) {
      transforms.redacted.add(match[1]);
    } else if ((match = /^truncate:([a-z][a-z0-9]*(?:[._-][a-z0-9]+)*):([1-9][0-9]*)$/.exec(value))) {
      const requestedLimit = Number(match[2]);
      const currentLimit = transforms.truncation.get(match[1]);
      transforms.truncation.set(
        match[1],
        currentLimit === undefined ? requestedLimit : Math.min(currentLimit, requestedLimit),
      );
    } else if (value === "compress:task-facts") {
      transforms.compressTaskFacts = true;
    } else {
      fail("UNSUPPORTED_TRANSFORM", "bundle issuer does not implement transform " + value);
    }
  }
  return transforms;
}

function readProvenance(candidate) {
  const values = candidate.provenance_refs ?? candidate.provenance_handles;
  return uniqueStrings(values ?? [], "claim.provenance_refs");
}

function transformText(value, limit, compress) {
  let result = compress ? value.replace(/\s+/g, " ").trim() : value;
  if (limit !== undefined) result = result.slice(0, limit);
  return result;
}

function transformValue(value, limit) {
  return typeof value === "string" && limit !== undefined ? value.slice(0, limit) : value;
}

function normalizeConfidence(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    fail("INVALID_CLAIM_CONFIDENCE", "claim confidence must be between zero and one");
  }
  return value;
}

function normalizeRecipient(recipient) {
  requirePlainObject(recipient, "request.recipient");
  requiredString(recipient.onward_disclosure, "request.recipient.onward_disclosure");
  return requiredString(recipient.principal, "request.recipient.principal");
}

function normalizeTask(task) {
  requirePlainObject(task, "task");
  const keys = Object.keys(task);
  if (
    keys.length !== 2
    || !keys.includes("kind")
    || !keys.includes("user_visible")
    || !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(task.kind)
    || typeof task.user_visible !== "boolean"
  ) {
    fail(
      "INVALID_TASK",
      "task must contain only a valid kind and boolean user_visible field",
    );
  }
  return {
    kind: task.kind,
    user_visible: task.user_visible,
  };
}

function requireSigningAuthority(authority) {
  if (
    !authority
    || authority.algorithm !== "Ed25519"
    || typeof authority.kid !== "string"
    || authority.kid.length === 0
    || typeof authority.sign !== "function"
  ) {
    fail("BUNDLE_AUTHORITY_REQUIRED", "bundle issuance requires an Ed25519 signing authority");
  }
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail("INVALID_STRING", label + " must be a non-empty string");
  return value;
}

export { BUNDLE_PREFIX as LOCAL_BUNDLE_ID_PREFIX };
