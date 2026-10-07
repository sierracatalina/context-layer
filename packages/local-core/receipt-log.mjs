import { mkdir, open, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  canonicalStringify,
  cloneJson,
  containsForbiddenRawMaterial,
  deepFreeze,
  digestJson,
  digestText,
  finalizeCanonicalRecord,
  isPlainObject,
  nowIso,
  requirePlainObject,
  secureEqualText,
  verifyCanonicalRecord,
} from "./canonical.mjs";
import { LocalCoreError, fail } from "./errors.mjs";
import { openReceiptAnchor } from "./receipt-anchor.mjs";

const SPEC_VERSION = "context-layer/0.2-draft";
const LOG_VERSION = 1;
const RECEIPT_PREFIX = "urn:cl:receipt:";
const GENESIS_DIGEST = "sha256:" + "0".repeat(64);
const NAME_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const RECEIPT_ID_PATTERN = /^urn:cl:receipt:[A-Za-z0-9._~-]+$/;
const SUBJECT_REF_PATTERN = /^urn:cl:alias:[A-Za-z0-9._~-]+$/;
const REQUEST_REF_PATTERN = /^urn:cl:request:[A-Za-z0-9._~-]+$/;
const DECISION_REF_PATTERN = /^urn:cl:decision:[A-Za-z0-9._~-]+$/;
const BUNDLE_REF_PATTERN = /^urn:cl:bundle:[A-Za-z0-9._~-]+$/;
const RFC3339_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;
const RECEIPT_KEYS = new Set([
  "spec_version",
  "type",
  "id",
  "created_at",
  "issuer",
  "operation",
  "actor",
  "subject_ref",
  "request_ref",
  "decision_ref",
  "bundle_ref",
  "supersedes_ref",
  "started_at",
  "completed_at",
  "outcome",
  "policy_snapshot",
  "input_digest",
  "output_digest",
  "user_summary",
  "metadata",
  "payload_included",
  "integrity",
]);
const REQUIRED_RECEIPT_KEYS = [
  "spec_version",
  "type",
  "id",
  "created_at",
  "issuer",
  "operation",
  "actor",
  "subject_ref",
  "request_ref",
  "decision_ref",
  "bundle_ref",
  "started_at",
  "completed_at",
  "outcome",
  "policy_snapshot",
  "input_digest",
  "output_digest",
  "user_summary",
  "payload_included",
];
const RECEIPT_OUTCOMES = new Set(["success", "failure", "indeterminate"]);

export function createOperationReceipt({
  operation,
  actor,
  subjectRef,
  requestRef = null,
  decisionRef = null,
  bundleRef = null,
  supersedesRef,
  startedAt = null,
  completedAt = null,
  outcome,
  policySnapshot = null,
  inputDigest = null,
  outputDigest = null,
  userSummary,
  metadata = {},
  issuer = { id: "urn:cl:receipt-writer:local" },
  clock = () => new Date(),
} = {}) {
  const createdAt = nowIso(clock);
  const receipt = finalizeCanonicalRecord({
    spec_version: SPEC_VERSION,
    type: "receipt",
    created_at: createdAt,
    issuer: cloneJson(issuer),
    operation: requiredString(operation, "operation"),
    actor: requiredString(actor, "actor"),
    subject_ref: requiredString(subjectRef, "subjectRef"),
    request_ref: optionalString(requestRef, "requestRef"),
    decision_ref: optionalString(decisionRef, "decisionRef"),
    bundle_ref: optionalString(bundleRef, "bundleRef"),
    ...(supersedesRef === undefined
      ? {}
      : { supersedes_ref: requireOptionalPattern(
        supersedesRef,
        RECEIPT_ID_PATTERN,
        "supersedesRef",
      ) }),
    started_at: normalizeTimestamp(startedAt ?? createdAt, "startedAt"),
    completed_at: normalizeTimestamp(completedAt ?? createdAt, "completedAt"),
    outcome: requiredString(outcome, "outcome"),
    policy_snapshot: optionalDigest(policySnapshot, "policySnapshot"),
    input_digest: inputDigest === null ? digestJson(null) : requiredDigest(inputDigest, "inputDigest"),
    output_digest: outputDigest === null ? digestJson(null) : requiredDigest(outputDigest, "outputDigest"),
    payload_included: false,
    user_summary: requiredString(userSummary, "userSummary"),
    metadata: cloneJson(requirePlainObject(metadata, "metadata")),
  }, RECEIPT_PREFIX);
  validateReceipt(receipt);
  return deepFreeze(receipt);
}

