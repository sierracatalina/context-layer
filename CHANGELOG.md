# Changelog

This file records material changes to the Context Layer working draft and its public reference artifacts. Package prereleases use SemVer-compatible identifiers; core wire and companion profile identifiers are separate and remain unstable. See RELEASE.md for the current version policy. Historical entries describe their own snapshots, not the present repository boundary.

## Unreleased

### Overview, navigation & requirement review

- Add a plain-language overview, one-line glossary, deterministic readability/coverage checks & synchronized site mirrors. Keep the overview's sentence-case exception; human comprehension remains unmeasured.
- Add progressive mobile navigation with repeated-toggle, dismissal, history & responsive-state regressions. Rendered device/browser checks remain a separate release gate.
- Add core section anchors, a one-page topic summary, a complete linked requirement index & primary-source prior-art comparisons. Preserve existing requirement passages & fenced examples; the complete requirement text is not claimed to fit on one page. Clarify section 13 as an informative role overview under section 1's uppercase-only convention.
- Clarify optional PCP use & separate authority to act from context disclosure. Reconcile prior-art claims with the bounded MCP demonstration below.

### Section 13 interpretation clarification

- Track the interpretation and evidence disposition in [issue #18](https://github.com/sierracatalina/context-layer/issues/18); the issue remains open for exact-patch independent review.
- Explicitly classify the six role lists as informative summaries. Replace five mixed-case introductions with `Implementation topics:` & one with `Documentation topics:`; retain every original role name & all 37 bullets.
- Preserve every existing uppercase obligation, its conditions & profile applicability, including section 14's applicable-test duties. No wire object, schema, runtime behavior or original normative-passage/code hash changes. Formal mandatory capability expansions require a separately reviewed, versioned profile.
- This is an explicit semantic interpretation, not a purely cosmetic change or a claim of equivalence with every earlier reading. Readers who treated ordinary-language “Must” as an additional requirement should review the change; stricter implementations remain permitted, and a stricter named profile can state those additional commitments explicitly.

### Conformance, independent Python & security evidence

- Add an exportable offline kit for the proposed local profile, with 45 assertions, four unchanged original vector sets, six separate fixtures & a labeled reference-derived complete-object supplement. Include malicious-adapter regressions & exact hash/schema checks; a pass is scoped fixture evidence.
- Correct Python receipt-lock contention by initializing one schema validator per log instance before lock acquisition. Preserve every receipt check and the five-second fail-closed lock limit. Exercise explicit spawned-process contention and ensure every child is reaped before failed-test cleanup.
- Add an independently authored source-only Python experiment with explicit clarification lineage, 95 unit tests & 52 standalone public-vector assertions. Both adapters pass the same 45-assertion kit plus nine byte-parity/bidirectional checks; project-produced independence is distinct from outside adoption or review.
- Prepare eleven versioned core/companion schema snapshots, their hash catalog & static site candidates. Offline identities and references are tested; live schema URLs remain unverified until deployment.
- Add bounded seeded malformed-input/property tests, updated threat-model limits & outside-review status. Outside cryptographic/protocol review has not occurred.
- Pin CI actions, disable persisted checkout credentials & add hash-locked Python dependencies on Ubuntu/Windows. Combine every documentation, core, security, conformance, independent & MCP check without changing existing core runtime or schema assertions.
- Add informative core links to the proposed profile, source-only implementation lineage, scoped kit/report contract & six neutral specification issues [[#13](https://github.com/sierracatalina/context-layer/issues/13), [#14](https://github.com/sierracatalina/context-layer/issues/14), [#15](https://github.com/sierracatalina/context-layer/issues/15), [#16](https://github.com/sierracatalina/context-layer/issues/16), [#17](https://github.com/sierracatalina/context-layer/issues/17), [#18](https://github.com/sierracatalina/context-layer/issues/18)]. Cross-links preserve existing requirement strength and do not settle the remaining general profile/compatibility choices.

### Experimental MCP bridge demonstration

- Add an isolated, version-pinned official-SDK MCP stdio demo, with six-to-three-field reduction, private-only denial & eight boundary/transport tests. Existing Context Layer core runtime behavior is unchanged.
- Include synthetic model-agent traces, independently generated agendas, an 87.5-second labeled walkthrough & hash-bound evidence. Native agents use a shell-to-MCP bridge; direct native-host/plugin integration remains unverified.
- Record exact-revision public fresh-clone timing: 14.26 seconds for protocol setup/run & 73.98 seconds through actual model agenda generation/verification. State installed prerequisites & the already authorized model runtime; preserve measured revision identifiers.

### Governance and evidence hardening

- Add proposed, measurable outside-implementation, three-project adoption and v1-freeze targets with unaccepted role owners, dates, acceptance measures and three synthetic user stories. No external adoption or delivery commitment is claimed.
- Add a staged roadmap and explicit v0.3 readiness gates; retain current package metadata at `0.2.0-draft.2` and distinguish core, companion, conformance and release versions. No tag or release is created by these changes.
- Correct current release and source-boundary documentation to include `site/context-layer/`; preserve historical release descriptions as historical evidence.
- Add public non-security bug/specification forms, a private security-reporting route and a PR evidence checklist. No security contact or enabled-reporting status is invented.
- Add a repository-wide claims-to-evidence ledger and regression checks, with explicit scope and pending independent review, adoption, live deployment and interoperability evidence.
- Label broader implementation recipes and essay capabilities as proposed/untested unless a named artifact and result demonstrate the narrower behavior.

### Runtime and earlier draft work

- Correct RFC 8785 string serialization to preserve non-BMP Unicode and reject lone surrogates; cover interoperability with independently generated Ed25519 signature bytes.
- Write receipt anchors as version 2; verify and atomically migrate version-1 HMAC or pre-release Ed25519 sidecars on open, preserving receipt bytes and replay history. Existing 32-byte key providers remain compatible; `anchor.legacyHmacKey` supports migration to a separate signing key.
- Replace shared-secret HMAC bundle authentication with Ed25519 signatures over RFC 8785 (JCS) canonical JSON. Envelopes now carry `authentication: { algorithm: "Ed25519", kid, sig }`; recipients verify with the issuer's public key. The receipt anchor chain is signed the same way. New `packages/local-core/jcs.mjs` vendors a minimal RFC 8785 canonicalizer. Legacy HMAC bundles are readable only behind an explicit `legacyHmac` option and are never written; test vectors and manifests were regenerated accordingly.
- Add the 2026-09 protocol proposal as a working draft: closed 0.2 Lite remains authoritative; `context-layer/0.3-draft` CL-Pass companions and T01–T10 vectors sit beside it.
- Consolidate specification, reference, schema and fixture artifacts under the explicit `protocol/` boundary. The current documentation site and standalone routing configuration are now included under `site/`.
- Require exact-candidate verification and explicit approval before any new prerelease; existing `v0.2-draft` history remains unchanged.

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
