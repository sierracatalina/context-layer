# Context Layer

**v0.2-draft · experimental · not an adopted standard**

Context Layer is a working protocol proposal for giving applications and agents the minimum context required for a declared purpose without exposing a user's entire private memory. It models the path from a purpose-bound request through policy, scoped disclosure, action, and receipt.

This repository is the canonical public source for the draft specification, reference artifacts, local-first implementation work, tests, and reviewed public-site source.

## Status

- `v0.2-draft` is the first public prerelease line and an inspectable proof-of-work snapshot. Draft objects and interfaces may change incompatibly.
- The reference code demonstrates contract validation and deterministic policy reduction. The local core adds an encrypted vault, authenticated bundle envelopes, anchored receipts, one files adapter, and one local-agent consumer. It is not a production security implementation.
- `sierracatalina.com` is the canonical public host. The OpenAI Sites worker is a redirect-only compatibility boundary and is deployed only after Sierra's same-origin routes are verified.
- The hosted site is a synthetic demonstrator and may trail the repository draft while a release is being reviewed.
- Conformance requires evidence against the declared profile. Passing the repository tests alone is not a security certification.

## Core invariants

Every conforming profile should preserve these boundaries:

1. **Purpose before access.** A request identifies the requester, recipient, purpose, fields, actions, and retention window before context is evaluated.
2. **Minimum necessary disclosure.** Policy may allow, reduce, deny, or require approval; it does not silently broaden scope.
3. **Raw-vault isolation.** External consumers cannot enumerate or resolve private vault objects.
4. **Recipient binding and expiry.** A scoped bundle is bound to its intended consumer and becomes unusable after its declared lifetime.
5. **Proposal-only memory writes.** Generated observations do not become durable memory without a distinct proposal and approval path.
6. **Minimized receipts.** Security-relevant operations leave a traceable record without copying raw private payloads into the receipt log.
7. **Fail-closed behavior.** Missing identity, ambiguous purpose, invalid scope, expired authorization, or receipt failure cannot produce broader access.
8. **Native-protocol preservation.** Adapters retain security-relevant identifiers and semantics from the systems they connect.

## Quickstart

Requirements:

- Node.js 22.13 or later
- npm

Install the locked dependencies and run the release checks:

```sh
npm ci
npm run lint
npm test
```

`npm test` builds the Cloudflare-compatible redirect worker and then runs the redirect-route, reference-contract, local-core, receipt-hardening, demo, and proof-vector suites.

Start the local development server with:

```sh
npm run dev
```

Run the synthetic, minimized local-core demonstration with:

```sh
npm run demo:local-core
```

The demo uses temporary files and test-only keys, then prints one payload-free JSON summary.

The archived demonstrator, redirect worker, and tests do not require an API key. This repository does not execute the native Sierra guide or hold its deployment credentials; never place credentials in client code, fixtures, or committed environment files.

## Artifact map

| Path | Purpose |
| --- | --- |
| `public/reference/` | Draft specification, implementation guidance, architecture, and the readable technical essay |
| `public/implementation/` | Portable schemas, synthetic fixtures, and the dependency-free reference module |
| `packages/local-core/` | Local-first vault, policy, bundle, and receipt boundary work for the v0.2 implementation line |
| `worker/` | Redirect-only Sites compatibility boundary with a reviewed path allowlist |
| `public/` | Reviewed Sierra publication sources, archive assets, metadata, downloads, and machine-readable navigation |
| `tests/` | Redirect-route, reference-contract, and local-core verification |
| `examples/` | Runnable synthetic local-core demonstration |
| `test-vectors/v0.2/` | SHA-bound deterministic protocol and security vectors |
| `docs/context-layer-threat-model.md` | Provisional repository-grounded threat model for the tested single-user profile |
| `docs/nostr/` | Unsubmitted Nostr interoperability discussion draft |
| `.openai/hosting.json` | Non-secret binding to the existing OpenAI Sites project |

## Live documentation

The current public demonstrator is available at:

- [Context Layer overview](https://sierracatalina.com/context-layer)
- [Technical essay](https://sierracatalina.com/signal/the-context-layer)
- [Architecture](https://sierracatalina.com/context-layer/architecture)
- [Draft specification](https://sierracatalina.com/context-layer/specification)
- [Implementation guide](https://sierracatalina.com/context-layer/implementation)
- [Reference code and schemas](https://sierracatalina.com/context-layer/code)

Check the status and version identifier inside each artifact before treating live documentation as matching the repository HEAD.

## Current limits

This project does not currently provide:

- An adopted standard or independent conformance program
- A production context vault, multi-user identity service, or approval service
- A mandated canonicalization or cryptographic signature suite
- Production source adapters or consumer integrations
- Proof of deletion by already-compromised recipients
- A security certification, privacy guarantee, or authorization to use real sensitive data

All committed fixtures and walkthroughs must remain synthetic. Production use requires an independent threat model, deployment-specific authentication and authorization, key management, abuse controls, recovery procedures, and security review.

The local receipt sidecar detects rollback only while its authenticated anchor remains intact. Deployments requiring hostile-local-process rollback resistance must store the checkpoint on a separate protected monotonic or compare-and-set boundary.

## Versioning

- Protocol objects carry an explicit draft identifier such as `context-layer/0.2-draft`.
- The first public proof-of-work snapshot uses the exact `v0.2-draft` tag; package metadata uses the semver-compatible `0.2.0-draft.1` identifier.
- Draft identifiers are unstable. Do not store production data against a draft without a migration plan.
- A change that weakens a security invariant or changes a required field is breaking, even when a serializer still accepts the object.
- The public site and repository may advance independently during review; the artifact's own identifier is authoritative.

See [RELEASE.md](RELEASE.md) for the public prerelease checklist, [CHANGELOG.md](CHANGELOG.md) for release notes, [SECURITY.md](SECURITY.md) for the disclosure process and security boundary, [docs/context-layer-threat-model.md](docs/context-layer-threat-model.md) for the current repository threat model, and [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes.

## Public source and reuse

The `v0.2-draft` tag publishes experimental proof of work under free and open licenses. Software, schemas, fixtures, tests, and executable examples are available under Apache License 2.0. Specifications, prose documentation, and diagrams are available under Creative Commons Attribution 4.0 International.

See [LICENSING.md](LICENSING.md) for the exact file boundary, attribution guidance, and the controlling license texts. Licensing permits reuse; it does not turn this draft into an adopted standard, production security implementation, or conformance certification.