export async function openReceiptLog({
  filePath,
  path: configuredPath,
  anchor,
} = {}) {
  const target = filePath ?? configuredPath;
  if (typeof target !== "string" || target.length === 0) {
    fail("INVALID_RECEIPT_LOG_PATH", "receipt log path is required");
  }
  const absolutePath = resolve(target);
  await mkdir(dirname(absolutePath), { recursive: true, mode: 0o700 });
  let receiptAnchor;
  let closed = false;
  let queue = Promise.resolve();

  try {
    receiptAnchor = await openAnchorForLog(absolutePath, anchor);
    await receiptAnchor.withExclusiveLock(async () => {
      const state = await readAndVerify(absolutePath);
      await receiptAnchor.verifyState(toAnchorState(state), { initialize: true });
    });
  } catch (error) {
    if (receiptAnchor) receiptAnchor.close();
    throw error;
  }

  function assertOpen() {
    if (closed) fail("RECEIPT_LOG_CLOSED", "receipt log is closed");
  }

  function serialize(work) {
    const operation = queue.then(work, work);
    queue = operation.catch(() => undefined);
    return operation;
  }

  async function preflight() {
    return serialize(async () => {
      assertOpen();
      return receiptAnchor.withExclusiveLock(async () => {
        const state = await readAndVerify(absolutePath);
        await receiptAnchor.verifyState(toAnchorState(state));
        return deepFreeze({
          ok: true,
          authenticated_anchor: true,
          entries: state.entries.length,
          tail_digest: state.tailDigest,
        });
      });
    });
  }

  async function append(receipt) {
    return serialize(async () => {
      assertOpen();
      validateReceipt(receipt);
      return receiptAnchor.withExclusiveLock(async () => {
        const state = await readAndVerify(absolutePath);
        const anchoredState = toAnchorState(state);
        await receiptAnchor.verifyState(anchoredState);
        if (
          receipt.operation === "bundle.consume"
          && receipt.outcome === "success"
          && state.entries.some((entry) =>
            entry.receipt.operation === "bundle.consume"
            && entry.receipt.outcome === "success"
            && entry.receipt.actor === receipt.actor
            && entry.receipt.bundle_ref === receipt.bundle_ref)
        ) {
          fail("RECEIPT_REPLAY_CONFLICT", "bundle consumption was already recorded");
        }
        const unsignedEntry = {
          log_version: LOG_VERSION,
          sequence: state.entries.length + 1,
          previous_entry_digest: state.tailDigest,
          receipt: cloneJson(receipt),
        };
        const entry = {
          ...unsignedEntry,
          entry_digest: digestJson(unsignedEntry),
        };
        await appendEntry(absolutePath, entry);
        const nextState = await readAndVerify(absolutePath);
        if (
          nextState.entries.length !== entry.sequence
          || !secureEqualText(nextState.tailDigest, entry.entry_digest)
        ) {
          fail("RECEIPT_LOG_APPEND_AMBIGUOUS", "receipt log append did not produce the expected state");
        }
        await receiptAnchor.advance(anchoredState, toAnchorState(nextState));
        return deepFreeze(cloneJson(entry));
      });
    });
  }

  async function verify() {
    return serialize(async () => {
      assertOpen();
      return receiptAnchor.withExclusiveLock(async () => {
        const state = await readAndVerify(absolutePath);
        await receiptAnchor.verifyState(toAnchorState(state));
        return deepFreeze({
          ok: true,
          authenticated_anchor: true,
          entries: state.entries.length,
          tail_digest: state.tailDigest,
        });
      });
    });
  }

  async function receipts() {
    return serialize(async () => {
      assertOpen();
      return receiptAnchor.withExclusiveLock(async () => {
        const state = await readAndVerify(absolutePath);
        await receiptAnchor.verifyState(toAnchorState(state));
        return deepFreeze(state.entries.map((entry) => cloneJson(entry.receipt)));
      });
    });
  }

  async function close() {
    return serialize(async () => {
      if (closed) return;
      receiptAnchor.close();
      closed = true;
    });
  }

  return Object.freeze({
    path: absolutePath,
    preflight,
    append,
    verify,
    receipts,
    close,
  });
}

