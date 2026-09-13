# CLOSED Context Layer 0.3-draft companions (CL-Pass) — 2026-08-29

Landed from the closed Drive record. Canonical URL:

https://docs.google.com/document/d/19ZNUrP3zCxRxbXvQ-0EBV9MKuMcJbkKXLKp58MTHtUA/edit

CLOSED 2026-08-29 by DaddyBot.

Context Layer — `context-layer/0.3-draft` companion addendum (CL-Pass)

0.2 Lite schemas remain closed. No PCP grants. No Legatus. No live issuer. No ouro.

Canonical pack (schemas + examples + spec.md): upload as `context-layer-0.3-companions.zip` in the same Drive folder. Coordinator pack for this weekend ship is the base64 gzip tar (md5 `6052995f6e54a874a6dd18cfc41da3ff`). Empty truncated stub from a blocked upload was renamed: `EMPTY STUB ignore — Context Layer 0.3 (blocked upload)`. Do not treat that stub as the spec.

## Objects (companion only)

`identity_assertion`, `client_pairing`, `context_pass`, `approval_handle`, `lifecycle_event`, `claim_annotation`, plus closed enum `memory_category` (`preference` | `fact` | `project` | `instruction`).

All use `spec_version` `context-layer/0.3-draft` and `additionalProperties: false`. They are not Lite patches.

## Closed 0.2 Lite (do not open)

`context_request`, `policy_decision`, `scoped_context_bundle`, `memory_update_proposal`, `receipt`.

## Invariants (normative for CL-Pass)

1. Identity is not a context grant. `identity_assertion.context_grant` MUST be `false`. Authenticating a principal MUST NOT disclose vault claims.
2. Identity-only consumers MUST NOT be treated as authorized to submit a disclosing `context_request` and MUST NOT be issued a `scoped_context_bundle`.
3. Pairing is not a pass. `client_pairing` admits an exact `client_instance` only.
4. Unpaired clients MUST get `deny` or `needs_approval`.
5. A pass is necessary, not sufficient. Every disclosure still requires 0.2 `context_request` → `policy_decision` → `scoped_context_bundle`. An active `context_pass` is not a bundle, wildcard selector, or ambient vault access.
6. Categories grant; predicates select. Pass grants `memory_category` values. Request still names `{ predicate }` selectors. Off-pass category MUST be denied or `needs_approval` for the exact request.
7. Ask is not read. `needs_approval` is a successful protocol outcome. `approval_handle` MUST NOT include denied claim values, claim text, or vault payloads.
8. Write approval is not a read pass. Committing a `memory_update_proposal` MUST NOT mint or widen a `context_pass`.
9. Revocation is prospective. Revoking a pass or pairing MUST prevent future bundles. It cannot un-disclose issued bundles.
10. Lifecycle events carry no content. `payload_included` MUST be `false`.
11. Evidence labels MUST NOT be upgraded. `inferred` MUST NOT be disclosed as `stated_by_user` or `direct_user_save`.
12. Public profile is not the vault. Visibility `vault` MUST NOT appear on a public profile.

## Flow

`identity_assertion` (not a grant) → `client_pairing` (exact `client_instance`) → `context_pass` (categories + purpose codes) → 0.2 request/decision/bundle. `needs_approval` returns `approval_handle` as success. Proposal commit MUST NOT mint a pass. `lifecycle_event` is content-free beside receipts. `claim_annotation` rides beside claims until a 0.3 core revision.

## Non-goals

No Egoist/Switchboard adapter. No Grok Bot adapter. No PCP grants. No Legatus envelope. No live issuer. No ouro landing. No wildcards for categories, purpose codes, or `client_instance`. No un-disclosure of issued bundles.

## Required tests (pack must publish results; schema-only is insufficient)

1. Reject vault disclosure when only `identity_assertion` is present.
2. Unpaired `client_instance`: `deny` or `needs_approval` without claim values.
3. `purpose_code` absent from pass: reject.
4. Off-pass category: deny; denied claim text absent from handle and bundle.
5. Later on-pass read still requires a new `context_request` and `policy_decision`.
6. Proposal commit does not create or widen a `context_pass`.
7. Revoked pass cannot obtain a later bundle.
8. `lifecycle_event` serializes `payload_included` false with no claim text.
9. `inferred` is not emitted as `stated_by_user`.
10. Visibility `vault` is absent from public-profile export.

Board: CLOSED. Next job for Context Layer is assigned separately.
