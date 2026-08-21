# v0.2-draft public prerelease

This document defines the release boundary for the first public Context Layer prerelease.

## Release type

`v0.2-draft` is a public, inspectable proof-of-work snapshot. Its package metadata uses the semver-compatible `0.2.0-draft.1` identifier. It is:

- A working protocol proposal
- A reviewable reference implementation and local-core experiment
- A reproducible set of synthetic schemas, fixtures, and tests
- A prerelease whose contracts may change incompatibly

It is not an adopted standard, a production security implementation, or a conformance certification.

## Included surface

The release snapshot may include only reviewed repository content:

- Draft specification, implementation guide, architecture, and technical essay under `protocol/spec/`
- Protocol schemas, synthetic fixtures, and reference module under `protocol/schemas/`, `protocol/fixtures/`, and `protocol/reference/`
- Local-first core modules and their tests
- Synthetic demo, deterministic test vectors, and unsubmitted interoperability drafts
- Public release, security, contribution, and CI metadata

Website application, hosting, and deployment source are intentionally maintained outside this repository and are excluded from the protocol release snapshot.

Generated builds, dependency directories, environment files, browser profiles, screenshots, logs, private drafts, local vault data, credentials, and unrelated project history are excluded.

## Required verification

Before tagging:

1. Install exactly the locked dependencies with `npm ci`.
2. Run `npm run lint`.
3. Run `npm test`, which runs the repository-boundary, reference-contract, local-core, receipt-hardening, demo, and proof-vector suites.
4. Confirm the local-core suite is also directly runnable through `npm run test:local-core`.
5. Run `git diff --check`.
6. Confirm the candidate tree contains no credential values, private filesystem paths, real personal data, local vault artifacts, or generated output.
7. Confirm every shipped protocol object, schema, fixture, document, and test declares the intended draft identifier.
8. Record the exact commit and verification results in the GitHub prerelease notes.

## Publication sequence

1. Publish only the reviewed clean snapshot to `sierracatalina/context-layer`; do not push unrelated local history.
2. Confirm GitHub private vulnerability reporting remains enabled.
3. Require the repository CI check on the candidate commit.
4. Create the exact `v0.2-draft` tag from that commit and a matching GitHub prerelease that repeats the experimental status and licensing boundary.
5. Do not attach or deploy website assets from the protocol tag; website releases are managed from their separate source location.

## Source-use status

Software, schemas, fixtures, tests, and executable examples are licensed under Apache License 2.0. Specifications, prose documentation, and diagrams are licensed under Creative Commons Attribution 4.0 International.

The exact file boundary and attribution guidance are defined in `LICENSING.md`; the full controlling terms are in `LICENSE` and `LICENSE-DOCS`. Open licensing permits review and reuse but does not imply protocol adoption, production readiness, certification, or warranty.

## Known gaps

- Draft contracts remain unstable.
- Production identity, authorization, signing, recovery, and multi-tenant isolation are not provided.
- A same-filesystem attacker can coordinate rollback of both a receipt log and its sidecar anchor; strong rollback resistance requires a separate protected checkpoint boundary.
- No independent conformance or security certification exists.
- Production source adapters and consumer integrations remain future work; this snapshot includes one narrow local-files adapter and one local-agent consumer for conformance evidence.
- Website rendering and deployment behavior are not verified by this repository because their source is intentionally maintained elsewhere.
