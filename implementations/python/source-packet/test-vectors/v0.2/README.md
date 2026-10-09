# Context Layer v0.2 proof vectors

This directory contains deterministic, executable vectors for the
`context-layer/0.2-draft` contracts and the local-core security profile.
`manifest.json` binds each JSON vector by SHA-256. The runner recomputes those
hashes and then exercises the current public reference validators and local-core
APIs; it does not treat the presence of a file as proof.

Run the vectors from the repository root:

```text
node --test tests/test-vectors.test.mjs
```

## Safety classification

Every identity, value, path fragment, and cryptographic byte sequence in this
package is synthetic-test-only. Fixed Ed25519 seed material exists solely to make
outputs reproducible. It is public test data, is not a deployable credential,
and must never be copied into configuration or production code.

The vectors prove:

- canonical JSON and SHA-256 agreement between public and local runtimes;
- registered and namespaced purpose-code handling;
- allow, allow-with-reductions, deny, and needs-approval policy states;
- authenticated, bound, and unexpired approvals;
- minimum-of-request, decision, and retention bundle expiry;
- authenticated-envelope tamper and forgery rejection;
- receipt-anchor requirements and rollback detection;
- proposal-only memory updates with no direct-write API; and
- raw-vault identifiers, denied values, and resolution APIs staying outside the
  disclosed bundle and consumer surface.

These are interoperability and negative-security vectors, not production key
material, conformance certification, or a compatibility promise beyond the
declared draft version.
