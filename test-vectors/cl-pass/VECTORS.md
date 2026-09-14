# Context Layer — CL-Pass required-test vectors

status: working draft · not an adopted standard
profile: CL-Pass
spec: context-layer/0.3-draft companion addendum
relates to: context-layer/0.2-draft CL-Core-Lite
published: 2026-08-29

0.2 Lite schemas stay closed. These vectors do not add fields to `context_request`, `policy_decision`, `scoped_context_bundle`, `memory_update_proposal`, or `receipt`. Schema-valid JSON is not a pass. Each test names an oracle that must fail if the invariant is broken even when every object validates.

No PCP grants. No Legatus. No live issuer.

## How to run

A `CL-Pass` claim MUST publish results for T01–T10. For each test:

1. Load **Given** objects.
2. Apply **When**.
3. Compare **Expected** members only. Do not require extra Lite fields.
4. Evaluate **Oracle**. FAIL if any forbidden string or object appears.
5. Record `pass` | `fail` plus the first failing check.

Counterexamples under **Fail if** are the schema-only traps. A harness that only validates JSON MUST report those as fail.

## Fixture world (synthetic)

Shared vault. No live subject data.

| Ref | Value |
| --- | --- |
| subject_ref | `vault://subjects/primary` |
| notes principal | `urn:app:notes` |
| paired client | `urn:device:local-workstation` |
| unpaired client | `urn:device:unpaired-phone` |
| identity | `urn:cl:identity:id_4401` (`context_grant: false`) |
| pairing | `urn:cl:pairing:pair_4401` (`status: paired`) |
| pass | `urn:cl:pass:pass_4401` categories `preference`, `fact`; purposes `retrieve.context`, `draft.response`; `status: active`; `expires_at: 2026-09-04T18:05:00Z` |
| eval_at | `2026-08-29T13:00:00Z` (strictly before pass expiry) |

Vault claims (canonical; appear only when an oracle allows them):

| claim_ref | category | visibility | evidence_basis | claim text (forbidden on fail paths) |
| --- | --- | --- | --- | --- |
| `urn:cl:claim:pref-quiet-hours` | preference | vault | direct_user_save | `quiet hours 21:00-07:00` |
| `urn:cl:claim:fact-timezone` | fact | public_profile | stated_by_user | `America/New_York` |
| `urn:cl:claim:instr-always-cite` | instruction | vault | direct_user_save | `always cite sources` |
| `urn:cl:claim:inferred-color` | preference | vault | inferred | `favorite color is teal` |

Forbidden-on-fail-path strings (scan every returned object, including URL query strings):

```
quiet hours 21:00-07:00
always cite sources
favorite color is teal
America/New_York
```

`America/New_York` is allowed only on T05 allow-path bundle context and T10 public-profile export. It is forbidden on T01–T04, T06–T09 deny/handle/lifecycle paths.

## T01 — identity is not a vault grant

**Invariant.** Authenticating a principal MUST NOT disclose vault claims. A consumer that only has `identity_assertion` MUST NOT be issued a bundle.

**Given**

- `identity_assertion` `id_4401` with `context_grant: false`
- no `client_pairing`
- no `context_pass`

**When**

Consumer holding only `id_4401` submits 0.2 `context_request` `urn:cl:request:t01`:

- `requester.principal`: `urn:app:notes`
- `requester.client_instance`: `urn:device:local-workstation`
- `purpose_code`: `retrieve.context`
- `selectors`: `[{ "predicate": "preference.quiet_hours" }]`

**Expected**

- `policy_decision.decision`: `deny`
- `reason_codes` includes `IDENTITY_ONLY`
- no `scoped_context_bundle`
- no `approval_handle` that carries claim text

**Oracle (must all hold)**

- `identity_assertion.context_grant === false`
- returned set contains zero objects with `type === "scoped_context_bundle"`
- none of the forbidden-on-fail-path strings appear in any returned object
- `identity_assertion` has no `selectors`, `categories`, `claims`, or `bundle_ref` members (`additionalProperties: false`)

**Fail if**

