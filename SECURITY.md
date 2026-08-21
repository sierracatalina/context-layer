# Security policy

## Project status

Context Layer is an experimental protocol proposal and reference implementation. It is not an adopted standard, a production context vault, or a security certification. Draft interfaces may change, and the repository must not be used with real secrets or sensitive personal data without a separate production threat model and security review.

Website application, hosting, and deployment source are intentionally maintained outside this protocol repository. Security reports about those surfaces should be filed with the project that owns their source and deployment.

Security fixes for the current `v0.2-draft` line are handled on a best-effort basis. Earlier drafts are documentation and migration references only.

## Report a vulnerability privately

Do not open a public issue for a suspected vulnerability.

Use GitHub private vulnerability reporting for this repository:

<https://github.com/sierracatalina/context-layer/security/advisories/new>

Private vulnerability reporting is enabled for the public repository. If the private form is unavailable, do not post exploit details, secrets, or affected data publicly; wait for the maintainers to restore a private reporting channel.

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
- Portable third-party-verifiable signatures, hostile-admin key protection, or rollback resistance when both a log and its sidecar anchor can be modified together
- Durable revocation or deletion at a compromised recipient
- Isolation between real tenants or hostile local processes
- Correctness of adapters that are not included and tested here
- Protection from every inference or correlation attack

Any deployed implementation must define its own trust boundaries, authentication, authorization, retention, audit, incident response, and recovery model. A passing test suite is necessary evidence for the tested profile, not proof of overall security.

## Disclosure and response

Maintainers will triage reports on a best-effort basis and coordinate a fix and disclosure window appropriate to the demonstrated risk. No response-time or remediation SLA is promised during the draft phase. Reporters should avoid public disclosure until a fix is available or a disclosure plan has been agreed.
