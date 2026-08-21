import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  canonicalStringify,
  cloneJson,
  digestText,
  nowIso,
  secureEqualText,
} from "./canonical.mjs";
import { LocalCoreError, fail } from "./errors.mjs";

const ENVELOPE_VERSION = 1;
const CIPHER = "aes-256-gcm";
const PAYLOAD_REF_PREFIX = "vault://objects/";

export async function openLocalVault({
  directory,
  keyProvider,
  vaultId = "local",
  clock = () => new Date(),
} = {}) {
  if (typeof directory !== "string" || directory.length === 0) {
    fail("INVALID_VAULT_DIRECTORY", "vault directory is required");
  }
  if (!keyProvider) fail("KEY_PROVIDER_REQUIRED", "an external key provider is required");

  const root = resolve(directory);
  const objectsDirectory = join(root, "objects");
  const eventsPath = join(root, "source-events.jsonl");
  await mkdir(objectsDirectory, { recursive: true, mode: 0o700 });

  const suppliedKey = await loadKey(keyProvider, vaultId);
  const key = Buffer.from(suppliedKey);
  if (key.length !== 32) {
    key.fill(0);
    fail("INVALID_VAULT_KEY", "key provider must return exactly 32 bytes");
  }

  let closed = false;

  function assertOpen() {
    if (closed) fail("VAULT_CLOSED", "vault is closed");
  }

  async function storePayload({ bytes, mediaType = "application/octet-stream" } = {}) {
    assertOpen();
    const plaintext = toBuffer(bytes);
    if (typeof mediaType !== "string" || mediaType.length === 0 || mediaType.length > 255) {
      fail("INVALID_MEDIA_TYPE", "media type must be a non-empty string");
    }

    const objectId = randomBytes(16).toString("hex");
    const createdAt = nowIso(clock);
    const plaintextDigest = digestText(plaintext);
    const iv = randomBytes(12);
    const header = {
      envelope_version: ENVELOPE_VERSION,
      cipher: CIPHER,
      object_id: objectId,
      media_type: mediaType,
      created_at: createdAt,
      plaintext_digest: plaintextDigest,
    };
    const cipher = createCipheriv(CIPHER, key, iv, { authTagLength: 16 });
    cipher.setAAD(Buffer.from(canonicalStringify(header), "utf8"));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const envelope = {
      ...header,
      iv: iv.toString("base64"),
      auth_tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
    const objectPath = join(objectsDirectory, objectId + ".clv.json");
    try {
      await writeFile(objectPath, canonicalStringify(envelope) + "\n", {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
    } finally {
      plaintext.fill(0);
    }

    return {
      ref: PAYLOAD_REF_PREFIX + objectId,
      media_type: mediaType,
      plaintext_digest: plaintextDigest,
      size_bytes: plaintext.byteLength,
      created_at: createdAt,
    };
  }

  async function readPayload(payloadRef) {
    assertOpen();
    const objectId = parsePayloadRef(payloadRef);
    let envelope;
    try {
      envelope = JSON.parse(await readFile(join(objectsDirectory, objectId + ".clv.json"), "utf8"));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new LocalCoreError("INVALID_VAULT_ENVELOPE", "vault envelope is not valid JSON");
      }
      throw error;
    }
    validateEnvelope(envelope, objectId);
    const header = {
      envelope_version: envelope.envelope_version,
      cipher: envelope.cipher,
      object_id: envelope.object_id,
      media_type: envelope.media_type,
      created_at: envelope.created_at,
      plaintext_digest: envelope.plaintext_digest,
    };

    try {
      const decipher = createDecipheriv(
        CIPHER,
        key,
        Buffer.from(envelope.iv, "base64"),
        { authTagLength: 16 },
      );
      decipher.setAAD(Buffer.from(canonicalStringify(header), "utf8"));
      decipher.setAuthTag(Buffer.from(envelope.auth_tag, "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64")),
        decipher.final(),
      ]);
      if (!secureEqualText(digestText(plaintext), envelope.plaintext_digest)) {
        fail("VAULT_DIGEST_MISMATCH", "decrypted payload digest does not match its envelope");
      }
      return {
        bytes: plaintext,
        media_type: envelope.media_type,
        plaintext_digest: envelope.plaintext_digest,
        created_at: envelope.created_at,
      };
    } catch (error) {
      if (error instanceof LocalCoreError) throw error;
      throw new LocalCoreError("VAULT_DECRYPT_FAILED", "vault payload could not be authenticated or decrypted");
    }
  }

  async function recordSourceEvent(event) {
    assertOpen();
    const serialized = canonicalStringify(event);
    await appendFile(eventsPath, serialized + "\n", { encoding: "utf8", mode: 0o600 });
    return cloneJson(event);
  }

  async function listSourceEvents() {
    assertOpen();
    try {
      const source = await readFile(eventsPath, "utf8");
      return source.split("\n").filter(Boolean).map((line) => JSON.parse(line));
    } catch (error) {
      if (error && error.code === "ENOENT") return [];
      throw error;
    }
  }

  function createCapturePort() {
    assertOpen();
    return Object.freeze({
      storePayload,
      recordSourceEvent,
    });
  }

  function close() {
    if (!closed) key.fill(0);
    closed = true;
  }

  return Object.freeze({
    vault_id: vaultId,
    storePayload,
    readPayload,
    recordSourceEvent,
    listSourceEvents,
    createCapturePort,
    close,
  });
}

