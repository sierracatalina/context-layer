# Roadmap to a stable core

Status: proposed sequencing, 2026-10-09. Dates and role owners in [GOALS.md](GOALS.md)
are unaccepted planning targets. This roadmap does not authorize publication or
promise a delivery date. The [claim ledger](docs/CLAIM-EVIDENCE.md) is the evidence
record; this checklist is not proof of completion.

## Current baseline

The repository package is `0.2.0-draft.2`; core objects use
`context-layer/0.2-draft`. The `context-layer/0.3-draft` companion documents are a
separate experimental proposal. Their presence does not constitute a unified v0.3
release, a portable CL-Pass implementation, or a v1 commitment.

The pinned baseline includes JavaScript reference/local-core experiments, four
core executable vector sets, synthetic fixtures and a documentation site in
`site/context-layer/`. Production adoption and independent security certification
are not established. See [RELEASE.md](RELEASE.md) for version semantics.

## Stage 1: Make the draft independently reviewable

- [ ] Clear overview, one-line glossary and measured reading method; human
  comprehension remains a separate evidence requirement.
- [ ] Stable requirement inventory, linked summary and primary-source prior-art
  comparison, with novelty claims bounded to demonstrated differences.
- [ ] Specification-only implementation in another language, with provenance and
  an ambiguity report. Project-produced code is not outside adoption.
- [ ] Standalone, versioned conformance runner with an implementation-neutral
  adapter contract, hash-bound cases and versioned schema publication.
- [ ] Reproducible generated/fuzz checks plus a clear independent-review status.
- [ ] One real protocol-level MCP or A2A demonstration with synthetic data, negative
  cases, fresh-clone timing and a recorded walkthrough of at most two minutes.
- [ ] Current claims, test evidence, release metadata and issue/PR routing agree.

Completion requires reviewing the integrated candidate, not adding together green
results from unrelated branches. Mark each item complete only with an exact commit
and evidence in the ledger.

## Stage 2: Consider a v0.3 prerelease

The [v0.3 readiness checklist](RELEASE.md#v03-readiness-criteria) is the gate. First
decide whether that release covers core hardening alone or also a separately
versioned CL-Pass profile. For every shipped profile, document its wire format,
canonicalization, signing, policy inputs, replay/receipt behavior and failure modes.
A companion schema passing validation does not implement its behavioral oracles.

Keep incompatible changes explicit. Specify migration of old bundles, receipt
anchors and schema URLs; an old consumer must not silently accept a wider grant.
Only after the full candidate passes and a maintainer approves publication should
package/tag metadata move to a chosen `0.3.0-draft.N` identifier. That string is a
versioning plan, not the current package version or a released tag.

## Stage 3: Test external usefulness

Pursue the proposed G-IMPLEMENT and G-ADOPT targets from [GOALS.md](GOALS.md) using
consenting, independently maintained projects. Record failure reports as useful
findings, not successful integrations. Do not represent a project as an adopter
without its owner's confirmation of the specific integration and public attribution.
No outreach, paid review or use of private data is authorized by this roadmap.

## Stage 4: Decide whether to freeze v1

Apply every [v1 freeze gate](GOALS.md#v1-freeze-gates), resolve disagreements in
public specification discussions without disclosing vulnerabilities, and publish a
reviewable candidate before a freeze decision. The proposed 2027-06-30 target
moves if evidence is missing. A freeze is a deliberate governance decision after
testing and review, not a date-triggered release.

## Out of the current delivery promise

Managed key custody, hostile-administrator resistance, guaranteed remote deletion,
production tenant isolation, native mobile clients and broad source adapters need
separate implementations and evidence. Roadmap inclusion must not appear in site
copy as a shipped capability.
