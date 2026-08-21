const SPEC_VERSION = "context-layer/0.2-draft";

const PURPOSE_CODES = Object.freeze([
  "draft.response",
  "summarize.material",
  "retrieve.context",
  "plan.task",
  "execute.approved_action",
  "discover.minimum_reveal",
  "propose.memory_update",
]);
const PURPOSE_CODE_SET = new Set(PURPOSE_CODES);

const REQUEST_KEYS = new Set([
  "spec_version",
  "type",
  "id",
  "created_at",
  "issuer",
  "subject_ref",
  "requester",
  "recipient",
  "purpose_code",
  "purpose",
  "task",
  "selectors",
  "requested_actions",
  "retention",
  "receipt_requirement",
  "expires_at",
]);

const POLICY_DECISION_KEYS = new Set([
  "spec_version",
  "type",
  "id",
  "created_at",
  "issuer",
  "request_ref",
  "request_digest",
  "decision",
  "policy_snapshot",
  "granted_selectors",
  "denied_selectors",
  "granted_actions",
  "denied_actions",
  "transform_requirements",
  "bundle_instructions",
  "retention",
  "onward_disclosure",
  "receipt_requirement",
  "receipt_preflight",
  "approval_verification",
  "approval_binding",
  "expires_at",
  "reason_codes",
  "integrity",
]);
const POLICY_DECISION_REQUIRED_KEYS = [
  "spec_version",
  "type",
  "id",
  "created_at",
  "issuer",
  "request_ref",
  "decision",
  "policy_snapshot",
  "granted_selectors",
  "denied_selectors",
  "granted_actions",
  "denied_actions",
  "transform_requirements",
  "retention",
  "onward_disclosure",
  "receipt_requirement",
  "expires_at",
  "reason_codes",
];

const MEMORY_UPDATE_PROPOSAL_KEYS = new Set([
  "spec_version",
  "type",
  "id",
  "created_at",
  "issuer",
  "subject_ref",
  "bundle_ref",
  "operation",
  "proposed_claims",
  "provenance_refs",
  "rationale",
  "submitted_by",
  "status",
  "approval_requirement",
  "expires_at",
  "integrity",
]);
const MEMORY_UPDATE_PROPOSAL_REQUIRED_KEYS = [
  "spec_version",
  "type",
  "id",
  "created_at",
  "issuer",
  "subject_ref",
  "operation",
  "proposed_claims",
  "provenance_refs",
  "rationale",
  "submitted_by",
  "status",
  "approval_requirement",
  "expires_at",
];

const SECRET_FIELD_NAMES = new Set([
  "accesstoken",
  "apikey",
  "authorization",
  "clientsecret",
  "cookie",
  "credential",
  "credentials",
  "password",
  "privatekey",
  "rawpayload",
  "rawsourcepayload",
  "rawvaultobject",
  "rawvaultwrite",
  "refreshtoken",
  "secret",
  "sessiontoken",
  "token",
  "vaultcredential",
]);

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export class ContextLayerReferenceError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.name = "ContextLayerReferenceError";
    this.code = code;
    this.details = details;
  }
}

export function findSecretFields(value) {
  const matches = [];
  const seen = new WeakSet();

  function visit(current, path) {
    if (!current || typeof current !== "object") return;
    if (seen.has(current)) return;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach(function visitArrayEntry(entry, index) {
        visit(entry, path + "[" + index + "]");
      });
      return;
    }

    for (const key of Object.keys(current)) {
      const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (SECRET_FIELD_NAMES.has(normalized)) {
        matches.push(path + "." + key);
      }
      visit(current[key], path + "." + key);
    }
  }

  visit(value, "$");
  return matches;
}

export function assertNoSecretFields(value, label = "input") {
  const matches = findSecretFields(value);
  if (matches.length > 0) {
    throw new ContextLayerReferenceError(
      "SECRET_FIELD_REJECTED",
      label + " contains forbidden secret-bearing fields",
      matches,
    );
  }
}

