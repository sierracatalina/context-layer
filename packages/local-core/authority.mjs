// Ed25519 bundle authority.
//
// Bundles are authenticated with Ed25519 over RFC 8785 (JCS) canonical JSON,
// so any recipient holding the issuer's public key can verify a bundle
// independently. The legacy shared-secret HMAC verifier remains available for
// reading old bundles only; this module never signs with HMAC.

import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  sign,
  timingSafeEqual,
  verify,
  KeyObject,
} from "node:crypto";

import { canonicalStringify, isPlainObject } from "./canonical.mjs";
import { fail } from "./errors.mjs";
import { jcsBytes } from "./jcs.mjs";

const ALGORITHM = "Ed25519";
const LEGACY_ALGORITHM = "hmac-sha256";
const SIG_PATTERN = /^[A-Za-z0-9_-]{86}$/;
const LEGACY_MAC_PATTERN = /^[A-Za-z0-9_-]{43}$/;
// PKCS#8 DER prefix for a raw 32-byte Ed25519 seed.
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function requireKeyId(keyId) {
  if (
    typeof keyId !== "string"
    || keyId.length < 3
    || keyId.length > 255
    || !/^[A-Za-z0-9][A-Za-z0-9._:/~-]+$/.test(keyId)
  ) {
    fail("INVALID_AUTHORITY_KEY_ID", "authority keyId must be an explicit opaque identifier");
  }
}

function loadEd25519PrivateKey(supplied) {
  if (supplied instanceof KeyObject) {
    if (supplied.type !== "private" || supplied.asymmetricKeyType !== "ed25519") {
      fail("INVALID_AUTHORITY_KEY", "authority KeyObject must be an Ed25519 private key");
    }
    return { privateKey: supplied, seed: null };
  }
  if (typeof supplied === "string") {
    let privateKey;
    try {
      privateKey = createPrivateKey(supplied);
    } catch {
      fail("INVALID_AUTHORITY_KEY", "authority key PEM could not be parsed");
    }
    if (privateKey.type !== "private" || privateKey.asymmetricKeyType !== "ed25519") {
      fail("INVALID_AUTHORITY_KEY", "authority key must be an Ed25519 private key");
    }
    return { privateKey, seed: null };
  }
  if (supplied instanceof Uint8Array) {
    const seed = Buffer.from(supplied);
    if (seed.length !== 32) {
      seed.fill(0);
      fail("INVALID_AUTHORITY_KEY", "Ed25519 authority seed must contain exactly 32 bytes");
    }
    const privateKey = createPrivateKey({
      key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
      format: "der",
      type: "pkcs8",
    });
    return { privateKey, seed };
  }
  fail("INVALID_AUTHORITY_KEY_PROVIDER", "authority key provider must return an Ed25519 private KeyObject, a 32-byte seed, or a PEM string");
}

async function resolveKeyProvider(keyProvider, keyId) {
  const supplied = typeof keyProvider === "function"
    ? await keyProvider({ keyId, purpose: "context-layer.bundle-authentication" })
    : typeof keyProvider.getKey === "function"
      ? await keyProvider.getKey({ keyId, purpose: "context-layer.bundle-authentication" })
      : null;
  if (supplied === null || supplied === undefined) {
    fail("INVALID_AUTHORITY_KEY_PROVIDER", "authority key provider returned no key material");
  }
  return supplied;
}

function isEd25519Authentication(authentication) {
  return (
    isPlainObject(authentication)
    && authentication.algorithm === ALGORITHM
    && typeof authentication.sig === "string"
    && SIG_PATTERN.test(authentication.sig)
    && Object.keys(authentication).every((key) => ["algorithm", "kid", "sig"].includes(key))
  );
}

