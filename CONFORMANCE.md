# Context Layer conformance

## What this kit establishes

`conformance/v0.2.0-draft.1/` is an exportable offline kit for the reviewed proposed experimental local-core profile. It is not registry-published, released, or a certification. A successful report establishes the listed assertions on the named adapter; it does not establish complete CL-Core-Lite conformance, production security, independent adoption, or outside cryptographic review.

The existing corpus contains **four vector sets** and a separate set of **six contract fixture files**. Existing vector bytes and their SHA-256 manifest are preserved. The runner adds explicit setup and checks hashes, record IDs, Ed25519 signatures, receipt and anchor chains rather than accepting adapter pass/fail claims for those bytes. A separately labeled `local-profile-expectations.json` supplement supplies complete fixed-transcript expected objects: decisions (including exact grants/denials and approval bindings), issued envelope, proposal, and receipts. Complete-object comparison rejects extra fields and unauthorized scope even when an adapter recomputes valid hashes. These supplemental objects are reference-derived by the profile author, validated against closed schemas in repository tests, and reviewed against prose; they are not an independent oracle or changes to the original four vector files. Malicious-adapter regressions cover rehashed unauthorized grants, unknown fields, wrong approval bindings and excess retention. Rejection/replay observations come from adapter invocations and must be accompanied by implementation-specific tests.

## One command for another implementation

```sh
node conformance/v0.2.0-draft.1/run.mjs -- /absolute/path/to/your-adapter
```

The adapter can be written in any language. The harness requires Node.js 22.13+ but no npm dependencies or network. Copy the kit directory outside this repository and run `node run.mjs -- <adapter-command>` to verify it is standalone. See the [adapter input/output contract](conformance/v0.2.0-draft.1/adapter-contract.md). Setup and corpus-integrity errors exit 2; assertion failures, unsupported features, crashes and timeouts exit 1; all assertions passing exits 0. JSON stdout identifies every assertion, passed/failed counts, tested scope and versions. Each adapter process has a 10-second deadline and 4 MiB output bound; the run has a 120-second bound.

For the existing JavaScript reference bridge:

```sh
npm run test:conformance
```

`scripts/conformance-reference-adapter.mjs` is deliberately outside the kit. It imports implementation code; the standalone harness does not. Independent implementers should use the specification, schemas, fixtures, original vectors and reviewed profile prose, and record their source packet hashes. Do not use this reference bridge as clean-room input.

## Independent implementation and cross-feed verification

The independent Python artifact is under `implementations/python/`. Its provenance records source-only inputs and reviewed profile revisions; its implementer did not inspect JavaScript runtime, tests, or the reference adapter. The profile author did inspect the reference. Independence describes the implementation process, not independent outside security review or adopter status.

Install its hash-locked Python 3.12 dependencies, then run both implementations and the cross-feed checks:

```sh
python -m pip install --require-hashes --only-binary=:all: -r implementations/python/requirements.lock
npm run test:all
```

`test:independent` runs the Python unit suite, the same standalone kit against both adapters, canonical byte comparisons for four policy states and approved decisions, exact same-input envelope/signature comparison, issuer-to-peer verification in both directions, and receipt-log byte comparison. Path-bound anchor bytes naturally differ by temporary storage location; their independent signature/hash verification is in the shared kit. CI runs this on Ubuntu and Windows with Node 22.13 and Python 3.12. A checked-in workflow is intended coverage, not a claim its latest run has passed.

## Stable schema identities

Core schema snapshots are under `protocol/schemas/0.2.0-draft.1/`; companion schema snapshots are separately under `protocol/schemas/0.3.0-draft.1/`. Their identifiers and static site publication candidates are:

- `https://sierracatalina.com/context-layer/schemas/0.2.0-draft.1/<name>.schema.json`
- `https://sierracatalina.com/context-layer/schemas/0.3.0-draft.1/<name>.schema.json`

`protocol/schemas/schema-catalog.json` binds all eleven snapshots by SHA-256, versioned ID and legacy alias; `site/context-layer/schemas/index.json` is its identical publication candidate. All current `$ref` values are document-local fragments; each is tested for resolution. Site copies have exactly the same bytes and `$id` values. Intended HTTPS locations are not claimed live until deployed and fetched successfully. Offline implementations resolve the included snapshots by `$id` and must not require HTTP fetches.

Existing unversioned core `/implementation/` IDs and companion `/primitives/` IDs remain compatibility aliases with unchanged schema content. Core static aliases already exist; this change prepares missing companion static aliases. An alias is mutable and must never be described as immutable. Pin a version and artifact hash for reproducibility. Changes to a released schema's assertions or identity require a new version directory; never silently overwrite a released snapshot. These proposed version directories may change during review and must be frozen before release.

## Version and integrity discipline

Package version, core wire identifier, companion draft identifier, local profile, schema snapshot, kit, adapter format, and vector-manifest format are distinct. See the manifests rather than deriving one from another. `scripts/update-conformance-manifest.mjs` updates hashes only while this kit is proposed; it must not be used to mutate a released kit. Hashes detect corruption but do not establish publisher authenticity. Obtain source through a trusted pinned commit.

A release needs both implementations run against the exact same kit, raw JSON reports, runtime/OS and dependency versions, resolution of reported ambiguities, and schema URL deployment verification. The independent implementation's provenance must distinguish baseline source-only inputs from this reviewed profile, whose author inspected the reference. Security and outside-review gates remain in [SECURITY.md](SECURITY.md).

Byte parity with reference-derived expectations is fixture evidence, not proof that reference behavior is universally correct. Closed-schema checks, explicit authorization invariants, malicious-adapter negatives, independent implementation tests and review of known profile contradictions remain separate gates.
