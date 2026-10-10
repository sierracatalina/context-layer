# Context Layer conformance kit 0.2.0-draft.1

Proposed, exportable, offline kit for the experimental local-core profile. Not published to a package registry and not a certification. Copy this directory outside the repository, then run:

```sh
node run.mjs -- /absolute/path/to/your-adapter --optional-argument
```

Node.js 22.13+ is the harness prerequisite; your adapter may use any language. No npm install is required for the harness. See `adapter-contract.md`. Every assertion is reported as JSON; exit 0 means all assertions passed, 1 means at least one failed, and 2 means setup/manifest failure. A partial implementation fails explicitly. Each adapter process is limited to 10 seconds and 4 MiB output. The corpus is small and sequential; the whole run is limited to 120 seconds.

The supplementary `local-profile-expectations.json` contains reference-derived complete expected output objects, explicitly separate from the original corpus. Full-object equality rejects changed authorization scope and extra fields even when hashes are valid. Repository tests independently validate every oracle object against the closed schemas and exercise deliberately faulty adapters. These reviewed fixed-transcript expectations are not an independent security audit.

The immutable-by-policy version directory contains the original four vector files unchanged, six separate contract fixtures, five versioned core schemas, reviewed proposed source-only local profile, runner, and a SHA-256 manifest. Integrity hashes detect accidental corruption; they do not authenticate a download. Obtain the kit from a trusted pinned commit. Any content change requires a new kit version before release. This proposed version may change during review and is not a released artifact.

Schema HTTPS identifiers are intended publication locations. Offline local resolution works from this kit; production URL availability is unverified until deployment. Companion 0.3 schemas are not part of this core kit.

Run only adapter commands you trust: they execute with your local account permissions. Process timeout/output limits are not a sandbox, a memory quota, or descendant-process isolation. The harness kills its direct adapter process on timeout.

Byte parity with reference-derived expectations is fixture evidence, not proof that reference behavior is universally correct. Closed-schema checks, explicit authorization invariants, malicious-adapter negatives, independent implementation tests and review of known profile contradictions remain separate gates.
