# Independent security review status

Status as of 2026-10-09: **not performed / no outside findings received**.

This repository does not identify an independent outside cryptographic or protocol reviewer, commissioned engagement, or completed audit. Agent-assisted analysis, a clean-room second implementation, static inspection, regressions, fuzzing, and CI must be labeled separately. No paid service or external outreach was initiated by this work.

## Proposed review scope

- Threat model, trust bootstrap and authenticated approval attestation
- Ed25519/JCS preimages, key-purpose separation, number and Unicode handling
- Schema/parser consistency and duplicate-name handling
- Recipient, expiry, revocation, concurrent replay, and session capability semantics
- Log/anchor durability, crash windows, protected checkpoint requirements and migration
- Context minimization, provenance, receipt privacy and memory proposal boundaries
- Dependency, CI, schema publication and artifact integrity assumptions

An actual reviewer should report their identity/affiliation, independence and conflicts, exact commit and profile scope, methods, test corpus, time window, limitations, findings and disposition. Do not fill these fields with hypothetical reviewers or a “no findings” statement before review occurs.

## Findings record template

- Finding ID and title:
- Reviewer and independence declaration:
- Reviewed commit/profile/version and review date:
- Invariant and affected surface:
- Severity and rationale:
- Synthetic reproduction and evidence:
- Required assumptions and impact:
- Proposed correction and compatibility effect:
- Owner-approved disposition:
- Fix commit and independently verified retest:
- Private disclosure / publication status:

Use the private route in [SECURITY.md](../SECURITY.md) for vulnerability details. Public release readiness remains blocked on verifying that route and deciding the outside review requirement; a draft PR does not close either gate.