export async function verifyReceiptLog(filePath, { anchor } = {}) {
  const absolutePath = resolve(filePath);
  const receiptAnchor = await openAnchorForLog(absolutePath, anchor);
  try {
    return await receiptAnchor.withExclusiveLock(async () => {
      const state = await readAndVerify(absolutePath);
      await receiptAnchor.verifyState(toAnchorState(state));
      return {
        ok: true,
        authenticated_anchor: true,
        entries: state.entries.length,
        tail_digest: state.tailDigest,
      };
    });
  } finally {
    receiptAnchor.close();
  }
}

export function validateReceipt(receipt) {
  requirePlainObject(receipt, "receipt");
  requireExactKeys(receipt, RECEIPT_KEYS, REQUIRED_RECEIPT_KEYS, "receipt");
  verifyCanonicalRecord(receipt, RECEIPT_PREFIX);
  validateIntegrity(receipt.integrity);
  if (receipt.spec_version !== SPEC_VERSION || receipt.type !== "receipt") {
    fail("INVALID_RECEIPT", "receipt type or version is unsupported");
  }
  requirePattern(receipt.id, RECEIPT_ID_PATTERN, "receipt.id");
  requireExactKeys(receipt.issuer, new Set(["id"]), ["id"], "receipt.issuer");
  requireBoundedString(receipt.issuer.id, 3, 512, "receipt.issuer.id");
  requirePattern(receipt.operation, NAME_PATTERN, "receipt.operation");
  requireBoundedString(receipt.actor, 3, 512, "receipt.actor");
  requirePattern(receipt.subject_ref, SUBJECT_REF_PATTERN, "receipt.subject_ref");
  requireOptionalPattern(receipt.request_ref, REQUEST_REF_PATTERN, "receipt.request_ref");
  requireOptionalPattern(receipt.decision_ref, DECISION_REF_PATTERN, "receipt.decision_ref");
  requireOptionalPattern(receipt.bundle_ref, BUNDLE_REF_PATTERN, "receipt.bundle_ref");
  if (Object.hasOwn(receipt, "supersedes_ref")) {
    requireOptionalPattern(
      receipt.supersedes_ref,
      RECEIPT_ID_PATTERN,
      "receipt.supersedes_ref",
    );
  }
  if (!RECEIPT_OUTCOMES.has(receipt.outcome)) {
    fail("INVALID_RECEIPT", "receipt.outcome must be success, failure, or indeterminate");
  }
  const startedAt = requireRfc3339(receipt.started_at, "receipt.started_at");
  const completedAt = requireRfc3339(receipt.completed_at, "receipt.completed_at");
  requireRfc3339(receipt.created_at, "receipt.created_at");
  if (completedAt < startedAt) {
    fail("INVALID_RECEIPT_TIME_RANGE", "receipt completion cannot precede its start");
  }
  requiredDigest(receipt.input_digest, "receipt.input_digest");
  requiredDigest(receipt.output_digest, "receipt.output_digest");
  if (receipt.policy_snapshot !== null) requiredDigest(receipt.policy_snapshot, "receipt.policy_snapshot");
  requireBoundedString(receipt.user_summary, 1, 500, "receipt.user_summary");
  if (Object.hasOwn(receipt, "metadata")) validateMetadata(receipt.metadata);
  if (receipt.payload_included !== false) {
    fail("RECEIPT_PAYLOAD_FORBIDDEN", "local receipts must declare payload_included as false");
  }
  if (containsForbiddenRawMaterial(receipt)) {
    fail("RECEIPT_CONTAINS_FORBIDDEN_MATERIAL", "receipt contains raw vault material or a secret field");
  }
  return true;
}