export function validateContextRequest(request) {
  const errors = [];

  if (!isPlainObject(request)) {
    return { valid: false, errors: ["request must be a JSON object"] };
  }

  try {
    assertNoSecretFields(request, "context request");
  } catch (error) {
    errors.push(error.message + ": " + error.details.join(", "));
  }

  rejectUnknownKeys(request, REQUEST_KEYS, "request", errors);

  const required = [
    "spec_version",
    "type",
    "id",
    "created_at",
    "issuer",
    "subject_ref",
    "requester",
    "recipient",
    "purpose_code",
    "task",
    "selectors",
    "requested_actions",
    "retention",
    "receipt_requirement",
    "expires_at",
  ];
  for (const key of required) {
    if (!(key in request)) errors.push("request." + key + " is required");
  }

  if (request.spec_version !== SPEC_VERSION) {
    errors.push("request.spec_version must equal " + SPEC_VERSION);
  }
  if (request.type !== "context_request") {
    errors.push("request.type must equal context_request");
  }
  if (!isIdentifier(request.id, "urn:cl:request:")) {
    errors.push("request.id must be a Context Layer request URN");
  }
  if (!isDateTime(request.created_at)) {
    errors.push("request.created_at must be an RFC 3339 date-time");
  }
  if (!isDateTime(request.expires_at)) {
    errors.push("request.expires_at must be an RFC 3339 date-time");
  }
  if (
    isDateTime(request.created_at)
    && isDateTime(request.expires_at)
    && dateTimeToMilliseconds(request.expires_at) <= dateTimeToMilliseconds(request.created_at)
  ) {
    errors.push("request.expires_at must be later than request.created_at");
  }

  validateIdentity(request.issuer, "request.issuer", ["id"], errors);
  if (
    typeof request.subject_ref !== "string"
    || request.subject_ref.length < 3
    || request.subject_ref.length > 512
  ) {
    errors.push("request.subject_ref must contain from 3 through 512 characters");
  }
  validateIdentity(
    request.requester,
    "request.requester",
    ["principal", "authenticated_by", "client_instance"],
    errors,
  );
  validateIdentity(
    request.recipient,
    "request.recipient",
    ["principal", "onward_disclosure"],
    errors,
  );
  if (
    isPlainObject(request.recipient)
    && !["allowed", "forbidden"].includes(request.recipient.onward_disclosure)
  ) {
    errors.push("request.recipient.onward_disclosure must be allowed or forbidden");
  }

  if (!isPurposeCode(request.purpose_code)) {
    errors.push("request.purpose_code must be a registered code or a namespaced x. extension");
  }
  if (
    request.purpose !== undefined
    && (
      typeof request.purpose !== "string"
      || request.purpose.length < 3
      || request.purpose.length > 240
    )
  ) {
    errors.push("request.purpose must contain from 3 through 240 characters when present");
  }

  if (!isPlainObject(request.task)) {
    errors.push("request.task must be an object");
  } else {
    rejectUnknownKeys(request.task, new Set(["kind", "user_visible"]), "request.task", errors);
    if (!isName(request.task.kind)) {
      errors.push("request.task.kind must be a stable name");
    }
    if (typeof request.task.user_visible !== "boolean") {
      errors.push("request.task.user_visible must be boolean");
    }
  }

  if (!Array.isArray(request.selectors) || request.selectors.length === 0) {
    errors.push("request.selectors must contain at least one selector");
  } else {
    if (request.selectors.length > 64) {
      errors.push("request.selectors must contain no more than 64 selectors");
    }
    const predicates = [];
    request.selectors.forEach(function validateSelector(selector, index) {
      const path = "request.selectors[" + index + "]";
      if (!isPlainObject(selector)) {
        errors.push(path + " must be an object");
        return;
      }
      rejectUnknownKeys(selector, new Set(["predicate"]), path, errors);
      if (!isName(selector.predicate)) errors.push(path + ".predicate is invalid");
      predicates.push(selector.predicate);
    });
    if (new Set(predicates).size !== predicates.length) {
      errors.push("request.selectors must not contain duplicate predicates");
    }
  }

  if (!isUniqueNameArray(request.requested_actions) || request.requested_actions.length > 64) {
    errors.push("request.requested_actions must contain no more than 64 unique action names");
  }

  if (!isPlainObject(request.retention)) {
    errors.push("request.retention must be an object");
  } else {
    rejectUnknownKeys(request.retention, new Set(["mode", "max_seconds"]), "request.retention", errors);
    if (!["ephemeral", "single_use"].includes(request.retention.mode)) {
      errors.push("request.retention.mode must be ephemeral or single_use");
    }
    if (
      !Number.isInteger(request.retention.max_seconds)
      || request.retention.max_seconds < 1
      || request.retention.max_seconds > 86400
    ) {
      errors.push("request.retention.max_seconds must be an integer from 1 through 86400");
    }
  }

  if (!isPlainObject(request.receipt_requirement)) {
    errors.push("request.receipt_requirement must be an object");
  } else {
    rejectUnknownKeys(
      request.receipt_requirement,
      new Set(["level", "required"]),
      "request.receipt_requirement",
      errors,
    );
    if (!["none", "decision", "operation"].includes(request.receipt_requirement.level)) {
      errors.push("request.receipt_requirement.level is invalid");
    }
    if (typeof request.receipt_requirement.required !== "boolean") {
      errors.push("request.receipt_requirement.required must be boolean");
    }
    if (
      typeof request.receipt_requirement.required === "boolean"
      && ["none", "decision", "operation"].includes(request.receipt_requirement.level)
      && (
        (request.receipt_requirement.level === "none"
          && request.receipt_requirement.required !== false)
        || (request.receipt_requirement.level !== "none"
          && request.receipt_requirement.required !== true)
      )
    ) {
      errors.push("request.receipt_requirement level and required must form a coherent pair");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validatePolicyDecision(decision) {
  const errors = [];

  if (!isPlainObject(decision)) {
    return { valid: false, errors: ["policy decision must be a JSON object"] };
  }

  try {
    assertNoSecretFields(decision, "policy decision");
  } catch (error) {
    errors.push(error.message + ": " + error.details.join(", "));
  }

  rejectUnknownKeys(decision, POLICY_DECISION_KEYS, "decision", errors);
  for (const key of POLICY_DECISION_REQUIRED_KEYS) {
    if (!(key in decision)) errors.push("decision." + key + " is required");
  }

  if (decision.spec_version !== SPEC_VERSION) {
    errors.push("decision.spec_version must equal " + SPEC_VERSION);
  }
  if (decision.type !== "policy_decision") {
    errors.push("decision.type must equal policy_decision");
  }
  if (!isIdentifier(decision.id, "urn:cl:decision:")) {
    errors.push("decision.id must be a Context Layer decision URN");
  }
  if (!isDateTime(decision.created_at)) {
    errors.push("decision.created_at must be an RFC 3339 date-time");
  }
  if (!isDateTime(decision.expires_at)) {
    errors.push("decision.expires_at must be an RFC 3339 date-time");
  }
  if (
    isDateTime(decision.created_at)
    && isDateTime(decision.expires_at)
    && dateTimeToMilliseconds(decision.expires_at) <= dateTimeToMilliseconds(decision.created_at)
  ) {
    errors.push("decision.expires_at must be later than decision.created_at");
  }

  validateIdentity(decision.issuer, "decision.issuer", ["id"], errors);
  if (!isIdentifier(decision.request_ref, "urn:cl:request:")) {
    errors.push("decision.request_ref must be a Context Layer request URN");
  }
  if (decision.request_digest !== undefined && !isDigest(decision.request_digest)) {
    errors.push("decision.request_digest must be a SHA-256 digest when present");
  }
  if (!["allow", "allow_with_reductions", "deny", "needs_approval"].includes(decision.decision)) {
    errors.push("decision.decision is invalid");
  }

  if (!isPlainObject(decision.policy_snapshot)) {
    errors.push("decision.policy_snapshot must be an object");
  } else {
    rejectUnknownKeys(
      decision.policy_snapshot,
      new Set(["version", "digest"]),
      "decision.policy_snapshot",
      errors,
    );
    if (
      typeof decision.policy_snapshot.version !== "string"
      || decision.policy_snapshot.version.length === 0
      || decision.policy_snapshot.version.length > 240
    ) {
      errors.push("decision.policy_snapshot.version must contain from 1 through 240 characters");
    }
    if (!isDigest(decision.policy_snapshot.digest)) {
      errors.push("decision.policy_snapshot.digest must be a SHA-256 digest");
    }
  }

  validateSelectorArray(decision.granted_selectors, "decision.granted_selectors", errors);
  validateSelectorArray(decision.denied_selectors, "decision.denied_selectors", errors);
  for (const key of ["granted_actions", "denied_actions"]) {
    if (!isUniqueNameArray(decision[key]) || decision[key].length > 64) {
      errors.push("decision." + key + " must be an array of unique names");
    }
  }
  if (
    !isUniqueTransformArray(decision.transform_requirements)
    || decision.transform_requirements.length > 64
  ) {
    errors.push("decision.transform_requirements must contain unique supported transforms");
  }
  if (
    decision.bundle_instructions !== undefined
    && (
      !Array.isArray(decision.bundle_instructions)
      || decision.bundle_instructions.length > 32
      || decision.bundle_instructions.some(function invalidInstruction(instruction) {
        return typeof instruction !== "string"
          || instruction.length === 0
          || instruction.length > 500;
      })
      || new Set(decision.bundle_instructions).size !== decision.bundle_instructions.length
    )
  ) {
    errors.push("decision.bundle_instructions must contain unique bounded strings");
  }

  if (!isPlainObject(decision.retention)) {
    errors.push("decision.retention must be an object");
  } else {
    rejectUnknownKeys(
      decision.retention,
      new Set(["mode", "max_seconds"]),
      "decision.retention",
      errors,
    );
    if (!["ephemeral", "single_use"].includes(decision.retention.mode)) {
      errors.push("decision.retention.mode must be ephemeral or single_use");
    }
    if (
      !Number.isInteger(decision.retention.max_seconds)
      || decision.retention.max_seconds < 0
      || decision.retention.max_seconds > 86400
    ) {
      errors.push("decision.retention.max_seconds must be an integer from 0 through 86400");
    }
  }

  if (!["allowed", "forbidden"].includes(decision.onward_disclosure)) {
    errors.push("decision.onward_disclosure must be allowed or forbidden");
  }
  validateReceiptRequirement(
    decision.receipt_requirement,
    "decision.receipt_requirement",
    errors,
  );
  if (decision.receipt_preflight !== undefined) {
    if (!isPlainObject(decision.receipt_preflight)) {
      errors.push("decision.receipt_preflight must be an object when present");
    } else {
      rejectUnknownKeys(
        decision.receipt_preflight,
        new Set(["required", "status"]),
        "decision.receipt_preflight",
        errors,
      );
      if (typeof decision.receipt_preflight.required !== "boolean") {
        errors.push("decision.receipt_preflight.required must be boolean");
      }
      if (
        !["not_required", "available", "unavailable"]
          .includes(decision.receipt_preflight.status)
      ) {
        errors.push("decision.receipt_preflight.status is invalid");
      }
    }
  }
  if (
    decision.approval_verification !== undefined
    && ![
      "not_required",
      "not_provided",
      "binding_invalid",
      "expired",
      "scope_incomplete",
      "verifier_missing",
      "rejected",
      "verified",
    ].includes(decision.approval_verification)
  ) {
    errors.push("decision.approval_verification is invalid");
  }
  if (decision.approval_binding !== undefined && decision.approval_binding !== null) {
    if (!isPlainObject(decision.approval_binding)) {
      errors.push("decision.approval_binding must be null or an object");
    } else {
      rejectUnknownKeys(
        decision.approval_binding,
        new Set(["approval_ref", "request_digest", "policy_digest", "expires_at"]),
        "decision.approval_binding",
        errors,
      );
      if (
        typeof decision.approval_binding.approval_ref !== "string"
        || decision.approval_binding.approval_ref.length < 3
        || decision.approval_binding.approval_ref.length > 512
      ) {
        errors.push("decision.approval_binding.approval_ref must contain from 3 through 512 characters");
      }
      for (const key of ["request_digest", "policy_digest"]) {
        if (!isDigest(decision.approval_binding[key])) {
          errors.push("decision.approval_binding." + key + " must be a SHA-256 digest");
        }
      }
      if (
        decision.approval_binding.expires_at !== undefined
        && !isDateTime(decision.approval_binding.expires_at)
      ) {
        errors.push("decision.approval_binding.expires_at must be an RFC 3339 timestamp");
      }
    }
  }

  if (
    !Array.isArray(decision.reason_codes)
    || decision.reason_codes.length === 0
    || decision.reason_codes.length > 32
    || !decision.reason_codes.every(isReasonCode)
    || new Set(decision.reason_codes).size !== decision.reason_codes.length
  ) {
    errors.push("decision.reason_codes must contain unique uppercase reason codes");
  }

  if (["deny", "needs_approval"].includes(decision.decision)) {
    if (Array.isArray(decision.granted_selectors) && decision.granted_selectors.length > 0) {
      errors.push("a deny or needs_approval decision cannot grant selectors");
    }
    if (Array.isArray(decision.granted_actions) && decision.granted_actions.length > 0) {
      errors.push("a deny or needs_approval decision cannot grant actions");
    }
    if (isPlainObject(decision.retention) && decision.retention.max_seconds !== 0) {
      errors.push("a deny or needs_approval decision must set retention.max_seconds to 0");
    }
  } else if (
    isPlainObject(decision.retention)
    && (!Number.isInteger(decision.retention.max_seconds) || decision.retention.max_seconds < 1)
  ) {
    errors.push("an allowing decision must set positive retention.max_seconds");
  }

  if (decision.integrity !== undefined) {
    validateCanonicalIntegrity(decision, "urn:cl:decision:", "decision", errors);
  }

  return { valid: errors.length === 0, errors };
}

export function validateMemoryUpdateProposal(proposal) {
  const errors = [];

  if (!isPlainObject(proposal)) {
    return { valid: false, errors: ["memory update proposal must be a JSON object"] };
  }

  try {
    assertNoSecretFields(proposal, "memory update proposal");
  } catch (error) {
    errors.push(error.message + ": " + error.details.join(", "));
  }

  rejectUnknownKeys(proposal, MEMORY_UPDATE_PROPOSAL_KEYS, "proposal", errors);
  for (const key of MEMORY_UPDATE_PROPOSAL_REQUIRED_KEYS) {
    if (!(key in proposal)) errors.push("proposal." + key + " is required");
  }

  if (proposal.spec_version !== SPEC_VERSION) {
    errors.push("proposal.spec_version must equal " + SPEC_VERSION);
  }
  if (proposal.type !== "memory_update_proposal") {
    errors.push("proposal.type must equal memory_update_proposal");
  }
  if (!isIdentifier(proposal.id, "urn:cl:proposal:")) {
    errors.push("proposal.id must be a Context Layer proposal URN");
  }
  if (!isDateTime(proposal.created_at)) {
    errors.push("proposal.created_at must be an RFC 3339 date-time");
  }
  if (!isDateTime(proposal.expires_at)) {
    errors.push("proposal.expires_at must be an RFC 3339 date-time");
  }
  if (
    isDateTime(proposal.created_at)
    && isDateTime(proposal.expires_at)
    && dateTimeToMilliseconds(proposal.expires_at) <= dateTimeToMilliseconds(proposal.created_at)
  ) {
    errors.push("proposal.expires_at must be later than proposal.created_at");
  }

  validateIdentity(proposal.issuer, "proposal.issuer", ["id"], errors);
  for (const key of ["subject_ref", "submitted_by"]) {
    if (typeof proposal[key] !== "string" || proposal[key].length < 3) {
      errors.push("proposal." + key + " must be a stable reference");
    }
  }
  if (
    proposal.bundle_ref !== undefined
    && !isIdentifier(proposal.bundle_ref, "urn:cl:bundle:")
  ) {
    errors.push("proposal.bundle_ref must be a Context Layer bundle URN when present");
  }
  if (!["add", "add_or_contradict", "supersede", "retract"].includes(proposal.operation)) {
    errors.push("proposal.operation is invalid");
  }

  if (!Array.isArray(proposal.proposed_claims) || proposal.proposed_claims.length === 0) {
    errors.push("proposal.proposed_claims must contain at least one claim");
  } else {
    proposal.proposed_claims.forEach(function validateProposedClaim(claim, index) {
      const path = "proposal.proposed_claims[" + index + "]";
      if (!isPlainObject(claim)) {
        errors.push(path + " must be an object");
        return;
      }
      rejectUnknownKeys(claim, new Set(["predicate", "object", "confidence"]), path, errors);
      if (!isName(claim.predicate)) errors.push(path + ".predicate is invalid");
      if (!isPlainObject(claim.object)) {
        errors.push(path + ".object must be an object");
      } else {
        rejectUnknownKeys(claim.object, new Set(["value", "datatype"]), path + ".object", errors);
        if (!("value" in claim.object)) errors.push(path + ".object.value is required");
        if (!isName(claim.object.datatype)) errors.push(path + ".object.datatype is invalid");
      }
      if (
        typeof claim.confidence !== "number"
        || claim.confidence < 0
        || claim.confidence > 1
      ) {
        errors.push(path + ".confidence must be between zero and one");
      }
    });
  }

  if (
    !Array.isArray(proposal.provenance_refs)
    || !proposal.provenance_refs.every(function validReference(reference) {
      return typeof reference === "string" && reference.length >= 3;
    })
    || new Set(proposal.provenance_refs).size !== proposal.provenance_refs.length
  ) {
    errors.push("proposal.provenance_refs must be unique stable references");
  }
  if (typeof proposal.rationale !== "string" || proposal.rationale.trim().length === 0) {
    errors.push("proposal.rationale is required");
  }
  if (
    ![
      "pending_validation",
      "pending_approval",
      "approved",
      "rejected",
      "committed",
      "expired",
    ].includes(proposal.status)
  ) {
    errors.push("proposal.status is invalid");
  }
  if (!isUniqueNameArray(proposal.approval_requirement)) {
    errors.push("proposal.approval_requirement must be an array of unique names");
  }
  if (
    ["approved", "committed"].includes(proposal.status)
    && Array.isArray(proposal.provenance_refs)
    && proposal.provenance_refs.length === 0
  ) {
    errors.push("an approved or committed proposal requires provenance");
  }
  if (proposal.integrity !== undefined) {
    validateCanonicalIntegrity(proposal, "urn:cl:proposal:", "proposal", errors);
  }

  return { valid: errors.length === 0, errors };
}

export function decideContextRequest(request, policy) {
  const validation = validateContextRequest(request);
  if (!validation.valid) {
    throw new ContextLayerReferenceError(
      "INVALID_CONTEXT_REQUEST",
      "context request failed validation",
      validation.errors,
    );
  }
  validatePolicy(policy);
  assertNoSecretFields(policy, "policy");

  const allowedPurposeCodes = new Set(policy.allowed_purpose_codes);
  const allowedSelectors = new Set(policy.allowed_selectors);
  const deniedSelectors = new Set(policy.denied_selectors || []);
  const allowedActions = new Set(policy.allowed_actions);
  const approvalPurposeCodes = new Set(policy.approval_required_purpose_codes || []);
  const approvalActions = new Set(policy.approval_required_actions || []);

  const purposeAllowed = allowedPurposeCodes.has(request.purpose_code);
  const grantedSelectors = request.selectors.filter(function selectorAllowed(selector) {
    return allowedSelectors.has(selector.predicate) && !deniedSelectors.has(selector.predicate);
  });
  const rejectedSelectors = request.selectors.filter(function selectorRejected(selector) {
    return !grantedSelectors.some(function samePredicate(granted) {
      return granted.predicate === selector.predicate;
    });
  });
  const grantedActions = request.requested_actions.filter(function actionAllowed(action) {
    return allowedActions.has(action);
  });
  const rejectedActions = request.requested_actions.filter(function actionRejected(action) {
    return !allowedActions.has(action);
  });

  const reasons = [];
  if (!purposeAllowed) reasons.push("PURPOSE_DENIED");
  if (grantedSelectors.length === 0) reasons.push("NO_SELECTORS_GRANTED");
  if (request.requested_actions.length > 0 && grantedActions.length === 0) {
    reasons.push("NO_ACTIONS_GRANTED");
  }

  const deny = reasons.length > 0;
  const approvalRequired = !deny && (
    approvalPurposeCodes.has(request.purpose_code)
    || grantedActions.some(function actionRequiresApproval(action) {
      return approvalActions.has(action);
    })
  );
  const grantBlocked = deny || approvalRequired;
  const retentionSeconds = grantBlocked
    ? 0
    : Math.min(request.retention.max_seconds, policy.max_retention_seconds);
  const onwardRequested = request.recipient.onward_disclosure === "allowed";
  const onwardAllowed = !grantBlocked
    && Boolean(policy.allow_onward_disclosure)
    && onwardRequested;

  if (!deny) {
    if (rejectedSelectors.length > 0) reasons.push("SCOPE_REDUCED");
    if (rejectedActions.length > 0) reasons.push("ACTION_REDUCED");
    if (retentionSeconds < request.retention.max_seconds) reasons.push("RETENTION_REDUCED");
    if (onwardRequested && !onwardAllowed) reasons.push("ONWARD_DISCLOSURE_DENIED");
    if (approvalRequired) reasons.push("APPROVAL_REQUIRED");
    if (reasons.length === 0) reasons.push("REQUEST_ALLOWED");
  }

  const decision = deny
    ? "deny"
    : approvalRequired
      ? "needs_approval"
      : reasons.length === 1 && reasons[0] === "REQUEST_ALLOWED"
        ? "allow"
        : "allow_with_reductions";
  const policyDigest = digestValue(policy);
  const decisionSeed = {
    request_id: request.id,
    policy_digest: policyDigest,
    decision,
    granted_selectors: grantBlocked ? [] : grantedSelectors,
    granted_actions: grantBlocked ? [] : grantedActions,
    retention_seconds: retentionSeconds,
    onward_disclosure: onwardAllowed,
  };

  return {
    spec_version: SPEC_VERSION,
    type: "policy_decision",
    id: "urn:cl:decision:" + digestValue(decisionSeed).slice(7, 31),
    created_at: request.created_at,
    issuer: { id: policy.issuer },
    request_ref: request.id,
    decision,
    policy_snapshot: {
      version: policy.version,
      digest: policyDigest,
    },
    granted_selectors: grantBlocked ? [] : clone(grantedSelectors),
    denied_selectors: clone(deny ? request.selectors : rejectedSelectors),
    granted_actions: grantBlocked ? [] : grantedActions,
    denied_actions: deny ? clone(request.requested_actions) : rejectedActions,
    transform_requirements: grantBlocked ? [] : clone(policy.transform_requirements || []),
    retention: {
      mode: request.retention.mode,
      max_seconds: retentionSeconds,
    },
    onward_disclosure: onwardAllowed ? "allowed" : "forbidden",
    receipt_requirement: clone(request.receipt_requirement),
    expires_at: request.expires_at,
    reason_codes: reasons,
  };
}

export function issueScopedBundle(input) {
  assertNoSecretFields(input, "bundle issuance input");
  rejectInputKeys(
    input,
    new Set(["request", "decision", "claims", "issuer"]),
    "bundle issuance input",
  );

  const request = input.request;
  const decision = input.decision;
  const claims = input.claims;
  const issuer = input.issuer;
  const validation = validateContextRequest(request);
  if (!validation.valid) {
    throw new ContextLayerReferenceError(
      "INVALID_CONTEXT_REQUEST",
      "context request failed validation",
      validation.errors,
    );
  }
  const decisionValidation = validatePolicyDecision(decision);
  if (!decisionValidation.valid) {
    throw new ContextLayerReferenceError(
      "INVALID_POLICY_DECISION",
      "policy decision failed validation",
      decisionValidation.errors,
    );
  }
  if (decision.request_ref !== request.id) {
    throw new ContextLayerReferenceError(
      "DECISION_REQUEST_MISMATCH",
      "policy decision does not reference the supplied request",
    );
  }
  if (!["allow", "allow_with_reductions"].includes(decision.decision)) {
    throw new ContextLayerReferenceError(
      "DECISION_DENIED",
      "a denied or pending-approval request cannot produce a scoped bundle",
    );
  }
  if (dateTimeToMilliseconds(decision.expires_at) > dateTimeToMilliseconds(request.expires_at)) {
    throw new ContextLayerReferenceError(
      "DECISION_EXPIRY_INVALID",
      "policy decision cannot outlive the supplied request",
    );
  }
  const bundleExpiresAt = validateIssuanceControls(request, decision);
  if (!Array.isArray(claims)) {
    throw new ContextLayerReferenceError("INVALID_CLAIMS", "claims must be an array");
  }
  if (typeof issuer !== "string" || issuer.length < 3) {
    throw new ContextLayerReferenceError("INVALID_ISSUER", "issuer must be a stable identifier");
  }

  const grantedPredicates = new Set(
    decision.granted_selectors.map(function predicateOf(selector) {
      return selector.predicate;
    }),
  );
  const transforms = parseTransforms(decision.transform_requirements);
  const context = claims
    .filter(function claimWasGranted(claim) {
      return isPlainObject(claim)
        && grantedPredicates.has(claim.predicate)
        && !transforms.redacted.has(claim.predicate);
    })
    .map(function sanitizeClaim(claim, index) {
      const path = "claims[" + index + "]";
      const errors = [];
      rejectUnknownKeys(
        claim,
        new Set(["claim", "predicate", "value", "confidence", "provenance_handles"]),
        path,
        errors,
      );
      if (errors.length > 0) {
        throw new ContextLayerReferenceError("INVALID_CLAIM", errors[0], errors);
      }
      if (!isName(claim.predicate)) {
        throw new ContextLayerReferenceError("INVALID_CLAIM", path + ".predicate is invalid");
      }
      if (
        typeof claim.claim !== "string"
        || claim.claim.length === 0
        || claim.claim.length > 2000
        || !("value" in claim)
      ) {
        throw new ContextLayerReferenceError(
          "INVALID_CLAIM",
          path + " must contain a bounded claim string and value",
        );
      }
      if (
        !Array.isArray(claim.provenance_handles)
        || claim.provenance_handles.length === 0
        || claim.provenance_handles.length > 32
        || new Set(claim.provenance_handles).size !== claim.provenance_handles.length
      ) {
        throw new ContextLayerReferenceError(
          "MISSING_PROVENANCE",
          path + ".provenance_handles must contain from 1 through 32 unique opaque handles",
        );
      }
      if (
        typeof claim.confidence !== "number"
        || !Number.isFinite(claim.confidence)
        || claim.confidence < 0
        || claim.confidence > 1
      ) {
        throw new ContextLayerReferenceError(
          "INVALID_CLAIM",
          path + ".confidence must be between zero and one",
        );
      }
      const sanitized = clone(claim);
      const truncationLimit = transforms.truncation.get(claim.predicate);
      sanitized.claim = transformClaimText(
        sanitized.claim,
        truncationLimit,
        transforms.compressTaskFacts,
      );
      sanitized.value = transformClaimValue(sanitized.value, truncationLimit);
      return sanitized;
    });

  for (const predicate of grantedPredicates) {
    if (transforms.redacted.has(predicate)) continue;
    if (!context.some(function hasPredicate(claim) { return claim.predicate === predicate; })) {
      throw new ContextLayerReferenceError(
        "MISSING_GRANTED_CLAIM",
        "no claim was supplied for granted predicate " + predicate,
      );
    }
  }
  if (context.length === 0) {
    throw new ContextLayerReferenceError(
      "NO_CONTEXT_GRANTED",
      "no approved claims remained after required transformations",
    );
  }
  if (context.length > 64) {
    throw new ContextLayerReferenceError(
      "TOO_MANY_CLAIMS",
      "a scoped bundle cannot contain more than 64 claims",
    );
  }

  const provenance = {};
  for (const claim of context) {
    for (const handle of claim.provenance_handles) {
      if (!isName(handle)) {
        throw new ContextLayerReferenceError(
          "INVALID_PROVENANCE_HANDLE",
          "provenance handles must be opaque names",
        );
      }
      provenance[handle] = {
        kind: "opaque_vault_reference",
        ref: "urn:cl:provenance:" + digestValue({
          handle,
          request_ref: request.id,
        }).slice(7, 31),
      };
    }
  }

  const bundleSeed = {
    request_ref: request.id,
    decision_ref: decision.id,
    recipient: request.recipient.principal,
    context,
    capabilities: decision.granted_actions,
  };

  return {
    spec_version: SPEC_VERSION,
    type: "scoped_context_bundle",
    id: "urn:cl:bundle:" + digestValue(bundleSeed).slice(7, 31),
    created_at: decision.created_at,
    issuer: { id: issuer },
    subject_alias: "urn:cl:alias:" + digestValue({
      subject_ref: request.subject_ref,
      request_ref: request.id,
    }).slice(7, 31),
    request_ref: request.id,
    decision_ref: decision.id,
    recipient: request.recipient.principal,
    purpose_code: request.purpose_code,
    ...(request.purpose === undefined ? {} : { purpose: request.purpose }),
    issued_at: decision.created_at,
    expires_at: bundleExpiresAt,
    single_use: true,
    context,
    provenance,
    instructions: [
      "use approved context only",
      "do not resolve raw vault data",
    ],
    capabilities: clone(decision.granted_actions),
    restrictions: {
      onward_disclosure: decision.onward_disclosure,
      memory_write: "proposal_only",
      raw_vault_resolution: "forbidden",
      retention_seconds: decision.retention.max_seconds,
    },
    receipt_contract: {
      required: decision.receipt_requirement.required,
      required_operations: unique([
        "bundle.consume",
        ...decision.granted_actions,
      ]),
    },
  };
}

function validateIssuanceControls(request, decision) {
  const requestDigest = digestValue(request);
  if (decision.request_digest !== undefined && decision.request_digest !== requestDigest) {
    throw new ContextLayerReferenceError(
      "DECISION_REQUEST_DIGEST_MISMATCH",
      "policy decision request digest does not match the supplied request",
    );
  }

  if (decision.receipt_preflight !== undefined) {
    const preflight = decision.receipt_preflight;
    if (preflight.required !== decision.receipt_requirement.required) {
      throw new ContextLayerReferenceError(
        "RECEIPT_PREFLIGHT_MISMATCH",
        "receipt preflight does not match the decision receipt requirement",
      );
    }
    const expectedStatus = preflight.required ? "available" : "not_required";
    if (preflight.status !== expectedStatus) {
      throw new ContextLayerReferenceError(
        "RECEIPT_PREFLIGHT_FAILED",
        "the required receipt path did not pass preflight",
      );
    }
  }

  const verification = decision.approval_verification;
  const binding = decision.approval_binding;
  if (verification === undefined) {
    if (binding !== undefined && binding !== null) {
      throw new ContextLayerReferenceError(
        "APPROVAL_BINDING_INVALID",
        "an approval binding requires an explicit verified approval state",
      );
    }
    return decision.expires_at;
  }
  if (verification === "not_required") {
    if (binding !== undefined && binding !== null) {
      throw new ContextLayerReferenceError(
        "APPROVAL_BINDING_INVALID",
        "a not-required approval state cannot carry an approval binding",
      );
    }
    return decision.expires_at;
  }
  if (verification !== "verified") {
    throw new ContextLayerReferenceError(
      "APPROVAL_NOT_VERIFIED",
      "bundle issuance requires a verified or explicitly not-required approval state",
    );
  }
  if (!isPlainObject(binding)) {
    throw new ContextLayerReferenceError(
      "APPROVAL_BINDING_INVALID",
      "a verified approval state requires an approval binding",
    );
  }
  if (
    binding.request_digest !== requestDigest
    || binding.policy_digest !== decision.policy_snapshot.digest
  ) {
    throw new ContextLayerReferenceError(
      "APPROVAL_BINDING_INVALID",
      "approval binding digests do not match the request and policy snapshot",
    );
  }
  if (binding.expires_at === undefined) return decision.expires_at;

  const bindingExpiry = dateTimeToMilliseconds(binding.expires_at);
  if (bindingExpiry <= dateTimeToMilliseconds(decision.created_at)) {
    throw new ContextLayerReferenceError(
      "APPROVAL_EXPIRED",
      "approval binding expired before bundle issuance",
    );
  }
  return bindingExpiry < dateTimeToMilliseconds(decision.expires_at)
    ? binding.expires_at
    : decision.expires_at;
}

function parseTransforms(values) {
  const transforms = {
    redacted: new Set(),
    truncation: new Map(),
    compressTaskFacts: false,
  };
  for (const value of values) {
    let match;
    if ((match = /^redact:([a-z][a-z0-9]*(?:[._-][a-z0-9]+)*)$/.exec(value))) {
      transforms.redacted.add(match[1]);
    } else if (
      (match = /^truncate:([a-z][a-z0-9]*(?:[._-][a-z0-9]+)*):([1-9][0-9]*)$/.exec(value))
    ) {
      const requestedLimit = Math.min(Number(match[2]), 2000);
      const currentLimit = transforms.truncation.get(match[1]);
      transforms.truncation.set(
        match[1],
        currentLimit === undefined ? requestedLimit : Math.min(currentLimit, requestedLimit),
      );
    } else if (value === "compress:task-facts") {
      transforms.compressTaskFacts = true;
    } else {
      throw new ContextLayerReferenceError(
        "UNSUPPORTED_TRANSFORM",
        "bundle issuer does not implement transform " + value,
      );
    }
  }
  return transforms;
}

function transformClaimText(value, limit, compress) {
  let transformed = compress ? value.replace(/\s+/g, " ").trim() : value;
  if (limit !== undefined) transformed = transformed.slice(0, limit);
  if (transformed.length === 0) {
    throw new ContextLayerReferenceError(
      "TRANSFORM_FAILED",
      "a required claim transform produced an empty claim",
    );
  }
  return transformed;
}

function transformClaimValue(value, limit) {
  return typeof value === "string" && limit !== undefined ? value.slice(0, limit) : value;
}

export function writeReceipt(input) {
  assertNoSecretFields(input, "receipt input");
  rejectInputKeys(
    input,
    new Set([
      "operation",
      "request",
      "decision",
      "bundle",
      "supersedes_ref",
      "actor",
      "issuer",
      "outcome",
      "started_at",
      "completed_at",
      "user_summary",
    ]),
    "receipt input",
  );

  const request = input.request;
  const decision = input.decision;
  const bundle = input.bundle;
  if (!isName(input.operation)) {
    throw new ContextLayerReferenceError("INVALID_OPERATION", "operation must be a stable name");
  }
  if (!isPlainObject(request) || !isPlainObject(decision) || !isPlainObject(bundle)) {
    throw new ContextLayerReferenceError(
      "INVALID_RECEIPT_CHAIN",
      "request, decision, and bundle are required",
    );
  }
  if (decision.request_ref !== request.id || bundle.request_ref !== request.id) {
    throw new ContextLayerReferenceError(
      "RECEIPT_REQUEST_MISMATCH",
      "receipt chain does not share one request reference",
    );
  }
  if (bundle.decision_ref !== decision.id) {
    throw new ContextLayerReferenceError(
      "RECEIPT_DECISION_MISMATCH",
      "bundle does not reference the supplied decision",
    );
  }

  const actor = input.actor || bundle.issuer.id;
  const issuer = input.issuer || "urn:cl:receipt-writer:reference";
  const outcome = input.outcome || "success";
  const startedAt = input.started_at || bundle.issued_at;
  const completedAt = input.completed_at || startedAt;
  const hasSupersedesRef = Object.hasOwn(input, "supersedes_ref");
  const supersedesRef = hasSupersedesRef
    ? validateReceiptReference(input.supersedes_ref, "supersedes_ref")
    : undefined;
  const userSummary = input.user_summary
    ?? "recorded " + input.operation + " with payload omitted.";
  if (typeof actor !== "string" || actor.length < 3 || actor.length > 512) {
    throw new ContextLayerReferenceError(
      "INVALID_ACTOR",
      "receipt actor must contain from 3 through 512 characters",
    );
  }
  if (typeof issuer !== "string" || issuer.length < 3 || issuer.length > 512) {
    throw new ContextLayerReferenceError(
      "INVALID_ISSUER",
      "receipt issuer must contain from 3 through 512 characters",
    );
  }
  if (
    typeof userSummary !== "string"
    || userSummary.length < 1
    || userSummary.length > 500
  ) {
    throw new ContextLayerReferenceError(
      "INVALID_USER_SUMMARY",
      "receipt user_summary must contain from 1 through 500 characters",
    );
  }
  if (containsCredentialShapedContent(userSummary)) {
    throw new ContextLayerReferenceError(
      "SECRET_CONTENT_REJECTED",
      "receipt user_summary contains credential-shaped content",
    );
  }
  if (!["success", "failure", "indeterminate"].includes(outcome)) {
    throw new ContextLayerReferenceError("INVALID_OUTCOME", "receipt outcome is invalid");
  }
  if (!isDateTime(startedAt) || !isDateTime(completedAt)) {
    throw new ContextLayerReferenceError(
      "INVALID_RECEIPT_TIME",
      "receipt timestamps must be RFC 3339 date-times",
    );
  }
  if (dateTimeToMilliseconds(completedAt) < dateTimeToMilliseconds(startedAt)) {
    throw new ContextLayerReferenceError(
      "INVALID_RECEIPT_TIME",
      "receipt completion cannot precede its start",
    );
  }

  const unsignedReceipt = {
    spec_version: SPEC_VERSION,
    type: "receipt",
    created_at: completedAt,
    issuer: { id: issuer },
    operation: input.operation,
    actor,
    subject_ref: bundle.subject_alias,
    request_ref: request.id,
    decision_ref: decision.id,
    bundle_ref: bundle.id,
    ...(hasSupersedesRef ? { supersedes_ref: supersedesRef } : {}),
    started_at: startedAt,
    completed_at: completedAt,
    outcome,
    policy_snapshot: decision.policy_snapshot.digest,
    input_digest: digestValue({
      request_ref: request.id,
      decision_ref: decision.id,
    }),
    output_digest: digestValue(bundle),
    user_summary: userSummary,
    payload_included: false,
  };
  return {
    ...unsignedReceipt,
    id: "urn:cl:receipt:" + digestValue(unsignedReceipt).slice("sha256:".length),
  };
}

export function digestValue(value) {
  return "sha256:" + sha256(stableStringify(value));
}

function validatePolicy(policy) {
  if (!isPlainObject(policy)) {
    throw new ContextLayerReferenceError("INVALID_POLICY", "policy must be an object");
  }
  const allowed = new Set([
    "id",
    "version",
    "issuer",
    "allowed_purpose_codes",
    "allowed_selectors",
    "denied_selectors",
    "allowed_actions",
    "approval_required_purpose_codes",
    "approval_required_actions",
    "max_retention_seconds",
    "allow_onward_disclosure",
    "transform_requirements",
  ]);
  const errors = [];
  rejectUnknownKeys(policy, allowed, "policy", errors);
  if (typeof policy.id !== "string" || policy.id.length < 3) errors.push("policy.id is required");
  if (typeof policy.version !== "string" || policy.version.length < 1) {
    errors.push("policy.version is required");
  }
  if (typeof policy.issuer !== "string" || policy.issuer.length < 3) {
    errors.push("policy.issuer is required");
  }
  if (!isUniquePurposeCodeArray(policy.allowed_purpose_codes)) {
    errors.push("policy.allowed_purpose_codes must contain unique registered or x. purpose codes");
  }
  for (const key of ["allowed_selectors", "allowed_actions"]) {
    if (!isUniqueNameArray(policy[key])) errors.push("policy." + key + " must be unique names");
  }
  if (policy.denied_selectors !== undefined && !isUniqueNameArray(policy.denied_selectors)) {
    errors.push("policy.denied_selectors must be unique names");
  }
  if (
    policy.approval_required_purpose_codes !== undefined
    && !isUniquePurposeCodeArray(policy.approval_required_purpose_codes)
  ) {
    errors.push("policy.approval_required_purpose_codes must contain unique purpose codes");
  }
  if (
    policy.approval_required_actions !== undefined
    && !isUniqueNameArray(policy.approval_required_actions)
  ) {
    errors.push("policy.approval_required_actions must be unique names");
  }
  if (
    !Number.isInteger(policy.max_retention_seconds)
    || policy.max_retention_seconds < 1
    || policy.max_retention_seconds > 86400
  ) {
    errors.push("policy.max_retention_seconds must be an integer from 1 through 86400");
  }
  if (typeof policy.allow_onward_disclosure !== "boolean") {
    errors.push("policy.allow_onward_disclosure must be boolean");
  }
  if (
    policy.transform_requirements !== undefined
    && !isUniqueTransformArray(policy.transform_requirements)
  ) {
    errors.push("policy.transform_requirements must contain unique supported transforms");
  }
  if (errors.length > 0) {
    throw new ContextLayerReferenceError("INVALID_POLICY", "policy failed validation", errors);
  }
}

function validateCanonicalIntegrity(value, idPrefix, path, errors) {
  const integrity = value.integrity;
  if (!isPlainObject(integrity)) {
    errors.push(path + ".integrity must be an object");
    return;
  }
  rejectUnknownKeys(
    integrity,
    new Set(["algorithm", "digest"]),
    path + ".integrity",
    errors,
  );
  if (integrity.algorithm !== "sha-256") {
    errors.push(path + ".integrity.algorithm must equal sha-256");
  }
  if (!isDigest(integrity.digest)) {
    errors.push(path + ".integrity.digest must be a SHA-256 digest");
    return;
  }

  const unsigned = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key !== "id" && key !== "integrity") unsigned[key] = entry;
  }
  const expectedDigest = digestValue(unsigned);
  if (integrity.digest !== expectedDigest) {
    errors.push(path + ".integrity.digest does not match the canonical record");
  }
  if (value.id !== idPrefix + expectedDigest.slice("sha256:".length)) {
    errors.push(path + ".id does not match the canonical record digest");
  }
}

function validateSelectorArray(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(path + " must be an array");
    return;
  }
  if (value.length > 64) errors.push(path + " must contain no more than 64 selectors");
  const predicates = [];
  value.forEach(function validateSelector(selector, index) {
    const selectorPath = path + "[" + index + "]";
    if (!isPlainObject(selector)) {
      errors.push(selectorPath + " must be an object");
      return;
    }
    rejectUnknownKeys(selector, new Set(["predicate"]), selectorPath, errors);
    if (!isName(selector.predicate)) errors.push(selectorPath + ".predicate is invalid");
    predicates.push(selector.predicate);
  });
  if (new Set(predicates).size !== predicates.length) {
    errors.push(path + " must not contain duplicate predicates");
  }
}

