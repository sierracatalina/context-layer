import {
  cloneJson,
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

export const POLICY_STATES = Object.freeze([
  "allow",
  "allow_with_reductions",
  "deny",
  "needs_approval",
]);

const SPEC_VERSION = "context-layer/0.2-draft";
const DECISION_PREFIX = "urn:cl:decision:";
const REGISTERED_PURPOSE_CODES = new Set([
  "draft.response",
  "summarize.material",
  "retrieve.context",
  "plan.task",
  "execute.approved_action",
  "discover.minimum_reveal",
  "propose.memory_update",
]);
const EXTENSION_PURPOSE_CODE = /^x\.[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\.[a-z0-9]+(?:[._-][a-z0-9]+)*)+$/;

export async function evaluatePolicy({
  request,
  policy,
  approval = null,
  approvalVerifier = null,
  receiptStore = null,
  clock = () => new Date(),
} = {}) {
  requirePlainObject(request, "request");
  requirePlainObject(policy, "policy");

  const createdAt = nowIso(clock);
  const now = Date.parse(createdAt);
  const requestDigest = digestJson(request);
  const policyDigest = digestJson(policy);
  const requestedSelectors = readSelectors(request.selectors);
  const requestedActions = uniqueStrings(request.requested_actions ?? [], "request.requested_actions");
  const allowedSelectors = policyStringSet(policy, "allowed_selectors");
  const allowedPurposeCodes = policyPurposeSet(policy, "allowed_purpose_codes");
  const approvalSelectors = policyStringSet(policy, "approval_required_selectors", []);
  const allowedActions = policyStringSet(policy, "allowed_actions");
  const approvalActions = policyStringSet(policy, "approval_required_actions", []);
  assertDisjoint(allowedSelectors, approvalSelectors, "selector");
  assertDisjoint(allowedActions, approvalActions, "action");
  const hardReasons = [];
  const reasonCodes = [];

  if (request.spec_version !== SPEC_VERSION || request.type !== "context_request") {
    hardReasons.push("UNSUPPORTED_REQUEST");
  }
  if (typeof request.id !== "string" || request.id.length === 0) hardReasons.push("REQUEST_ID_MISSING");
  if (typeof request.subject_ref !== "string" || request.subject_ref.length === 0) hardReasons.push("SUBJECT_MISSING");

  const requester = request.requester;
  if (!requester || typeof requester.principal !== "string" || requester.principal.length === 0) {
    hardReasons.push("REQUESTER_UNAUTHENTICATED");
  } else {
    const method = requester.authenticated_by;
    if (typeof method !== "string" || method.length === 0 || /^(?:none|anonymous)$/i.test(method)) {
      hardReasons.push("REQUESTER_UNAUTHENTICATED");
    }
    requireAllowed(request.subject_ref, policyStringSet(policy, "allowed_subjects"), "SUBJECT_NOT_AUTHORIZED", hardReasons);
    requireAllowed(requester.principal, policyStringSet(policy, "allowed_requesters"), "REQUESTER_NOT_AUTHORIZED", hardReasons);
    requireAllowed(requester.client_instance, policyStringSet(policy, "allowed_clients"), "CLIENT_NOT_AUTHORIZED", hardReasons);
    if (policy.allowed_authentication_methods) {
      requireAllowed(method, policyStringSet(policy, "allowed_authentication_methods"), "AUTHENTICATION_METHOD_NOT_ALLOWED", hardReasons);
    }
  }

  const recipient = request.recipient;
  if (!recipient || typeof recipient.principal !== "string" || recipient.principal.length === 0) {
    hardReasons.push("RECIPIENT_AMBIGUOUS");
  } else {
    requireAllowed(recipient.principal, policyStringSet(policy, "allowed_recipients"), "RECIPIENT_NOT_AUTHORIZED", hardReasons);
    const onward = recipient.onward_disclosure;
    requireAllowed(
      onward,
      policyStringSet(policy, "allowed_onward_disclosure", ["forbidden"]),
      "ONWARD_DISCLOSURE_NOT_ALLOWED",
      hardReasons,
    );
  }

  const purposeCode = typeof request.purpose_code === "string" ? request.purpose_code : "";
  if (!purposeCode) {
    hardReasons.push("PURPOSE_CODE_MISSING");
  } else if (!isValidPurposeCode(purposeCode)) {
    hardReasons.push("PURPOSE_CODE_INVALID");
  } else {
    requireAllowed(
      purposeCode,
      allowedPurposeCodes,
      "PURPOSE_CODE_NOT_ALLOWED",
      hardReasons,
    );
  }
  if (
    Object.hasOwn(request, "purpose")
    && (
      typeof request.purpose !== "string"
      || request.purpose.length < 3
      || request.purpose.length > 240
    )
  ) {
    hardReasons.push("PURPOSE_INVALID");
  }

  const taskKind = request.task && request.task.kind;
  requireAllowed(taskKind, policyStringSet(policy, "allowed_tasks"), "TASK_NOT_ALLOWED", hardReasons);

  let requestExpiry = NaN;
  try {
    requestExpiry = requireDate(request.expires_at, "request.expires_at");
    if (requestExpiry <= now) hardReasons.push("REQUEST_EXPIRED");
  } catch {
    hardReasons.push("REQUEST_EXPIRY_INVALID");
  }

  const requestedRetention = normalizeRetention(request.retention, "request.retention");
  const maximumRetention = normalizeRetention(policy.maximum_retention, "policy.maximum_retention");
  if (requestedRetention.mode !== maximumRetention.mode) hardReasons.push("RETENTION_MODE_NOT_ALLOWED");
  if (policy.rate_limit_ok === false) hardReasons.push("RATE_LIMIT_EXCEEDED");
  if (policy.anomaly_state && policy.anomaly_state !== "normal") hardReasons.push("ANOMALY_STATE_BLOCKED");

  if (requestedSelectors.length === 0) hardReasons.push("SELECTORS_EMPTY");
  if (requestedActions.length === 0) hardReasons.push("ACTIONS_EMPTY");
  if (requestedSelectors.some((selector) => selector.predicate === "*")) hardReasons.push("SELECTOR_WILDCARD_NOT_ALLOWED");
  if (requestedActions.includes("*")) hardReasons.push("ACTION_WILDCARD_NOT_ALLOWED");

  const receiptRequirement = normalizeReceiptRequirement(
    request.receipt_requirement,
    policy.require_receipts === true,
  );
  const receiptPreflight = await runReceiptPreflight(receiptRequirement.required, receiptStore);
  if (receiptPreflight.status === "unavailable") hardReasons.push("RECEIPT_PREFLIGHT_FAILED");

  const ordinarySelectors = [];
  const gatedSelectors = [];
  const deniedSelectors = [];
  for (const selector of requestedSelectors) {
    if (allowedSelectors.has(selector.predicate)) ordinarySelectors.push(selector);
    else if (approvalSelectors.has(selector.predicate)) gatedSelectors.push(selector);
    else deniedSelectors.push(selector);
  }

  const ordinaryActions = [];
  const gatedActions = [];
  const deniedActions = [];
  for (const action of requestedActions) {
    if (allowedActions.has(action)) ordinaryActions.push(action);
    else if (approvalActions.has(action)) gatedActions.push(action);
    else deniedActions.push(action);
  }

  const approvalResult = await validateApproval({
    approval,
    approvalVerifier,
    requestDigest,
    policyDigest,
    now,
    gatedSelectors,
    gatedActions,
  });
  const grantedSelectors = [...ordinarySelectors];
  const grantedActions = [...ordinaryActions];
  if (approvalResult.valid) {
    grantedSelectors.push(...gatedSelectors);
    grantedActions.push(...gatedActions);
  }

  let state;
  if (hardReasons.length > 0) {
    state = "deny";
  } else if ((gatedSelectors.length > 0 || gatedActions.length > 0) && !approvalResult.valid) {
    state = "needs_approval";
    reasonCodes.push(approvalResult.reason);
  } else if (grantedSelectors.length === 0 || grantedActions.length === 0) {
    state = "deny";
    if (grantedSelectors.length === 0) hardReasons.push("NO_SELECTOR_GRANTED");
    if (grantedActions.length === 0) hardReasons.push("NO_ACTION_GRANTED");
  } else {
    const retentionReduced = requestedRetention.max_seconds > maximumRetention.max_seconds;
    const transformed = transformRequirements(policy, grantedSelectors).length > 0;
    state = deniedSelectors.length > 0
      || deniedActions.length > 0
      || retentionReduced
      || transformed
      ? "allow_with_reductions"
      : "allow";
  }

  if (state === "deny" || state === "needs_approval") {
    grantedSelectors.length = 0;
    grantedActions.length = 0;
  }

  if (state === "allow") reasonCodes.push("REQUEST_ALLOWED");
  if (state === "allow_with_reductions") reasonCodes.push("SCOPE_REDUCED");
  if (deniedSelectors.length > 0) reasonCodes.push("SELECTORS_WITHHELD");
  if (deniedActions.length > 0) reasonCodes.push("ACTIONS_WITHHELD");
  if (requestedRetention.max_seconds > maximumRetention.max_seconds) reasonCodes.push("RETENTION_REDUCED");
  reasonCodes.push(...hardReasons);

  const ttlSeconds = positiveInteger(policy.decision_ttl_seconds ?? 300, "policy.decision_ttl_seconds");
  const decisionExpiry = Number.isFinite(requestExpiry)
    ? Math.min(
        requestExpiry,
        now + ttlSeconds * 1000,
        approvalResult.expiresAt ?? Number.POSITIVE_INFINITY,
      )
    : now;
  const transforms = state === "allow" || state === "allow_with_reductions"
    ? transformRequirements(policy, grantedSelectors)
    : [];
  const authorizedRetention = {
    mode: maximumRetention.mode,
    max_seconds: Math.min(requestedRetention.max_seconds, maximumRetention.max_seconds),
  };
  const retention = state === "allow" || state === "allow_with_reductions"
    ? authorizedRetention
    : { mode: maximumRetention.mode, max_seconds: 0 };

  const decision = finalizeCanonicalRecord({
    spec_version: SPEC_VERSION,
    type: "policy_decision",
    created_at: createdAt,
    issuer: cloneJson(policy.issuer ?? { id: "urn:cl:policy-engine:local" }),
    request_ref: typeof request.id === "string" ? request.id : "urn:cl:request:invalid",
    request_digest: requestDigest,
    decision: state,
    policy_snapshot: {
      version: requiredString(policy.version, "policy.version"),
      digest: policyDigest,
    },
    granted_selectors: cloneJson(grantedSelectors),
    denied_selectors: cloneJson(
      state === "deny"
        ? requestedSelectors
        : [...deniedSelectors, ...gatedSelectors.filter(() => !approvalResult.valid)],
    ),
    granted_actions: [...grantedActions],
    denied_actions: state === "deny"
      ? [...requestedActions]
      : [...deniedActions, ...gatedActions.filter(() => !approvalResult.valid)],
    transform_requirements: transforms,
    bundle_instructions: policyInstructions(policy),
    retention,
    onward_disclosure: state === "allow" || state === "allow_with_reductions"
      ? request.recipient.onward_disclosure
      : "forbidden",
    receipt_requirement: receiptRequirement,
    receipt_preflight: receiptPreflight,
    approval_verification: approvalResult.verification,
    approval_binding: approvalResult.valid
      && approval
      && (gatedSelectors.length > 0 || gatedActions.length > 0)
      ? {
          approval_ref: approval.id,
          request_digest: requestDigest,
          policy_digest: policyDigest,
          expires_at: approval.expires_at,
        }
      : null,
    expires_at: new Date(decisionExpiry).toISOString(),
    reason_codes: [...new Set(reasonCodes)],
  }, DECISION_PREFIX);

  return deepFreeze(decision);
}

export function verifyPolicyDecision(decision, { request, policy } = {}) {
  verifyCanonicalRecord(decision, DECISION_PREFIX);
  if (decision.spec_version !== SPEC_VERSION || decision.type !== "policy_decision") {
    fail("INVALID_POLICY_DECISION", "policy decision type or version is unsupported");
  }
  if (!POLICY_STATES.includes(decision.decision)) {
    fail("INVALID_POLICY_DECISION", "policy decision state is unsupported");
  }
  requireDate(decision.expires_at, "decision.expires_at");
  if (request && !secureEqualText(decision.request_digest, digestJson(request))) {
    fail("DECISION_REQUEST_MISMATCH", "policy decision is not bound to this request");
  }
  if (policy && !secureEqualText(decision.policy_snapshot?.digest, digestJson(policy))) {
    fail("DECISION_POLICY_MISMATCH", "policy decision is not bound to this policy");
  }
  return true;
}

function readSelectors(value) {
  if (!Array.isArray(value)) fail("INVALID_SELECTORS", "request.selectors must be an array");
  return value.map((selector, index) => {
    requirePlainObject(selector, "request.selectors[" + index + "]");
    requiredString(selector.predicate, "request.selectors[" + index + "].predicate");
    if (Object.keys(selector).some((key) => key !== "predicate")) {
      fail("UNSUPPORTED_SELECTOR_FIELD", "local policy supports predicate-only selectors");
    }
    return cloneJson(selector);
  });
}

function policyStringSet(policy, key, fallback) {
  const value = policy[key] ?? fallback;
  if (!Array.isArray(value)) fail("INVALID_POLICY", "policy." + key + " must be an array");
  return new Set(uniqueStrings(value, "policy." + key));
}

function policyPurposeSet(policy, key) {
  const values = policyStringSet(policy, key);
  for (const value of values) {
    if (!isValidPurposeCode(value)) {
      fail("INVALID_POLICY_PURPOSE_CODE", "policy." + key + " contains an invalid purpose code");
    }
  }
  return values;
}

function requireAllowed(value, allowed, reason, reasons) {
  if (typeof value !== "string" || !allowed.has(value)) reasons.push(reason);
}

function assertDisjoint(ordinary, approval, label) {
  for (const value of ordinary) {
    if (approval.has(value)) {
      fail("AMBIGUOUS_POLICY_SCOPE", "policy lists " + label + " in both ordinary and approval-required scope");
    }
  }
}

function normalizeRetention(value, label) {
  requirePlainObject(value, label);
  const mode = requiredString(value.mode, label + ".mode");
  return { mode, max_seconds: positiveInteger(value.max_seconds, label + ".max_seconds") };
}

function normalizeReceiptRequirement(value, policyRequiresReceipt) {
  requirePlainObject(value, "request.receipt_requirement");
  return {
    level: requiredString(value.level, "request.receipt_requirement.level"),
    required: value.required === true || policyRequiresReceipt,
  };
}

async function runReceiptPreflight(required, receiptStore) {
  if (!required) return { required: false, status: "not_required" };
  if (!receiptStore || typeof receiptStore.preflight !== "function") {
    return { required: true, status: "unavailable" };
  }
  try {
    const result = await receiptStore.preflight();
    if (!isPlainObject(result) || result.ok !== true) {
      return { required: true, status: "unavailable" };
    }
    return { required: true, status: "available" };
  } catch {
    return { required: true, status: "unavailable" };
  }
}

async function validateApproval({
  approval,
  approvalVerifier,
  requestDigest,
  policyDigest,
  now,
  gatedSelectors,
  gatedActions,
}) {
  if (gatedSelectors.length === 0 && gatedActions.length === 0) {
    return { valid: true, reason: null, verification: "not_required" };
  }
  if (!approval || typeof approval !== "object") {
    return { valid: false, reason: "APPROVAL_REQUIRED", verification: "not_provided" };
  }
  if (
    typeof approval.id !== "string"
    || !secureEqualText(approval.request_digest, requestDigest)
    || !secureEqualText(approval.policy_digest, policyDigest)
  ) {
    return { valid: false, reason: "APPROVAL_BINDING_INVALID", verification: "binding_invalid" };
  }
  let expiry;
  try {
    expiry = requireDate(approval.expires_at, "approval.expires_at");
  } catch {
    return { valid: false, reason: "APPROVAL_EXPIRED", verification: "expired" };
  }
  if (expiry <= now) {
    return { valid: false, reason: "APPROVAL_EXPIRED", verification: "expired" };
  }
  const selectorGrants = new Set(Array.isArray(approval.granted_selectors) ? approval.granted_selectors : []);
  const actionGrants = new Set(Array.isArray(approval.granted_actions) ? approval.granted_actions : []);
  if (
    gatedSelectors.some((selector) => !selectorGrants.has(selector.predicate))
    || gatedActions.some((action) => !actionGrants.has(action))
  ) {
    return { valid: false, reason: "APPROVAL_SCOPE_INCOMPLETE", verification: "scope_incomplete" };
  }
  if (typeof approvalVerifier !== "function") {
    return { valid: false, reason: "APPROVAL_UNVERIFIED", verification: "verifier_missing" };
  }
  try {
    const verified = await approvalVerifier({
      approval: cloneJson(approval),
      request_digest: requestDigest,
      policy_digest: policyDigest,
    });
    if (verified !== true) {
      return { valid: false, reason: "APPROVAL_UNVERIFIED", verification: "rejected" };
    }
  } catch {
    return { valid: false, reason: "APPROVAL_UNVERIFIED", verification: "rejected" };
  }
  return { valid: true, reason: null, verification: "verified", expiresAt: expiry };
}

function transformRequirements(policy, selectors) {
  const mapping = policy.transforms ?? {};
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
    fail("INVALID_POLICY", "policy.transforms must be an object");
  }
  const transforms = [];
  for (const selector of selectors) {
    const entries = mapping[selector.predicate] ?? [];
    if (!Array.isArray(entries)) fail("INVALID_POLICY", "policy transform entries must be arrays");
    transforms.push(...uniqueStrings(entries, "policy.transforms." + selector.predicate));
  }
  return [...new Set(transforms)].sort();
}

function policyInstructions(policy) {
  const instructions = policy.bundle_instructions ?? [];
  return uniqueStrings(instructions, "policy.bundle_instructions");
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) fail("INVALID_POSITIVE_INTEGER", label + " must be a positive integer");
  return value;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail("INVALID_STRING", label + " must be a non-empty string");
  return value;
}

export { SPEC_VERSION as LOCAL_CORE_SPEC_VERSION };

export function isValidPurposeCode(value) {
  return typeof value === "string"
    && (REGISTERED_PURPOSE_CODES.has(value) || EXTENSION_PURPOSE_CODE.test(value));
}
