# Context Layer primitives addendum

## Draft companion objects for v0.3 / `CL-Pass` beside v0.2

| Field | Value |
| --- | --- |
| Status | Working Draft - not an adopted standard |
| Version identifier | `context-layer/0.3-draft` |
| Companion profile | `CL-Pass` (negotiable beside `context-layer/0.2-draft` without mutating Lite schemas) |
| Date | 2026-08-28 |
| Relates to | `context-layer/0.2-draft` CL-Core-Lite |

## Change log

- 2026.08.28 · 0.3-draft companions · identity, pairing, pass, approval handle, lifecycle, claim annotation

## Abstract

This addendum defines companion objects that a Context Layer vault MAY issue beside `context-layer/0.2-draft`. It does not change the five closed CL-Core-Lite schemas.

The missing contract is standing authorization above a single request: who is signed in, which exact client is paired, which memory categories a consumer may even ask about, what happens when the ask is ahead of the grant, and a content-free log of those lifecycle edges.

A pass is not a bundle. Identity is not a pass. Pairing is not a pass. Ask is not read. Write approval is not a read pass.

## 1. Requirements language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14/) when, and only when, they appear in all capitals.

Normative requirements apply only to an implementation claiming `CL-Pass` or `context-layer/0.3-draft` for these object types. Descriptive text and examples are informative unless labeled normative.

Common representation rules from 0.2-draft section 6 apply: UTF-8 JSON, `spec_version` / `type` / `id` / `created_at` / `issuer`, opaque `urn:cl:...` identifiers, RFC 3339 timestamps. Identifiers MUST NOT embed email addresses, names, access tokens, raw content, or other unnecessary private data.

## 2. Status and composition

### 2.1 In scope

- `identity_assertion`
- `client_pairing`
- `context_pass`
- `memory_category` enum
- `approval_handle`
- `lifecycle_event`
- `claim_annotation`
- Invariants that bind those objects to the existing 0.2 request → decision → bundle → proposal → receipt flow
- A 0.3-draft note for evidence and visibility fields on `context_claim`

### 2.2 Closed 0.2 Lite schemas

The five CL-Core-Lite schemas remain closed (`additionalProperties: false`):

- `context_request`
- `policy_decision`
- `scoped_context_bundle`
- `memory_update_proposal`
- `receipt`

Implementations MUST NOT add fields to those objects in this addendum. `CL-Pass` evaluation MUST use existing 0.2 members (in particular `decision`, `reason_codes`, `requester.client_instance`, and `{ "predicate" }` selectors).

`context_claim` is specified in 0.2 prose and is not one of the five Lite schemas. This addendum still MUST NOT patch 0.2 claim objects. Evidence, visibility, category, and attribution live on `claim_annotation` until a 0.3 core revision folds them in.

### 2.3 Already specified (do not duplicate)

0.2-draft already requires purpose-bound requests, four-state policy (`allow`, `allow_with_reductions`, `deny`, `needs_approval`), recipient-bound single-use bundles, proposal-only writeback, receipts, `requester` / `recipient` / `client_instance`, `onward_disclosure`, and selectors as `{ "predicate" }`. This addendum does not redefine them.

### 2.4 Observed origin

Several standing-grant, pairing, and ask-versus-read behaviors were observed in Egoist AI Passport and Switchboard. This addendum rewrites those behaviors as Context Layer objects. It does not implement, subset, or adapt their protocol. Types, tool names, authorization-scope strings, and packages from that system are not imported. See [crosswalk.md](crosswalk.md).

### 2.5 Profile negotiation

Objects defined here MUST use `spec_version` `context-layer/0.3-draft`.

A 0.2-draft deployment MAY advertise companion profile `CL-Pass`. Negotiating `CL-Pass` does not make a 0.3 object into a 0.2 Lite object. Consumers MUST reject these companions if they do not implement this addendum.

## 3. Invariants

A conforming `CL-Pass` implementation MUST preserve these invariants in addition to 0.2-draft section 3.