- identity object validates and a bundle is issued
- decision is `allow` or `allow_with_reductions`
- claim text is copied onto the identity object or a receipt `user_summary`

## T02 — unpaired client: ask is not read

**Invariant.** Unpaired `client_instance` MUST be `deny` or `needs_approval`. `approval_handle` MUST NOT include denied claim values.

**Given**

- `identity_assertion` `id_4401`
- pairing `pair_4401` for `urn:device:local-workstation` only
- no pairing for `urn:device:unpaired-phone`
- pass `pass_4401` (does not bind the unpaired device)

**When**

`context_request` `urn:cl:request:t02` with `requester.client_instance`: `urn:device:unpaired-phone`, selector `preference.quiet_hours`, `purpose_code`: `retrieve.context`.

**Expected (either branch is conforming)**

Branch A:

- `decision`: `deny`
- `reason_codes` includes `PAIRING_REQUIRED`
- no bundle

Branch B:

- `decision`: `needs_approval`
- `approval_handle` `request_ref`: `urn:cl:request:t02`
- `pass_gap.missing_categories` MAY be `["preference"]` or empty if the implementation treats pairing as the only gap
- `user_visible_url` if present is `https://` with no claim text in the query

**Oracle**

- no bundle
- `approval_handle` if present contains none of the forbidden strings
- handle has no `context`, `claims`, `proposed_claims`, or selector values (`additionalProperties: false`)
- `needs_approval` is returned as a successful protocol outcome (not a transport 4xx solely because approval is required)

**Fail if**

- unpaired client receives `allow`
- handle validates and includes `quiet hours 21:00-07:00`

## T03 — purpose_code absent from pass

**Invariant.** Request `purpose_code` MUST be a member of `allowed_purpose_codes`. Prefix match MUST NOT satisfy.

**Given**

- pairing `pair_4401` (`paired`)
- pass `pass_4401` (`active`; purposes `retrieve.context`, `draft.response`)

**When**

`context_request` `urn:cl:request:t03` with `purpose_code`: `retrieve.summary` (prefix-similar, not a member), selector `preference.quiet_hours`.

**Expected**

- `decision`: `deny` or `needs_approval`
- `reason_codes` includes `PURPOSE_NOT_ON_PASS`
- no bundle

**Oracle**

- `retrieve.summary` is not treated as `retrieve.context`
- no bundle
- no forbidden strings on handle or decision

**Fail if**

- prefix or `purpose` text match issues a bundle
- schema-valid pass + schema-valid request is treated as sufficient

## T04 — off-pass category; denied text absent

**Invariant.** A selector whose category is not on the pass MUST be denied or force `needs_approval` for the exact request. Denied claim text MUST be absent from handle and bundle.

**Given**

- pairing `pair_4401`
- pass `pass_4401` categories `preference`, `fact` (not `instruction`)
- vault claim `instr-always-cite` text `always cite sources`

**When**

`context_request` `urn:cl:request:t04` `purpose_code`: `retrieve.context` with selectors:

```json
[
  { "predicate": "preference.quiet_hours" },
  { "predicate": "instruction.citation" }
]
```

Classification: `preference.quiet_hours` → `preference` (on pass); `instruction.citation` → `instruction` (off pass).

**Expected (either conforming)**

Branch A — exact request `needs_approval`:

- `decision`: `needs_approval`
- `approval_handle.pass_gap.missing_categories`: `["instruction"]`
- no bundle
- handle MUST NOT contain `always cite sources` or `quiet hours 21:00-07:00`

Branch B — reduce:

- `decision`: `allow_with_reductions`
- `denied_selectors` includes `{ "predicate": "instruction.citation" }`
- `reason_codes` includes `CATEGORY_NOT_ON_PASS`
- if a bundle is issued, its `context` MUST NOT include `always cite sources` or predicate `instruction.citation`

**Oracle**

- scan every returned object for `always cite sources` → FAIL if found
- off-pass selector is never in `granted_selectors`

**Fail if**

- off-pass instruction claim is in the bundle and objects still validate
- handle lists the missing category and also includes the claim value

## T05 — later on-pass read still needs a new request

