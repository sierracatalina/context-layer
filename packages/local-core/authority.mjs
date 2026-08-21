import { createHmac, timingSafeEqual } from "node:crypto";

import { canonicalStringify } from "./canonical.mjs";
import { fail } from "./errors.mjs";

const ALGORITHM = "hmac-sha256";
const MAC_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function createHmacBundleAuthority({
  keyId,
  keyProvider,
} = {}) {
  if (
    typeof keyId !== "string"
    || keyId.length < 3
    || keyId.length > 255
    || !/^[A-Za-z0-9][A-Za-z0-9._:/~-]+$/.test(keyId)
  ) {
    fail("INVALID_AUTHORITY_KEY_ID", "authority keyId must be an explicit opaque identifier");
  }
  if (!keyProvider) {
    fail("AUTHORITY_KEY_PROVIDER_REQUIRED", "bundle authority requires an external key provider");
  }
  const supplied = typeof keyProvider === "function"
    ? await keyProvider({ keyId, purpose: "context-layer.bundle-authentication" })
    : typeof keyProvider.getKey === "function"
      ? await keyProvider.getKey({ keyId, purpose: "context-layer.bundle-authentication" })
      : null;
  if (!(supplied instanceof Uint8Array)) {
    fail("INVALID_AUTHORITY_KEY_PROVIDER", "authority key provider must return a Uint8Array");
  }
  const key = Buffer.from(supplied);
  if (key.length !== 32) {
    key.fill(0);
    fail("INVALID_AUTHORITY_KEY", "HMAC authority key must contain exactly 32 bytes");
  }
  let closed = false;

  function assertOpen() {
    if (closed) fail("BUNDLE_AUTHORITY_CLOSED", "bundle authority is closed");
  }

  async function sign(payload) {
    assertOpen();
    const mac = computeMac(key, payload).toString("base64url");
    return Object.freeze({
      algorithm: ALGORITHM,
      key_id: keyId,
      mac,
    });
  }

  async function verify(payload, authentication) {
    assertOpen();
    if (
      !authentication
      || typeof authentication !== "object"
      || Array.isArray(authentication)
      || authentication.algorithm !== ALGORITHM
      || authentication.key_id !== keyId
      || typeof authentication.mac !== "string"
      || !MAC_PATTERN.test(authentication.mac)
      || Object.keys(authentication).some((field) =>
        !["algorithm", "key_id", "mac"].includes(field))
    ) {
      return false;
    }
    const suppliedMac = Buffer.from(authentication.mac, "base64url");
    const expectedMac = computeMac(key, payload);
    return suppliedMac.length === expectedMac.length && timingSafeEqual(suppliedMac, expectedMac);
  }

  function createVerifier() {
    assertOpen();
    return Object.freeze({
      algorithm: ALGORITHM,
      key_id: keyId,
      verify,
    });
  }

  function close() {
    if (!closed) key.fill(0);
    closed = true;
  }

  return Object.freeze({
    algorithm: ALGORITHM,
    key_id: keyId,
    sign,
    verify,
    createVerifier,
    close,
  });
}

function computeMac(key, payload) {
  return createHmac("sha256", key)
    .update(canonicalStringify(payload), "utf8")
    .digest();
}

export { ALGORITHM as BUNDLE_AUTHENTICATION_ALGORITHM };
