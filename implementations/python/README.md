# Independent Python Context Layer experiment

This is a source-only implementation experiment for `context-layer/0.2-draft`.
It implements the five closed object schemas, a scoped local core, and the
separately reviewed **proposed** `local-core-0.2-draft.1` interoperability profile.
It is not a production vault, adopted standard, security certification, or a
claim that every CL-Core-Lite requirement is met.

The implementation author did not inspect, import, run, or translate the
JavaScript reference. The original specification left important wire/setup
questions open. A separate profile author who could inspect the reference wrote
the proposed clarification. That additional source and its lineage are explicit
in `LINEAGE.md`; the original four vector files were not changed.

## Run

Python 3.11 or newer is required. Reproducible hash-locked CI inputs cover CPython
3.12 on Ubuntu and Windows x86-64:

```sh
python -m pip install --require-hashes --only-binary=:all: -r requirements.lock
python -m unittest discover -s tests -v
python run_vectors.py --output reports/public-vectors.json
python -m context_layer_independent.adapter
```

For another supported Python/platform combination, `requirements.txt` pins all
runtime/transitive versions, but its wheel hashes must be resolved separately.
The JSON-lines adapter reads one input per process and emits one result. Its
contract is in `source-only/adapter-contract.md`. It never needs JavaScript,
Node, reference source, a production key, or network access after dependencies
are installed.

Run from this directory. Schemas and public vector bytes are included under
`source-packet/`; schema validators also accept an explicit schema directory.
There is no HTTP server or deployment command. Do not install this directory as
a wheel without first packaging the schema resources; repository-local and
editable execution are the supported modes for this experiment.

## Implemented boundaries

- Exact supported purpose codes, four policy states, authenticated host binding,
  scope/retention reduction, request and policy digest binding, approval expiry
- Closed schema validation with asserted timestamp checking
- Opaque exported provenance, allowed-predicate filtering, no raw-vault API
- Recipient binding, expiry, single-use opening, revocation failure closed
- Ed25519 envelopes and public-key-only verification under the proposed profile
- Proposal-only memory boundary with no consumer commit operation
- Durable SQLite core receipts, minimized payloads, indeterminate side-effect
  completion, and idempotent receipt retry without repeating the side effect
- Signed version-2 receipt anchors with exact-byte verification, protected-anchor
  log rollback detection, and cross-process locked replay enforcement

`core.py` exposes a trusted in-process authority example. Do not hand its object
to hostile code: Python object privacy is not a sandbox. `profile.py` implements
the separately described wire experiment. The adapter's in-memory receipt store
is explicitly a synthetic test double. Independent filesystem tests exercise the
real anchored store and concurrent processes separately.

## Evidence and limits

`run_vectors.py` verifies all four SHA-256 manifest bindings before executing
assertions. Its report separates the six contract fixtures from the four vector
sets. `reports/public-vectors.json` lists every tested assertion; it does not
turn corpus presence or skipped cases into passes. `tests/` contains independently
authored negative tests, including concurrent receipt writers/consumers,
receipt-loss uncertainty, source-data isolation, and signature forgery.

Important unimplemented or intentionally limited areas:

- Legacy HMAC verification requires explicit opt-in and a configured key; issuance
  always uses Ed25519. Version-1 anchor migration is not supported
- Both an old authentic log and its old authentic anchor can be rolled back
  together; preventing that requires an external monotonic checkpoint
- Receipt append crashes between log and anchor writes fail closed; there is no
  automatic repair that could bless an unauthenticated suffix
- Network authentication, hardware key custody, encryption-at-rest vaults,
  discovery privacy, adapters, and automatic authority-side memory commit are out
  of scope; no full-role conformance claim is made
- Timestamp validation is strict, but leap-second timestamps are unsupported
- Duplicate JSON names and lone Unicode surrogates are rejected, stricter than
  the historical record-canonicalization baseline
- Numeric inputs use finite IEEE-754 binary64 semantics: JSON integers outside
  the safe-integer range are rounded to binary64 before canonicalization; Python
  arbitrary-precision integer semantics are not preserved
- This is not exhaustive JSON Schema, RFC 8785 numeric, OS, or cryptographic review
- Secret/raw-material checks supplement field minimization; they are not a
  semantic detector capable of recognizing arbitrary secrets embedded in strings
- Unkeyed provenance hashes in the proposed profile can permit guessing of
  low-entropy source references; they are not confidential commitments

The original specification gaps and proposed clarification lineage are described
in `LINEAGE.md`. No original normative source file was amended by this
implementation work.

## License and attribution

New Python code and machine-readable test artifacts: Apache-2.0. New prose:
CC BY 4.0, following the upstream project's documented boundary. The unchanged
source packet retains its upstream licenses. Attribution: “Context Layer,
Sierra Catalina, Context Layer v0.2 draft,”
https://github.com/sierracatalina/context-layer at
`0a8d016c822f38e8fc857422e133d0699c42a21f`.

The implementation and proposed profile are modifications/additions. They do not
imply endorsement, adoption, warranty, or security certification. Third-party
Python libraries retain their own licenses; no third-party runtime source is
vendored here.
