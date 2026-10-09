# Security policy

## Project status

Context Layer is an experimental protocol proposal and reference implementation. It is not an adopted standard, a production context vault, or a security certification. Draft interfaces may change, and the repository must not be used with real secrets or sensitive personal data without a separate production threat model and security review.

The canonical Context Layer website source is in `site/context-layer/`, with routing in `site/vercel.json`. It is in repository review scope. Hosting account configuration, deployed infrastructure, and unrelated Sierra Catalina website source are outside this repository; their security properties are not established by these tests.

Security fixes for the current `v0.2-draft` line are handled on a best-effort basis. Earlier drafts are documentation and migration references only.

## Report a vulnerability privately

Do not open a public issue for a suspected vulnerability.

Use GitHub private vulnerability reporting for this repository:

<https://github.com/sierracatalina/context-layer/security/advisories/new>

This is the repository-specific GitHub private-report route, also linked from the issue chooser. Its public page currently leads to GitHub sign-in; that does not verify the authenticated form or the repository setting. Maintainers must verify private reporting is enabled before a security-sensitive release. No fallback email has been verified. If the private form is unavailable, do not post exploit details, secrets, or affected data publicly; wait for the maintainers to restore a private reporting channel.

Include only synthetic evidence and provide:

- The affected commit, version, protocol artifact, or runtime surface
- The violated invariant or trust boundary
- Reproduction steps or a minimal proof of concept
- Expected and observed behavior
- Likely impact and any suggested mitigation
- Whether the issue may already be publicly known

Do not test against accounts, vaults, or data you do not own or have explicit permission to assess.

## Security-sensitive scope

Reports are especially useful when they demonstrate:

- Raw vault data crossing the disclosure boundary
- Policy allow, reduce, deny, or approval behavior being bypassed
- Recipient binding, expiry, or revocation being ignored
- Secret-bearing fields entering bundles, receipts, logs, or published protocol artifacts
- A receipt claiming an operation or decision that did not occur
- Prompt injection expanding tool or data capabilities
- A closed schema or reference validator accepting forbidden or unknown fields
- An adapter discarding security-relevant native identifiers or semantics
- A dependency, CI, or release compromise with a concrete path into this project

General product requests, draft-design disagreements, and findings without a plausible impact path may be handled through normal project discussion.

## Experimental security boundary

The repository demonstrates protocol contracts and selected failure behavior. It does not currently guarantee:

- Production-grade encryption, key custody, identity, or account recovery
- Production key distribution or hostile-admin key protection. The tested local profile does use public-key-verifiable Ed25519 signatures; that proves possession of the signing key under the configured trust binding, not real-world issuer identity
- Rollback resistance when both a log and its sidecar anchor can be replaced together
- Durable revocation or deletion at a compromised recipient
- Isolation between real tenants or hostile local processes
- Correctness of adapters that are not included and tested here
- Protection from every inference or correlation attack

Any deployed implementation must define its own trust boundaries, authentication, authorization, retention, audit, incident response, and recovery model. A passing test suite is necessary evidence for the tested profile, not proof of overall security.

## Evidence and open review

- [Threat model and trust assumptions](docs/context-layer-threat-model.md)
- [Reviewed proposed local profile and known differences](protocol/profiles/local-core-0.2-draft.1.md)
- [Reproducible bounded fuzz and property tests](docs/security-testing.md)
- [Independent outside review status and findings template](docs/security-review-status.md)

The repository has not established independent outside cryptographic or protocol review. Agent-assisted implementation review, a second implementation, and passing CI are separate evidence; none is an outside audit.

## Disclosure and response

Maintainers will triage reports on a best-effort basis and coordinate a fix and disclosure window appropriate to the demonstrated risk. No response-time or remediation SLA is promised during the draft phase. Reporters should avoid public disclosure until a fix is available or a disclosure plan has been agreed.
