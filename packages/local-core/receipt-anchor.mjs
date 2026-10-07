import { constants } from "node:fs";
import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  KeyObject,
  randomBytes,
  sign,
  verify,
} from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import {
  canonicalStringify,
  isPlainObject,
  secureEqualText,
} from "./canonical.mjs";
import { fail } from "./errors.mjs";
import { jcsBytes } from "./jcs.mjs";

const ANCHOR_VERSION = 2;
const MAC_PREFIX = "hmac-sha256:";
const GENESIS_MAC = MAC_PREFIX + "0".repeat(64);
const SIG_PREFIX = "ed25519:";
const GENESIS_SIG = SIG_PREFIX + "0".repeat(86);
const SIG_VALUE_PATTERN = /^[A-Za-z0-9_-]{86}$/;
// PKCS#8 DER prefix for a raw 32-byte Ed25519 seed.
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const DEFAULT_LOCK_TIMEOUT_MS = 5_000;
const DEFAULT_LOCK_RETRY_MS = 10;
const ANCHOR_KEYS = Object.freeze([
  "anchor_sequence",
  "anchor_version",
  "byte_length",
  "entries",
  "file_digest",
  "log_id",
  "previous_sig",
  "sig",
  "tail_digest",
]);
const LEGACY_ANCHOR_KEYS = Object.freeze(ANCHOR_KEYS
  .filter((key) => key !== "sig" && key !== "previous_sig")
  .concat("mac", "previous_mac").sort());

