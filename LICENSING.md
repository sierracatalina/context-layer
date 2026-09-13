# Licensing

Context Layer uses separate licenses for software and documentation.

## Apache License 2.0

The following material is licensed under the Apache License, Version 2.0. The controlling text is in [LICENSE](LICENSE).

- Executable protocol, package, and configuration source
- `packages/`, `scripts/`, `tests/`, and executable files under `examples/`
- `protocol/reference/`, `protocol/schemas/`, and `protocol/fixtures/`
- `test-vectors/` machine-readable vectors and manifests

The `private: true` package setting prevents accidental registry publication; it does not change the Apache-2.0 grant.

## Creative Commons Attribution 4.0 International

The following material is licensed under Creative Commons Attribution 4.0 International. The controlling text is in [LICENSE-DOCS](LICENSE-DOCS).

- Root Markdown documentation, including `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `RELEASE.md`, and `SECURITY.md`
- Prose and diagrams under `docs/` and `protocol/spec/`
- `examples/README.md`, `test-vectors/**/README.md`, and other non-executable project diagrams

Suggested attribution: “Context Layer, Sierra Catalina, Context Layer v0.2 draft,” with a link to the source repository and an indication of modifications.

Website application, hosting, and deployment source are intentionally outside this repository. This file does not assign licenses to material maintained in that separate source location.

## Mixed files and exceptions

If a file combines executable software with embedded explanatory prose and is not explicitly listed in the documentation section, Apache-2.0 applies to the whole file. Third-party dependencies, quoted standards text, linked external material, trademarks, and generated dependency notices remain governed by their own terms.

## Protocol proposal (weekend ship)

The 2026-09 weekend protocol proposal and `protocol/companions/0.3-draft` companion materials are part of this repository. Schemas, examples, and other executable companion artifacts use Apache-2.0. Proposal prose, companion specification pages, and `test-vectors/cl-pass/VECTORS.md` use CC BY 4.0. This note does not relicense the existing v0.2 product or replace `LICENSE` / `LICENSE-DOCS`.

No license grants trademark rights or implies endorsement, protocol adoption, production readiness, security certification, or warranty.