**Invariant.** A pass is necessary, not sufficient. A later read of an on-pass category still requires a new `context_request` and `policy_decision`.

**Given**

- pairing `pair_4401`
- pass `pass_4401` still `active`
- prior successful disclosure of `pref-quiet-hours` under `urn:cl:request:t05a` / `urn:cl:decision:t05a` / `urn:cl:bundle:t05a` (expired or consumed)

**When**

Consumer, still holding `pass_4401` and the prior bundle id, asks again for `preference.quiet_hours` without a new request, then with a new request `urn:cl:request:t05b`.

**Expected**

- replay of `urn:cl:bundle:t05a` is refused (`single_use` / expired)
- no ambient disclosure from the pass alone
- `urn:cl:request:t05b` produces a new `policy_decision` `urn:cl:decision:t05b`
- only after `allow` or `allow_with_reductions` may `urn:cl:bundle:t05b` include `quiet hours 21:00-07:00`
- `t05b` ids MUST differ from `t05a`

**Oracle**

- pass object is unchanged (same `id`, `categories`, `allowed_purpose_codes`)
- two distinct `context_request` ids exist for the two reads
- consumer cannot obtain claim text by presenting only `pass_4401`

**Fail if**

- presenting the pass returns claim text with no new request
- a new bundle is issued with `request_ref` equal to the consumed `t05a`

## T06 — proposal commit does not mint or widen a pass

**Invariant.** Committing a `memory_update_proposal` MUST NOT create or widen a `context_pass`.

**Given**

- pass `pass_4401` categories `["preference", "fact"]`
- 0.2 `memory_update_proposal` `urn:cl:proposal:t06` `operation`: `add`, predicate `instruction.citation`, status `pending_approval` (closed Lite object; no extra fields)

**When**

Proposal is approved and committed. Emit `lifecycle_event` `proposal.committed`.

**Expected**

- proposal `status` becomes committed per 0.2 rules
- `lifecycle_event.operation`: `proposal.committed`
- `refs.proposal_ref`: `urn:cl:proposal:t06`
- `payload_included`: `false`
- pass set after commit: still exactly `pass_4401` with categories `["preference", "fact"]`
- no new object with `type === "context_pass"`
- `pass_4401.allowed_purpose_codes` unchanged

**Oracle**

- `count(type==context_pass)` after === before
- `pass_4401.categories` deep-equals `["preference", "fact"]`
- subsequent read of `instruction.citation` still fails T04 (off-pass)
- lifecycle event contains none of the forbidden strings

**Fail if**

- commit mints `urn:cl:pass:*` for `instruction`
- commit appends `instruction` to `pass_4401.categories`
- commit is treated as a standing read grant

## T07 — revoked pass cannot obtain a later bundle

**Invariant.** Revocation is prospective. A revoked pass MUST NOT issue future bundles. It cannot un-disclose already issued ones.

**Given**

- pass `pass_4401` was `active`
- optional prior bundle `urn:cl:bundle:t07-prior` already issued under it

**When**

1. Set `pass_4401.status` to `revoked`, set `revoked_at`.
2. Emit `lifecycle_event` `pass.revoked` with `refs.pass_ref`: `urn:cl:pass:pass_4401`.
3. Submit new `context_request` `urn:cl:request:t07` for `preference.quiet_hours`.

**Expected**

- new request: `deny` or `needs_approval`
- `reason_codes` includes `PASS_REVOKED`
- no new bundle
- prior bundle `t07-prior` is not rewritten; remote deletion is not claimed
- lifecycle `payload_included`: `false`

**Oracle**

- zero new `scoped_context_bundle` objects after revoke
- `always cite sources` and `quiet hours 21:00-07:00` absent from the new decision/handle
- prior bundle body, if retained, is unchanged (prospective only)

**Fail if**

- revoked pass still issues a bundle
- revoke rewrites or deletes the historical bundle object and calls that un-disclosure

## T08 — lifecycle_event is content-free

**Invariant.** `lifecycle_event` MUST serialize `payload_included: false` and MUST NOT include claim text.

**Given**