async function loadKey(provider, vaultId) {
  const value = typeof provider === "function"
    ? await provider({ vaultId })
    : typeof provider.getKey === "function"
      ? await provider.getKey({ vaultId })
      : null;
  if (!(value instanceof Uint8Array)) {
    fail("INVALID_KEY_PROVIDER", "key provider must return a Uint8Array");
  }
  return value;
}

function toBuffer(value) {
  if (typeof value === "string") return Buffer.from(value, "utf8");
  if (value instanceof Uint8Array) return Buffer.from(value);
  fail("INVALID_PAYLOAD", "payload must be a string or Uint8Array");
}

function parsePayloadRef(value) {
  if (typeof value !== "string" || !value.startsWith(PAYLOAD_REF_PREFIX)) {
    fail("INVALID_PAYLOAD_REF", "payload reference is not a local vault object reference");
  }
  const objectId = value.slice(PAYLOAD_REF_PREFIX.length);
  if (!/^[0-9a-f]{32}$/.test(objectId)) fail("INVALID_PAYLOAD_REF", "payload reference is malformed");
  return objectId;
}

function validateEnvelope(envelope, objectId) {
  if (!envelope || typeof envelope !== "object") {
    fail("INVALID_VAULT_ENVELOPE", "vault envelope must be an object");
  }
  if (envelope.envelope_version !== ENVELOPE_VERSION) {
    fail("UNSUPPORTED_VAULT_ENVELOPE", "vault envelope version is not supported");
  }
  if (envelope.cipher !== CIPHER || envelope.object_id !== objectId) {
    fail("INVALID_VAULT_ENVELOPE", "vault envelope binding is invalid");
  }
  for (const key of ["media_type", "created_at", "plaintext_digest", "iv", "auth_tag", "ciphertext"]) {
    if (typeof envelope[key] !== "string") {
      fail("INVALID_VAULT_ENVELOPE", "vault envelope field " + key + " is invalid");
    }
  }
  if (Buffer.from(envelope.iv, "base64").length !== 12 || Buffer.from(envelope.auth_tag, "base64").length !== 16) {
    fail("INVALID_VAULT_ENVELOPE", "vault envelope nonce or authentication tag is invalid");
  }
}

export { CIPHER as VAULT_CIPHER, ENVELOPE_VERSION as VAULT_ENVELOPE_VERSION };
