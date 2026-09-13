# Observed phrase → Context Layer primitive

This table records where a behavior was observed, then names the CL object that encodes it. Observation is not adoption.

This addendum does **not** implement Egoist AI Passport, Switchboard, or any protocol from that system. It does not import their types, tool names, authorization-scope strings, or packages. A CL deployment that speaks these objects is not speaking that protocol.

| Observed phrase (Egoist / Switchboard) | CL primitive | What is lifted | What is not imported |
| --- | --- | --- | --- |
| Sign-in consent and memory consent are two consents | `identity_assertion` with `context_grant: false` | Authenticating a principal MUST NOT disclose vault claims. A consumer that only has identity MUST NOT call the vault. | Authorization-scope names, identity-provider token shapes, client metadata documents |
| Category pass: one app, one category, one duration | `context_pass` | Standing grant of `memory_category` values to one `principal` + `client_instance` until `expires_at` or revoke. Necessary, not sufficient. | Pass type names, duration defaults, app-id formats from that system |
| Preference, fact, project, instruction | `memory_category` enum | Closed grant layer above selectors. A pass grants categories. A request still names `{ "predicate" }` selectors. | Their category type names as imported types; predicates stay 0.2 selectors |
| Recall without a pass returns an approval link as normal output, not an error | `policy_decision.decision = needs_approval` (already 0.2) plus companion `approval_handle` | Ask is not read. `needs_approval` is a successful protocol outcome. Handle carries `pass_gap` and optional `user_visible_url`. MUST NOT include denied claim values. | Their approval URL format, tool names, or error-vs-result encoding |
| Approval does not grant read access | Invariant on `memory_update_proposal` commit | Committing a proposal MUST NOT mint or widen a `context_pass`. Read still requires an active pass and a new `context_request`. | Their write-approval records or store-tool semantics |
| Pair exact clients before grants | `client_pairing` | Exact `client_instance` admission. Unpaired clients MUST be `deny` or `needs_approval`. Pairing is not a pass. | Their client registry, metadata URL rules, or admission paths |
| Content-free lifecycle events, separate from deletable content | `lifecycle_event` | Syncable public-of-the-vault log: operation, refs, timestamps. NO claim text. NO payloads. Receipts remain 0.2 evidence. | Their sync wire format or event type names as imported enums |
| Evidence and visibility on stored items | `claim_annotation`; 0.3 field proposals on `context_claim` | `evidence_basis`, `visibility`, `category`, `attribution`. Public profile MUST NOT include vault-only claims. `inferred` MUST NOT be disclosed as `stated_by_user`. | Their item schemas, visibility flags, or inference labels as imported fields |

## How to read this

Left column: informal description of a behavior that existed elsewhere.

Middle: the CL object or invariant. New work is companion objects plus a 0.3-draft note. The five CL-Core-Lite schemas are not extended.

Right: reminder that a crosswalk is not a mapping of on-the-wire types.

If a deployment needs to interoperate with that other system, it MUST do so through an adapter that preserves CL invariants at the vault boundary. That adapter is out of scope here.
