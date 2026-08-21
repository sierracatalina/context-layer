import { createHash, timingSafeEqual } from "node:crypto";

import { fail } from "./errors.mjs";

export function canonicalStringify(value) {
  const ancestors = new Set();

  function encode(current, path) {
    if (current === null) return "null";
    if (typeof current === "string" || typeof current === "boolean") {
      return JSON.stringify(current);
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) fail("NON_JSON_VALUE", path + " must be a finite number");
      return JSON.stringify(current);
    }
    if (Array.isArray(current)) {
      if (ancestors.has(current)) fail("CYCLIC_JSON", path + " contains a cycle");
      ancestors.add(current);
      const encoded = "[" + current.map((entry, index) => encode(entry, path + "[" + index + "]")).join(",") + "]";
      ancestors.delete(current);
      return encoded;
    }
    if (isPlainObject(current)) {
      if (ancestors.has(current)) fail("CYCLIC_JSON", path + " contains a cycle");
      ancestors.add(current);
      const entries = Object.keys(current).sort().map((key) => {
        const entry = current[key];
        if (entry === undefined || typeof entry === "function" || typeof entry === "symbol" || typeof entry === "bigint") {
          fail("NON_JSON_VALUE", path + "." + key + " is not JSON-serializable");
        }
        return JSON.stringify(key) + ":" + encode(entry, path + "." + key);
      });
      ancestors.delete(current);
      return "{" + entries.join(",") + "}";
    }
    fail("NON_JSON_VALUE", path + " is not JSON-serializable");
  }

  return encode(value, "$");
}

export function sha256Bytes(value) {
  return createHash("sha256").update(value).digest();
}

export function sha256Hex(value) {
  return sha256Bytes(value).toString("hex");
}

export function digestJson(value) {
  return "sha256:" + sha256Hex(canonicalStringify(value));
}

export function digestText(value) {
  return "sha256:" + sha256Hex(value);
}

export function cloneJson(value) {
  return JSON.parse(canonicalStringify(value));
}

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function requirePlainObject(value, label) {
  if (!isPlainObject(value)) fail("INVALID_OBJECT", label + " must be a plain object");
  return value;
}

export function requireDate(value, label) {
  const timestamp = typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(timestamp)) fail("INVALID_DATE_TIME", label + " must be an RFC 3339 timestamp");
  return timestamp;
}

export function nowIso(clock) {
  const value = typeof clock === "function" ? clock() : new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) fail("INVALID_CLOCK", "clock returned an invalid date");
  return date.toISOString();
}

export function uniqueStrings(values, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || value.length === 0)) {
    fail("INVALID_STRING_LIST", label + " must contain non-empty strings");
  }
  return [...new Set(values)];
}

export function secureEqualText(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function finalizeCanonicalRecord(unsignedRecord, idPrefix) {
  requirePlainObject(unsignedRecord, "unsigned record");
  if (typeof idPrefix !== "string" || idPrefix.length === 0) {
    fail("INVALID_ID_PREFIX", "record ID prefix is required");
  }
  const unsigned = cloneJson(unsignedRecord);
  const digest = digestJson(unsigned);
  return {
    ...unsigned,
    id: idPrefix + digest.slice("sha256:".length),
    integrity: { algorithm: "sha-256", digest },
  };
}

export function verifyCanonicalRecord(record, idPrefix) {
  requirePlainObject(record, "record");
  const { id, integrity, ...unsigned } = record;
  if (!isPlainObject(integrity) || integrity.algorithm !== "sha-256") {
    fail("INVALID_RECORD_INTEGRITY", "record integrity metadata is missing or unsupported");
  }
  const digest = digestJson(unsigned);
  const expectedId = idPrefix + digest.slice("sha256:".length);
  if (!secureEqualText(integrity.digest, digest) || !secureEqualText(id, expectedId)) {
    fail("RECORD_INTEGRITY_MISMATCH", "record canonical digest or ID does not match its contents");
  }
  return true;
}

export function containsForbiddenRawMaterial(value) {
  const serialized = canonicalStringify(value);
  if (/vault:\/\//i.test(serialized)) return true;
  const forbiddenKey = /^(?:raw[_-]?(?:payload|source|vault)|(?:direct|raw)[_-]?vault[_-]?(?:write|object|data|ref|id)|(?:encryption|private|secret|signing|service[_-]?account|ssh[_-]?private)[_-]?key|passphrase|password|authorization|credentials?|secret|token|cookies?|api[_-]?key|(?:access|refresh|session|auth|oauth|bearer|id|private|personal[_-]?access|csrf)[_-]?token|(?:client|consumer|webhook)[_-]?secret|client[_-]?assertion|connection[_-]?string|database[_-]?url)$/i;
  const seen = new Set();
  const visit = (current) => {
    if (!current || typeof current !== "object" || seen.has(current)) return false;
    seen.add(current);
    if (Array.isArray(current)) return current.some(visit);
    return Object.entries(current).some(([key, entry]) => forbiddenKey.test(key) || visit(entry));
  };
  return visit(value);
}
