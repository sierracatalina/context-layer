# Changelog

This file records material changes to the Context Layer working draft and its public reference artifacts. The project follows semantic-versioning-shaped prerelease tags, but draft protocol identifiers remain unstable until a stable specification is declared.

## Unreleased

- Select and add a repository license before inviting reuse or accepting external contributions; the first proof-of-work prerelease remains clearly unlicensed.
- Create the canonical public GitHub repository and enable private vulnerability reporting.
- Publish the reviewed `v0.2-draft` prerelease only after the full release suite passes.

## 0.2-draft - 2026-08-17

### Added

- A canonical public release boundary for the specification, implementation guide, hosted demonstrator, schemas, fixtures, reference module, and local-first core work.
- Explicit contracts for purpose-bound requests, policy decisions, scoped bundles, proposal-only memory updates, and minimized receipts.
- Deterministic validation, policy reduction, bundle issuance, secret-field rejection, and receipt-chain test coverage for the reference profile.
- A phased implementation path from contract fixtures through a local vault, one narrow source adapter, and one agent consumer.
- An AES-256-GCM local vault, exact-purpose four-state policy engine, HMAC-authenticated bundle envelope, UTF-8 files adapter, and recipient-bound local-agent consumer.
- An authenticated receipt anchor with cross-process locking, a minimized end-to-end demo, and executable SHA-bound test vectors.
- An unsubmitted Nostr minimum-reveal discussion draft using NIP-44 and NIP-59 without assigning event kinds.

### Security

- Elevated raw-vault isolation, minimum disclosure, recipient binding, expiry, fail-closed behavior, and native-protocol preservation to release invariants.
- Kept fixtures synthetic and separated the public demonstrator from claims of production security or standards adoption.
- Defined private vulnerability reporting and the experimental security boundary in `SECURITY.md`.
- Added regressions for forged capabilities, approval expiry escape, non-monotonic transforms, malformed revocation/preflight responses, receipt rollback, replay races, and raw-vault write fields.
- Documented the first prerelease as public source and proof of work without implying an open-source license or reuse grant.

### Known limitations

- This is a working draft, not an adopted standard or security certification.
- Production identity, signing, durable storage, remote adapters, multi-tenant isolation, and independent conformance remain out of scope for this draft release.
- Coordinated rollback of both the local receipt log and its sidecar anchor remains possible unless the anchor is stored on a separate rollback-resistant boundary.
- The hosted public site may lag the repository while a saved version awaits release approval.
