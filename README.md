# Context Layer

**v0.2-draft · experimental protocol · open specification and reference implementation**

Context Layer is a protocol for moving the minimum useful context across applications, models, and agents while keeping authority with the user. Every exchange begins with a declared purpose, passes through policy, produces a recipient-bound scoped bundle, and leaves a minimized receipt.

This is the canonical public repository for both the protocol and its published documentation experience. It contains the specification, schemas, reference runtime, local-core proof, threat model, test vectors, executable tests, and the source served at [sierracatalina.com/context-layer](https://sierracatalina.com/context-layer).

## Start here

- [Draft technical specification](protocol/spec/context-layer-technical-specification.md)
- [Implementation and interoperability guide](protocol/spec/context-layer-implementation-and-interoperability.md)
- [Architecture diagram](protocol/spec/context-layer-architecture-diagram.svg)
- [JSON Schemas](protocol/schemas/)
- [Dependency-free reference runtime](protocol/reference/context-layer-reference.mjs)
- [Experimental local core](packages/local-core/)
- [Threat model](docs/context-layer-threat-model.md)
- [Executable v0.2 vectors](test-vectors/v0.2/)

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

- [Overview](https://sierracatalina.com/context-layer)
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

## Security and licensing

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/sierracatalina/context-layer/security/advisories/new); do not post exploit details in a public issue.

Software, schemas, fixtures, tests, and executable examples are licensed under Apache License 2.0. Specifications, prose documentation, and diagrams are licensed under Creative Commons Attribution 4.0 International. See [LICENSING.md](LICENSING.md) for the exact boundary.