export async function createEd25519BundleAuthority({
  keyId,
  keyProvider,
} = {}) {
  requireKeyId(keyId);
  if (!keyProvider) {
    fail("AUTHORITY_KEY_PROVIDER_REQUIRED", "bundle authority requires an external key provider");
  }
  const { privateKey, seed } = loadEd25519PrivateKey(await resolveKeyProvider(keyProvider, keyId));
  const publicKey = createPublicKey(privateKey);
  let closed = false;

  function assertOpen() {
    if (closed) fail("BUNDLE_AUTHORITY_CLOSED", "bundle authority is closed");
  }

  function checkAuthentication(bundle, authentication) {
    if (
      !isEd25519Authentication(authentication)
      || authentication.kid !== keyId
    ) {
      return false;
    }
    const raw = Buffer.from(authentication.sig, "base64url");
    if (raw.length !== 64) return false;
    try {
      return verify(null, jcsBytes(bundle), publicKey, raw);
    } catch {
      return false;
    }
  }

  async function signBundle(bundle) {
    assertOpen();
    const raw = sign(null, jcsBytes(bundle), privateKey);
    return Object.freeze({
      algorithm: ALGORITHM,
      kid: keyId,
      sig: raw.toString("base64url"),
    });
  }

  async function verifyBundle(bundle, authentication) {
    assertOpen();
    return checkAuthentication(bundle, authentication);
  }

  function createVerifier() {
    assertOpen();
    return Object.freeze({
      algorithm: ALGORITHM,
      kid: keyId,
      verify: async (bundle, authentication) => {
        assertOpen();
        return checkAuthentication(bundle, authentication);
      },
    });
  }

  function close() {
    if (!closed) {
      if (seed) seed.fill(0);
      closed = true;
    }
  }

  return Object.freeze({
    algorithm: ALGORITHM,
    kid: keyId,
    sign: signBundle,
    verify: verifyBundle,
    createVerifier,
    close,
  });
}

// Verify-only reader for bundles authenticated with the retired HMAC scheme.
// It cannot sign; issuance always uses Ed25519. Consumers accept it only
// behind the explicit `legacyHmac` option.
export async function createLegacyHmacBundleVerifier({
  keyId,
  keyProvider,
} = {}) {
  requireKeyId(keyId);
  if (!keyProvider) {
    fail("AUTHORITY_KEY_PROVIDER_REQUIRED", "bundle verifier requires an external key provider");
  }
  const supplied = await resolveKeyProvider(keyProvider, keyId);
  if (!(supplied instanceof Uint8Array)) {
    fail("INVALID_AUTHORITY_KEY_PROVIDER", "legacy HMAC key provider must return a Uint8Array");
  }
  const key = Buffer.from(supplied);
  if (key.length !== 32) {
    key.fill(0);
    fail("INVALID_AUTHORITY_KEY", "legacy HMAC key must contain exactly 32 bytes");
  }
  let closed = false;

  function computeMac(payload) {
    // The retired scheme MACed this exact canonical form; frozen for legacy reads.
    return createHmac("sha256", key).update(canonicalStringify(payload), "utf8").digest();
  }

  function checkAuthentication(payload, authentication) {
    if (
      !isPlainObject(authentication)
      || authentication.algorithm !== LEGACY_ALGORITHM
      || authentication.key_id !== keyId
      || typeof authentication.mac !== "string"
      || !LEGACY_MAC_PATTERN.test(authentication.mac)
      || Object.keys(authentication).some((field) => !["algorithm", "key_id", "mac"].includes(field))
    ) {
      return false;
    }
    const suppliedMac = Buffer.from(authentication.mac, "base64url");
    const expectedMac = computeMac(payload);
    return suppliedMac.length === expectedMac.length && timingSafeEqual(suppliedMac, expectedMac);
  }

  function close() {
    if (!closed) {
      key.fill(0);
      closed = true;
    }
  }

  return Object.freeze({
    algorithm: LEGACY_ALGORITHM,
    key_id: keyId,
    verify: async (payload, authentication) => {
      if (closed) fail("BUNDLE_AUTHORITY_CLOSED", "bundle verifier is closed");
      return checkAuthentication(payload, authentication);
    },
    close,
  });
}

export { ALGORITHM as BUNDLE_AUTHENTICATION_ALGORITHM };
export { LEGACY_ALGORITHM as LEGACY_BUNDLE_AUTHENTICATION_ALGORITHM };
