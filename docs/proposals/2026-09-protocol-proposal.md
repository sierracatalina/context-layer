# Context Layer — 2026-09 protocol proposal

| Field | Value |
| --- | --- |
| Status | Working draft — not an adopted standard |
| Date | 2026-09-13 |
| Closed Lite | `context-layer/0.2-draft` CL-Core-Lite |
| Companion profile | `context-layer/0.3-draft` CL-Pass |
| Repo | https://github.com/sierracatalina/context-layer |
| License | Existing repository boundary (Apache-2.0 software / CC BY 4.0 prose). This proposal does not relicense v0.2. |

This is the 2026-09 proposal write-up. It states what is already closed, what the 0.3 companions add beside Lite, and what this proposal does not do.

## What Context Layer is

Context Layer is a protocol for moving the minimum useful context across applications, models, and agents while keeping authority with the user. The vault is user-owned. Isolation is purpose-bound: a consumer receives an approved scoped bundle, not an unrestricted vault query interface.

Every disclosing exchange begins with a declared purpose, passes through policy, produces a recipient-bound scoped bundle, and leaves a minimized receipt. New memory enters only as a proposal. Authentication of a principal is not authorization to read the vault.

The published v0.2 product (schemas, reference runtime, local-core proof, public dossier) remains the closed Lite line. This proposal does not open those objects.

## Closed 0.2 Lite

The five CL-Core-Lite objects stay closed (`additionalProperties: false`). Implementations MUST reject unknown top-level fields. Version `0.2-draft` does not define portable `extensions` or `required_extensions` members.

| Object | Role |
| --- | --- |
| `context_request` | Purpose-bound ask: requester, recipient, `purpose_code`, `{ predicate }` selectors, actions, retention, receipt requirement, expiry |
| `policy_decision` | Four-state outcome: `allow`, `allow_with_reductions`, `deny`, `needs_approval` |
| `scoped_context_bundle` | Recipient-bound, single-use, expiring packet of approved claims only |
| `memory_update_proposal` | Proposal-only writeback; commit is not a standing read grant |
| `receipt` | Payload-minimized evidence (`payload_included` is `false`) |

Authoritative schemas: [`protocol/schemas/`](../../protocol/schemas/). Synthetic fixtures: [`protocol/fixtures/`](../../protocol/fixtures/). Executable v0.2 vectors: [`test-vectors/v0.2/`](../../test-vectors/v0.2/).

### Flow

```text
context_request
  -> policy_decision
  -> scoped_context_bundle   (only on allow / allow_with_reductions)
  -> capability-bound action
  -> receipt
  -> memory_update_proposal  (optional; review then commit)
```

`needs_approval` is a successful protocol outcome. It is not a transport failure and it is not a read.

### Why Lite stays closed

Lite is the interoperable experiment surface. Opening it to carry identity, pairing, pass, approval-handle, lifecycle, or annotation fields would:

- silently treat unknown members as authorized extensions;
- let a schema-valid identity object masquerade as a grant;
- mix pairing and pass into the request/decision/bundle contract;
- make T01–T10 oracles untestable against a stable baseline.

0.3 companions are therefore **not Lite patches**. They use `spec_version: context-layer/0.3-draft` and `additionalProperties: false` on their own objects. Reason codes such as `IDENTITY_ONLY`, `PAIRING_REQUIRED`, `PURPOSE_NOT_ON_PASS`, `CATEGORY_NOT_ON_PASS`, and `PASS_REVOKED` travel on the existing `policy_decision.reason_codes` array. They are not new Lite fields.

## 0.3 / CL-Pass companions

Companion pack: [`protocol/companions/0.3-draft/`](../../protocol/companions/0.3-draft/).

| Object | Role |
| --- | --- |
| `identity_assertion` | Authenticates a principal. `context_grant` MUST be `false`. |
| `client_pairing` | Admits an exact `client_instance` only. Pairing is not a pass. |
| `context_pass` | Grants `memory_category` values and allowed purpose codes. Necessary, not sufficient. |
| `approval_handle` | Returned on `needs_approval`. MUST NOT carry claim text or vault payloads. |
| `lifecycle_event` | Content-free lifecycle beside receipts. `payload_included` MUST be `false`. |
| `claim_annotation` | Rides beside claims until a 0.3 core revision. Evidence labels MUST NOT be upgraded. |
| `memory_category` | Closed enum: `preference` \| `fact` \| `project` \| `instruction` |