function validateReceiptRequirement(value, path, errors) {
  if (!isPlainObject(value)) {
    errors.push(path + " must be an object");
    return;
  }
  rejectUnknownKeys(value, new Set(["level", "required"]), path, errors);
  if (!["none", "decision", "operation"].includes(value.level)) {
    errors.push(path + ".level is invalid");
  }
  if (typeof value.required !== "boolean") {
    errors.push(path + ".required must be boolean");
  }
  if (
    typeof value.required === "boolean"
    && ["none", "decision", "operation"].includes(value.level)
    && (
      (value.level === "none" && value.required !== false)
      || (value.level !== "none" && value.required !== true)
    )
  ) {
    errors.push(path + " level and required must form a coherent pair");
  }
}

function validateIdentity(value, path, allowedKeys, errors) {
  if (!isPlainObject(value)) {
    errors.push(path + " must be an object");
    return;
  }
  rejectUnknownKeys(value, new Set(allowedKeys), path, errors);
  for (const key of allowedKeys) {
    const minimum = ["id", "principal", "client_instance"].includes(key) ? 3 : 1;
    const maximum = key === "authenticated_by" ? 120 : 512;
    if (
      typeof value[key] !== "string"
      || value[key].length < minimum
      || value[key].length > maximum
    ) {
      errors.push(
        path + "." + key + " must contain from " + minimum + " through " + maximum + " characters",
      );
    }
  }
}

