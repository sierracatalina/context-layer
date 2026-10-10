# Independent Python policy and anchor review correction

Date: 2026-10-10 UTC. Baseline: the independently authored Python artifact in
Context Layer PR 19 at head `76ada6e`, after its reported Ubuntu and Windows CI
passes. The integration owner subsequently reported that the Security Review
for that prior head completed with no additional finding visible. Those results
do not cover this new correction, which is pending exact-patch independent review
and new hosted CI.

Only this Python implementation, its own tests, the source-only proposed profile,
and supplied review descriptions were used. No JavaScript source, JavaScript
tests, reference adapters, or unrelated implementation code was inspected.

## Findings reproduced before changes

1. Optional authentication/onward-disclosure allowlists supplied as strings could
   authorize through substring membership. Dict values could authorize through
   key membership. Direct core `Authority` also accepted dicts in all twelve
   authorizing allow/approval collections, and null/bool values could cause raw
   type errors. The baseline reproduction files record the exact synthetic cases.
2. The stated `encrypt:<predicate>` disclosure did **not** reproduce: both policy
   evaluation and issuance already rejected that unsupported identifier with
   `SCHEMA_INVALID` before signing. No unsupported-transform leak fix is claimed.
3. Additional transform-container probes did reproduce a different defect:
   dictionary-valued entries were iterated as lists. An empty entry could be
   ignored and an unchanged bundle signed; a dictionary's transform keys could
   execute while its false values were ignored. Other malformed mappings/lists
   could produce raw attribute/type errors.
4. Newline-only and whitespace-only existing anchor files were rejected without
   mutation, but as `INVALID_JSON`, not the receipt-anchor corruption error family.
   The reported `IndexError` did not reproduce in the reviewed current artifact.

## Runtime changes

A shared present-field collection validator now runs at direct `Authority`
construction and profile policy validation. Every present authorizing collection
must be a list of nonempty exact strings. The twelve fields cover subject,
requester, client, authentication method, recipient, onward disclosure, purpose,
task, selector/action allowlists, and selector/action approval-gated lists.
Missing-field defaults and valid empty arrays retain their existing semantics.
The profile still separately requires its mandatory fields.

Present transform configuration must be a mapping from nonempty string predicates
to lists of nonempty string identifiers. Invalid containers are rejected as
`INVALID_POLICY` before policy execution or signing. Supported identifier grammar
continues to be enforced by the existing closed decision schema; unsupported
identifiers still yield its existing `SCHEMA_INVALID` rejection.

Malformed existing-anchor JSON now maps consistently to
`RECEIPT_ANCHOR_INVALID`, matching the implementation's other anchor-corruption
paths. This is an error-classification consistency change, not a claim that the
profile explicitly mandates that literal code for every parse error. Corrupt
anchor bytes are preserved; no repair, bootstrap, or integrity bypass is added.

## Evidence

- 105 independent tests passed with the pinned hash-locked dependencies on Linux
- 52 standalone public-corpus assertions passed
- Adversarial list/container cases cover strings, dictionaries, null, booleans,
  numeric values, and invalid/nonempty exact-string elements across both core and
  profile entry paths
- Exact arrays, substring-only arrays, empty arrays, and omitted optional fields
  have explicit semantic checks
- Redact, positive-integer truncate (including minimum limit), and
  `compress:task-facts` retain positive behavior tests
- Unsupported identifiers and malformed transform containers are asserted to fail
  before signing-key construction; no bundle is returned
- Blank, whitespace-only, malformed, and wrong-shaped anchor records reject
  consistently without changing storage

The original source packet, clarification hashes, runtime lock timeout, receipt
schema/record/signature checks, and concurrency/replay tests are preserved.
No remote writes were performed by this correction. Independent review and new
hosted checks are still required before describing the new head as clear.