1. **Identity is not a context grant.** An `identity_assertion` authenticates a principal. It MUST NOT contain vault claims, selector matches, or bundle material. Authenticating a principal MUST NOT disclose vault claims.
2. **Identity-only consumers cannot read the vault.** A consumer that only has `identity_assertion` MUST NOT be treated as authorized to submit a disclosing `context_request`, and MUST NOT be issued a `scoped_context_bundle`.
3. **Pairing is not a pass.** `client_pairing` admits an exact `client_instance`. It MUST NOT by itself authorize category disclosure.
4. **Unpaired clients do not get standing disclosure.** If the requester's `client_instance` has no `client_pairing` with `status: "paired"` for the subject, policy MUST return `deny` or `needs_approval`.
5. **A pass is necessary, not sufficient.** Every disclosure still requires a 0.2 `context_request` → `policy_decision` → `scoped_context_bundle`. An active `context_pass` MUST NOT be treated as a bundle, a wildcard selector, or ambient vault access.
6. **Categories grant; predicates select.** A pass grants `memory_category` values. A request still names `{ "predicate" }` selectors. Policy MUST deny a selector whose category is not on an active pass for that principal and `client_instance`, unless this exact request is decided `needs_approval`.
7. **Ask is not read.** `needs_approval` is a successful protocol outcome. It MUST NOT be encoded as a transport error solely because approval is required. The companion `approval_handle` MUST NOT include denied claim values, claim text, or vault payloads.
8. **Write approval is not a read pass.** Committing a `memory_update_proposal` MUST NOT mint a `context_pass` and MUST NOT add categories, purpose codes, principals, or `client_instance` bindings to an existing pass. Subsequent read still requires an active pass and a new `context_request`.
9. **Revocation is prospective.** Revoking a pass or pairing MUST prevent future bundles under that grant. It cannot un-disclose issued bundles. Issued-bundle limits remain as in 0.2-draft section 11.7.
10. **Lifecycle events carry no content.** A `lifecycle_event` MUST NOT include claim text, selector values, proposal bodies, or bundle context. `payload_included` MUST be `false`.
11. **Evidence labels MUST NOT be upgraded.** `inferred` MUST NOT be disclosed as `stated_by_user` or `direct_user_save`. `derived` MUST NOT be disclosed as `direct_user_save`.
12. **Public profile is not the vault.** Records with `visibility: "vault"` MUST NOT appear on a public profile. Public profile is not a `scoped_context_bundle` and not a `context_pass`.

## 4. Terminology

Terms from 0.2-draft section 5 apply. This addendum adds:

**Identity assertion**
A time-bounded statement that a principal was authenticated at a `client_instance`. It is not authorization to disclose vault context.

**Client pairing**
A standing admission that a specific `client_instance` may participate in pass issuance and context requests for a subject. Pairing is revoked independently of passes.

**Memory category**
One of `preference`, `fact`, `project`, `instruction`. A closed grant layer. Not a selector.

**Context pass**
A revocable, expiring grant of one or more memory categories and purpose codes to one principal and one `client_instance`. Necessary for disclosure under `CL-Pass`. Never sufficient.

**Approval handle**
A content-free companion to a `needs_approval` decision, naming the request and the pass gap so a person can approve without the consumer having already read the vault.

**Claim annotation**
A companion envelope for evidence basis, visibility, category, and attribution of a claim. Not the claim.

**Lifecycle event**
A content-free, syncable record that a pass, pairing, proposal, or bundle changed state. Distinct from a receipt.

## 5. Objects

Examples use synthetic values. Canonical instances live in [examples/](examples/).

### 5.1 `identity_assertion`

Proves a principal. Does not grant context.

Required fields:

- `subject_ref`
- `principal`
- `client_instance`
- `authenticated_by`
- `authenticated_at`
- `expires_at`
- `context_grant` with the exact value `false`

```json
{
  "spec_version": "context-layer/0.3-draft",
  "type": "identity_assertion",
  "id": "urn:cl:identity:id_4401",
  "created_at": "2026-08-28T18:00:00Z",
  "issuer": { "id": "urn:cl:identity-issuer:local" },
  "subject_ref": "vault://subjects/primary",
  "principal": "urn:cl:principal:subject-primary",
  "client_instance": "urn:device:local-workstation",
  "authenticated_by": "deployment_session",
  "authenticated_at": "2026-08-28T18:00:00Z",
  "audience": "urn:app:notes",
  "expires_at": "2026-08-28T20:00:00Z",
  "context_grant": false
}
```

`context_grant` MUST be `false`. Implementations MUST reject an identity object that includes selectors, predicates, claims, categories, or bundle refs. Schema `additionalProperties: false` is the mechanical enforcement; policy MUST still treat possession of this object as non-authorization for vault read.

`authenticated_by` names a deployment identity method. It is not a purpose code and MUST NOT be interpreted as a category grant.

