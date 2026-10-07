// Minimal RFC 8785 (JSON Canonicalization Scheme) implementation.
//
// Used for all Ed25519 signature payloads in local-core. This module is
// intentionally separate from `canonicalStringify` (canonical.mjs): the
// existing canonical form is load-bearing for record IDs and digests, while
// signatures require byte-exact RFC 8785 output for cross-implementation
// verification.
//
// RFC 8785 section 3 rules implemented here:
// - UTF-8 output, no insignificant whitespace.
// - Object properties sorted by UTF-16 code units (JavaScript default string order).
// - Numbers serialized per ECMAScript Number-to-String (JSON.stringify semantics;
//   -0 serializes as "0").
// - Strings: JSON escaping, preserving valid Unicode scalars (including astral
//   characters) and rejecting lone surrogates.
// - NaN and Infinity are rejected; callers must reject duplicate names when parsing.

import { fail } from "./errors.mjs";

const SHORT_ESCAPES = {
  '"': '\\"',
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
};

function encodeString(value) {
  let out = '"';
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    const short = SHORT_ESCAPES[value[index]];
    if (short !== undefined) {
      out += short;
      continue;
    }
    if (unit < 0x20) {
      out += "\\u00" + unit.toString(16).padStart(2, "0");
      continue;
    }
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = value.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        out += value[index] + value[index + 1];
        index += 1;
        continue;
      }
      fail("NON_JSON_VALUE", "JCS strings must not contain lone surrogates");
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) {
      fail("NON_JSON_VALUE", "JCS strings must not contain lone surrogates");
    }
    out += value[index];
  }
  return out + '"';
}

function encodeNumber(value, path) {
  if (!Number.isFinite(value)) {
    fail("NON_JSON_VALUE", path + " must be a finite number");
  }
  return JSON.stringify(value);
}

export function jcsStringify(value) {
  const ancestors = new Set();

  function encode(current, path) {
    if (current === null) return "null";
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "string") return encodeString(current);
    if (typeof current === "number") return encodeNumber(current, path);
    if (Array.isArray(current)) {
      if (ancestors.has(current)) fail("CYCLIC_JSON", path + " contains a cycle");
      ancestors.add(current);
      const encoded = "[" + current.map((entry, index) => encode(entry, path + "[" + index + "]")).join(",") + "]";
      ancestors.delete(current);
      return encoded;
    }
    if (current !== null && typeof current === "object") {
      const prototype = Object.getPrototypeOf(current);
      if (prototype !== Object.prototype && prototype !== null) {
        fail("NON_JSON_VALUE", path + " is not a plain JSON object");
      }
      if (ancestors.has(current)) fail("CYCLIC_JSON", path + " contains a cycle");
      ancestors.add(current);
      // Default sort orders UTF-16 code units, matching RFC 8785 3.2.3.
      const entries = Object.keys(current).sort().map((key) => {
        const entry = current[key];
        if (entry === undefined || typeof entry === "function" || typeof entry === "symbol" || typeof entry === "bigint") {
          fail("NON_JSON_VALUE", path + "." + key + " is not JSON-serializable");
        }
        return encodeString(key) + ":" + encode(entry, path + "." + key);
      });
      ancestors.delete(current);
      return "{" + entries.join(",") + "}";
    }
    fail("NON_JSON_VALUE", path + " is not JSON-serializable");
  }

  return encode(value, "$");
}

export function jcsBytes(value) {
  return Buffer.from(jcsStringify(value), "utf8");
}