export async function openReceiptAnchor({
  filePath,
  path: configuredPath,
  keyProvider = null,
  key: configuredKey = null,
  legacyHmacKey = null,
  logId,
  genesisTailDigest,
  genesisFileDigest,
  lockPath: configuredLockPath = null,
  lockTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS,
  lockRetryMs = DEFAULT_LOCK_RETRY_MS,
} = {}) {
  const target = filePath ?? configuredPath;
  if (typeof target !== "string" || target.length === 0) {
    fail("INVALID_RECEIPT_ANCHOR_PATH", "receipt anchor path is required");
  }
  requiredDigest(logId, "logId");
  requiredDigest(genesisTailDigest, "genesisTailDigest");
  requiredDigest(genesisFileDigest, "genesisFileDigest");
  validateLockTiming(lockTimeoutMs, lockRetryMs);
  if (configuredKey !== null && keyProvider !== null) {
    fail("AMBIGUOUS_RECEIPT_ANCHOR_KEY", "provide either key or keyProvider, not both");
  }

  const absolutePath = resolve(target);
  const absoluteLockPath = resolve(configuredLockPath ?? absolutePath + ".lock");
  if (absolutePath === absoluteLockPath) {
    fail("INVALID_RECEIPT_ANCHOR_LOCK_PATH", "receipt anchor and lock paths must differ");
  }
  await mkdir(dirname(absolutePath), { recursive: true, mode: 0o700 });
  await mkdir(dirname(absoluteLockPath), { recursive: true, mode: 0o700 });

  const suppliedKey = await loadKey(configuredKey, keyProvider, absolutePath);
  if (legacyHmacKey !== null && (!(legacyHmacKey instanceof Uint8Array) || legacyHmacKey.length !== 32)) {
    fail("INVALID_RECEIPT_ANCHOR_KEY", "legacyHmacKey must contain exactly 32 bytes");
  }
  const { privateKey, seed } = loadEd25519PrivateKey(suppliedKey);
  const publicKey = createPublicKey(privateKey);
  // Preserve existing 32-byte key/keyProvider configurations. A separate retired
  // HMAC key can be supplied when migrating to a different Ed25519 signing key.
  const legacyKey = legacyHmacKey === null ? seed : Buffer.from(legacyHmacKey);

  let closed = false;

  function assertOpen() {
    if (closed) fail("RECEIPT_ANCHOR_CLOSED", "receipt anchor is closed");
  }

  function computeSig(unsignedRecord) {
    assertOpen();
    const raw = sign(null, jcsBytes(unsignedRecord), privateKey);
    return SIG_PREFIX + raw.toString("base64url");
  }

  function verifySig(unsignedRecord, sig) {
    if (typeof sig !== "string" || !sig.startsWith(SIG_PREFIX)) return false;
    const raw = Buffer.from(sig.slice(SIG_PREFIX.length), "base64url");
    if (raw.length !== 64) return false;
    try {
      return verify(null, jcsBytes(unsignedRecord), publicKey, raw);
    } catch {
      return false;
    }
  }

  function verifyMac(unsignedRecord, mac) {
    if (legacyKey === null) {
      fail("RECEIPT_ANCHOR_LEGACY_KEY_REQUIRED", "legacy HMAC anchors require their original 32-byte key via legacyHmacKey");
    }
    const expected = MAC_PREFIX + createHmac("sha256", legacyKey)
      .update("context-layer/receipt-anchor/v1\0", "utf8")
      .update(canonicalStringify(unsignedRecord), "utf8")
      .digest("hex");
    return secureEqualText(mac, expected);
  }

  function createRecord({
    anchorSequence,
    entries,
    tailDigest,
    byteLength,
    fileDigest,
    previousSig,
  }) {
    const unsigned = {
      anchor_version: ANCHOR_VERSION,
      log_id: logId,
      anchor_sequence: anchorSequence,
      entries,
      tail_digest: tailDigest,
      byte_length: byteLength,
      file_digest: fileDigest,
      previous_sig: previousSig,
    };
    return { ...unsigned, sig: computeSig(unsigned) };
  }

  async function readAndVerifyAnchor() {
    assertOpen();
    const source = await readAnchorSource(absolutePath);
    if (!source.exists) return { exists: false, records: [], last: null };
    if (source.text.length === 0) {
      fail("RECEIPT_ANCHOR_EMPTY", "existing receipt anchor is empty or was truncated");
    }
    if (!source.text.endsWith("\n")) {
      fail("RECEIPT_ANCHOR_TRUNCATED", "receipt anchor does not end at a record boundary");
    }

    const lines = source.text.slice(0, -1).split("\n");
    const records = [];
    let previous = null;
    for (let index = 0; index < lines.length; index += 1) {
      let record;
      try {
        record = JSON.parse(lines[index]);
      } catch {
        fail("RECEIPT_ANCHOR_INVALID_JSON", "receipt anchor record is not valid JSON", {
          anchor_sequence: index,
        });
      }
      const legacy = validateRecordShape(record, index, logId);
      const authenticationKey = legacy ? "mac" : "sig";
      const previousKey = legacy ? "previous_mac" : "previous_sig";
      const { [authenticationKey]: authentication, ...unsigned } = record;
      if (!(legacy ? verifyMac(unsigned, authentication) : verifySig(unsigned, authentication))) {
        fail("RECEIPT_ANCHOR_AUTHENTICATION_FAILED", "receipt anchor authentication is invalid", {
          anchor_sequence: index,
        });
      }
      if (index === 0) {
        if (
          record.entries !== 0
          || record.byte_length !== 0
          || !secureEqualText(record.tail_digest, genesisTailDigest)
          || !secureEqualText(record.file_digest, genesisFileDigest)
          || !secureEqualText(record[previousKey], legacy ? GENESIS_MAC : GENESIS_SIG)
        ) {
          fail("RECEIPT_ANCHOR_INVALID_GENESIS", "receipt anchor genesis is invalid");
        }
      } else if (
        record.entries !== previous.entries + 1
        || record.anchor_version !== previous.anchor_version
        || !secureEqualText(record[previousKey], previous[authenticationKey])
      ) {
        fail("RECEIPT_ANCHOR_CHAIN_MISMATCH", "receipt anchor ordering or chain is invalid", {
          anchor_sequence: index,
        });
      }
      records.push(record);
      previous = record;
    }
    return { exists: true, records, last: previous };
  }

  async function migrateAnchor(records) {
    let previousSig = GENESIS_SIG;
    const migrated = records.map((record) => {
      const next = createRecord({
        anchorSequence: record.anchor_sequence,
        entries: record.entries,
        tailDigest: record.tail_digest,
        byteLength: record.byte_length,
        fileDigest: record.file_digest,
        previousSig,
      });
      previousSig = next.sig;
      return next;
    });
    // The caller holds the receipt-log lock. Verify the entire old chain and log
    // before replacing anything; a failed write leaves the original sidecar intact.
    const temporaryPath = absolutePath + ".migrate-" + randomBytes(16).toString("hex");
    const handle = await open(temporaryPath, "wx", 0o600);
    try {
      try {
        await handle.writeFile(migrated.map(canonicalStringify).join("\n") + "\n", "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryPath, absolutePath);
    } finally {
      await unlink(temporaryPath).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }

  async function verifyState(state, { initialize = false } = {}) {
    const normalized = normalizeLogState(state);
    const anchorState = await readAndVerifyAnchor();
    if (!anchorState.exists) {
      if (!initialize) {
        fail("RECEIPT_ANCHOR_MISSING", "authenticated receipt anchor is missing");
      }
      if (
        normalized.entries !== 0
        || normalized.byteLength !== 0
        || !secureEqualText(normalized.tailDigest, genesisTailDigest)
        || !secureEqualText(normalized.fileDigest, genesisFileDigest)
      ) {
        fail(
          "RECEIPT_ANCHOR_BOOTSTRAP_UNSAFE",
          "a missing anchor cannot be initialized for a non-empty receipt log",
        );
      }
      const genesis = createRecord({
        anchorSequence: 0,
        entries: 0,
        tailDigest: genesisTailDigest,
        byteLength: 0,
        fileDigest: genesisFileDigest,
        previousSig: GENESIS_SIG,
      });
      await appendRecord(absolutePath, genesis, { create: true });
      return {
        entries: 0,
        tailDigest: genesisTailDigest,
        byteLength: 0,
        fileDigest: genesisFileDigest,
      };
    }
    if (normalized.entries < anchorState.last.entries) {
      fail("RECEIPT_LOG_ROLLBACK", "receipt log is behind its authenticated tail anchor", {
        anchored_entries: anchorState.last.entries,
        log_entries: normalized.entries,
      });
    }
    if (normalized.entries > anchorState.last.entries) {
      fail("RECEIPT_LOG_UNANCHORED_SUFFIX", "receipt log contains entries absent from its authenticated anchor", {
        anchored_entries: anchorState.last.entries,
        log_entries: normalized.entries,
      });
    }
    if (
      !secureEqualText(anchorState.last.tail_digest, normalized.tailDigest)
      || anchorState.last.byte_length !== normalized.byteLength
      || !secureEqualText(anchorState.last.file_digest, normalized.fileDigest)
    ) {
      fail("RECEIPT_LOG_REWRITE", "receipt log bytes do not match its authenticated tail anchor", {
        entries: normalized.entries,
      });
    }
    if (initialize && anchorState.last.anchor_version === 1) {
      await migrateAnchor(anchorState.records);
    }
    return normalized;
  }

  async function advance(expectedState, nextState) {
    const expected = normalizeLogState(expectedState);
    const next = normalizeLogState(nextState);
    if (next.entries !== expected.entries + 1) {
      fail("INVALID_RECEIPT_ANCHOR_ADVANCE", "receipt anchor must advance by exactly one entry");
    }
    const anchorState = await readAndVerifyAnchor();
    if (!anchorState.exists || anchorState.last === null) {
      fail("RECEIPT_ANCHOR_MISSING", "authenticated receipt anchor is missing");
    }
    if (
      anchorState.last.entries !== expected.entries
      || !secureEqualText(anchorState.last.tail_digest, expected.tailDigest)
      || anchorState.last.byte_length !== expected.byteLength
      || !secureEqualText(anchorState.last.file_digest, expected.fileDigest)
    ) {
      fail("RECEIPT_ANCHOR_MISMATCH", "receipt anchor changed before it could be advanced");
    }
    if (anchorState.last.anchor_version !== ANCHOR_VERSION) {
      fail("RECEIPT_ANCHOR_MIGRATION_REQUIRED", "open the receipt log to migrate its legacy anchor before appending");
    }
    const record = createRecord({
      anchorSequence: anchorState.last.anchor_sequence + 1,
      entries: next.entries,
      tailDigest: next.tailDigest,
      byteLength: next.byteLength,
      fileDigest: next.fileDigest,
      previousSig: anchorState.last.sig,
    });
    await appendRecord(absolutePath, record, { create: false });
    return next;
  }

  async function withExclusiveLock(work) {
    assertOpen();
    if (typeof work !== "function") {
      fail("INVALID_RECEIPT_ANCHOR_WORK", "exclusive receipt anchor work must be callable");
    }
    const lock = await acquireLock({
      lockPath: absoluteLockPath,
      timeoutMs: lockTimeoutMs,
      retryMs: lockRetryMs,
    });
    try {
      assertOpen();
      return await work();
    } finally {
      await releaseLock(lock, absoluteLockPath);
    }
  }

  function close() {
    if (!closed) {
      if (seed) seed.fill(0);
      if (legacyKey && legacyKey !== seed) legacyKey.fill(0);
      closed = true;
    }
  }

  return Object.freeze({
    path: absolutePath,
    lock_path: absoluteLockPath,
    withExclusiveLock,
    verifyState,
    advance,
    close,
  });
}

async function loadKey(configuredKey, provider, anchorPath) {
  let value = configuredKey;
  if (value === null) {
    if (typeof provider === "function") {
      value = await provider({ anchorPath });
    } else if (provider && typeof provider.getKey === "function") {
      value = await provider.getKey({ anchorPath });
    } else {
      fail("RECEIPT_ANCHOR_KEY_REQUIRED", "a receipt anchor key or key provider is required");
    }
  }
  if (
    !(value instanceof Uint8Array)
    && !(value instanceof KeyObject)
    && typeof value !== "string"
  ) {
    fail("INVALID_RECEIPT_ANCHOR_KEY_PROVIDER", "receipt anchor key provider must return an Ed25519 private KeyObject, a 32-byte seed, or a PEM string");
  }
  return value;
}

function loadEd25519PrivateKey(supplied) {
  if (supplied instanceof KeyObject) {
    if (supplied.type !== "private" || supplied.asymmetricKeyType !== "ed25519") {
      fail("INVALID_RECEIPT_ANCHOR_KEY", "receipt anchor KeyObject must be an Ed25519 private key");
    }
    return { privateKey: supplied, seed: null };
  }
  if (typeof supplied === "string") {
    let privateKey;
    try {
      privateKey = createPrivateKey(supplied);
    } catch {
      fail("INVALID_RECEIPT_ANCHOR_KEY", "receipt anchor key PEM could not be parsed");
    }
    if (privateKey.type !== "private" || privateKey.asymmetricKeyType !== "ed25519") {
      fail("INVALID_RECEIPT_ANCHOR_KEY", "receipt anchor key must be an Ed25519 private key");
    }
    return { privateKey, seed: null };
  }
  const seed = Buffer.from(supplied);
  if (seed.length !== 32) {
    seed.fill(0);
    fail("INVALID_RECEIPT_ANCHOR_KEY", "receipt anchor Ed25519 seed must be exactly 32 bytes");
  }
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
  return { privateKey, seed };
}

async function readAnchorSource(anchorPath) {
  try {
    return { exists: true, text: await readFile(anchorPath, "utf8") };
  } catch (error) {
    if (error && error.code === "ENOENT") return { exists: false, text: "" };
    throw error;
  }
}

async function appendRecord(anchorPath, record, { create }) {
  let handle;
  try {
    handle = await open(
      anchorPath,
      create ? "ax" : constants.O_WRONLY | constants.O_APPEND,
      0o600,
    );
    await handle.writeFile(canonicalStringify(record) + "\n", { encoding: "utf8" });
    await handle.sync();
  } catch (error) {
    if (create && error && error.code === "EEXIST") {
      fail("RECEIPT_ANCHOR_INITIALIZATION_RACE", "receipt anchor appeared during initialization");
    }
    throw error;
  } finally {
    if (handle) await handle.close();
  }
}

function validateRecordShape(record, index, logId) {
  if (!isPlainObject(record)) {
    fail("RECEIPT_ANCHOR_INVALID_RECORD", "receipt anchor record must be an object", {
      anchor_sequence: index,
    });
  }
  const keys = Object.keys(record).sort();
  const legacy = record.anchor_version === 1 && Object.hasOwn(record, "mac");
  const expectedKeys = legacy ? LEGACY_ANCHOR_KEYS : ANCHOR_KEYS;
  if (keys.length !== expectedKeys.length || keys.some((key, keyIndex) => key !== expectedKeys[keyIndex])) {
    fail("RECEIPT_ANCHOR_INVALID_RECORD", "receipt anchor record has unsupported fields", {
      anchor_sequence: index,
    });
  }
  if (
    (record.anchor_version !== ANCHOR_VERSION && record.anchor_version !== 1)
    || record.anchor_sequence !== index
    || !Number.isSafeInteger(record.entries)
    || record.entries < 0
    || !Number.isSafeInteger(record.byte_length)
    || record.byte_length < 0
    || !secureEqualText(record.log_id, logId)
  ) {
    fail("RECEIPT_ANCHOR_INVALID_RECORD", "receipt anchor record metadata is invalid", {
      anchor_sequence: index,
    });
  }
  requiredDigest(record.tail_digest, "anchor.tail_digest");
  requiredDigest(record.file_digest, "anchor.file_digest");
  if (legacy) {
    for (const value of [record.previous_mac, record.mac]) {
      if (typeof value !== "string" || !/^hmac-sha256:[0-9a-f]{64}$/.test(value)) {
        fail("RECEIPT_ANCHOR_INVALID_RECORD", "legacy receipt anchor requires HMAC-SHA-256 values");
      }
    }
  } else {
    requiredSignature(record.previous_sig, "anchor.previous_sig");
    requiredSignature(record.sig, "anchor.sig");
  }
  return legacy;
}

function normalizeLogState(state) {
  if (
    !isPlainObject(state)
    || !Number.isSafeInteger(state.entries)
    || state.entries < 0
    || !Number.isSafeInteger(state.byteLength)
    || state.byteLength < 0
  ) {
    fail("INVALID_RECEIPT_ANCHOR_STATE", "receipt anchor state requires a non-negative entry count");
  }
  requiredDigest(state.tailDigest, "anchor state tailDigest");
  requiredDigest(state.fileDigest, "anchor state fileDigest");
  return {
    entries: state.entries,
    tailDigest: state.tailDigest,
    byteLength: state.byteLength,
    fileDigest: state.fileDigest,
  };
}

async function acquireLock({ lockPath, timeoutMs, retryMs }) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const token = randomBytes(16).toString("hex");
    const record = {
      lock_version: 1,
      pid: process.pid,
      token,
      created_at: new Date().toISOString(),
    };
    const serialized = canonicalStringify(record) + "\n";
    let handle;
    try {
      handle = await open(lockPath, "wx", 0o600);
      await handle.writeFile(serialized, { encoding: "utf8" });
      await handle.sync();
      return { handle, serialized };
    } catch (error) {
      if (handle) {
        try {
          await handle.close();
        } finally {
          await unlink(lockPath).catch(() => undefined);
        }
      }
      if (!await isLockContention(error, lockPath)) {
        fail("RECEIPT_ANCHOR_LOCK_FAILED", "exclusive receipt-log lock could not be acquired");
      }
      if (Date.now() >= deadline) {
        fail("RECEIPT_ANCHOR_LOCK_TIMEOUT", "exclusive receipt-log lock remained unavailable");
      }
      await delay(Math.min(retryMs, Math.max(1, deadline - Date.now())));
    }
  }
}

async function isLockContention(error, lockPath) {
  if (error?.code === "EEXIST") return true;
  if (error?.code !== "EACCES" && error?.code !== "EPERM") return false;
  try {
    await stat(lockPath);
    return true;
  } catch {
    return false;
  }
}

async function releaseLock(lock, lockPath) {
  let current;
  try {
    current = await readFile(lockPath, "utf8");
  } catch {
    await lock.handle.close().catch(() => undefined);
    fail("RECEIPT_ANCHOR_LOCK_LOST", "exclusive receipt-log lock disappeared before release");
  }
  if (!secureEqualText(current, lock.serialized)) {
    await lock.handle.close().catch(() => undefined);
    fail("RECEIPT_ANCHOR_LOCK_LOST", "exclusive receipt-log lock ownership changed unexpectedly");
  }
  await lock.handle.close();
  try {
    await unlink(lockPath);
  } catch {
    fail("RECEIPT_ANCHOR_LOCK_RELEASE_FAILED", "exclusive receipt-log lock could not be released");
  }
}

function validateLockTiming(timeoutMs, retryMs) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > 60_000) {
    fail("INVALID_RECEIPT_ANCHOR_LOCK_TIMEOUT", "lockTimeoutMs must be between 0 and 60000");
  }
  if (!Number.isSafeInteger(retryMs) || retryMs <= 0 || retryMs > 1_000) {
    fail("INVALID_RECEIPT_ANCHOR_LOCK_RETRY", "lockRetryMs must be between 1 and 1000");
  }
}

function requiredDigest(value, label) {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    fail("INVALID_RECEIPT_ANCHOR_DIGEST", label + " must be a lowercase SHA-256 digest");
  }
  return value;
}

function requiredSignature(value, label) {
  if (
    typeof value !== "string"
    || !value.startsWith(SIG_PREFIX)
    || !SIG_VALUE_PATTERN.test(value.slice(SIG_PREFIX.length))
  ) {
    fail("INVALID_RECEIPT_ANCHOR_SIGNATURE", label + " must be an Ed25519 signature value");
  }
  return value;
}

export {
  ANCHOR_VERSION as RECEIPT_ANCHOR_VERSION,
  DEFAULT_LOCK_RETRY_MS as RECEIPT_ANCHOR_DEFAULT_LOCK_RETRY_MS,
  DEFAULT_LOCK_TIMEOUT_MS as RECEIPT_ANCHOR_DEFAULT_LOCK_TIMEOUT_MS,
};