### 5.2 `client_pairing`

Binds one `client_instance` to one subject.

Required fields:

- `subject_ref`
- `client_instance`
- `display_name`
- `paired_at`
- `status` (`paired` or `revoked`)

When `status` is `revoked`, `revoked_at` is REQUIRED.

```json
{
  "spec_version": "context-layer/0.3-draft",
  "type": "client_pairing",
  "id": "urn:cl:pairing:pair_4401",
  "created_at": "2026-08-28T18:02:00Z",
  "issuer": { "id": "urn:cl:pairing:local" },
  "subject_ref": "vault://subjects/primary",
  "client_instance": "urn:device:local-workstation",
  "display_name": "local workstation notes",
  "paired_at": "2026-08-28T18:02:00Z",
  "status": "paired"
}
```

`display_name` is a user-facing label for the client. It MUST NOT contain vault claim values.

Pairing MUST match the request's `requester.client_instance` exactly. Implementations MUST NOT treat a related device, same-principal wildcard, or display-name match as paired.

Revoking a pairing MUST prevent issuance of new passes and new bundles for that `client_instance`. Existing passes for that instance SHOULD be revoked as well; if they are left `active`, policy MUST still deny disclosure because pairing is no longer `paired`.

### 5.3 `memory_category`

Closed enum:

| Value | Intended use |
| --- | --- |
| `preference` | Subject-stated preferences |
| `fact` | Factual claims about the subject or their world |
| `project` | Project, task, or work-stream context |
| `instruction` | Standing instructions to consumers |

A vault claiming `CL-Pass` MUST classify every disclosable predicate into exactly one `memory_category` before policy evaluation. An unclassified predicate MUST be denied or force `needs_approval` for the exact request.

Selectors stay 0.2 `{ "predicate" }` objects. Requests MUST NOT carry a category in place of a predicate. Passes MUST NOT carry predicates in place of categories.

This enum is closed in 0.3-draft. New categories require a later spec version. Implementations MUST NOT accept unknown category strings.

### 5.4 `context_pass`

Standing grant: one principal, one `client_instance`, one or more categories, one or more purpose codes, one expiry.

Required fields:

- `subject_ref`
- `principal`
- `client_instance`
- `categories` (min 1, unique, from `memory_category`)
- `allowed_purpose_codes` (min 1, unique, 0.2 purpose-code registry or `x.` extension)
- `expires_at`
- `revocable`
- `status` (`active`, `revoked`, or `expired`)

When `status` is `revoked`, `revoked_at` is REQUIRED. `pairing_ref` is OPTIONAL and SHOULD be set when the pass was issued against a known pairing.

```json
{
  "spec_version": "context-layer/0.3-draft",
  "type": "context_pass",
  "id": "urn:cl:pass:pass_4401",
  "created_at": "2026-08-28T18:05:00Z",
  "issuer": { "id": "urn:cl:pass-issuer:local" },
  "subject_ref": "vault://subjects/primary",
  "principal": "urn:app:notes",
  "client_instance": "urn:device:local-workstation",
  "pairing_ref": "urn:cl:pairing:pair_4401",
  "categories": ["preference", "fact"],
  "allowed_purpose_codes": ["retrieve.context", "draft.response"],
  "expires_at": "2026-09-04T18:05:00Z",
  "revocable": true,
  "status": "active"
}
```

A pass is **active** only when `status` is `active` and `expires_at` is strictly in the future at evaluation time. An implementation MUST treat a stored `active` pass as `expired` once `expires_at` has passed, and MUST NOT issue bundles under it.

`principal` on the pass MUST equal the request's `requester.principal`. `client_instance` on the pass MUST equal the request's `requester.client_instance`. The request `purpose_code` MUST be a member of `allowed_purpose_codes`. Prefix match, similarity, and optional `purpose` text MUST NOT satisfy this check (same rule as 0.2-draft section 7.3.1).

`revocable` SHOULD be `true`. If `revocable` is `false`, only expiry (and pairing revocation, per 5.2) ends the grant. A `CL-Pass` issuer MUST still honor subject-initiated pairing revocation.

Issuing a pass MUST NOT emit a `scoped_context_bundle`. Widening a pass (adding categories, purpose codes, a different principal, or a different `client_instance`) MUST be represented as a new pass object, not a silent mutation of an already-evaluated grant. A later policy change MUST NOT silently broaden an already-issued pass.

### 5.5 `approval_handle`

