import { constants } from "node:fs";
import { lstat, open, realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { TextDecoder } from "node:util";

import {
  canonicalStringify,
  cloneJson,
  deepFreeze,
  digestJson,
  digestText,
  finalizeCanonicalRecord,
  nowIso,
  uniqueStrings,
} from "./canonical.mjs";
import { fail } from "./errors.mjs";

const SPEC_VERSION = "context-layer/0.2-draft";
const SOURCE_EVENT_PREFIX = "urn:cl:event:";
const DEFAULT_MAX_BYTES = 1024 * 1024;

export async function createUtf8FilesAdapter({
  allowedRoots,
  capturePort,
  maxBytes = DEFAULT_MAX_BYTES,
  issuer = { id: "urn:cl:adapter:files-local" },
  clock = () => new Date(),
} = {}) {
  if (!Array.isArray(allowedRoots) || allowedRoots.length === 0) {
    fail("FILES_ROOTS_REQUIRED", "at least one allowed file root is required");
  }
  if (
    !capturePort
    || typeof capturePort.storePayload !== "function"
    || typeof capturePort.recordSourceEvent !== "function"
  ) {
    fail("INVALID_CAPTURE_PORT", "files adapter requires a vault capture port");
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    fail("INVALID_FILE_SIZE_LIMIT", "maxBytes must be a positive integer");
  }

  const roots = [];
  for (const configuredRoot of allowedRoots) {
    if (typeof configuredRoot !== "string" || configuredRoot.length === 0) {
      fail("INVALID_FILES_ROOT", "allowed roots must be non-empty paths");
    }
    const configured = resolve(configuredRoot);
    const rootLink = await lstat(configured);
    if (rootLink.isSymbolicLink()) fail("FILES_ROOT_SYMLINK", "allowed file roots cannot be symlinks");
    const canonical = await realpath(configured);
    const rootStat = await stat(canonical);
    if (!rootStat.isDirectory()) fail("FILES_ROOT_NOT_DIRECTORY", "allowed file root is not a directory");
    roots.push({
      canonical,
      id: digestJson({ adapter: "files.local", root: canonical }),
    });
  }

  async function captureFile({
    filePath,
    subjectRef,
    predicate = "file.text",
    classification = ["private", "files"],
  } = {}) {
    if (typeof filePath !== "string" || filePath.length === 0 || !isAbsolute(filePath)) {
      fail("ABSOLUTE_FILE_PATH_REQUIRED", "filePath must be an absolute path");
    }
    if (typeof subjectRef !== "string" || subjectRef.length === 0) {
      fail("SUBJECT_REF_REQUIRED", "subjectRef is required");
    }
    if (typeof predicate !== "string" || predicate.length === 0 || predicate === "*") {
      fail("INVALID_FILE_PREDICATE", "predicate must be a specific non-empty value");
    }
    const classes = uniqueStrings(classification, "classification");
    const requestedPath = resolve(filePath);
    const root = findContainingRoot(roots, requestedPath);
    if (!root) fail("FILE_OUTSIDE_ALLOWED_ROOT", "file is outside every allowed root");

    await assertNoSymlinkSegments(root.canonical, requestedPath);
    const canonicalPath = await realpath(requestedPath);
    if (!isContained(root.canonical, canonicalPath)) {
      fail("FILE_OUTSIDE_ALLOWED_ROOT", "resolved file escaped the allowed root");
    }

    const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
    const handle = await open(canonicalPath, constants.O_RDONLY | noFollow);
    let bytes;
    let before;
    try {
      before = await handle.stat();
      if (!before.isFile()) fail("FILE_NOT_REGULAR", "capture target must be a regular file");
      if (before.size > maxBytes) fail("FILE_TOO_LARGE", "capture target exceeds the configured byte limit");
      bytes = await handle.readFile();
      const after = await handle.stat();
      if (
        before.dev !== after.dev
        || before.ino !== after.ino
        || before.size !== after.size
        || before.mtimeMs !== after.mtimeMs
        || bytes.byteLength !== after.size
      ) {
        fail("FILE_CHANGED_DURING_CAPTURE", "file changed while it was being captured");
      }
    } finally {
      await handle.close();
    }

    await assertNoSymlinkSegments(root.canonical, requestedPath);
    const finalPath = await realpath(requestedPath);
    if (finalPath !== canonicalPath) fail("FILE_CHANGED_DURING_CAPTURE", "file target changed during capture");

    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      bytes.fill(0);
      fail("FILE_INVALID_UTF8", "capture target is not valid UTF-8");
    }

    const capturedAt = nowIso(clock);
    const relativePath = relative(root.canonical, canonicalPath);
    const privateRecord = {
      original_path: canonicalPath,
      relative_path: relativePath,
      file_name: basename(canonicalPath),
      text,
      size_bytes: before.size,
      modified_at: before.mtime.toISOString(),
      access_context: {
        mode: before.mode,
        uid: before.uid,
        gid: before.gid,
      },
    };
    const privateBytes = Buffer.from(canonicalStringify(privateRecord), "utf8");
    let stored;
    try {
      stored = await capturePort.storePayload({
        bytes: privateBytes,
        mediaType: "application/vnd.context-layer.file+json",
      });
    } finally {
      privateBytes.fill(0);
      bytes.fill(0);
    }

    const nativeIdDigest = digestJson({
      root_id: root.id,
      relative_path: relativePath,
    });
    const event = finalizeCanonicalRecord({
      spec_version: SPEC_VERSION,
      type: "source_event",
      created_at: capturedAt,
      issuer: cloneJson(issuer),
      subject_ref: subjectRef,
      occurred_at: before.mtime.toISOString(),
      captured_at: capturedAt,
      source: {
        adapter: "files.local",
        adapter_version: "0.1.0",
        native_protocol: "filesystem",
        native_id_digest: nativeIdDigest,
        content_digest: digestText(text),
        size_bytes: before.size,
        verification: "local-read",
        visibility: "allowed-root",
        control_semantics: "untrusted_data",
      },
      payload_ref: {
        ref: stored.ref,
        media_type: stored.media_type,
        plaintext_digest: stored.plaintext_digest,
      },
      classification: classes,
      provenance: [{ kind: "direct_capture", confidence: 1 }],
    }, SOURCE_EVENT_PREFIX);
    await capturePort.recordSourceEvent(event);

    return deepFreeze({
      event_ref: event.id,
      claim: {
        claim: "Approved UTF-8 file content.",
        predicate,
        value: text,
        confidence: 1,
        provenance_refs: [event.id],
        control_semantics: "untrusted_data",
      },
      source: {
        adapter: "files.local",
        native_id_digest: nativeIdDigest,
        content_digest: digestText(text),
        size_bytes: before.size,
      },
    });
  }

  return Object.freeze({
    manifest: deepFreeze({
      adapter_id: "org.context-layer.files-local",
      adapter_version: "0.1.0",
      native_protocol: "filesystem",
      directions: ["capture"],
      object_mappings: ["source_event", "context_claim"],
      auth_profile: "local-filesystem-permissions",
      preserves: ["native_id_digest", "content_digest", "size", "mtime", "access_context"],
      lossy_fields: [],
    }),
    captureFile,
  });
}

function findContainingRoot(roots, candidate) {
  return roots.find((root) => isContained(root.canonical, candidate)) ?? null;
}

function isContained(root, candidate) {
  const child = relative(root, candidate);
  return child === "" || (!child.startsWith(".." + sep) && child !== ".." && !isAbsolute(child));
}

async function assertNoSymlinkSegments(root, candidate) {
  const child = relative(root, candidate);
  if (!isContained(root, candidate)) fail("FILE_OUTSIDE_ALLOWED_ROOT", "file is outside the allowed root");
  let cursor = root;
  for (const segment of child.split(sep).filter(Boolean)) {
    cursor = join(cursor, segment);
    const entry = await lstat(cursor);
    if (entry.isSymbolicLink()) fail("FILE_SYMLINK_FORBIDDEN", "symlink file paths are not allowed");
  }
}

export { DEFAULT_MAX_BYTES as DEFAULT_FILE_CAPTURE_MAX_BYTES };