Companion schemas, examples, README, spec, and T01–T10 vectors live under [`protocol/companions/0.3-draft/`](../../protocol/companions/0.3-draft/) and [`test-vectors/cl-pass/VECTORS.md`](../../test-vectors/cl-pass/VECTORS.md). Do not invent types.

### Invariants (normative for CL-Pass)

1. **Identity ≠ grant.** `identity_assertion.context_grant` MUST be `false`. Authenticating a principal MUST NOT disclose vault claims.
2. **Identity-only is not authorized disclosure.** A consumer holding only an identity assertion MUST NOT be treated as authorized to submit a disclosing `context_request` and MUST NOT be issued a `scoped_context_bundle`.
3. **Pairing ≠ pass.** `client_pairing` admits an exact `client_instance` only. No wildcards.
4. **Unpaired clients** MUST receive `deny` or `needs_approval`.
5. **A pass is necessary, not sufficient.** Every disclosure still requires 0.2 `context_request` → `policy_decision` → `scoped_context_bundle`. An active `context_pass` is not a bundle, wildcard selector, or ambient vault access.
6. **Categories grant; predicates select.** The pass grants `memory_category` values. The request still names `{ predicate }` selectors. An off-pass category MUST be denied or force `needs_approval` for the exact request.
7. **Ask ≠ read.** `needs_approval` is a successful protocol outcome. `approval_handle` MUST NOT include denied claim values, claim text, or vault payloads.
8. **Write approval ≠ read pass.** Committing a `memory_update_proposal` MUST NOT mint or widen a `context_pass`.
9. **Revocation is prospective.** Revoking a pass or pairing MUST prevent future bundles. It cannot un-disclose issued bundles.
10. **Lifecycle is content-free.** `lifecycle_event.payload_included` MUST be `false`.
11. **Evidence is not upgraded.** `inferred` MUST NOT be disclosed as `stated_by_user` or `direct_user_save`.
12. **Vault ≠ public profile.** Visibility `vault` MUST NOT appear on a public profile.

### Companion flow

```text
identity_assertion          (not a grant)
  -> client_pairing         (exact client_instance)
  -> context_pass           (categories + purpose codes)
  -> 0.2 request / decision / bundle
```

`needs_approval` returns `approval_handle` as success. Proposal commit MUST NOT mint a pass. `lifecycle_event` sits beside receipts and carries no content. `claim_annotation` rides beside claims until a 0.3 core revision.

`lifecycle_event.operation` stays exactly:

`pass.issued` | `pass.revoked` | `pairing.revoked` | `proposal.committed` | `bundle.issued` | `bundle.expired`

### Required tests

Schema-valid JSON is not a pass. A CL-Pass claim MUST publish results for T01–T10. The oracles are in [`test-vectors/cl-pass/VECTORS.md`](../../test-vectors/cl-pass/VECTORS.md).

| ID | Invariant |
| --- | --- |
| T01 | Identity is not a vault grant |
| T02 | Unpaired client: ask is not read |
| T03 | `purpose_code` absent from pass (no prefix match) |
| T04 | Off-pass category; denied text absent |
| T05 | Later on-pass read still needs a new request |
| T06 | Proposal commit does not mint or widen a pass |
| T07 | Revoked pass cannot obtain a later bundle |
| T08 | `lifecycle_event` is content-free |
| T09 | `inferred` is not emitted as `stated_by_user` |
| T10 | Visibility `vault` is absent from public-profile export |

## Pointers

| Artifact | Location |
| --- | --- |
| Companion pack | [`protocol/companions/0.3-draft/`](../../protocol/companions/0.3-draft/) |
| Companion spec | [`protocol/companions/0.3-draft/spec.md`](../../protocol/companions/0.3-draft/spec.md) |
| 0.2 ↔ 0.3 crosswalk | [`protocol/companions/0.3-draft/crosswalk.md`](../../protocol/companions/0.3-draft/crosswalk.md) |
| T01–T10 vectors | [`test-vectors/cl-pass/VECTORS.md`](../../test-vectors/cl-pass/VECTORS.md) |
| Closed Lite schemas | [`protocol/schemas/`](../../protocol/schemas/) |

## Non-goals

This repository ships Context Layer only. PCP, Legatus, and AAA are out of scope for this change.

Do not do any of the following in this proposal:

- Switchboard / Egoist adapter, SDK, OIDC, MCP, or type-name imports
- PCP grants
- Legatus envelope
- Live issuer
- Opening the five Lite schemas
- Wildcards for categories, purpose codes, or `client_instance`
- Un-disclosure of already issued bundles
- Relicensing the public repository from Apache-2.0 / CC BY 4.0 to MIT
