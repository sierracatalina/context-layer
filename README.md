# Context Layer

**v0.2-draft · experimental protocol · open specification and reference implementation**

## TL;DR

Context Layer is a draft set of rules for sharing context with an app or AI agent. An app asks for facts for one task. Policy checks decide what it can see & do. It gets a small packet with a time limit, rather than full access to the user's vault. Receipts record what happened. New memory starts as a proposal.

This repo has the spec, tests & a working local proof for one user. The proof uses made-up data. It is not ready for production or proven to work across vendors.

Start with the [plain-language overview](OVERVIEW.md) & [one-line glossary](GLOSSARY.md). The [public site's source](site/context-layer/) lives here too.

## Start here

- [Draft technical specification](protocol/spec/context-layer-technical-specification.md)
- [Implementation and interoperability guide](protocol/spec/context-layer-implementation-and-interoperability.md)
- [Architecture diagram](protocol/spec/context-layer-architecture-diagram.svg)
- [JSON Schemas](protocol/schemas/)
- [Dependency-free reference runtime](protocol/reference/context-layer-reference.mjs)
- [Experimental local core](packages/local-core/)
- [Threat model](docs/context-layer-threat-model.md)
- [Executable v0.2 vectors](test-vectors/v0.2/)
- [2026-09 protocol proposal (0.2 Lite + 0.3 CL-Pass)](docs/proposals/2026-09-protocol-proposal.md)

## Protocol flow

~~~text
purpose-bound request
  -> policy decision
  -> minimum approved bundle
  -> capability-bound action
  -> minimized receipt
  -> reviewable memory proposal
~~~

The protocol preserves seven core boundaries:

1. Purpose is declared before access.
2. Policy can allow, reduce, require approval, or deny.
3. Raw-vault material never enters a scoped bundle.
4. Bundles are bound to a recipient, expiry, and single-use rule.
5. Consumers receive explicit capabilities rather than ambient authority.
6. Sensitive operations produce payload-minimized receipts.
7. New memory enters through a proposal and review path.

## Implemented proof

The v0.2 draft includes:

- Closed JSON Schemas for requests, decisions, bundles, receipts, and memory proposals
- A dependency-free reference validator and deterministic policy/bundle flow
- An encrypted single-user local vault
- Four-state policy evaluation
- Authenticated scoped-bundle envelopes
- An append-only receipt log with an authenticated anchor
- One root-confined UTF-8 files adapter
- One capability-bound local-agent consumer
- Synthetic fixtures, executable vectors, and an end-to-end demo

The proof is experimental and is not an adopted standard or a production security certification.

## Run the proof

Requirements:

- Node.js 22.13 or later
- npm

~~~sh
npm ci
npm run lint
npm test
npm run demo:local-core
~~~

npm test runs the repository-boundary, public-contract, local-core, receipt-hardening, demo, and proof-vector suites. All fixtures and demos are synthetic.

### Receipt anchor upgrades

New receipt anchors use `anchor_version: 2` with Ed25519 signatures. `openReceiptLog`
verifies an existing version-1 HMAC chain and its matching receipt log before
atomically replacing the sidecar with a version-2 chain under the receipt-log lock.
Receipt bytes and replay history are preserved. Existing 32-byte `anchor.key` or
`anchor.keyProvider` configurations continue to work; when using a different
Ed25519 signing key, supply the original 32-byte HMAC key as `anchor.legacyHmacKey`
for migration. It can be retired after a successful upgrade. The pre-release
version-1 Ed25519 format is also verified and upgraded. `verifyReceiptLog` remains
read-only. Tampered or mismatched logs fail closed before migration; older HMAC-only
software cannot reopen upgraded sidecars.

## Repository map

| Path | Purpose |
| --- | --- |
| protocol/spec/ | Draft specification, implementation guide, architecture, and technical essay |
| protocol/schemas/ | Portable JSON Schemas |
| protocol/fixtures/ | Valid and invalid synthetic contract fixtures |
| protocol/reference/ | Dependency-free reference runtime |
| packages/local-core/ | Experimental vault, policy, bundle, receipt, adapter, and consumer modules |
| docs/ | Threat model and interoperability drafts |
| test-vectors/v0.2/ | SHA-bound deterministic protocol/security vectors |
| examples/ | Minimized executable local-core demonstration |
| site/context-layer/ | Canonical source for the published Context Layer dossier and its routes |
| site/vercel.json | Standalone route map for previewing or deploying the public documentation experience |
| tests/ | Contract, boundary, local-core, receipt, demo, and vector verification |

## Public documentation

- [Plain-language overview](https://sierracatalina.com/context-layer/overview)
- [Protocol home](https://sierracatalina.com/context-layer)
- [Architecture](https://sierracatalina.com/context-layer/architecture)
- [Specification](https://sierracatalina.com/context-layer/specification)
- [Implementation](https://sierracatalina.com/context-layer/implementation)
- [Reference code](https://sierracatalina.com/context-layer/code)
- [Interactive synthetic demo](https://sierracatalina.com/context-layer/demo)

The website is a documentation surface, and its complete public source is versioned in `site/context-layer/`. The protocol objects under `protocol/` remain authoritative for technical behavior and versioned proof artifacts.

## Preview the public site

The `site/` directory is independently deployable and preserves the production URL structure, including `/context-layer`, `/context-layer/architecture`, and `/signal/the-context-layer`.

~~~sh
npx vercel dev site
~~~

The repository test suite verifies that all published routes and their required assets remain present. Changes to public copy or design should be made here first so the repository and live documentation cannot silently diverge.

## Protocol proposal (2026-09)

The 2026-09 proposal keeps `CL-Core-Lite` closed and adds a reviewable `context-layer/0.3-draft` companion pack (CL-Pass) beside it. This does not open the five Lite schemas or mint a live issuer.

| Path | Purpose |
| --- | --- |
| [docs/proposals/2026-09-protocol-proposal.md](docs/proposals/2026-09-protocol-proposal.md) | Technical write-up (working draft) |
| [protocol/companions/0.3-draft/](protocol/companions/0.3-draft/) | Companion objects, closed schemas, examples |
| [test-vectors/cl-pass/VECTORS.md](test-vectors/cl-pass/VECTORS.md) | Required T01–T10 oracles (schema-valid JSON is not a pass) |

## Security and licensing

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/sierracatalina/context-layer/security/advisories/new); do not post exploit details in a public issue.

Software, schemas, fixtures, tests, and executable examples are licensed under Apache License 2.0. Specifications, prose documentation, and diagrams are licensed under Creative Commons Attribution 4.0 International. See [LICENSING.md](LICENSING.md) for the exact boundary.
