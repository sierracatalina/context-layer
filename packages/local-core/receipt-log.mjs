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
  requireDate,
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

export function createOperationReceipt({
  operation,
  actor,
  subjectRef,
  requestRef = null,
  decisionRef = null,
  bundleRef = null,
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
  verifyCanonicalRecord(receipt, RECEIPT_PREFIX);
  if (receipt.spec_version !== SPEC_VERSION || receipt.type !== "receipt") {
    fail("INVALID_RECEIPT", "receipt type or version is unsupported");
  }
  for (const key of ["operation", "actor", "subject_ref", "outcome", "user_summary"]) {
    requiredString(receipt[key], "receipt." + key);
  }
  normalizeTimestamp(receipt.started_at, "receipt.started_at");
  normalizeTimestamp(receipt.completed_at, "receipt.completed_at");
  normalizeTimestamp(receipt.created_at, "receipt.created_at");
  if (Date.parse(receipt.completed_at) < Date.parse(receipt.started_at)) {
    fail("INVALID_RECEIPT_TIME_RANGE", "receipt completion cannot precede its start");
  }
  requiredDigest(receipt.input_digest, "receipt.input_digest");
  requiredDigest(receipt.output_digest, "receipt.output_digest");
  if (receipt.policy_snapshot !== null) requiredDigest(receipt.policy_snapshot, "receipt.policy_snapshot");
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
  requireDate(value, label);
  return new Date(Date.parse(value)).toISOString();
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

export {
  GENESIS_DIGEST as RECEIPT_LOG_GENESIS_DIGEST,
  LOG_VERSION as RECEIPT_LOG_VERSION,
};
