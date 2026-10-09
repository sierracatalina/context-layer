# Implementation lineage

## Source boundary

Baseline repository: https://github.com/sierracatalina/context-layer

Pinned commit: `0a8d016c822f38e8fc857422e133d0699c42a21f`.

The original allowed source packet contains exactly 23 files:

- Two specification/prose documents
- Five closed v0.2 schemas
- Six synthetic contract fixtures
- The vector README and manifest, and four actual vector JSON files
- LICENSE, LICENSE-DOCS, LICENSING.md, CONTRIBUTING.md

Every filename, exact byte length, SHA-256, Git blob SHA-1, and pinned public URL
is recorded in `source-manifest.json`. The fetched UTF-8 bytes were verified
against their Git blob identifiers; every vector digest matches the original
manifest. The source packet is unmodified. Six fixtures are not six vector sets.

The implementation author did not read `packages/`, `protocol/reference/`,
`tests/`, executable `examples/`, implementation website source, git history, or
another implementation checkout. No JavaScript reference source was read, run,
imported, translated, or used as a test oracle. No private source repository was
used. Broad workspace listings exposed directory names only, not their contents.
The pinned source tree was reported to have no AGENTS.md.

## Chronology, UTC 2026-10-09

1. 22:35–22:37: fetched only the allowed source files at the pinned commit,
   preserved exact bytes, and verified Git blob and vector manifest hashes.
2. 22:37: reported missing approval, envelope, canonicalization, and receipt
   anchor wire/setup contracts. Continued the normative core independently.
3. 22:39–22:42: wrote the first core and 51 independent tests. No portable profile
   acceptance was claimed from these tests.
4. 22:41 onward: received a separately authored, agent-reviewed PROPOSED
   experimental profile as prose only. Its author inspected reference behavior;
   the Python implementation author did not. This is an explicit clarification
   dependency, not a claim that the original core prose was sufficient.
5. 22:42: used independently maintained Python libraries for schema validation,
   RFC 8785 serialization, and Ed25519 primitives. Dependency implementation source
   was not inspected. No Context Layer runtime dependency was introduced.
6. 22:43–22:50: implemented the proposed profile and JSON-lines adapter, authored
   additional independent security tests, and ran unmodified public inputs.
   A separate harness reported output/error mismatches as protocol data only.
   Clarification of malformed-authentication codes and the decision digest
   preimage was provided as revised prose before corresponding code changes.
7. 23:00 onward: an independent reviewer supplied prose/data findings only.
   Fixed malformed-signature metadata classification, invalid RFC 3339 offset
   acceptance, large-integer binary64 interpretation, and JSONL parsing that had
   incorrectly treated Unicode separators inside valid strings as record breaks.
   Related numeric-field checks now accept integer-valued decimal spellings
   while rejecting booleans. Added independent regressions and incorporated the separately reviewed pending
   denial-array clarification. No reference source was transferred or inspected.
8. No remote writes, public issues, deployments, tags, releases, or merges were
   performed by this implementation work.

## Clarification revisions

All hashes are SHA-256 of the source-only prose as received:

- Initial: `545336bece25665fceb5b271b1719b873e9adaedfb1c6f0d634f6b727a8fa82e`
- Authoritative core/schema requirements preserved:
  `0e96577874a80a51c35b3554d54a2b1f42cae68048b7956afd3f93c22d92a3f7`
- Explicit envelope/authentication error classifications:
  `6e41aab8e04f504257fd3f328567cf1b9e5d0ba5e98a04146ca35c18e5fe109a`
- Decision digest preimage clarification:
  `ef5618216014ce290c46bea0d33ff6799dac4c33f9f88b36ed2b524742e42b50`
- Pending versus denied scope-array clarification, currently used:
  `c0103260c0fcff84bb9f0565c7b2c03139e251f4a165c35300b8dca93d45094a`

Only the current proposed prose snapshot is included at
`source-only/profiles/local-core-0.2-draft.1.md`. The JSON-lines adapter contract
is separately hashed in `clarification-manifest.json`. These are proposed
additions and do not modify the original source packet or core normative text.

## Dependency provenance

`requirements.txt` pins the complete direct/transitive runtime set.
`requirements.lock` binds downloaded CPython 3.12 Ubuntu/Windows x86-64 wheels by
SHA-256. `dependency-provenance.json` lists every wheel and target. Dependencies
are installed from the normal package registry, not copied from another Context
Layer implementation. Downloading Windows wheels is not evidence of Windows
execution; OS-matrix execution belongs to separately reported CI.
