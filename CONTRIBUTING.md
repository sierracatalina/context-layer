# Contributing

Context Layer is an experimental protocol draft. Focused review of invariants,
object contracts, fixtures, threat boundaries and failure behavior is welcome.
Contributions follow the existing software/documentation licenses in
[LICENSING.md](LICENSING.md).

This repository accepts protocol, reference-runtime, local-core, conformance,
proof and public-documentation changes. Canonical Context Layer site source lives
in `site/context-layer/`; unrelated Sierra Catalina website source does not.

## Before contributing

- Read [README.md](README.md), [SECURITY.md](SECURITY.md), the
  [roadmap](ROADMAP.md) and the [claim ledger](docs/CLAIM-EVIDENCE.md).
- Use synthetic data only. Never include real credentials, private conversations,
  sensitive personal data, private filesystem paths or raw vault contents.
- State the exact version, profile and requirement affected. Distinguish a normative
  obligation, implemented behavior, a test observation and a proposed feature.
- Keep protocol claims, implementation, schemas, fixtures and tests aligned in the
  same proposed change. Update both canonical source and affected site mirrors.
- Keep specifications in `protocol/spec/`, reference code in `protocol/reference/`,
  schemas in `protocol/schemas/` and fixtures in `protocol/fixtures/`.

## Choose the right report

- **Bug:** use the public bug form for a non-security defect, exact revision,
  synthetic reproduction and expected/observed behavior.
- **Specification question:** use the public specification form for ambiguous
  requirements, incompatible readings, prior-art questions or evidence gaps.
- **Security:** use [GitHub private vulnerability reporting](https://github.com/sierracatalina/context-layer/security/advisories/new)
  and the [private report template](.github/SECURITY_REPORT_TEMPLATE.md). Never put exploit
  details, credentials or affected private data in public issues or PRs. If the
  private form is unavailable, wait for a private channel; there is no invented
  fallback email. A login page alone does not verify that reporting is enabled.

The issue chooser routes security reports to the private form instead of offering
a public security issue template. Maintainers need to check that route before any
release. Ordinary issue forms are public even if their title says “security.”

## Local checks

Use Node.js 22.13 or later and the locked dependencies:

```sh
npm ci
npm run lint
npm test
node --test tests/governance-evidence.test.mjs
npm run verify:context-layer
npm run release:hygiene
git diff --check
```

Run every additional conformance, independent-implementation and generated-test
command shipped by the affected profile. For site edits, use
`npm run format:context-layer`, rerun the verifier and site tests, then review the
rendered pages. Source checks do not establish browser usability or production
parity. Record checks as passed, failed or not run; never combine results from
different commits into an apparent candidate pass.

## Pull requests and review

Open a draft PR until the scope and evidence are reviewable. Keep changes small
enough to review as one protocol decision and use the PR template.

- Explain compatibility and migration for changed fields, enums, defaults,
  canonical bytes, authorization and security behavior.
- Add valid and invalid synthetic cases for contract changes. Independent
  implementations should document the source material they used and ambiguities
  they could not resolve, rather than guessing reference behavior.
- Do not weaken a security default merely to make an integration pass.
- Add or update the evidence ledger when public capability claims change. Name the
  exact tests and their scope; label untested integrations planned/experimental.
- A maintainer reviews the specification and implementation together. Accepted
  review or a merged PR does not constitute security certification.
- Follow [RELEASE.md](RELEASE.md) for release gates. PR approval alone is not
  permission to tag, publish a release, deploy a site or speak for outside adopters.

## License status

Software contributions are submitted under Apache License 2.0. Specification,
prose-documentation and diagram contributions are submitted under Creative Commons
Attribution 4.0 International. By submitting a contribution, the contributor
represents that they have the right to provide it under the applicable project
license. See [LICENSING.md](LICENSING.md) before opening a pull request.
