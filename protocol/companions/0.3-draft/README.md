# Context Layer primitives addendum

Companion objects for `context-layer/0.3-draft`. A `context-layer/0.2-draft` deployment MAY negotiate the `CL-Pass` profile without opening the five CL-Core-Lite schemas.

Status: working draft. Not an adopted standard.

## What this is

Native Context Layer objects for:

- identity that is not a vault grant
- exact client pairing
- a standing category pass (necessary, not sufficient)
- closed memory categories above predicate selectors
- ask-without-read (`needs_approval` as success, plus `approval_handle`)
- write-commit that MUST NOT mint a read pass
- content-free lifecycle events
- claim evidence, visibility, category, and attribution (companion envelope; 0.3 field proposals)

This directory is spec, schemas, and examples. It is not runtime code.

## What this is not

- Not a patch to `context_request`, `policy_decision`, `scoped_context_bundle`, `memory_update_proposal`, or `receipt`. Those Lite schemas stay closed (`additionalProperties: false`).
- Not a restatement of 0.2-draft: purpose-bound requests, four-state policy, recipient-bound single-use bundles, proposal-only writeback, receipts, requester / recipient / `client_instance`, `onward_disclosure`, or selectors as `{ "predicate" }`. Those already exist. This addendum only adds what they do not cover.
- Not an Egoist AI Passport or Switchboard adapter, subset, client, or type import.

## Observed origin

Standing category grants, identity-without-memory, exact client pairing, ask as normal output, write-approval-is-not-read, and content-free lifecycle were observed in Egoist AI Passport / Switchboard. They are rewritten here as Context Layer objects. That system's types, tool names, authorization-scope strings, and packages are not imported. See [crosswalk.md](crosswalk.md).

## How it composes with 0.2-draft

```text
identity_assertion          # not a context grant
client_pairing              # exact client_instance; not a pass
        |
        v
context_pass                # categories + purpose codes; necessary, not sufficient
        |
        v
context_request             # 0.2; selectors remain predicates
        |
        v
policy_decision             # 0.2 four-state; unchanged schema
        |
        +-- needs_approval --> approval_handle   # success, not an error
        |
        +-- allow / allow_with_reductions --> scoped_context_bundle  # 0.2
        |
        v
receipt                     # 0.2
optional memory_update_proposal
        |
        v
commit  MUST NOT mint or widen a context_pass
lifecycle_event             # content-free sync log beside receipts
claim_annotation            # rides beside claims until 0.3
```

A consumer that holds only `identity_assertion` MUST NOT be issued a bundle and MUST NOT be treated as authorized to request vault disclosure.

`CL-Pass` evaluation uses existing 0.2 `reason_codes` (for example `PASS_MISSING`, `CATEGORY_NOT_ON_PASS`, `PAIRING_REQUIRED`). It does not add fields to Lite objects.

## Files

| Path | Role |
| --- | --- |
| [spec.md](spec.md) | Normative addendum: invariants, objects, lifecycles, 0.3-draft note, non-goals |
| [crosswalk.md](crosswalk.md) | Observed phrase → CL primitive. Not their protocol. |
| [schemas/](schemas/) | Closed JSON Schema 2020-12 companions |
| [examples/](examples/) | Synthetic objects valid against those schemas |

## Companion schemas

Required by this addendum:

- `schemas/context-pass.schema.json`
- `schemas/client-pairing.schema.json`
- `schemas/approval-handle.schema.json`
- `schemas/lifecycle-event.schema.json`

Also in this directory, because they are first-class companion objects:

- `schemas/identity-assertion.schema.json`
- `schemas/claim-annotation.schema.json`

All use `spec_version` `context-layer/0.3-draft` and `additionalProperties: false`.
