# Changelog

This file records material changes to the Context Layer working draft and its public reference artifacts. The project follows semantic-versioning-shaped prerelease tags, but draft protocol identifiers remain unstable until a stable specification is declared.

## Unreleased

- Replace shared-secret HMAC bundle authentication with Ed25519 signatures over RFC 8785 (JCS) canonical JSON. Envelopes now carry `authentication: { algorithm: "Ed25519", kid, sig }`; recipients verify with the issuer's public key. The receipt anchor chain is signed the same way. New `packages/local-core/jcs.mjs` vendors a minimal RFC 8785 canonicalizer. Legacy HMAC bundles are readable only behind an explicit `legacyHmac` option and are never written; test vectors and manifests were regenerated accordingly.
- Add the 2026-09 protocol proposal as a working draft: closed 0.2 Lite remains authoritative; `context-layer/0.3-draft` CL-Pass companions and T01–T10 vectors sit beside it.
- Confirm the dual-license boundary and contribution terms before publishing the first proof-of-work prerelease.
- Populate the canonical protocol-only GitHub repository from the reviewed release commit.
- Consolidate specification, reference, schema, and fixture artifacts under the explicit `protocol/` boundary; keep website and deployment source outside this repository.
- Publish the reviewed `v0.2-draft` prerelease only after the full release suite passes.

## 0.2-draft - 2026-08-21

### Added

- A canonical public release boundary for `protocol/spec/`, `protocol/reference/`, `protocol/schemas/`, `protocol/fixtures/`, local-first core work, and proof artifacts.
- Explicit contracts for purpose-bound requests, policy decisions, scoped bundles, proposal-only memory updates, and minimized receipts.
- Deterministic validation, policy reduction, bundle issuance, secret-field rejection, and receipt-chain test coverage for the reference profile.
- A phased implementation path from contract fixtures through a local vault, one narrow source adapter, and one agent consumer.
- An AES-256-GCM local vault, exact-purpose four-state policy engine, HMAC-authenticated bundle envelope, UTF-8 files adapter, and recipient-bound local-agent consumer.
- An authenticated receipt anchor with cross-process locking, a minimized end-to-end demo, and executable SHA-bound test vectors.
- An unsubmitted Nostr minimum-reveal discussion draft using NIP-44 and NIP-59 without assigning event kinds.

### Security

- Elevated raw-vault isolation, minimum disclosure, recipient binding, expiry, fail-closed behavior, and native-protocol preservation to release invariants.
- Kept fixtures synthetic and separated the protocol repository from website and deployment source.
- Defined private vulnerability reporting and the experimental security boundary in `SECURITY.md`.
- Enabled GitHub private vulnerability reporting for the canonical public repository.
- Added regressions for forged capabilities, approval expiry escape, non-monotonic transforms, malformed revocation/preflight responses, receipt rollback, replay races, and raw-vault write fields.
- Licensed software artifacts under Apache-2.0 and specifications, prose documentation, and diagrams under CC BY 4.0 with an explicit file map.

### Known limitations

- This is a working draft, not an adopted standard or security certification.
- Production identity, signing, durable storage, remote adapters, multi-tenant isolation, and independent conformance remain out of scope for this draft release.
- Coordinated rollback of both the local receipt log and its sidecar anchor remains possible unless the anchor is stored on a separate rollback-resistant boundary.
- Website application and deployment source are intentionally versioned outside this protocol repository and are not included in its release tags.
