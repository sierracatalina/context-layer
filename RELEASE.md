# Release policy and current draft boundary

Status checked: 2026-10-09. Current repository package metadata is
`0.2.0-draft.2`. This file is a release procedure and readiness plan, not a release
announcement. No tag or release is created by this documentation change.

## Version identifiers and compatibility

| Surface | Current identifier | Meaning |
| --- | --- | --- |
| Repository package | `0.2.0-draft.2` | SemVer prerelease metadata; the package is private and is not promised as an npm distribution. |
| Core wire objects | `context-layer/0.2-draft` | Closed draft object contract; never derive a wire identifier from an npm version. |
| CL-Pass companions | `context-layer/0.3-draft` | Separate experimental companion proposal; not a unified v0.3 release or completed implementation. |
| Conformance corpus | `test-vectors/v0.2/manifest.json` plus its recorded hashes | Four core executable vector sets in the pinned baseline; reports identify the exact manifest revision/hash, not just a draft name. |
| Historical releases | Existing Git tags and release notes | Immutable historical snapshots; old descriptions do not define current scope. |

The version plan follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
Major-zero and prerelease APIs are unstable. Changes still need an explicit
compatibility decision, migration notes and regression evidence. Preserve existing
release bytes; issue a new version for changed artifacts. Use increasing
`0.2.0-draft.N` prereleases for the selected 0.2 line, consider
`0.3.0-draft.N` only after the gates below, and define the stable public contract
before any `1.0.0` decision. After v1, incompatible public-contract changes need a
major version, compatible additions a minor version and compatible fixes a patch.

A wire-format or authorization change requires its own profile/version decision,
including rejection or migration of older data. Package numbering alone does not
prove compatibility. Versioned conformance packages and schema URLs identify their
own exact artifacts; aliases are not immutable version identifiers.

## Included surface

A reviewed release may include:

- Draft specifications, informative guides and diagrams under `protocol/spec/`
- Core and companion schemas, synthetic fixtures and reference code under `protocol/`
- Experimental local-core modules, adapters, tests, vector corpus and synthetic demos
- Governance, contribution, security and CI metadata
- Public documentation source under `site/context-layer/` and the standalone
  routing configuration in `site/vercel.json`

The site is part of this repository. Hosting accounts, production configuration
outside this tree and the unrelated Sierra Catalina apex website remain outside
its release boundary. A source release does not deploy a site or verify a live URL.

Exclude generated builds, dependency directories, environment files, browser
profiles, private drafts, local vault data, credentials and unrelated project
history. Publish only intentionally reviewed, synthetic proof outputs; raw logs
and screenshots require separate checks for private information and stale claims.

## Required verification for any new release

All items apply to one exact candidate commit. A local pass is not remote CI
success, a deployment check or an independent security review.

1. Install locked dependencies with `npm ci` on supported Node.js.
2. Run `npm run lint`, `npm test`, `npm run verify:context-layer`,
   `npm run release:hygiene` and `npm audit --audit-level=high`.
3. Run `npm run test:local-core` directly; run any additional conformance,
   independent-implementation, normative-inventory, readability or generated-test
   checks shipped by that candidate. Include unsupported and skipped cases.
4. Run `git diff --check`; review the full tracked tree for private data,
   credential material, local paths, unreviewed output and unrelated history.
5. Compare package/lockfile versions, wire identifiers, profile identifiers,
   schema URLs, vector hashes and migration notes. Keep historical notes intact.
6. Review the [claim ledger](docs/CLAIM-EVIDENCE.md) against the candidate. Record
   exact commands, environment, result counts, failures and evidence links. Do not
   carry a previous commit's passing result forward as proof of new behavior.
7. Verify GitHub private vulnerability reporting is available to an eligible
   reporter. The documented login redirect alone does not establish that the
   private form is enabled. If unavailable, restore a private route before release;
   never redirect exploit details into public issues.
8. Require passing repository CI on the exact candidate, including every supported
   OS and any new conformance jobs. Resolve failures or document a narrower
   supported scope before claiming readiness.
9. Review rendered site pages and source mirrors. If site deployment is separately
   approved, test preview and production routes/assets/schema bytes after deployment;
   record the deployment revision and results separately from the source release.
10. Obtain explicit maintainer approval of the exact version, commit, included
    artifacts, unresolved limitations and publication action. No auto-tagging,
    automatic release or deployment is authorized by completing this checklist.

## v0.3 readiness criteria

Status: proposed and not certified complete. Keep package metadata at its current
version until release review selects and approves the next version.

- [ ] Release scope states whether CL-Pass is excluded, experimental-only, or a
  separately named implemented profile; no accidental expansion of closed Lite.
- [ ] Stable requirement IDs cover the shipped normative contract; canonical JSON,
  signing, local envelope, receipt anchors and failure behavior are specified well
  enough for an implementation that has not read the JavaScript code.
- [ ] A second-language implementation and the JavaScript implementation pass every
  applicable case in the same versioned, hash-verified corpus. Record clean-room
  provenance and unresolved ambiguity; outside maintenance is a separate v1 goal.
- [ ] The conformance runner works from its documented standalone distribution,
  and immutable versioned schemas resolve to expected bytes. Enumerate the actual
  corpus; do not describe prose or fixture files as executable vector sets.
- [ ] Compatibility/migration tests cover old bundles and receipt anchors, unknown
  fields, legacy opt-ins and mixed-version rejection without wider authority.
- [ ] At least one real local MCP or A2A protocol flow is reproducible with synthetic
  data, with a passing negative case and measured fresh-clone instructions.
- [ ] Generated/property and malformed-input checks have fixed replayable seeds and
  recorded limits; the threat model and independent-review status are current.
  If outside review is still pending, state that prominently rather than implying
  it occurred. Independent review remains a v1 freeze gate.
- [ ] All general release checks above pass on the integrated candidate, and a
  maintainer approves the scope and remaining experimental limitations.

## Publication sequence after approval

1. Confirm the reviewed clean commit is on the intended repository branch.
2. Recheck exact-commit CI and version/manifest integrity.
3. Create only the approved new tag and matching prerelease, with the exact commit,
   verification evidence, migration guidance and experimental limitations.
4. Preserve historical tags, including `v0.2-draft`; never move a tag to new bytes.
5. Deploy documentation only when that action is separately authorized, then verify
   actual routes. A tag is not deployment approval or proof of production parity.

## Source-use status and known limits

[LICENSING.md](LICENSING.md), [LICENSE](LICENSE) and [LICENSE-DOCS](LICENSE-DOCS)
define the existing software/documentation boundary. Open licensing does not imply
adoption, security review, certification or warranty.

Contracts remain unstable. The local Ed25519 profile supports public-key bundle
verification in its tested scope, but does not provide managed identity, production
key custody, account recovery or hostile-process isolation. An attacker able to
roll back both a receipt log and its sidecar can evade that local checkpoint;
a protected separate checkpoint is a deployment responsibility. Remote deletion,
third-party adoption and production interoperability are not established by the
synthetic tests. See [SECURITY.md](SECURITY.md) and the
[claim ledger](docs/CLAIM-EVIDENCE.md).