async function readAndVerify(filePath) {
  let source;
  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        entries: [],
        tailDigest: GENESIS_DIGEST,
        byteLength: 0,
        fileDigest: digestText(""),
      };
    }
    throw error;
  }
  if (source.length === 0) {
    return {
      entries: [],
      tailDigest: GENESIS_DIGEST,
      byteLength: 0,
      fileDigest: digestText(""),
    };
  }
  if (!source.endsWith("\n")) {
    fail("RECEIPT_LOG_TRUNCATED", "receipt log does not end at an entry boundary");
  }
  const lines = source.slice(0, -1).split("\n");
  const entries = [];
  let previous = GENESIS_DIGEST;
  for (let index = 0; index < lines.length; index += 1) {
    let entry;
    try {
      entry = JSON.parse(lines[index]);
    } catch {
      throw new LocalCoreError("RECEIPT_LOG_INVALID_JSON", "receipt log entry is not valid JSON", {
        sequence: index + 1,
      });
    }
    if (!isPlainObject(entry)) {
      fail("RECEIPT_LOG_INVALID_ENTRY", "receipt log entry must be an object", { sequence: index + 1 });
    }
    const { entry_digest: entryDigest, ...unsigned } = entry;
    const expectedDigest = digestJson(unsigned);
    if (
      entry.log_version !== LOG_VERSION
      || entry.sequence !== index + 1
      || !secureEqualText(entry.previous_entry_digest, previous)
      || !secureEqualText(entryDigest, expectedDigest)
    ) {
      fail("RECEIPT_LOG_CHAIN_MISMATCH", "receipt log integrity or ordering check failed", {
        sequence: index + 1,
      });
    }
    validateReceipt(entry.receipt);
    entries.push(entry);
    previous = entryDigest;
  }
  return {
    entries,
    tailDigest: previous,
    byteLength: Buffer.byteLength(source, "utf8"),
    fileDigest: digestText(source),
  };
}

async function appendEntry(filePath, entry) {
  const handle = await open(filePath, "a", 0o600);
  try {
    await handle.writeFile(canonicalStringify(entry) + "\n", { encoding: "utf8" });
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function openAnchorForLog(logPath, anchor) {
  if (!isPlainObject(anchor)) {
    fail("RECEIPT_ANCHOR_REQUIRED", "durable receipt logs require an authenticated external anchor");
  }
  const anchorPath = anchor.filePath ?? anchor.path;
  if (typeof anchorPath !== "string" || anchorPath.length === 0) {
    fail("INVALID_RECEIPT_ANCHOR_PATH", "receipt anchor path is required");
  }
  if (resolve(anchorPath) === logPath) {
    fail("INVALID_RECEIPT_ANCHOR_PATH", "receipt log and anchor paths must differ");
  }
  return openReceiptAnchor({
    filePath: anchorPath,
    key: anchor.key ?? null,
    keyProvider: anchor.keyProvider ?? null,
    legacyHmacKey: anchor.legacyHmacKey ?? null,
    logId: digestJson({ receipt_log_path: logPath }),
    genesisTailDigest: GENESIS_DIGEST,
    genesisFileDigest: digestText(""),
    lockPath: logPath + ".lock",
    lockTimeoutMs: anchor.lockTimeoutMs,
    lockRetryMs: anchor.lockRetryMs,
  });
}

function toAnchorState(state) {
  return {
    entries: state.entries.length,
    tailDigest: state.tailDigest,
    byteLength: state.byteLength,
    fileDigest: state.fileDigest,
  };
}

function normalizeTimestamp(value, label) {
  return new Date(requireRfc3339(value, label)).toISOString();
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail("INVALID_STRING", label + " must be a non-empty string");
  return value;
}

function optionalString(value, label) {
  if (value === null) return null;
  return requiredString(value, label);
}

function requiredDigest(value, label) {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    fail("INVALID_DIGEST", label + " must be a lowercase SHA-256 digest");
  }
  return value;
}

function optionalDigest(value, label) {
  if (value === null) return null;
  return requiredDigest(value, label);
}

function requireExactKeys(value, allowedKeys, requiredKeys, label) {
  requirePlainObject(value, label);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      fail("INVALID_RECEIPT", label + " contains unsupported key " + key);
    }
  }
  for (const key of requiredKeys) {
    if (!Object.hasOwn(value, key)) {
      fail("INVALID_RECEIPT", label + " is missing required key " + key);
    }
  }
  return value;
}

