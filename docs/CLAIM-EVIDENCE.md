# Claims and evidence

Evidence review date: 2026-10-09. Baseline revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.

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
| [C08](#c08) | Four hash-bound core vector sets and a synthetic local demo are executable. | implemented-tested |
| [C09](#c09) | The documentation site includes checked routes, source/asset contracts and progressive mobile navigation. | implemented-tested |
| [C10](#c10) | Package metadata and core/companion wire identifiers are separate. | implemented-inspected |
| [C11](#c11) | CL-Pass schemas and behavioral oracles describe a separate experimental proposal. | proposed-untested |
| [C12](#c12) | Broader source, organization, federation, semantic proxy and discovery profiles are design targets. | proposed-untested |
| [C13](#c13) | One local MCP stdio demo narrows six synthetic fields to three before delivery and denies a private-only request. | implemented-tested |
| [C14](#c14) | The Nostr profile is unsubmitted and event kinds remain unassigned. | proposed-untested |
| [C15](#c15) | Outside implementation and adoption are not established by baseline artifacts. | not-established |
| [C16](#c16) | Independent security review and certification are not established. | not-established |
| [C17](#c17) | Generated/fuzz coverage beyond deterministic regressions is not established at baseline. | not-established |
| [C18](#c18) | Human comprehension, explain-back and external user outcomes are unmeasured. | not-established |
| [C19](#c19) | Immutable schema publication and standalone external conformance are unverified at baseline. | not-established |
| [C20](#c20) | Private disclosure has a documented GitHub destination; form availability requires an authenticated check. | implemented-inspected |
| [C21](#c21) | A plain-language overview and one-line glossary satisfy documented automated readability and coverage checks. | implemented-tested |
| [C22](#c22) | Core navigation, a concise summary and a complete normative index preserve existing requirement passages and examples. | implemented-tested |
| [C23](#c23) | Proposed measurable goals, user stories, release gates and private-report routing have reviewable repository artifacts. | implemented-tested |

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

Four hash-bound core vector sets and a synthetic local demo are executable.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Core v0.2 manifest and repository-local JavaScript runner.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [test-vectors/v0.2/manifest.json](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/test-vectors/v0.2/manifest.json).
- [examples/local-core-demo.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/examples/local-core-demo.mjs).
- [tests/test-vectors.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/test-vectors.test.mjs): “manifest binds every synthetic vector by content and coverage”.
- [tests/local-core-demo.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core-demo.test.mjs): “synthetic demo runs end to end and emits only its minimized summary”.
- Limits: The baseline runner imports repository modules. Six fixtures and CL-Pass prose oracles are not six executable vector sets or a standalone kit.
- Next evidence: Version an implementation-neutral kit and report actual case and set totals.

### C09

The documentation site includes checked routes, source/asset contracts and progressive mobile navigation.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: site/context-layer source and site/vercel.json, including the plain-language overview and mobile-menu state checks.
- Evidence revision: `0747517319b65902f72a146cb0ec6cc959c59782`.
- CI evidence: [recorded workflow run](https://github.com/sierracatalina/context-layer/actions/runs/38001192309). This is evidence for the pinned source revision, not the final integrated candidate or deployment.
- [site/vercel.json](https://github.com/sierracatalina/context-layer/blob/0747517319b65902f72a146cb0ec6cc959c59782/site/vercel.json).
- [tests/public-site.test.mjs](https://github.com/sierracatalina/context-layer/blob/0747517319b65902f72a146cb0ec6cc959c59782/tests/public-site.test.mjs): “all public routes expose a progressive mobile menu with the full navigation”.
- [tests/public-site.test.mjs](https://github.com/sierracatalina/context-layer/blob/0747517319b65902f72a146cb0ec6cc959c59782/tests/public-site.test.mjs): “mobile menu supports repeat toggles, dismissal, responsive changes and history restore”.
- [tests/overview.test.mjs](https://github.com/sierracatalina/context-layer/blob/0747517319b65902f72a146cb0ec6cc959c59782/tests/overview.test.mjs): “overview, TLDR, glossary, rendered page and local links satisfy the G1 contract”.
- [tests/editorial-formatting.test.mjs](https://github.com/sierracatalina/context-layer/blob/0747517319b65902f72a146cb0ec6cc959c59782/tests/editorial-formatting.test.mjs).
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

Outside implementation and adoption are not established by baseline artifacts.

- Status: **not-established**. Reviewed 2026-10-09.
- Scope: All code and demonstrations in the pinned repository snapshot.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [README.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/README.md).
- [test-vectors/v0.2/README.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/test-vectors/v0.2/README.md).
- Limits: Project-produced second-language or clean-room code can test implementability without proving outside ownership or adoption.
- Next evidence: Apply GOALS.md G-IMPLEMENT and G-ADOPT with consenting outside project-owner confirmation.

### C16

Independent security review and certification are not established.

- Status: **not-established**. Reviewed 2026-10-09.
- Scope: Protocol, cryptography, local runtime and site.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [SECURITY.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/SECURITY.md).
- [docs/context-layer-threat-model.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/docs/context-layer-threat-model.md).
- Limits: Regression tests and disclosure instructions are not an outside audit, security score or certification.
- Next evidence: Record real independent review scope and finding dispositions; keep unsupported assurances absent.

### C17

Generated/fuzz coverage beyond deterministic regressions is not established at baseline.

- Status: **not-established**. Reviewed 2026-10-09.
- Scope: Bundle/receipt parsing, replay and revocation properties.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [tests/local-core.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/local-core.test.mjs).
- [tests/receipt-log-hardening.test.mjs](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/tests/receipt-log-hardening.test.mjs).
- Limits: Named negative examples are not a measured fuzz campaign.
- Next evidence: Link reproducible seeds, command, corpus, budget and failures for a generated/property suite.

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

Immutable schema publication and standalone external conformance are unverified at baseline.

- Status: **not-established**. Reviewed 2026-10-09.
- Scope: Core and companion schema IDs and deployment paths.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [protocol/schemas/receipt.schema.json](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/protocol/schemas/receipt.schema.json).
- [protocol/companions/0.3-draft/README.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/protocol/companions/0.3-draft/README.md).
- Limits: An $id, local route or alias does not prove a stable live URL or successful standalone installation.
- Next evidence: Resolve each versioned URL, compare expected bytes/hashes and test the packaged runner outside the checkout.

### C20

Private disclosure has a documented GitHub destination; form availability requires an authenticated check.

- Status: **implemented-inspected**. Reviewed 2026-10-09.
- Scope: Repository security policy and issue routing.
- Evidence revision: `0a8d016c822f38e8fc857422e133d0699c42a21f`.
- [SECURITY.md](https://github.com/sierracatalina/context-layer/blob/0a8d016c822f38e8fc857422e133d0699c42a21f/SECURITY.md).
- Limits: Public read on 2026-10-09 reached GitHub login only. This verifies the destination route, not an eligible reporter submission. No fallback contact is invented.
- Next evidence: Verify the authenticated private form before release; do not post exploit details publicly if unavailable.

### C21

A plain-language overview and one-line glossary satisfy documented automated readability and coverage checks.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Five-section overview, README TL;DR, 119 glossary entries, 81 distinct extracted source terms and generated site mirrors.
- Evidence revision: `0747517319b65902f72a146cb0ec6cc959c59782`.
- CI evidence: [recorded workflow run](https://github.com/sierracatalina/context-layer/actions/runs/38001192309). This is evidence for the pinned source revision, not the final integrated candidate or deployment.
- [OVERVIEW.md](https://github.com/sierracatalina/context-layer/blob/0747517319b65902f72a146cb0ec6cc959c59782/OVERVIEW.md).
- [GLOSSARY.md](https://github.com/sierracatalina/context-layer/blob/0747517319b65902f72a146cb0ec6cc959c59782/GLOSSARY.md).
- [docs/overview-validation.md](https://github.com/sierracatalina/context-layer/blob/0747517319b65902f72a146cb0ec6cc959c59782/docs/overview-validation.md).
- [tests/overview.test.mjs](https://github.com/sierracatalina/context-layer/blob/0747517319b65902f72a146cb0ec6cc959c59782/tests/overview.test.mjs): “overview, TLDR, glossary, rendered page and local links satisfy the G1 contract”.
- [tests/overview.test.mjs](https://github.com/sierracatalina/context-layer/blob/0747517319b65902f72a146cb0ec6cc959c59782/tests/overview.test.mjs): “glossary derives coverage from both specifications and fails on an omitted term”.
- Limits: Flesch estimates use a deterministic heuristic and are not observed human comprehension. The pinned overview is the reviewed source-branch revision; later integrated wording has separately rerun metrics. No nontechnical explain-back study is claimed.
- Next evidence: Rerun source/rendered checks on the integrated commit, review protected browser rendering and record consented human explain-back results.

### C22

Core navigation, a concise summary and a complete normative index preserve existing requirement passages and examples.

- Status: **implemented-tested**. Reviewed 2026-10-09.
- Scope: Core v0.2 specification only: 123 raw uppercase MUST/SHOULD occurrences, 119 indexed occurrences in 56 passages after excluding the language definition. Primary-source prior-art comparisons are informative.
- Evidence revision: `b60781c9cdaa3a326d0173717087cf3c5903e196`.
- CI evidence: [recorded workflow run](https://github.com/sierracatalina/context-layer/actions/runs/38001341242). This is evidence for the pinned source revision, not the final integrated candidate or deployment.
- [NORMATIVE-SUMMARY.md](https://github.com/sierracatalina/context-layer/blob/b60781c9cdaa3a326d0173717087cf3c5903e196/NORMATIVE-SUMMARY.md).
- [NORMATIVE-INDEX.md](https://github.com/sierracatalina/context-layer/blob/b60781c9cdaa3a326d0173717087cf3c5903e196/NORMATIVE-INDEX.md).
- [PRIOR-ART.md](https://github.com/sierracatalina/context-layer/blob/b60781c9cdaa3a326d0173717087cf3c5903e196/PRIOR-ART.md).
- [tests/spec-documentation.test.mjs](https://github.com/sierracatalina/context-layer/blob/b60781c9cdaa3a326d0173717087cf3c5903e196/tests/spec-documentation.test.mjs): “navigation and citation edits preserve all normative excerpts and code examples”.
- [tests/spec-documentation.test.mjs](https://github.com/sierracatalina/context-layer/blob/b60781c9cdaa3a326d0173717087cf3c5903e196/tests/spec-documentation.test.mjs): “every indexed passage renders in full and has shared GitHub/site anchors”.
- [tests/spec-documentation.test.mjs](https://github.com/sierracatalina/context-layer/blob/b60781c9cdaa3a326d0173717087cf3c5903e196/tests/spec-documentation.test.mjs): “each prior-art comparison includes the required decision dimensions and primary links”.
- Limits: Counts are keyword occurrences and passages, not atomic requirements. The complete index is longer than the one-page summary. Companion/Nostr drafts are outside the core index. Section 13 mixed-case Must implement/document remains ambiguous under the uppercase BCP 14 rule; its text and strength are not silently changed.
- Next evidence: Resolve normative ambiguities explicitly before a stable contract or expanded conformance claim; retain exact source/hash preservation checks after integration.

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
