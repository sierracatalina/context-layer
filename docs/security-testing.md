# Reproducible security tests

The bounded, seeded mutation/property suite is `tests/security/fuzz-properties.test.mjs`. It uses only built-in Node.js facilities, synthetic fixtures, temporary files, and public test seeds. It is a deterministic generated test campaign, not a coverage-guided fuzzer or exhaustive proof.

Run the default corpus:

```sh
npm run test:security
```

Reproduce a seed and increase the bounded corpus on POSIX:

```sh
CONTEXT_FUZZ_SEED=12648430 CONTEXT_FUZZ_CASES=4096 npm run test:security
```

On PowerShell:

```powershell
$env:CONTEXT_FUZZ_SEED='12648430'
$env:CONTEXT_FUZZ_CASES='4096'
npm run test:security
```

The generator is xorshift32-v1. Default seed is decimal 12648430 (0x00c0ffee); zero selects state 1. Seed accepts unsigned 32-bit integers. Case count defaults to 256 and is restricted to 1–4096. Generated JSON depth is at most 5 and fanout below 5. Each test has a 30-second timeout. CI sets its own job timeout; there are no unbounded campaigns, paid tools or newly scheduled background jobs.

## Assertions and limits

1. Bundle JSON/shape, digest, signature, envelope version, unknown authentication field and forbidden-material mutations reject before consumption. Includes the 2 MiB serialized input bound.
2. Receipt random shapes, rehashed forbidden payload fields, metadata, invalid dates/ranges, unknown keys, digests and overlength summaries reject.
3. Up to 128 seeded byte corruptions of an actual receipt log and three anchor truncation positions fail closed; restoring exact original bytes verifies.
4. Up to 16 generated bundles race four opens through two independent receipt-log objects sharing filesystem storage. Exactly one succeeds; a restarted consumer rejects replay. This tests in-process concurrent clients using interprocess filesystem locking; it does not claim hostile-process or distributed consensus coverage.
5. Up to 32 sessions recheck revocation, malformed revocation results, provider outages and exact expiry on context reads, action handlers and memory proposals. Blocked cases never invoke the handler.

The console reports seed/case settings; assertion messages include case index and byte offset where applicable. A failure must be reproduced with the same commit, runtime, OS and settings, minimized into a synthetic regression, and tracked privately if it exposes a vulnerability. Never include real data in reproducers or logs.

Known baseline gaps are recorded in the proposed local profile; this campaign does not require duplicate-member acceptance or count it as successful conformance. Limits intentionally exclude unbounded recursion, resource-exhaustion benchmarking, trusted-host compromise, production key custody, private-service security or external crypto review. State which tests ran and which did not. CI results belong to the exact tested commit, not a later combined branch.
