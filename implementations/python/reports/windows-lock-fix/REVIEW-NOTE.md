# Windows lock-contention correction

Date: 2026-10-10 UTC. Review target: the independent Python files from combined
Context Layer draft PR 19, head `fc326de8f12f3e539e757144942d9d6d9b6c454a`.
No JavaScript source, JavaScript tests, or reference adapter was inspected.

## Verified observations

The supplied Windows CI trace first reported `RECEIPT_LOCK_TIMEOUT` while a child
constructed `AnchoredReceiptLog`. The test joined/asserted each child in order,
so a failure could trigger temporary-directory cleanup while later children were
still using the log. A subsequent missing-anchor error is therefore not evidence
that the anchor verification itself should be weakened.

The Python implementation constructed a fresh `SchemaValidator` for every receipt
read under the shared file lock. Each construction loaded and meta-validated all
five immutable schemas. Log construction and append verification repeatedly paid
this setup cost, even though the schemas did not change within the store.

A controlled Linux diagnostic of six new store instances and six append
transactions measured 57 schema-validator constructions and 2.441 seconds total
lock-held work before the change. The same diagnostic after the change measured
6 constructions and 0.031 seconds total lock-held work. These are diagnostic
measurements, not performance guarantees or a Windows CI rerun. The exact Windows
lock-holder timing was not available; a fresh Windows run remains required.

## Narrow runtime change

`AnchoredReceiptLog` now constructs one validator per store before acquiring its
file lock. Every receipt is still validated on each replay and append. No schema,
record hash, signature, sequence, anchor, replay, ownership-token, append/fsync,
or failure-closed check was removed or relaxed. The runtime lock timeout remains
5 seconds, retries remain 10 milliseconds, and another writer's lock is never
stolen or automatically deleted.

## Test corrections

Both concurrency tests now use `spawn` explicitly on every platform. A readiness
barrier separates import/store startup from concurrent operations, making Linux
exercise the Windows process-start model as well. Test-cohort startup and
completion each have a bounded 30-second budget; these do not alter the runtime
5-second lock timeout. Nonzero child exits and missing readiness remain failures.

All started children are joined, terminated if necessary, and reaped in `finally`
before test failure can escape to temporary-directory cleanup. A dedicated failure
regression proves a failed child cannot leave a waiting sibling alive. The append
test still requires six successful concurrent writers and verifies all six unique
operation names. The replay test still requires one accepted consumer and three
`BUNDLE_REPLAY` rejections.

Additional regressions verify the validator is initialized before lock acquisition
and reused without admitting invalid receipt fields, and that a lock timeout
preserves another writer's token and leaves receipt/anchor bytes unchanged.

## Evidence and limits

- Full independent suite: 95 tests passed on Linux using the pinned hash-locked
  dependencies
- Standalone public corpus: 52 assertions passed; original four vector files and
  six fixtures unchanged
- Spawn contention and failure-cleanup scenarios repeated ten times each
- Windows success is not claimed until the reviewed patch passes fresh Windows CI

The patch is supplied for independent review before publication. No remote writes
were performed by this implementation correction.