function rejectUnknownKeys(value, allowedKeys, path, errors) {
  if (!isPlainObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) errors.push(path + "." + key + " is not allowed");
  }
}

function rejectInputKeys(value, allowedKeys, path) {
  const errors = [];
  rejectUnknownKeys(value, allowedKeys, path, errors);
  if (errors.length > 0) {
    throw new ContextLayerReferenceError("UNKNOWN_FIELD", errors[0], errors);
  }
}

function isIdentifier(value, prefix) {
  return typeof value === "string"
    && value.startsWith(prefix)
    && /^[A-Za-z0-9._~-]+$/.test(value.slice(prefix.length));
}

function validateReceiptReference(value, label) {
  if (
    value !== null
    && (
      typeof value !== "string"
      || !/^urn:cl:receipt:[A-Za-z0-9._~-]+$/.test(value)
    )
  ) {
    throw new ContextLayerReferenceError(
      "INVALID_SUPERSEDES_REF",
      label + " must be null or an exact Context Layer receipt URN",
    );
  }
  return value;
}

const DATE_TIME_SEPARATOR = /t|\s/i;
const FULL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const FULL_TIME = /^(\d{2}):(\d{2}):(\d{2})(\.\d+)?(z|[+-]\d{2}(?::?\d{2})?)?$/i;
const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function parseDateTime(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(DATE_TIME_SEPARATOR);
  if (parts.length !== 2) return null;
  const date = FULL_DATE.exec(parts[0]);
  const time = FULL_TIME.exec(parts[1]);
  if (!date || !time) return null;

  const year = Number(date[1]);
  const month = Number(date[2]);
  const day = Number(date[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const maximumDay = month === 2 && leapYear ? 29 : DAYS_IN_MONTH[month];
  if (month < 1 || month > 12 || day < 1 || day > maximumDay) return null;

  const hour = Number(time[1]);
  const minute = Number(time[2]);
  const second = Number(time[3]);
  const regularTime = hour <= 23 && minute <= 59 && second <= 59;
  const leapSecond = hour === 23 && minute === 59 && second === 60;
  if (!regularTime && !leapSecond) return null;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    fraction: time[4],
    timezone: time[5],
  };
}

function isDateTime(value) {
  return parseDateTime(value) !== null;
}

function dateTimeToMilliseconds(value) {
  const parsed = parseDateTime(value);
  if (!parsed) return Number.NaN;
  const milliseconds = parsed.fraction
    ? Math.floor(Number(parsed.fraction) * 1000)
    : 0;
  const date = new Date(0);
  date.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day);
  date.setUTCHours(parsed.hour, parsed.minute, Math.min(parsed.second, 59), milliseconds);
  let timestamp = date.getTime() + (parsed.second === 60 ? 1000 : 0);
  if (parsed.timezone && parsed.timezone.toLowerCase() !== "z") {
    const compactOffset = parsed.timezone.slice(1).replace(":", "");
    const offsetHours = Number(compactOffset.slice(0, 2));
    const offsetMinutes = compactOffset.length > 2 ? Number(compactOffset.slice(2, 4)) : 0;
    const direction = parsed.timezone[0] === "+" ? 1 : -1;
    timestamp -= direction * (offsetHours * 60 + offsetMinutes) * 60 * 1000;
  }
  return timestamp;
}