function requireBoundedString(value, minimum, maximum, label) {
  if (typeof value !== "string" || value.length < minimum || value.length > maximum) {
    fail("INVALID_RECEIPT", label + " must be a string between " + minimum + " and " + maximum + " characters");
  }
  return value;
}

function requirePattern(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail("INVALID_RECEIPT", label + " has an invalid format");
  }
  return value;
}

function requireOptionalPattern(value, pattern, label) {
  if (value === null) return null;
  return requirePattern(value, pattern, label);
}

function validateMetadata(metadata) {
  requirePlainObject(metadata, "receipt.metadata");
  const entries = Object.entries(metadata);
  if (entries.length > 16) {
    fail("INVALID_RECEIPT", "receipt.metadata cannot contain more than 16 entries");
  }
  for (const [key, value] of entries) {
    requirePattern(key, NAME_PATTERN, "receipt.metadata key");
    requireBoundedString(value, 1, 512, "receipt.metadata." + key);
  }
}

function validateIntegrity(integrity) {
  requireExactKeys(
    integrity,
    new Set(["algorithm", "digest"]),
    ["algorithm", "digest"],
    "receipt.integrity",
  );
  if (integrity.algorithm !== "sha-256") {
    fail("INVALID_RECEIPT", "receipt.integrity.algorithm must be sha-256");
  }
  requiredDigest(integrity.digest, "receipt.integrity.digest");
}

function requireRfc3339(value, label) {
  if (typeof value !== "string") {
    fail("INVALID_DATE_TIME", label + " must be an RFC 3339 timestamp");
  }
  const match = RFC3339_PATTERN.exec(value);
  if (!match) {
    fail("INVALID_DATE_TIME", label + " must be an RFC 3339 timestamp");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = match[7] ?? "";
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [0, 31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    month < 1
    || month > 12
    || day < 1
    || day > daysInMonth[month]
    || hour > 23
    || minute > 59
    || second > 60
    || (second === 60 && (hour !== 23 || minute !== 59))
    || offsetHour > 23
    || offsetMinute > 59
  ) {
    fail("INVALID_DATE_TIME", label + " must be an RFC 3339 timestamp");
  }
  const instant = new Date(0);
  instant.setUTCFullYear(year, month - 1, day);
  instant.setUTCHours(hour, minute, Math.min(second, 59), Number((fraction + "000").slice(0, 3)));
  let timestamp = instant.getTime() + (second === 60 ? 1_000 : 0);
  if (match[8]) {
    const offset = (offsetHour * 60 + offsetMinute) * 60_000;
    timestamp += match[8] === "+" ? -offset : offset;
  }
  if (!Number.isFinite(timestamp)) {
    fail("INVALID_DATE_TIME", label + " must be an RFC 3339 timestamp");
  }
  return timestamp;
}

export {
  GENESIS_DIGEST as RECEIPT_LOG_GENESIS_DIGEST,
  LOG_VERSION as RECEIPT_LOG_VERSION,
};
