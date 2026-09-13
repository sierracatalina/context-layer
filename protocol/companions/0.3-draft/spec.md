# Context Layer primitives addendum

Normative companion addendum for `context-layer/0.3-draft` (CL-Pass). A `context-layer/0.2-draft` deployment MAY negotiate this profile without opening the five CL-Core-Lite schemas.

Status: working draft. Not an adopted standard.

Closed Drive record: [CLOSED Context Layer 0.3-draft companions (CL-Pass) — 2026-08-29](https://docs.google.com/document/d/19ZNUrP3zCxRxbXvQ-0EBV9MKuMcJbkKXLKp58MTHtUA/edit). Landed copy: [DRIVE-PAGE.md](DRIVE-PAGE.md).

## 0.3-draft note

This addendum defines companion objects beside Lite. It is not a restatement of 0.2-draft and it is not a patch to Lite.

The five CL-Core-Lite objects stay closed (`additionalProperties: false`):

- `context_request`
- `policy_decision`
- `scoped_context_bundle`
- `memory_update_proposal`
- `receipt`

`CL-Pass` evaluation uses existing 0.2 `policy_decision.reason_codes`. It does not add fields to Lite objects. Example codes: `IDENTITY_ONLY`, `PAIRING_REQUIRED`, `PURPOSE_NOT_ON_PASS`, `CATEGORY_NOT_ON_PASS`, `PASS_REVOKED`, `PASS_MISSING`.

All companion objects use `spec_version` `context-layer/0.3-draft` and `additionalProperties: false`.

## Invariants

1. Identity is not a context grant. `identity_assertion.context_grant` MUST be `false`. Authenticating a principal MUST NOT disclose vault claims.
2. Identity-only consumers MUST NOT be treated as authorized to submit a disclosing `context_request` and MUST NOT be issued a `scoped_context_bundle`.
3. Pairing is not a pass. `client_pairing` admits an exact `client_instance` only.
4. Unpaired clients MUST get `deny` or `needs_approval`.
5. A pass is necessary, not sufficient. Every disclosure still requires 0.2 `context_request` → `policy_decision` → `scoped_context_bundle`. An active `context_pass` is not a bundle, wildcard selector, or ambient vault access.
6. Categories grant; predicates select. A pass grants `memory_category` values. A request still names `{ "predicate" }` selectors. An off-pass category MUST be denied or `needs_approval` for the exact request.
7. Ask is not read. `needs_approval` is a successful protocol outcome. `approval_handle` MUST NOT include denied claim values, claim text, or vault payloads.
8. Write approval is not a read pass. Committing a `memory_update_proposal` MUST NOT mint or widen a `context_pass`.
9. Revocation is prospective. Revoking a pass or pairing MUST prevent future bundles. It cannot un-disclose issued bundles.
10. Lifecycle events carry no content. `payload_included` MUST be `false`.
11. Evidence labels MUST NOT be upgraded. `inferred` MUST NOT be disclosed as `stated_by_user` or `direct_user_save`.
12. Public profile is not the vault. Visibility `vault` MUST NOT appear on a public profile.

## Closed enum: `memory_category`

Grant layer above selectors. Closed values:

`preference` | `fact` | `project` | `instruction`

There is no standalone schema file. The enum is defined inside the companion schemas that use it. No wildcards.

## Companion objects

Schemas live in [schemas/](schemas/). Synthetic examples live in [examples/](examples/).

### `identity_assertion`

Authentication of a principal. Not a context grant. MUST NOT carry vault claims, selectors, or bundle material.

`context_grant` is `const false`. Schema: [schemas/identity-assertion.schema.json](schemas/identity-assertion.schema.json).

### `client_pairing`

Exact `client_instance` admission for a subject. Pairing is not a `context_pass` and not a context grant.

`status` is `paired` or `revoked`. `revoked` requires `revoked_at`. Schema: [schemas/client-pairing.schema.json](schemas/client-pairing.schema.json).

### `context_pass`

Standing category grant for one principal and one client instance. Necessary, not sufficient, for disclosure.

`categories` are `memory_category` values. `allowed_purpose_codes` are the 0.2 registered codes plus the 0.2 experimental `x.` pattern. Prefix match MUST NOT satisfy a purpose check.

`status` is `active`, `revoked`, or `expired`. `revoked` requires `revoked_at`. Schema: [schemas/context-pass.schema.json](schemas/context-pass.schema.json).

### `approval_handle`

Companion to a `policy_decision` of `needs_approval`. Successful protocol output, not an error. MUST NOT carry claim values or denied vault content.

`pass_gap.missing_categories` names the categories that blocked the request. Optional `user_visible_url` is `https` only. Schema: [schemas/approval-handle.schema.json](schemas/approval-handle.schema.json).

### `lifecycle_event`

Content-free vault lifecycle record for sync. MUST NOT include claim text, selector values, or payloads. Distinct from a 0.2 receipt.

`payload_included` is `const false`. `operation` stays exactly:

`pass.issued` | `pass.revoked` | `pairing.revoked` | `proposal.committed` | `bundle.issued` | `bundle.expired`

`refs` may contain only `pass_ref`, `pairing_ref`, `proposal_ref`, `bundle_ref`, `request_ref`, and `decision_ref`. Required refs depend on `operation`. Schema: [schemas/lifecycle-event.schema.json](schemas/lifecycle-event.schema.json).

### `claim_annotation`

Companion envelope for evidence basis, visibility, memory category, and attribution. Not a patch to closed 0.2 Lite objects. Proposed native fields for `context_claim` in a later 0.3 core revision.

`evidence_basis`: `direct_user_save` | `stated_by_user` | `derived` | `inferred`

`visibility`: `vault` | `public_profile`

Schema: [schemas/claim-annotation.schema.json](schemas/claim-annotation.schema.json).

## Lifecycle

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

## Required tests

Schema-valid JSON is not a pass. A CL-Pass claim MUST publish results for T01–T10. Oracles: [../../../test-vectors/cl-pass/VECTORS.md](../../../test-vectors/cl-pass/VECTORS.md).

## Non-goals

- Not an Egoist AI Passport or Switchboard adapter, subset, client, or type import. Observation is recorded in [crosswalk.md](crosswalk.md); that is not adoption.
- No Grok Bot adapter
- No PCP grants
- No Legatus envelope
- No live issuer
- No ouro / Ouroboros landing
- No wildcards for categories, purpose codes, or `client_instance`
- No un-disclosure of issued bundles
- No opening of the five Lite schemas