Companion to a 0.2 `policy_decision` whose `decision` is `needs_approval`.

Required fields:

- `request_ref`
- `pass_gap.missing_categories` (min 1)
- `expires_at`

`decision_ref` and `user_visible_url` are OPTIONAL. `user_visible_url`, if present, MUST be an `https://` URL.

```json
{
  "spec_version": "context-layer/0.3-draft",
  "type": "approval_handle",
  "id": "urn:cl:approval:ah_4401",
  "created_at": "2026-08-28T18:10:00Z",
  "issuer": { "id": "urn:cl:approval-surface:local" },
  "request_ref": "urn:cl:request:req_880",
  "decision_ref": "urn:cl:decision:dec_880",
  "pass_gap": {
    "missing_categories": ["instruction"]
  },
  "user_visible_url": "https://vault.example/approve/ah_4401",
  "expires_at": "2026-08-28T18:40:00Z"
}
```

The handle MUST NOT include claim values, denied selector payloads, provenance text, or any field that would let the consumer read vault content before approval. The schema forbids additional properties; implementations MUST NOT smuggle content through `user_visible_url` query strings.

`pass_gap.missing_categories` lists categories requested (via classified predicates) that are not on an active pass. It MAY omit categories that were not requested. It MUST NOT list category values as a substitute for disclosing claims in those categories.

Approval identifiers remain single-use or bound to the exact request digest, as in 0.2-draft section 9.3. A changed request MUST invalidate the handle. Completing approval MAY mint a `context_pass` for the approved categories; it MUST NOT skip the subsequent `context_request` → `policy_decision` → bundle path.

### 5.6 `claim_annotation`

Companion envelope for a `context_claim`. 0.3 field proposals, not a Lite patch.

Required fields:

- `claim_ref`
- `evidence_basis`
- `visibility`
- `category`
- `attribution.via_principal`
- `attribution.captured_at`

`evidence_basis` values:

| Value | Meaning |
| --- | --- |
| `direct_user_save` | The subject stored the claim as such |
| `stated_by_user` | The subject stated it; capture may be mediated |
| `derived` | Extracted from sources with provenance |
| `inferred` | Model- or heuristic-inferred; not stated as fact by the subject |

`visibility` values: `vault` | `public_profile`.

```json
{
  "spec_version": "context-layer/0.3-draft",
  "type": "claim_annotation",
  "id": "urn:cl:annotation:ann_4401",
  "created_at": "2026-08-28T17:55:00Z",
  "issuer": { "id": "urn:cl:annotator:local" },
  "claim_ref": "urn:cl:claim:pref-quiet-hours",
  "evidence_basis": "direct_user_save",
  "visibility": "vault",
  "category": "preference",
  "attribution": {
    "via_principal": "urn:cl:principal:subject-primary",
    "captured_at": "2026-08-28T17:54:50Z"
  }
}
```

A public profile MUST NOT include claims whose annotation `visibility` is `vault`. An `inferred` claim MUST NOT be disclosed with `evidence_basis` rewritten to `stated_by_user` or `direct_user_save`. Bundles that include an inferred claim SHOULD preserve the basis via a future 0.3 claim field; until then, the annotation stays inside the vault zone unless policy explicitly grants the annotation itself.

### 5.7 `lifecycle_event`

Syncable public-of-the-vault log. Content-free.

Required fields:

- `subject_ref`
- `operation`
- `occurred_at`
- `refs` (at least one allowed ref)
- `payload_included` with the exact value `false`

`operation` values:

| Operation | Required ref |
| --- | --- |
| `pass.issued` | `refs.pass_ref` |
| `pass.revoked` | `refs.pass_ref` |
| `pairing.revoked` | `refs.pairing_ref` |
| `proposal.committed` | `refs.proposal_ref` |
| `bundle.issued` | `refs.bundle_ref` |
| `bundle.expired` | `refs.bundle_ref` |

Allowed ref members: `pass_ref`, `pairing_ref`, `proposal_ref`, `bundle_ref`, `request_ref`, `decision_ref`. Additional properties are forbidden.

```json
{
  "spec_version": "context-layer/0.3-draft",
  "type": "lifecycle_event",
  "id": "urn:cl:lifecycle:le_4401",
  "created_at": "2026-08-28T18:05:01Z",
  "issuer": { "id": "urn:cl:lifecycle:local" },
  "subject_ref": "vault://subjects/primary",
  "operation": "pass.issued",
  "occurred_at": "2026-08-28T18:05:00Z",
  "refs": {
    "pass_ref": "urn:cl:pass:pass_4401",
    "pairing_ref": "urn:cl:pairing:pair_4401"
  },
  "payload_included": false
}
```

