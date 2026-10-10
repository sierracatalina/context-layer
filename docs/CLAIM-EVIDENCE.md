# Claims and evidence

Evidence review date: 2026-10-10. Baseline revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.

This is a repository-wide inventory of material capability claims, not a security
score, certification, exhaustive proof, or record of every normative obligation.
The structured source is [claim-evidence.json](claim-evidence.json). Links pin the
revision actually inspected. A later implementation can improve these results
only after its exact commit and evidence are recorded; branch work is not silently
treated as merged, deployed or externally adopted.

Baseline CI: [Ubuntu and Windows run](https://github.com/sierracatalina/context-layer/actions/runs/37695577167). Ubuntu and Windows workflow associated with the pinned main revision; not proof for later changes.

## Status meanings

- **implemented-tested:** code and named automated coverage exist at the linked
  revision, with test evidence scoped to that revision. Read limits; finite tests are not guarantees.
- **implemented-inspected:** an artifact or configuration was inspected; the
  corresponding operational outcome is not established by that inspection.
- **proposed-untested:** a design, scenario or planned integration, not a shipped claim.
- **not-established:** the required evidence is absent from this baseline inventory;
  this does not assert that no private or unrecorded work exists elsewhere.

A normative requirement states what an implementation should do. It does not
demonstrate that any implementation does it. Schema validity alone is not
behavioral conformance. A passed synthetic test does not establish adoption,
human comprehension, outside review, production interoperability or certification.

## Claim index

| ID | Claim | Status |
| --- | --- | --- |
| [C01](#c01) | Closed core object contracts reject tested unknown/forbidden fields. | implemented-tested |
| [C02](#c02) | The local policy proof exercises four decision states and approval binding. | implemented-tested |
| [C03](#c03) | The local bundle profile signs canonical JSON with Ed25519 and rejects tested tampering. | implemented-tested |
| [C04](#c04) | Recipients reject tested wrong-recipient, expiry, revocation and replay cases. | implemented-tested |
| [C05](#c05) | Receipt chains detect tested tampering and migrate earlier anchors. | implemented-tested |
| [C06](#c06) | The vault encrypts persisted test data and the files adapter enforces tested root boundaries. | implemented-tested |
| [C07](#c07) | The consumer produces pending memory proposals without a direct commit API. | implemented-tested |
| [C08](#c08) | A versioned standalone kit executes the scoped local-profile transcript against JavaScript and Python adapters. | implemented-tested |
| [C09](#c09) | The documentation site includes checked routes, source/asset contracts and progressive mobile navigation. | implemented-tested |
| [C10](#c10) | Package metadata and core/companion wire identifiers are separate. | implemented-inspected |
| [C11](#c11) | CL-Pass schemas and behavioral oracles describe a separate experimental proposal. | proposed-untested |
| [C12](#c12) | Broader source, organization, federation, semantic proxy and discovery profiles are design targets. | proposed-untested |
| [C13](#c13) | One local MCP stdio demo narrows six synthetic fields to three before delivery and denies a private-only request. | implemented-tested |
| [C14](#c14) | The Nostr profile is unsubmitted and event kinds remain unassigned. | proposed-untested |
| [C15](#c15) | Outside maintenance and adoption are not established by these project-produced experiments. | not-established |
| [C16](#c16) | Independent security review and certification are not established. | not-established |
| [C17](#c17) | A bounded seeded generated/property suite exercises malformed inputs, receipt corruption, concurrent replay and revocation/expiry. | implemented-tested |
| [C18](#c18) | Human comprehension, explain-back and external user outcomes are unmeasured. | not-established |
| [C19](#c19) | Eleven version-addressed schema snapshots and their static site candidates pass offline identity, reference and hash checks. | implemented-tested |
| [C20](#c20) | Private disclosure has a documented GitHub destination; form availability requires an authenticated check. | implemented-inspected |
| [C21](#c21) | A plain-language overview and one-line glossary satisfy documented automated readability and coverage checks. | implemented-tested |
| [C22](#c22) | Core navigation, a concise topic summary and a complete normative index preserve existing uppercase requirements and examples; section 13 now explicitly summarizes roles informatively. | implemented-tested |
| [C23](#c23) | Proposed measurable goals, user stories, release gates and private-report routing have reviewable repository artifacts. | implemented-tested |
| [C24](#c24) | An independently authored Python experiment passes its own tests and the shared local-profile transcript. | implemented-tested |

## Evidence by claim

### C01

Closed core object contracts reject tested unknown/forbidden fields.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Five core schemas and the JavaScript reference runtime.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [protocol/schemas/context-request.schema.json](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/protocol/schemas/context-request.schema.json).
- [protocol/reference/context-layer-reference.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/protocol/reference/context-layer-reference.mjs).
- [tests/reference-implementation.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/reference-implementation.test.mjs): “request validation rejects unknown and secret-bearing fields”.
- Limits: Finite fixtures do not establish universal validation correctness or companion conformance.
- Next evidence: Rerun candidate contracts and independent implementations.

### C02

The local policy proof exercises four decision states and approval binding.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Synthetic reference/local-core policy profiles.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [packages/local-core/policy.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/packages/local-core/policy.mjs).
- [tests/local-core.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core.test.mjs): “policy engine deterministically emits allow, reduce, approval, and deny states”.
- [tests/local-core.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core.test.mjs): “approval requires explicit authentication and exact request and policy digest binding”.
- Limits: An authenticated approval input is not a production consent UI or identity service.
- Next evidence: Specify portable policy and approval semantics for independent implementation.

### C03

The local bundle profile signs canonical JSON with Ed25519 and rejects tested tampering.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Local experimental envelope, synthetic keys and listed canonicalization cases.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [packages/local-core/jcs.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/packages/local-core/jcs.mjs).
- [packages/local-core/authority.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/packages/local-core/authority.mjs).
- [tests/local-core.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core.test.mjs): “Ed25519 verification rejects tampering, wrong keys, and malformed signatures”.
- [tests/local-core.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core.test.mjs): “Ed25519 Unicode signatures interoperate with independent canonical bytes”.
- Limits: Public-key verification does not prove issuer trust, managed key custody, all RFC edge cases or outside review. Legacy HMAC reading is opt-in.
- Next evidence: Publish precise signing/canonicalization contracts and cross-implementation vectors.

### C04

Recipients reject tested wrong-recipient, expiry, revocation and replay cases.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Trusted single-user local consumer and receipt-log boundary.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [packages/local-core/consumer.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/packages/local-core/consumer.mjs).
- [tests/local-core.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core.test.mjs): “local agent rejects wrong-recipient, expired, and revoked bundles”.
- [tests/local-core.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core.test.mjs): “local agent enforces durable single-use replay across receipt-log reopen”.
- Limits: Cannot enforce deletion or prevent misuse by a compromised recipient after disclosure. Handler code and the revocation source are trusted.
- Next evidence: Add independent negative tests and deployment-specific identity/revocation evidence.

### C05

Receipt chains detect tested tampering and migrate earlier anchors.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Local append-only log, signed sidecar and same-filesystem locking.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [packages/local-core/receipt-log.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/packages/local-core/receipt-log.mjs).
- [tests/receipt-log-hardening.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/receipt-log-hardening.test.mjs): “version-1 HMAC logs verify read-only, migrate on open, and keep replay history”.
- [tests/receipt-log-hardening.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/receipt-log-hardening.test.mjs): “authenticated anchor detects rollback, rewrite, and unanchored suffixes”.
- Limits: Coordinated rollback of log and sidecar remains possible. A receipt attests to reported operations, not complete behavioral correctness.
- Next evidence: Test protected external checkpoints before claiming stronger rollback resistance.

### C06

The vault encrypts persisted test data and the files adapter enforces tested root boundaries.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: One experimental local vault and UTF-8 files adapter.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [packages/local-core/vault.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/packages/local-core/vault.mjs).
- [packages/local-core/files-adapter.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/packages/local-core/files-adapter.mjs).
- [tests/local-core.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core.test.mjs): “vault uses versioned AES-256-GCM envelopes and exposes no plaintext at rest”.
- [tests/local-core.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core.test.mjs): “files adapter rejects outside-root, oversized, invalid UTF-8, and symlink paths”.
- Limits: No production key custody, tenant isolation or hostile-process protection is established.
- Next evidence: Specify and assess actual production custody and process boundaries separately.

### C07

The consumer produces pending memory proposals without a direct commit API.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Synthetic local-core/reference proposal-only writeback.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [protocol/schemas/memory-update-proposal.schema.json](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/protocol/schemas/memory-update-proposal.schema.json).
- [tests/local-core.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core.test.mjs): “memory writeback remains a receipted pending proposal with no commit API”.
- Limits: This does not implement a human review interface or an approved-commit workflow.
- Next evidence: Review and test a separate commit workflow and human comprehension before claiming it exists.

### C08

A versioned standalone kit executes the scoped local-profile transcript against JavaScript and Python adapters.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Forty-five common-kit assertions per adapter, four unchanged original vector sets, six separate contract fixtures and a labeled reference-derived full-object supplement.
- Evidence revision: `af610f6e39ee0b8dbc3db49f098676bb1fd729c1`.
- CI evidence: [recorded workflow run](https://github.com/sierracatalina/context-layer/actions/runs/38006012587). This is evidence for the pinned source revision, not the final integrated candidate or deployment.
- [CONFORMANCE.md](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/CONFORMANCE.md).
- [conformance/v0.2.0-draft.1/manifest.json](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/conformance/v0.2.0-draft.1/manifest.json).
- [tests/conformance-kit.test.mjs](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/tests/conformance-kit.test.mjs): “exported kit runs outside repository and tests real reference adapter results”.
- [tests/conformance-kit.test.mjs](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/tests/conformance-kit.test.mjs): “full-object profile oracles satisfy independent closed schemas and explicit scope”.
- [scripts/check-independent-conformance.mjs](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/scripts/check-independent-conformance.mjs).
- Limits: The supplement is reference-derived, not an independent oracle. The kit is exported offline, not registry-published or a certification. A passing transcript does not establish complete core/role conformance, outside adoption or universally correct reference behavior.
- Next evidence: Run the exact final combined candidate on both hosted operating systems and retain assertion-level reports; resolve remaining profile/coverage questions in issues #13–17 without treating source links as resolution.

### C09

The documentation site includes checked routes, source/asset contracts and progressive mobile navigation.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: site/context-layer source and site/vercel.json, including the plain-language overview and mobile-menu state checks.
- Evidence revision: `378aab9cf48c5148c8ffce1f5fca17bcbee08f18`.
- [site/vercel.json](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/site/vercel.json).
- [tests/public-site.test.mjs](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/tests/public-site.test.mjs): “all public routes expose a progressive mobile menu with the full navigation”.
- [tests/public-site.test.mjs](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/tests/public-site.test.mjs): “mobile menu supports repeat toggles, dismissal, responsive changes and history restore”.
- [tests/overview.test.mjs](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/tests/overview.test.mjs): “overview, TLDR, glossary, rendered page and local links satisfy the G1 contract”.
- [tests/editorial-formatting.test.mjs](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/tests/editorial-formatting.test.mjs).
- Limits: Source assertions and simulated events do not verify production deployment, rendered browser viewports or human usability. The overview preserves a narrow sentence-case exception; ordinary site prose keeps its editorial contract.
- Next evidence: Check rendered protected preview and production bytes at the exact deployment revision; keep deployment protection in place.

### C10

Package metadata and core/companion wire identifiers are separate.

- Status: **implemented-inspected**. Reviewed 2026-10-09.
- Scope: Package 0.2.0-draft.2; core context-layer/0.2-draft; companion context-layer/0.3-draft.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [package.json](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/package.json).
- [package-lock.json](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/package-lock.json).
- [protocol/companions/0.3-draft/README.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/protocol/companions/0.3-draft/README.md).
- Limits: A version string does not establish compatibility, an issued tag or release readiness.
- Next evidence: Apply RELEASE.md exact-candidate gates and explicit publication approval.

### C11

CL-Pass schemas and behavioral oracles describe a separate experimental proposal.

- Status: **proposed-untested**. Reviewed 2026-10-09.
- Scope: context-layer/0.3-draft companions.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [protocol/companions/0.3-draft/spec.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/protocol/companions/0.3-draft/spec.md).
- [test-vectors/cl-pass/VECTORS.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/test-vectors/cl-pass/VECTORS.md).
- Limits: Schema-valid examples do not demonstrate T01–T10 behavior or a live issuer.
- Next evidence: Implement and execute every claimed companion behavior before upgrading status.

### C12

Broader source, organization, federation, semantic proxy and discovery profiles are design targets.

- Status: **proposed-untested**. Reviewed 2026-10-09.
- Scope: Implementation guide, architecture and essay, including source/site mirrors.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [protocol/spec/context-layer-implementation-and-interoperability.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/protocol/spec/context-layer-implementation-and-interoperability.md).
- [protocol/spec/context-layer-blog-post.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/protocol/spec/context-layer-blog-post.md).
- [protocol/spec/context-layer-architecture-diagram.svg](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/protocol/spec/context-layer-architecture-diagram.svg).
- Limits: Diagrams and recipes do not prove extraction, semantic redaction, mobile UI, recovery or production adapters exist.
- Next evidence: Link a concrete implementation, supported profile and negative tests for each capability.

### C13

One local MCP stdio demo narrows six synthetic fields to three before delivery and denies a private-only request.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Official SDK 1.32.1 client/server using negotiated MCP 2025-11-25; native model agents used a shell-to-MCP bridge. Public fresh-clone protocol timing was 14.26 seconds at runtime revision 12bdad60bb34ac0bc47bd1e6b322d032c14a8110. A separate same-clock fresh-clone through actual model agenda and verification took 73.98 seconds at f50e9684533229e707fc6ec6a5e541c8e79d785e.
- Evidence revision: `b4c16dad4e919816f2aed87bef2b138e3c23121b`.
- CI evidence: [recorded workflow run](https://github.com/sierracatalina/context-layer/actions/runs/38002964853). This is evidence for the pinned source revision, not the final integrated candidate or deployment.
- [examples/mcp-agent-demo/demo.test.mjs](https://github.com/sierracatalina/context-layer/blob/b4c16dad4e919816f2aed87bef2b138e3c23121b/examples/mcp-agent-demo/demo.test.mjs): “scoped MCP payload removes unrelated values before the client receives them”.
- [examples/mcp-agent-demo/demo.test.mjs](https://github.com/sierracatalina/context-layer/blob/b4c16dad4e919816f2aed87bef2b138e3c23121b/examples/mcp-agent-demo/demo.test.mjs): “private-only selector is denied through actual MCP transport”.
- [docs/demo/README.md](https://github.com/sierracatalina/context-layer/blob/b4c16dad4e919816f2aed87bef2b138e3c23121b/docs/demo/README.md).
- [docs/demo/evidence/fresh-clone.json](https://github.com/sierracatalina/context-layer/blob/b4c16dad4e919816f2aed87bef2b138e3c23121b/docs/demo/evidence/fresh-clone.json).
- [docs/demo/evidence/fresh-clone-model.json](https://github.com/sierracatalina/context-layer/blob/b4c16dad4e919816f2aed87bef2b138e3c23121b/docs/demo/evidence/fresh-clone-model.json).
- [docs/demo/evidence/fresh-clone-agent/mcp-tool-call.json](https://github.com/sierracatalina/context-layer/blob/b4c16dad4e919816f2aed87bef2b138e3c23121b/docs/demo/evidence/fresh-clone-agent/mcp-tool-call.json).
- [docs/demo/evidence/SHA256SUMS](https://github.com/sierracatalina/context-layer/blob/b4c16dad4e919816f2aed87bef2b138e3c23121b/docs/demo/evidence/SHA256SUMS).
- [site/context-layer/demo/media/mcp-agent-walkthrough.mp4](https://github.com/sierracatalina/context-layer/blob/b4c16dad4e919816f2aed87bef2b138e3c23121b/site/context-layer/demo/media/mcp-agent-walkthrough.mp4).
- Limits: This is a local bridge-based experiment using synthetic data, not direct native-host/plugin verification, general MCP interoperability, A2A implementation, outside adoption or production readiness. Timing assumes installed prerequisites and an already available authorized model-agent runtime; it excludes acquiring or signing in to that runtime. The 87.5-second video labels replayed model results separately from captured live protocol/test output.
- Next evidence: Verify the exact integrated candidate and protected browser presentation; separately test a supported native host and consenting independently maintained integration before broadening claims.

### C14

The Nostr profile is unsubmitted and event kinds remain unassigned.

- Status: **proposed-untested**. Reviewed 2026-10-09.
- Scope: Experimental discussion draft only.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [docs/nostr/NIP-XX-purpose-bound-context.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/docs/nostr/NIP-XX-purpose-bound-context.md).
- Limits: No accepted NIP, tested relay interoperability or deployed minimum-reveal service is established.
- Next evidence: Obtain implementation and relay evidence; submission requires a separate decision.

### C15

Outside maintenance and adoption are not established by these project-produced experiments.

- Status: **not-established**. Reviewed 2026-10-09.
- Scope: JavaScript experiments and the independently authored Python implementation produced within this project.
- Evidence revision: `af610f6e39ee0b8dbc3db49f098676bb1fd729c1`.
- [implementations/python/LINEAGE.md](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/implementations/python/LINEAGE.md).
- [CONFORMANCE.md](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/CONFORMANCE.md).
- Limits: Project-produced second-language or clean-room code can test implementability without proving outside ownership or adoption.
- Next evidence: Apply GOALS.md G-IMPLEMENT and G-ADOPT with consenting outside project-owner confirmation.

### C16

Independent security review and certification are not established.

- Status: **not-established**. Reviewed 2026-10-09.
- Scope: Protocol, cryptography, local runtime and site.
- Evidence revision: `af610f6e39ee0b8dbc3db49f098676bb1fd729c1`.
- [SECURITY.md](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/SECURITY.md).
- [docs/context-layer-threat-model.md](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/docs/context-layer-threat-model.md).
- [docs/security-review-status.md](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/docs/security-review-status.md).
- Limits: Regression tests and disclosure instructions are not an outside audit, security score or certification.
- Next evidence: Record real independent review scope and finding dispositions; keep unsupported assurances absent.

### C17

A bounded seeded generated/property suite exercises malformed inputs, receipt corruption, concurrent replay and revocation/expiry.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Five deterministic property families; xorshift32-v1 seed 12648430, default 256 generated cases with configurable bound 1–4096 and documented per-family caps.
- Evidence revision: `af610f6e39ee0b8dbc3db49f098676bb1fd729c1`.
- CI evidence: [recorded workflow run](https://github.com/sierracatalina/context-layer/actions/runs/38006012587). This is evidence for the pinned source revision, not the final integrated candidate or deployment.
- [docs/security-testing.md](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/docs/security-testing.md).
- [tests/security/fuzz-properties.test.mjs](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/tests/security/fuzz-properties.test.mjs): “seeded bundle JSON/shape mutations reject without releasing context”.
- [tests/security/fuzz-properties.test.mjs](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/tests/security/fuzz-properties.test.mjs): “generated concurrent single-use and restart properties use durable shared storage”.
- [tests/security/fuzz-properties.test.mjs](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/tests/security/fuzz-properties.test.mjs): “generated revocation/expiry rechecks prevent handler invocation after open”.
- Limits: This is a fixed-seed bounded campaign, not a coverage-guided fuzzer, exhaustive proof, hostile-process assessment or outside cryptographic review. Per-family scenario limits differ from the configured generated-case count.
- Next evidence: Record final-candidate seed, case budget and results; preserve private reporting for vulnerability details and obtain actual outside review separately.

### C18

Human comprehension, explain-back and external user outcomes are unmeasured.

- Status: **not-established**. Reviewed 2026-10-09.
- Scope: README, site and protocol documentation.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [README.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/README.md).
- [site/context-layer/_pages/index.html](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/site/context-layer/_pages/index.html).
- Limits: Automated readability metrics and model reviews cannot establish what actual people understood.
- Next evidence: Record consented, anonymized human method/results separately from reading scores.

### C19

Eleven version-addressed schema snapshots and their static site candidates pass offline identity, reference and hash checks.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Five core 0.2.0-draft.1 schemas and six separate companion 0.3.0-draft.1 schemas, with a shared hash catalog and legacy aliases.
- Evidence revision: `af610f6e39ee0b8dbc3db49f098676bb1fd729c1`.
- CI evidence: [recorded workflow run](https://github.com/sierracatalina/context-layer/actions/runs/38006012587). This is evidence for the pinned source revision, not the final integrated candidate or deployment.
- [protocol/schemas/schema-catalog.json](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/protocol/schemas/schema-catalog.json).
- [site/context-layer/schemas/index.json](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/site/context-layer/schemas/index.json).
- [tests/conformance-kit.test.mjs](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/tests/conformance-kit.test.mjs): “versioned schemas compile offline and publication candidates preserve exact identities and refs”.
- [tests/conformance-kit.test.mjs](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/tests/conformance-kit.test.mjs): “schema catalog binds every versioned source and site candidate”.
- Limits: The catalog explicitly records prepared-not-deployment-verified status. These proposed version directories are not immutable published releases yet; an identifier or local file does not prove a live URL. Companion schema checks do not implement CL-Pass behavior.
- Next evidence: After approved site deployment, fetch all eleven versioned URLs and legacy aliases and compare bytes, IDs and catalog hashes; freeze released versions instead of overwriting them.

### C20

Private disclosure has a documented GitHub destination; form availability requires an authenticated check.

- Status: **implemented-inspected**. Reviewed 2026-10-09.
- Scope: Repository security policy and issue routing.
- Evidence revision: `af610f6e39ee0b8dbc3db49f098676bb1fd729c1`.
- [SECURITY.md](https://github.com/sierracatalina/context-layer/blob/af610f6e39ee0b8dbc3db49f098676bb1fd729c1/SECURITY.md).
- Limits: Public read on 2026-10-09 reached GitHub login only. This verifies the destination route, not an eligible reporter submission. No fallback contact is invented.
- Next evidence: Verify the authenticated private form before release; do not post exploit details publicly if unavailable.

### C21

A plain-language overview and one-line glossary satisfy documented automated readability and coverage checks.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Five-section overview, README TL;DR, 119 glossary entries, 81 distinct extracted source terms and generated site mirrors.
- Evidence revision: `378aab9cf48c5148c8ffce1f5fca17bcbee08f18`.
- [OVERVIEW.md](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/OVERVIEW.md).
- [GLOSSARY.md](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/GLOSSARY.md).
- [docs/overview-validation.md](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/docs/overview-validation.md).
- [tests/overview.test.mjs](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/tests/overview.test.mjs): “overview, TLDR, glossary, rendered page and local links satisfy the G1 contract”.
- [tests/overview.test.mjs](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/tests/overview.test.mjs): “glossary derives coverage from both specifications and fails on an omitted term”.
- Limits: Flesch estimates use a deterministic heuristic and are not observed human comprehension. The integrated optional-PCP wording passes the same automated contract; no nontechnical explain-back study is claimed.
- Next evidence: Rerun source/rendered checks on the integrated commit, review protected browser rendering and record consented human explain-back results.

### C22

Core navigation, a concise topic summary and a complete normative index preserve existing uppercase requirements and examples; section 13 now explicitly summarizes roles informatively.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Core v0.2 specification only: 123 raw uppercase MUST/SHOULD occurrences, 119 indexed occurrences in 56 passages after excluding the language definition. All 37 original role bullets are preserved. Prior-art comparisons and local-profile links are informative.
- Evidence revision: `378aab9cf48c5148c8ffce1f5fca17bcbee08f18`.
- [NORMATIVE-SUMMARY.md](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/NORMATIVE-SUMMARY.md).
- [NORMATIVE-INDEX.md](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/NORMATIVE-INDEX.md).
- [PRIOR-ART.md](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/PRIOR-ART.md).
- [tests/spec-documentation.test.mjs](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/tests/spec-documentation.test.mjs): “navigation and citation edits preserve all normative excerpts and code examples”.
- [tests/spec-documentation.test.mjs](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/tests/spec-documentation.test.mjs): “every indexed passage renders in full and has shared GitHub/site anchors”.
- [tests/spec-documentation.test.mjs](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/tests/spec-documentation.test.mjs): “each prior-art comparison includes the required decision dimensions and primary links”.
- [tests/spec-documentation.test.mjs](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/tests/spec-documentation.test.mjs): “informative role overview preserves all original bullets and existing requirement scope”.
- [CHANGELOG.md](https://github.com/sierracatalina/context-layer/blob/378aab9cf48c5148c8ffce1f5fca17bcbee08f18/CHANGELOG.md).
- Limits: Counts are keyword occurrences and passages, not atomic requirements. The one-page document is a topic summary; the complete requirement listing remains a separate longer index. Section 13 selects the informative interpretation under the existing uppercase-only convention; this is not equivalence with every earlier stricter reading. No existing uppercase obligation, condition, profile boundary, code example or role bullet is changed. Companion/Nostr drafts remain outside this core index.
- Next evidence: Independently review the exact integrated section 13 change and compatibility note under issue #18 before disposition. General canonicalization, approval, receipt, schema/profile and coverage questions remain tracked in issues #13–17.

### C23

Proposed measurable goals, user stories, release gates and private-report routing have reviewable repository artifacts.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: G-IMPLEMENT, G-ADOPT and G-FREEZE proposals; three synthetic user stories; issue/PR templates; current release and version policy.
- Evidence revision: `9149d9ecb14ef2807495ff70d448320439353b04`.
- CI evidence: [recorded workflow run](https://github.com/sierracatalina/context-layer/actions/runs/38001797605). This is evidence for the pinned source revision, not the final integrated candidate or deployment.
- [GOALS.md](https://github.com/sierracatalina/context-layer/blob/9149d9ecb14ef2807495ff70d448320439353b04/GOALS.md).
- [ROADMAP.md](https://github.com/sierracatalina/context-layer/blob/9149d9ecb14ef2807495ff70d448320439353b04/ROADMAP.md).
- [RELEASE.md](https://github.com/sierracatalina/context-layer/blob/9149d9ecb14ef2807495ff70d448320439353b04/RELEASE.md).
- [tests/governance-evidence.test.mjs](https://github.com/sierracatalina/context-layer/blob/9149d9ecb14ef2807495ff70d448320439353b04/tests/governance-evidence.test.mjs): “adoption and freeze goals remain proposed with owners, dates and measurements”.
- [tests/governance-evidence.test.mjs](https://github.com/sierracatalina/context-layer/blob/9149d9ecb14ef2807495ff70d448320439353b04/tests/governance-evidence.test.mjs): “security reporting routes privately and public forms discourage sensitive details”.
- Limits: Targets, owners and dates are unaccepted proposals. Documentation is not release authorization, a completed external review, verified private-form availability, outside adoption or a v0.3 tag.
- Next evidence: Obtain owner acceptance, verify the authenticated private report form, decide any external-review recipient/budget and apply exact-candidate release gates before promotion.

### C24

An independently authored Python experiment passes its own tests and the shared local-profile transcript.

- Status: **implemented-tested**. Reviewed 2026-10-10.
- Scope: Python 3.12 experiment with 105 unit tests, 52 standalone public-vector assertions, 45 common-kit assertions and nine cross-implementation byte/parity/bidirectional checks.
- Evidence revision: `b35e25cf1e83d7c3b7dc16b66686dde5625be11c`.
- [implementations/python/LINEAGE.md](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/LINEAGE.md).
- [implementations/python/reports/verification-summary.json](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/reports/verification-summary.json).
- [implementations/python/tests/test_profile.py](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/tests/test_profile.py): “test_profile_signature_verified_with_only_public_key”.
- [implementations/python/tests/test_profile.py](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/tests/test_profile.py): “test_profile_bound_approval_transcript”.
- [scripts/check-independent-conformance.mjs](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/scripts/check-independent-conformance.mjs).
- [implementations/python/tests/test_profile.py](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/tests/test_profile.py): “test_profile_log_reuses_validator_without_skipping_receipt_checks”.
- [implementations/python/tests/test_profile.py](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/tests/test_profile.py): “test_profile_lock_timeout_keeps_owner_and_receipts_unchanged”.
- [implementations/python/tests/test_profile.py](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/tests/test_profile.py): “test_profile_process_harness_reaps_children_before_failure_escapes”.
- [implementations/python/reports/windows-lock-fix/REVIEW-NOTE.md](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/reports/windows-lock-fix/REVIEW-NOTE.md).
- [implementations/python/tests/test_core.py](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/tests/test_core.py): “test_authority_rejects_malformed_authorizing_collections_at_construction”.
- [implementations/python/tests/test_profile.py](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/tests/test_profile.py): “test_profile_malformed_transform_containers_never_reach_signing”.
- [implementations/python/tests/test_profile.py](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/tests/test_profile.py): “test_profile_supported_transform_families_preserve_their_effects”.
- [implementations/python/tests/test_profile.py](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/tests/test_profile.py): “test_profile_unsupported_transform_fails_before_bundle_signing”.
- [implementations/python/reports/python-policy-review/REVIEW-NOTE.md](https://github.com/sierracatalina/context-layer/blob/b35e25cf1e83d7c3b7dc16b66686dde5625be11c/implementations/python/reports/python-policy-review/REVIEW-NOTE.md).
- Limits: The implementation author used a source-only packet plus separately authored profile prose. The profile author inspected JavaScript; the implementer did not. This is project-produced implementation-process independence, not outside maintenance, adoption or security audit. Python does not implement version-1 receipt-anchor migration, a production vault or every core role. Receipt-lock and policy-container corrections passed local Linux tests and independent exact-patch review. The malformed allowlist/transform-container failures were reproduced; unsupported-identifier disclosure and IndexError were not, and their actual fail-closed behavior is documented. Fresh exact-head hosted Windows/Ubuntu results are required; earlier hosted CI and configured code/security review apply only to their recorded prior heads.
- Next evidence: Run final combined hosted Linux/Windows checks and preserve exact source/clarification provenance; resolve recorded general-core ambiguities and obtain consenting outside implementation evidence separately.

## Keeping claims honest

This inventory covers root positioning, specifications and informative guides,
companion/Nostr proposals, local implementation and test artifacts, security/release
docs, and public site source/mirrors. For every changed claim, update the row,
evidence revision, exact test or review artifact, date, scope and remaining limit.
Preserve historical release notes as historical statements; correct current copy
rather than rewriting old snapshots to imply present capabilities existed then.

Keep planned/experimental labels close to the relevant documentation and site
claim. Do not publish unsupported numerical security ratings, certified status,
production-proven language, independent-review assertions or adopter counts.
The [goals](../GOALS.md) and [roadmap](../ROADMAP.md) are proposed targets; they
are not evidence. Release promotion follows [RELEASE.md](../RELEASE.md).

Regenerate this file after editing the JSON with
`node scripts/verify-claim-evidence.mjs --write`; verify it with
`node scripts/verify-claim-evidence.mjs`. Link checks establish artifact presence
and named-test references in the current checkout, not historical bytes at each
pinned revision, the truth of all prose or a fresh test pass. Reviewers verify
pinned references separately before changing evidence status.