function isName(value) {
  return typeof value === "string"
    && /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
}

function isPurposeCode(value) {
  return PURPOSE_CODE_SET.has(value)
    || (
      typeof value === "string"
      && /^x\.[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\.[a-z0-9]+(?:[._-][a-z0-9]+)*)+$/.test(value)
    );
}

function isReasonCode(value) {
  return typeof value === "string"
    && /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(value);
}

function isDigest(value) {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isUniqueNameArray(value) {
  return Array.isArray(value)
    && value.every(isName)
    && new Set(value).size === value.length;
}

function isTransformIdentifier(value) {
  return typeof value === "string"
    && /^(?:redact:[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*|truncate:[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*:[1-9][0-9]*|compress:task-facts)$/.test(value);
}

function isUniqueTransformArray(value) {
  return Array.isArray(value)
    && value.every(isTransformIdentifier)
    && new Set(value).size === value.length;
}

function containsCredentialShapedContent(value) {
  return /(?:\b(?:authorization|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|password|private[_ -]?key|session[_ -]?token|cookie)\b["']?\s*[:=]\s*\S+|\bbearer\s+[a-z0-9._~+/=-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value);
}

function isUniquePurposeCodeArray(value) {
  return Array.isArray(value)
    && value.every(isPurposeCode)
    && new Set(value).size === value.length;
}

function unique(values) {
  return Array.from(new Set(values));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (isPlainObject(value)) {
    return "{" + Object.keys(value).sort().map(function stringifyEntry(key) {
      return JSON.stringify(key) + ":" + stableStringify(value[key]);
    }).join(",") + "}";
  }
  return JSON.stringify(value);
}

function rotateRight(value, amount) {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256(text) {
  const source = new TextEncoder().encode(text);
  const bitLength = source.length * 8;
  const paddedLength = Math.ceil((source.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const state = [
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const previous15 = words[index - 15];
      const previous2 = words[index - 2];
      const sigma0 = rotateRight(previous15, 7)
        ^ rotateRight(previous15, 18)
        ^ (previous15 >>> 3);
      const sigma1 = rotateRight(previous2, 17)
        ^ rotateRight(previous2, 19)
        ^ (previous2 >>> 10);
      words[index] = (
        words[index - 16]
        + sigma0
        + words[index - 7]
        + sigma1
      ) >>> 0;
    }

    let a = state[0];
    let b = state[1];
    let c = state[2];
    let d = state[3];
    let e = state[4];
    let f = state[5];
    let g = state[6];
    let h = state[7];

    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temporary1 = (
        h + sum1 + choose + SHA256_CONSTANTS[index] + words[index]
      ) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  return state.map(function toHex(value) {
    return value.toString(16).padStart(8, "0");
  }).join("");
}

export { PURPOSE_CODES, SPEC_VERSION };
