# v0.2-draft public prerelease

This document defines the release boundary for the first public Context Layer prerelease.

## Release type

`v0.2-draft` is a public, inspectable proof-of-work snapshot. Its package metadata uses the semver-compatible `0.2.0-draft.1` identifier. It is:

- A working protocol proposal
- A reviewable reference implementation and local-core experiment
- A reproducible set of synthetic schemas, fixtures, and tests
- A prerelease whose contracts may change incompatibly

It is not an adopted standard, a production security implementation, a conformance certification, or an open-source release.

## Included surface

The release snapshot may include only reviewed repository content:

- Draft specification, implementation guide, architecture, and technical essay
- Protocol schemas, synthetic fixtures, and reference module
- Local-first core modules and their tests
- Synthetic demo, deterministic test vectors, and unsubmitted interoperability drafts
- Hosted demonstrator source and route tests
- Public release, security, contribution, and CI metadata

Generated builds, dependency directories, environment files, browser profiles, screenshots, logs, private drafts, local vault data, credentials, and unrelated project history are excluded.

## Required verification

Before tagging:

1. Install exactly the locked dependencies with `npm ci`.
2. Run `npm run lint`.
3. Run `npm test`, which builds the hosted worker and runs the route, reference-contract, local-core, receipt-hardening, demo, and proof-vector suites.
4. Confirm the local-core suite is also directly runnable through `npm run test:local-core`.
5. Run `git diff --check`.
6. Confirm the candidate tree contains no credential values, private filesystem paths, real personal data, local vault artifacts, or generated output.
7. Confirm every shipped protocol object, schema, fixture, document, and test declares the intended draft identifier.
8. Record the exact commit and verification results in the GitHub prerelease notes.

## Publication sequence

1. Publish only the reviewed clean snapshot to `sierracatalina/context-layer`; do not push unrelated local history.
2. Enable GitHub private vulnerability reporting.
3. Require the repository CI check on the candidate commit.
4. Create the exact `v0.2-draft` tag from that commit and a matching GitHub prerelease.
5. Create a GitHub prerelease that repeats the experimental and unlicensed status.
6. Treat deployment of a saved OpenAI Sites version as a separate public-release decision. A repository tag does not implicitly deploy the site.

## Source-use status

No open-source license has been selected or granted. Publication makes the source inspectable for proof-of-work review and citation but does not grant permission to copy, modify, redistribute, or create derivative works.

License selection is a follow-up before inviting reuse or accepting external contributions. Its absence does not prevent a clearly labeled unlicensed proof-of-work tag, and this prerelease must not be presented as open source.

## Known gaps

- Draft contracts remain unstable.
- Production identity, authorization, signing, recovery, and multi-tenant isolation are not provided.
- A same-filesystem attacker can coordinate rollback of both a receipt log and its sidecar anchor; strong rollback resistance requires a separate protected checkpoint boundary.
- No independent conformance or security certification exists.
- Production source adapters and consumer integrations remain future work; this snapshot includes one narrow local-files adapter and one local-agent consumer for conformance evidence.
- The public demonstrator may trail the repository while a saved deployment awaits separate approval.