A `lifecycle_event` is not a `receipt`. Receipts remain the 0.2 evidence object (digests, outcomes, `user_summary`). Lifecycle events are the subset that may be synced as the public-of-the-vault log after content deletion. Implementations MUST be able to delete claim text and bundle context without deleting the corresponding lifecycle refs, subject to 0.2-draft section 11.7.

## 6. Lifecycles

These steps sit in front of, or beside, 0.2-draft section 8. They do not replace it.

### 6.1 Pair, then pass, then request

1. Authenticate the principal. Issue `identity_assertion` with `context_grant: false`. Stop. Do not disclose vault claims.
2. Require `client_pairing` for the exact `client_instance`. If unpaired, `deny` or `needs_approval`.
3. Require an active `context_pass` covering each requested selector's category and the request `purpose_code`. If missing, `deny` or `needs_approval` with `approval_handle`.
4. Continue with 0.2 outbound context lifecycle: evaluate the request, reduce scope, issue a recipient-bound single-use bundle, require receipts.

Step 3 failure MUST NOT produce a bundle. Step 3 success MUST NOT skip step 4.

### 6.2 Ask is not read

When policy returns `needs_approval`:

1. Persist the 0.2 `policy_decision`.
2. Issue `approval_handle` bound to `request_ref` (and `decision_ref` when available).
3. Return both as a successful protocol outcome.
4. MUST NOT put claim values on the handle.
5. MUST NOT treat the handle as a pass or a bundle.

### 6.3 Write approval is not a read pass

When a `memory_update_proposal` is approved and committed:

1. Apply 0.2 commit rules. The proposal becomes `committed`.
2. Emit `lifecycle_event` with `operation` `proposal.committed` and `refs.proposal_ref` set. `payload_included` MUST be `false`.
3. MUST NOT mint a new `context_pass`.
4. MUST NOT add categories, purpose codes, principals, or `client_instance` bindings to an existing pass.
5. A later read of the committed category still requires an active pass covering that category and a new `context_request`.

### 6.4 Revocation is prospective

When a pass or pairing is revoked:

1. Set `status` to `revoked` and set `revoked_at`.
2. Emit `lifecycle_event` `pass.revoked` or `pairing.revoked` with the required ref. `payload_included` MUST be `false`.
3. Subsequent disclosing requests under that grant MUST be `deny` or `needs_approval`.
4. MUST NOT issue a new `scoped_context_bundle` under the revoked grant.
5. MUST NOT rewrite, delete, or un-disclose an already issued bundle. Issued-bundle limits remain as in 0.2-draft section 11.7.

### 6.5 Evidence, visibility, and public profile

`claim_annotation` rides beside claims until a 0.3 core revision. Policy MUST keep `inferred` from being disclosed as `stated_by_user` or `direct_user_save`. A public-profile export MUST include only claims whose annotation `visibility` is `public_profile`. It is not a `scoped_context_bundle` and not a `context_pass`.

## 7. Reason codes and the 0.3-draft note

`CL-Pass` evaluation MUST use existing 0.2 `policy_decision.reason_codes`. It MUST NOT add fields to Lite objects.

Example codes for this profile:

- `IDENTITY_ONLY`
- `PAIRING_REQUIRED`
- `PASS_MISSING`
- `PURPOSE_NOT_ON_PASS`
- `CATEGORY_NOT_ON_PASS`
- `PASS_REVOKED`

`context_claim` remains specified in 0.2 prose. Evidence, visibility, category, and attribution live on `claim_annotation` until a later 0.3 core revision folds them into the claim.

## 8. Required tests

Schema-valid JSON is not a pass. A `CL-Pass` claim MUST publish results for T01–T10. Oracles: [../../../test-vectors/cl-pass/VECTORS.md](../../../test-vectors/cl-pass/VECTORS.md).

## 9. Non-goals

- Not an Egoist AI Passport or Switchboard adapter, subset, client, or type import. Observation is recorded in [crosswalk.md](crosswalk.md); that is not adoption.
- No PCP grants
- No Legatus envelope
- No live issuer
- No wildcards for categories, purpose codes, or `client_instance`
- No un-disclosure of issued bundles
- No opening of the five Lite schemas