Events for `pass.issued` (`le_4401`), `proposal.committed` (`le_t06`), `pass.revoked` (`le_t07`).

**When**

Serialize each event to JSON.

**Expected** (canonical shape)

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

**Oracle (every event)**

- `payload_included === false`
- keys of `refs` ⊆ `{pass_ref, pairing_ref, proposal_ref, bundle_ref, request_ref, decision_ref}`
- JSON string of the event contains none of the forbidden claim strings
- no `context`, `claims`, `proposed_claims`, `user_summary`, or selector-value members

**Fail if**

- object validates against the schema and includes claim text in any string field
- `payload_included` is omitted or `true`

## T09 — inferred MUST NOT be emitted as stated_by_user

**Invariant.** Evidence labels MUST NOT be upgraded. `inferred` MUST NOT be disclosed as `stated_by_user` or `direct_user_save`.

**Given**

```json
{
  "spec_version": "context-layer/0.3-draft",
  "type": "claim_annotation",
  "id": "urn:cl:annotation:ann_inferred_color",
  "created_at": "2026-08-28T17:56:00Z",
  "issuer": { "id": "urn:cl:annotator:local" },
  "claim_ref": "urn:cl:claim:inferred-color",
  "evidence_basis": "inferred",
  "visibility": "vault",
  "category": "preference",
  "attribution": {
    "via_principal": "urn:app:notes",
    "captured_at": "2026-08-28T17:56:00Z"
  }
}
```

**When**

Any disclosure path that includes `urn:cl:claim:inferred-color` (bundle, public profile, or annotation export).

**Expected**

- if disclosed, `evidence_basis` remains `inferred`
- MUST NOT appear as `stated_by_user` or `direct_user_save`
- annotation stays vault-zone unless policy explicitly grants the annotation

**Oracle**

- no returned object pairs `claim_ref` `urn:cl:claim:inferred-color` with `evidence_basis` in `{stated_by_user, direct_user_save}`
- `favorite color is teal` MUST NOT appear with those upgraded labels
- 0.2 `context_claim.status: "derived"` is not a license to drop `inferred`

**Fail if**

- annotation schema-validates and a bundle lists the claim as user-stated

## T10 — visibility vault is absent from public-profile export

**Invariant.** Public profile is not the vault. `visibility: "vault"` MUST NOT appear on a public profile.

**Given**

- `pref-quiet-hours`: `visibility: vault`
- `fact-timezone`: `visibility: public_profile`
- `instr-always-cite`: `visibility: vault`
- `inferred-color`: `visibility: vault`

**When**

Export public profile for `vault://subjects/primary`.

**Expected**

- export MAY include `America/New_York` / `fact-timezone`
- export MUST NOT include `quiet hours 21:00-07:00`, `always cite sources`, `favorite color is teal`
- export is not a `scoped_context_bundle` and not a `context_pass`

**Oracle**

- scan export for the three vault claim strings → FAIL if any found
- every exported claim has annotation `visibility === "public_profile"`
- export `type` is not `scoped_context_bundle` or `context_pass`

**Fail if**

- vault claims are present on the profile and objects still validate
- profile is issued as a bundle substitute

## Closed Lite reminder

T01–T07 MAY emit 0.2 objects. Those objects MUST validate against the closed 0.2 schemas with no additional properties. `reason_codes` values (`IDENTITY_ONLY`, `PAIRING_REQUIRED`, `PURPOSE_NOT_ON_PASS`, `CATEGORY_NOT_ON_PASS`, `PASS_REVOKED`) travel on the existing `policy_decision.reason_codes` array. They are not new Lite fields.

## Result ledger

| Test | Result | First failing check |
| --- | --- | --- |
| T01 identity-only | | |
| T02 unpaired client | | |
| T03 purpose not on pass | | |
| T04 off-pass category | | |
| T05 new request required | | |
| T06 commit does not mint pass | | |
| T07 revoked pass | | |
| T08 lifecycle content-free | | |
| T09 inferred not upgraded | | |
| T10 vault not on profile | | |

A row that only says “schemas valid” is not a pass.
