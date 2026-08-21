# Contributing

Context Layer is an experimental protocol draft. Focused review of invariants, object contracts, fixtures, threat boundaries, and failure behavior is welcome. Contributions must follow the software and documentation license boundary in `LICENSING.md`.

## Before contributing

- Read the status and limits in `README.md` and the private disclosure process in `SECURITY.md`.
- Never include real secrets, credentials, private conversations, or sensitive personal data. Use synthetic fixtures only.
- Keep a protocol claim, implementation behavior, schema, fixture, and test aligned in the same proposed change.
- State which invariant and draft identifier the change affects.

## Local checks

```sh
npm ci
npm run lint
npm test
```

`npm test` performs the production build before running the Node test suites.

## Pull requests

- Keep changes small enough to review as one protocol decision.
- Explain compatibility and migration effects for changed required fields, enums, defaults, or security behavior.
- Add valid and invalid synthetic fixtures for contract changes.
- Do not weaken a security default merely to make an integration pass.
- Report vulnerabilities privately rather than opening a public pull request or issue.

## License status

Software contributions are submitted under Apache License 2.0. Specification, prose-documentation, and diagram contributions are submitted under Creative Commons Attribution 4.0 International. By submitting a contribution, the contributor represents that they have the right to provide it under the applicable project license. See `LICENSING.md` before opening a pull request.
