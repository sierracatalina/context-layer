const SPEC_VERSION = "context-layer/0.1-draft";

const REQUEST_KEYS = new Set([
  "spec_version",
  "type",
  "id",
  "created_at",
  "issuer",
  "subject_ref",
  "requester",
  "recipient",
  "purpose",
  "task",
  "selectors",
  "requested_actions",
  "retention",
  "receipt_requirement",
  "expires_at",
]);

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
  "refreshtoken",
  "secret",
  "sessiontoken",
  "token",
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
    "purpose",
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
    && Date.parse(request.expires_at) <= Date.parse(request.created_at)
  ) {
    errors.push("request.expires_at must be later than request.created_at");
  }

  validateIdentity(request.issuer, "request.issuer", ["id"], errors);
  if (typeof request.subject_ref !== "string" || request.subject_ref.length < 3) {
    errors.push("request.subject_ref must be a non-empty reference");
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

  if (typeof request.purpose !== "string" || request.purpose.trim().length < 3) {
    errors.push("request.purpose must contain at least three characters");
  }

  if (!isPlainObject(request.task)) {
    errors.push("request.task must be an object");
  } else {
    rejectUnknownKeys(request.task, new Set(["kind", "user_visible"]), "request.task", errors);
    if (typeof request.task.kind !== "string" || request.task.kind.length === 0) {
      errors.push("request.task.kind is required");
    }
    if (typeof request.task.user_visible !== "boolean") {
      errors.push("request.task.user_visible must be boolean");
    }
  }

  if (!Array.isArray(request.selectors) || request.selectors.length === 0) {
    errors.push("request.selectors must contain at least one selector");
  } else {
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

  if (!isUniqueNameArray(request.requested_actions)) {
    errors.push("request.requested_actions must be an array of unique action names");
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

  const allowedPurposes = new Set(policy.allowed_purposes);
  const allowedSelectors = new Set(policy.allowed_selectors);
  const deniedSelectors = new Set(policy.denied_selectors || []);
  const allowedActions = new Set(policy.allowed_actions);

  const purposeAllowed = allowedPurposes.has(request.purpose);
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
  const retentionSeconds = deny
    ? 0
    : Math.min(request.retention.max_seconds, policy.max_retention_seconds);
  const onwardRequested = request.recipient.onward_disclosure === "allowed";
  const onwardAllowed = Boolean(policy.allow_onward_disclosure) && onwardRequested;

  if (!deny) {
    if (rejectedSelectors.length > 0) reasons.push("SCOPE_REDUCED");
    if (rejectedActions.length > 0) reasons.push("ACTION_REDUCED");
    if (retentionSeconds < request.retention.max_seconds) reasons.push("RETENTION_REDUCED");
    if (onwardRequested && !onwardAllowed) reasons.push("ONWARD_DISCLOSURE_DENIED");
    if (reasons.length === 0) reasons.push("REQUEST_ALLOWED");
  }

  const decision = deny
    ? "deny"
    : reasons.length === 1 && reasons[0] === "REQUEST_ALLOWED"
      ? "allow"
      : "allow_with_reductions";
  const policyDigest = digestValue(policy);
  const decisionSeed = {
    request_id: request.id,
    policy_digest: policyDigest,
    decision,
    granted_selectors: deny ? [] : grantedSelectors,
    granted_actions: deny ? [] : grantedActions,
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
    granted_selectors: deny ? [] : clone(grantedSelectors),
    denied_selectors: clone(deny ? request.selectors : rejectedSelectors),
    granted_actions: deny ? [] : grantedActions,
    denied_actions: deny ? clone(request.requested_actions) : rejectedActions,
    transform_requirements: deny ? [] : clone(policy.transform_requirements || []),
    retention: {
      mode: request.retention.mode,
      max_seconds: retentionSeconds,
    },
    onward_disclosure: onwardAllowed ? "allowed" : "forbidden",
    receipt_requirement: clone(request.receipt_requirement),
    valid_until: request.expires_at,
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
  if (!isPlainObject(decision) || decision.type !== "policy_decision") {
    throw new ContextLayerReferenceError("INVALID_POLICY_DECISION", "a policy decision is required");
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
      "a denied request cannot produce a scoped bundle",
    );
  }
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
  const context = claims
    .filter(function claimWasGranted(claim) {
      return isPlainObject(claim) && grantedPredicates.has(claim.predicate);
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
      if (!Array.isArray(claim.provenance_handles) || claim.provenance_handles.length === 0) {
        throw new ContextLayerReferenceError(
          "MISSING_PROVENANCE",
          path + ".provenance_handles must contain at least one opaque handle",
        );
      }
      if (
        typeof claim.confidence !== "number"
        || claim.confidence < 0
        || claim.confidence > 1
      ) {
        throw new ContextLayerReferenceError(
          "INVALID_CLAIM",
          path + ".confidence must be between zero and one",
        );
      }
      return clone(claim);
    });

  for (const predicate of grantedPredicates) {
    if (!context.some(function hasPredicate(claim) { return claim.predicate === predicate; })) {
      throw new ContextLayerReferenceError(
        "MISSING_GRANTED_CLAIM",
        "no claim was supplied for granted predicate " + predicate,
      );
    }
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
    purpose: request.purpose,
    issued_at: decision.created_at,
    expires_at: decision.valid_until,
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

export function writeReceipt(input) {
  assertNoSecretFields(input, "receipt input");
  rejectInputKeys(
    input,
    new Set([
      "operation",
      "request",
      "decision",
      "bundle",
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
  if (!["success", "failure", "indeterminate"].includes(outcome)) {
    throw new ContextLayerReferenceError("INVALID_OUTCOME", "receipt outcome is invalid");
  }
  if (!isDateTime(startedAt) || !isDateTime(completedAt)) {
    throw new ContextLayerReferenceError(
      "INVALID_RECEIPT_TIME",
      "receipt timestamps must be RFC 3339 date-times",
    );
  }
  if (Date.parse(completedAt) < Date.parse(startedAt)) {
    throw new ContextLayerReferenceError(
      "INVALID_RECEIPT_TIME",
      "receipt completion cannot precede its start",
    );
  }

  const receiptSeed = {
    operation: input.operation,
    request_ref: request.id,
    decision_ref: decision.id,
    bundle_ref: bundle.id,
    actor,
    outcome,
    completed_at: completedAt,
  };

  return {
    spec_version: SPEC_VERSION,
    type: "receipt",
    id: "urn:cl:receipt:" + digestValue(receiptSeed).slice(7, 31),
    created_at: completedAt,
    issuer: { id: issuer },
    operation: input.operation,
    actor,
    subject_ref: bundle.subject_alias,
    request_ref: request.id,
    decision_ref: decision.id,
    bundle_ref: bundle.id,
    started_at: startedAt,
    completed_at: completedAt,
    outcome,
    policy_snapshot: decision.policy_snapshot.digest,
    input_digest: digestValue({
      request_ref: request.id,
      decision_ref: decision.id,
    }),
    output_digest: digestValue(bundle),
    user_summary: input.user_summary || "recorded " + input.operation + " with payload omitted.",
    payload_included: false,
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
    "allowed_purposes",
    "allowed_selectors",
    "denied_selectors",
    "allowed_actions",
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
  for (const key of ["allowed_purposes", "allowed_selectors", "allowed_actions"]) {
    if (!isUniqueStringArray(policy[key])) errors.push("policy." + key + " must be unique strings");
  }
  if (policy.denied_selectors !== undefined && !isUniqueStringArray(policy.denied_selectors)) {
    errors.push("policy.denied_selectors must be unique strings");
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
    && !isUniqueStringArray(policy.transform_requirements)
  ) {
    errors.push("policy.transform_requirements must be unique strings");
  }
  if (errors.length > 0) {
    throw new ContextLayerReferenceError("INVALID_POLICY", "policy failed validation", errors);
  }
}

function validateIdentity(value, path, allowedKeys, errors) {
  if (!isPlainObject(value)) {
    errors.push(path + " must be an object");
    return;
  }
  rejectUnknownKeys(value, new Set(allowedKeys), path, errors);
  for (const key of allowedKeys) {
    if (typeof value[key] !== "string" || value[key].length < 1) {
      errors.push(path + "." + key + " is required");
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
    && /^[A-Za-z0-9._~:-]+$/.test(value);
}

function isDateTime(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function isName(value) {
  return typeof value === "string"
    && /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
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

function isUniqueStringArray(value) {
  return Array.isArray(value)
    && value.every(function nonEmptyString(entry) {
      return typeof entry === "string" && entry.length > 0;
    })
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

export { SPEC_VERSION };
