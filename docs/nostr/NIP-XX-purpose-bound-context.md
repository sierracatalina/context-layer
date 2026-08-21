# NIP-XX: Purpose-Bound Private Context Discovery and Minimum Reveal

`unsubmitted` `discussion-draft` `optional`

- Date: 2026-08-21
- Status: discussion draft only; not submitted to the Nostr NIPs repository
- New event kinds: unassigned (`TBD`)
- Maturity: experimental and subject to incompatible change

## Abstract

This document sketches a use-case-specific Nostr microstandard for asking whether private context satisfies a narrow condition and, only after policy and any required approval, returning the minimum useful reveal. It defines private request, result, approved-reveal, and receipt messages.

The protocol keeps matching inside a context custodian's authority boundary. It never turns a relay, requester, or generic computation marketplace into a raw-context search interface. Raw vault context and private match scores MUST NOT be published or disclosed.

This is not a generic data-vending-machine protocol. NIP-90 is currently marked `draft`, `unrecommended`, and `optional`, and its own warning recommends use-case-specific microstandards. This proposal therefore does not depend on NIP-90 and does not claim any kind in its `5000` through `7000` range.

## Status and terminology

This file is an unsubmitted discussion draft. `NIP-XX` and every `TBD_*` kind name are editorial placeholders, not allocations. NIP-01 requires an on-wire `kind` to be an integer. The examples that use a symbolic kind are intentionally not relay-valid until kinds are registered.

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, and MAY describe the proposed interoperability contract. They do not imply that this draft has been adopted.

The following terms are used:

- **Subject/controller:** the person or authority that controls the private context and its policy.
- **Requester:** the Nostr principal asking a bounded discovery question.
- **Custodian:** the Nostr principal operating the private discovery proxy, policy boundary, and reveal issuer for the subject/controller.
- **Reveal recipient:** the Nostr principal authorized to receive an approved minimum reveal. In this bounded profile it MUST be the requester; third-party recipients are deferred to a future profile.
- **Relay:** an untrusted transport and storage intermediary. A relay is not a policy authority and does not perform private matching.
- **Optional HTTP gateway:** a TLS endpoint that accepts or returns the same encrypted Nostr envelopes. It does not gain raw-vault access merely by being a gateway.

No v0.1 field, approval reference, relay tag, or wrapper construction delegates a reveal to a third party. A future profile may relax the requester-only rule only after it defines an independently testable, issuer-authenticated authorization summary that commits to the third-party recipient and every disclosure bound below. Implementations of this discussion version MUST NOT infer such authority.

## Scope

This microstandard covers one flow:

1. A requester privately sends a purpose-bound discovery request to a known custodian.
2. The custodian evaluates the request against private context inside its controlled boundary.
3. The custodian privately returns a coarse result that contains no raw context, private match features, or private match score.
4. If policy requires approval, the subject/controller approves an exact reveal outside the relay-visible surface.
5. The custodian privately sends that minimum reveal to the authorized recipient.
6. Participants privately exchange minimized receipts for required state changes or actions.

This microstandard does not define:

- generic outsourced computation, provider discovery, bidding, payment, or job chaining;
- a public profile-search or broadcast-query protocol;
- vault storage, raw-vault lookup, policy-engine internals, or approval UI;
- a guarantee that a match is correct or that an authorized recipient deletes plaintext;
- a production security profile, key-recovery scheme, or global purpose registry.

## Dependencies and composition

This proposal composes existing Nostr mechanisms rather than redefining them:

- **NIP-01** supplies event serialization, identifiers, Schnorr signatures, tags, and kind-range semantics.
- **NIP-44 v2** supplies versioned encryption. Version 2 is REQUIRED; version 1 and NIP-04 are not part of this profile.
- **NIP-59** supplies rumors, `kind:13` seals, and `kind:1059` or ephemeral `kind:21059` gift wraps.
- **NIP-98** MAY authenticate requests to an optional HTTP gateway. It is not the relay protocol, disclosure policy, or encrypted message format.
- **RFC 8785 JSON Canonicalization Scheme (JCS)** supplies deterministic encoding for the approval commitment.

NIP-90 is explicitly not a dependency.

## Non-negotiable privacy invariants

1. Matching MUST execute inside the custodian's controlled boundary.
2. A request MUST contain criteria, never exported raw subject context or raw-vault credentials.
3. A result MUST NOT contain raw vault context, private match features, private negative evidence, similarity vectors, rankings, or private match scores.
4. A reveal MUST contain only fields approved for the exact purpose, recipient, actions, and validity window.
5. A purpose code is an exact authorization input. Human-readable purpose text MUST NOT broaden it.
6. In v0.1 the reveal recipient MUST equal the requester. No approval reference or custodian assertion may redirect the reveal to another principal.
7. Any change to the requester, reveal recipient, purpose code, selectors, requested fields, or requested actions requires a new request and policy decision.
8. Receipts MUST be minimized and MUST contain `"payload_included": false`.
9. Missing identity, ambiguous purpose, expired state, replay conflict, missing required approval, or unavailable required receipt/revocation state MUST fail closed.

## Event kinds

Four inner rumor kinds are proposed, with no numbers assigned:

| Symbolic name | Allocation | Meaning |
| --- | --- | --- |
| `TBD_REQUEST` | `TBD` | purpose-bound private discovery request |
| `TBD_RESULT` | `TBD` | coarse private discovery result |
| `TBD_REVEAL` | `TBD` | approved minimum reveal |
| `TBD_RECEIPT` | `TBD` | minimized receipt, including revocation notice |

These messages are immutable facts, not replaceable profiles. Whether four regular inner kinds or one registered kind with a required `message_type` is preferable remains an open registration question.

## Required NIP-59 envelope

Every application message MUST use this construction:

1. Create an unsigned NIP-01 rumor with its calculated `id`, the real sender's `pubkey`, canonical `created_at`, one registered inner kind, empty `tags`, and a compact JSON string in `content`.
2. Encrypt the JSON-encoded rumor to the direct recipient using NIP-44 v2.
3. Put that ciphertext in a signed `kind:13` seal authored by the real sender. Seal tags MUST be empty.
4. Encrypt the JSON-encoded seal to the same direct recipient using NIP-44 v2 and a fresh one-time wrapper key.
5. Put that ciphertext in a signed `kind:1059` gift wrap for asynchronous delivery or `kind:21059` for connected, real-time delivery.
6. Publish only the gift wrap, only to the recipient's selected relays. Discard unencrypted construction material and never publish the rumor or seal directly.

The rumor's `created_at` is canonical for application processing. Seal and gift-wrap timestamps SHOULD be independently moved into the past as described by NIP-59 and MUST NOT be used for application expiry decisions.

Before decrypting, a recipient MUST validate the outer NIP-01 identifier, public key, kind, and signature. After decrypting, it MUST validate the seal identifier and signature before decrypting the rumor. It then MUST:

- recompute the rumor `id` using NIP-01 serialization;
- confirm that the rumor has no `sig`;
- confirm that the rumor `pubkey` equals the seal signer;
- confirm that the rumor kind and decoded `message_type` agree;
- enforce all bindings described below.

Unknown encryption versions, malformed Base64, invalid MACs, invalid signatures, oversized inputs, unexpected fields where strict validation is enabled, and invalid JSON MUST be rejected before any policy evaluation or side effect.

### Strict outer-tag minimization

In this core profile, a gift wrap MUST contain exactly one routing tag:

```json
[["p", "<direct-recipient-pubkey>"]]
```

The seal MUST have `tags: []`, as required by NIP-59. The inner rumor also MUST have `tags: []`; all application fields live in its encrypted `content`.

The core profile forbids outer tags containing an event type, purpose, request or subject identifier, result, status, score, relay URL, application name, contact route, expiry, `e` reference, or `a` reference. Proof-of-work, relay-expiration, or other routing extensions require a separately negotiated profile and MUST be evaluated for metadata leakage. They are not part of this core.

A multi-recipient message MUST be wrapped separately for each recipient. A wrapper key MUST never be reused. Recipients SHOULD use read relays that enforce NIP-42 authentication and only serve `kind:1059` events to the marked `p` recipient.

## Common encrypted payload

Each rumor `content` MUST decode to an object containing:

| Field | Requirement |
| --- | --- |
| `protocol` | exact value `context-layer.nostr/0.1-discussion` for this draft |
| `message_type` | one of `request`, `result`, `approved_reveal`, or `receipt` |
| `message_id` | fresh, opaque, unpredictable identifier with at least 128 bits of entropy |
| `nonce` | fresh 32-byte random value encoded as lowercase hex |
| `sender_pubkey` | exact rumor and seal-author pubkey |
| `recipient_pubkey` | exact direct recipient and outer `p`-tag pubkey |
| `purpose_code` | exact lowercase dotted purpose authorized by policy |
| `created_at` | Unix seconds, exactly equal to the rumor `created_at` |
| `expires_at` | Unix seconds after `created_at`; last time the message may cause new processing |

Identifiers MUST be scoped per relationship or request and MUST NOT be stable subject identifiers. Unknown `purpose_code` values MUST be denied. An implementation MUST NOT authorize a purpose through prefix matching, semantic similarity, or the optional explanatory text.

For every message, the receiver MUST compare the encrypted payload's sender and recipient with the envelope, compare purpose and references with the active request chain, enforce expiry against its local clock and the configured bounds below, and reject conflicting duplicates.

### Local-clock freshness and causal acceptance

Rumor and payload times are sender assertions. They MUST be checked against the receiver's local clock and MUST NOT be treated as fresh merely because a relay delivered them. Each implementation MUST configure, for every message type, a positive `max_ttl_seconds` and a non-negative `max_clock_skew_seconds`. A deployment MAY choose stricter values by purpose. Missing or unbounded values are invalid configuration for processing a new reveal or action.

At first processing, let `local_now` be the receiver's current Unix time. The receiver MUST reject a message unless all of these hold:

1. `created_at` and `expires_at` are integer Unix seconds.
2. `created_at < expires_at`.
3. `expires_at - created_at <= max_ttl_seconds` for that message type.
4. `created_at <= local_now + max_clock_skew_seconds`.
5. `local_now <= expires_at`.
6. `local_now - created_at <= max_ttl_seconds + max_clock_skew_seconds`.

Clock skew is an acceptance tolerance, not an authorization extension. A new reveal or external action MUST NOT begin when the receiver's local clock is later than the applicable reveal or approval expiry. An exact duplicate received later MAY return a previously stored receipt but MUST NOT repeat processing or a side effect. Seal, gift-wrap, relay-observation, and HTTP-gateway times never replace these checks.

References, not timestamps alone, establish causality. A result MUST reference an already accepted request; a reveal MUST reference the already accepted request and result plus a valid approval commitment; and a receipt MUST reference an already accepted target or its retained terminal tombstone. Within one chain, a child `created_at` plus the configured clock-skew allowance MUST NOT precede its parent's `created_at`; `approved_at` plus that allowance MUST NOT precede the result; reveal `created_at` plus that allowance MUST NOT precede `approved_at`; and receipt `occurred_at` plus that allowance MUST NOT precede the referenced operation or message. A timestamp-consistent message with an unknown or conflicting parent MUST still fail closed.

## Private request payload

A `TBD_REQUEST` payload adds:

- `subject_alias`: a per-request or per-relationship opaque alias, never a resolvable vault path;
- `requested_reveal_recipient_pubkey`: the only principal eligible to receive a reveal; in this profile it MUST equal the request sender's pubkey;
- `purpose_text`: optional explanation that cannot broaden `purpose_code`;
- `task`: one bounded discovery class;
- `selectors`: explicit predicates and constraints; wildcards are forbidden;
- `requested_reveal_fields`: an allowlist of minimum-reveal field names;
- `requested_actions`: an allowlist of actions the reveal may support;
- `retention_seconds`: requested recipient retention after reveal;
- `receipt_required`: whether the chain requires receipts;
- optional opaque query-budget proof understood by the custodian.

The request sender, `requested_reveal_recipient_pubkey`, and any later reveal's `requester_pubkey` and `recipient_pubkey` MUST all be the same key in v0.1. A request that names a different reveal recipient is invalid rather than a delegation request.

The request MUST NOT contain subject records, embeddings, private work history, private messages, private graph edges, vault object references, vault credentials, or any other raw private context.

Synthetic decoded example:

```json
{
  "protocol": "context-layer.nostr/0.1-discussion",
  "message_type": "request",
  "message_id": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "nonce": "1010101010101010101010101010101010101010101010101010101010101010",
  "sender_pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
  "recipient_pubkey": "2222222222222222222222222222222222222222222222222222222222222222",
  "purpose_code": "discover.minimum_reveal",
  "purpose_text": "Check availability for one paid prototype engagement",
  "created_at": 1787306400,
  "expires_at": 1787307300,
  "subject_alias": "subject-opaque-7f4c",
  "requested_reveal_recipient_pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
  "task": {
    "class": "opportunity_match"
  },
  "selectors": [
    {
      "predicate": "engagement.type",
      "operator": "equals",
      "value": "paid_prototype"
    }
  ],
  "requested_reveal_fields": [
    "availability_statement",
    "reply_route"
  ],
  "requested_actions": [
    "contact.reply"
  ],
  "retention_seconds": 3600,
  "receipt_required": true
}
```

## Private result payload

A `TBD_RESULT` payload adds:

- `request_event_id`: the exact NIP-01 rumor ID of the request;
- `requested_reveal_recipient_pubkey`: copied exactly from the request;
- `result`: one of `no_match`, `possible_match`, `approval_required`, `denied`, or `budget_exhausted`;
- `reveal_class`: a categorical description of what could be revealed;
- `approved_field_names`: names only, never private values;
- `requires_user_approval`: a boolean;
- `query_budget_state`: optional coarse remaining/reset information;
- `raw_context_included`: exact value `false`;
- `private_match_score_included`: exact value `false`.

A possible match is not approval. The result MUST NOT contain a hidden or rounded score, threshold distance, feature attribution, rejected private facts, candidate ranking, or a resolvable provenance reference. A `no_match` result SHOULD be shaped and timed according to the deployment's inference-resistance policy.

Synthetic decoded example:

```json
{
  "protocol": "context-layer.nostr/0.1-discussion",
  "message_type": "result",
  "message_id": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "nonce": "2020202020202020202020202020202020202020202020202020202020202020",
  "sender_pubkey": "2222222222222222222222222222222222222222222222222222222222222222",
  "recipient_pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
  "purpose_code": "discover.minimum_reveal",
  "created_at": 1787306460,
  "expires_at": 1787307300,
  "request_event_id": "abababababababababababababababababababababababababababababababab",
  "requested_reveal_recipient_pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
  "result": "approval_required",
  "reveal_class": "availability_statement",
  "approved_field_names": [
    "availability_statement",
    "reply_route"
  ],
  "requires_user_approval": true,
  "query_budget_state": {
    "remaining": 3,
    "resets_at": 1787310000
  },
  "raw_context_included": false,
  "private_match_score_included": false
}
```

## Approved reveal payload

A `TBD_REVEAL` payload adds:

- `request_event_id` and `result_event_id`;
- `requester_pubkey` and the already bound direct `recipient_pubkey`;
- `approval_expires_at`: the last Unix second covered by the issuer's approval assertion;
- `approval`: the exact issuer-authenticated authorization summary defined below;
- `approval_commitment`: the lowercase SHA-256 commitment to that summary, encoded as `sha256:<64 lowercase hex characters>`;
- `revocation_generation`: the integer revocation counter bound into this reveal, with exact initial value `1` in v0.1;
- `reveal`: the minimum policy-approved fields and values;
- `valid_actions`: the exact actions the reveal may support;
- `retention_seconds`: no longer than the approved request value;
- `single_use`: whether only one action may consume the reveal;
- `receipt_required`;
- `raw_vault_context_included`: exact value `false`;
- `private_match_score_included`: exact value `false`.

The `approval` object MUST contain exactly these fields and no others:

- `approval_ref`: a fresh opaque identifier scoped to this authorization;
- `request_event_id` and `result_event_id`;
- `issuer_pubkey`: the reveal rumor pubkey and `kind:13` seal signer;
- `requester_pubkey` and `recipient_pubkey`, which MUST be equal in v0.1;
- `purpose_code`;
- `reveal_field_names`: a unique, lexicographically sorted list;
- `valid_actions`: a unique, lexicographically sorted list;
- `retention_seconds`;
- `single_use`;
- `approved_at`;
- `approval_expires_at`.

`approved_at` and `approval_expires_at` MUST be integer Unix seconds. Their difference MUST be positive and no greater than the `max_ttl_seconds` configured for `TBD_REVEAL`; `approved_at` MUST NOT be later than the receiver's local time plus `max_clock_skew_seconds`, and a new reveal or action MUST NOT be accepted after `approval_expires_at`.

To compute `approval_commitment`, construct an object with exactly these four members:

```json
{
  "protocol": "context-layer.nostr/0.1-discussion",
  "approval": "<the exact approval object>",
  "reveal": "<the exact reveal object>",
  "revocation_generation": 1
}
```

The placeholders above stand for the actual JSON objects, not strings. Both objects MUST be valid I-JSON without duplicate property names. Canonicalize this four-member input according to RFC 8785 JCS, SHA-256 hash the resulting UTF-8 bytes, and encode the result as `"sha256:"` followed by the 64-character lowercase hexadecimal digest. The `approval_commitment` field itself is not part of the commitment input. Because the exact reveal object and initial generation are included, changing a disclosed value, field name, authorization bound, or initial revocation state invalidates the commitment.

The receiver MUST verify the issuer-signed `kind:13` seal, authenticated NIP-44 layers, rumor identity, exact approval-object keys, and recomputed commitment before trusting the summary. The seal signature and both authenticated-encryption layers bind the rumor containing this summary; this draft does not invent a nested signature. Every approval value MUST exactly match the corresponding request, result, and reveal value. Top-level `approval_expires_at` MUST equal `approval.approval_expires_at`, MUST be greater than `approved_at`, and MUST be no later than the request and result expiries. Reveal `expires_at` MUST be no later than `approval_expires_at`. The keys of `reveal` MUST exactly equal `approval.reveal_field_names`; the top-level action list, retention, and `single_use` value MUST exactly equal the approval summary. `revocation_generation` MUST be an integer in the inclusive range `1` through `4294967295`, MUST equal `1` on every newly approved v0.1 reveal, and MUST match the value in the commitment input. A changed recipient, purpose, field set or value, action set, retention period, single-use rule, expiry, or initial revocation generation requires a new approval and reveal; it MUST NOT be patched in transit.

Synthetic decoded example:

```json
{
  "protocol": "context-layer.nostr/0.1-discussion",
  "message_type": "approved_reveal",
  "message_id": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "nonce": "3030303030303030303030303030303030303030303030303030303030303030",
  "sender_pubkey": "2222222222222222222222222222222222222222222222222222222222222222",
  "recipient_pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
  "purpose_code": "discover.minimum_reveal",
  "created_at": 1787306520,
  "expires_at": 1787307000,
  "request_event_id": "abababababababababababababababababababababababababababababababab",
  "result_event_id": "bcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbc",
  "requester_pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
  "approval_expires_at": 1787307000,
  "approval": {
    "approval_ref": "approval-opaque-91d2",
    "request_event_id": "abababababababababababababababababababababababababababababababab",
    "result_event_id": "bcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbc",
    "issuer_pubkey": "2222222222222222222222222222222222222222222222222222222222222222",
    "requester_pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
    "recipient_pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
    "purpose_code": "discover.minimum_reveal",
    "reveal_field_names": [
      "availability_statement",
      "reply_route"
    ],
    "valid_actions": [
      "contact.reply"
    ],
    "retention_seconds": 3600,
    "single_use": true,
    "approved_at": 1787306500,
    "approval_expires_at": 1787307000
  },
  "approval_commitment": "sha256:3c96cb23dccd7dc280fdeba7c3aaeee407dd9d3a6bdb37860522a46cddc9b900",
  "reveal": {
    "availability_statement": "Available for one paid prototype engagement in September",
    "reply_route": "reply_to_request"
  },
  "valid_actions": [
    "contact.reply"
  ],
  "retention_seconds": 3600,
  "single_use": true,
  "revocation_generation": 1,
  "receipt_required": true,
  "raw_vault_context_included": false,
  "private_match_score_included": false
}
```

An approved statement is a derived, scoped disclosure. It MUST NOT be accompanied by the raw notes, messages, source documents, embeddings, or private score that produced it.

## Private receipt payload

A `TBD_RECEIPT` payload adds:

- the applicable `request_event_id`, `result_event_id`, or `reveal_event_id` references;
- `operation`: a fixed code such as `request.receive`, `result.receive`, `reveal.consume`, or `reveal.revoke`;
- `outcome`: one of `success`, `denied`, `expired`, `replayed`, `revoked`, `failed`, or `indeterminate`;
- `occurred_at`: Unix seconds;
- `reason_codes`: zero or more non-sensitive categorical codes;
- `revocation_generation` when a reveal is referenced; it MUST be an integer from `1` through `4294967295`; only an authenticated revocation from the reveal issuer may advance stored generation, while every other receipt MUST echo the latest issuer-authored generation exactly;
- optional encrypted `relay_sightings` as defined below;
- `payload_included`: exact value `false`.

Receipts MUST NOT contain the request criteria, result values, reveal values, private scores, raw prompts, raw model output, credentials, authorization headers, or free-form error dumps. A receipt records what a component reported; it does not prove that the match was correct or that an external side effect had no undisclosed consequences.

Synthetic decoded example:

```json
{
  "protocol": "context-layer.nostr/0.1-discussion",
  "message_type": "receipt",
  "message_id": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  "nonce": "4040404040404040404040404040404040404040404040404040404040404040",
  "sender_pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
  "recipient_pubkey": "2222222222222222222222222222222222222222222222222222222222222222",
  "purpose_code": "discover.minimum_reveal",
  "created_at": 1787306600,
  "expires_at": 1787307500,
  "request_event_id": "abababababababababababababababababababababababababababababababab",
  "reveal_event_id": "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
  "operation": "reveal.consume",
  "outcome": "success",
  "occurred_at": 1787306598,
  "reason_codes": [
    "BOUND_RECIPIENT_CONFIRMED",
    "PURPOSE_CONFIRMED"
  ],
  "revocation_generation": 1,
  "relay_sightings": [
    {
      "relay_ref": "relay-opaque-01",
      "wrap_event_id": "dededededededededededededededededededededededededededededededede",
      "observed_at": 1787306570,
      "status": "received"
    }
  ],
  "payload_included": false
}
```

## Purpose, recipient, reference, and expiry binding

The following checks are REQUIRED before a result, reveal, receipt, or action is accepted:

1. `recipient_pubkey` equals the local recipient key and the sole outer `p` value.
2. `sender_pubkey` equals the rumor pubkey and seal signer.
3. `purpose_code` exactly equals the active request's purpose code.
4. The request, result, and reveal event IDs form one known chain.
5. The request sender, requester's `requested_reveal_recipient_pubkey`, reveal `requester_pubkey`, reveal direct recipient, payload recipient, and outer `p` value are the same key in v0.1.
6. Request, result, `approval_expires_at`, and reveal expiries are monotonically non-increasing and satisfy the local-clock and maximum-TTL rules above. A receipt's processing expiry MAY extend beyond the referenced message, but it MUST NOT authorize a new use of expired state.
7. Every referenced parent was already accepted and the chain satisfies the causal-order rules above; timestamps alone do not create a parent relationship.
8. The approval object has exactly the defined fields, its commitment recomputes over the exact approval, reveal, and initial `revocation_generation`, its issuer equals the authenticated reveal issuer, and its recipient, purpose, fields, actions, retention, single-use rule, expiry, and initial generation exactly bind the request and reveal.
9. Every nonce and message ID is fresh for the sender and purpose, or is an idempotent duplicate of the exact same rumor ID.

An outer gift wrap may be re-created or observed on more than one relay. Processing identity is therefore the inner rumor ID, not the outer wrap ID. A different rumor using a previously seen message ID or nonce is a conflict and MUST fail closed.

## Relay sightings

A relay sighting is local evidence that a particular outer wrap was observed at, accepted by, or read from a relay. It is not proof that the application message was decrypted, authorized, understood, or consumed.

Sightings MAY appear only inside encrypted receipt content. Each sighting contains:

- an opaque or keyed-pseudonymous `relay_ref`, not a public raw relay URL by default;
- the outer `wrap_event_id`;
- `observed_at` in Unix seconds;
- a fixed `status` such as `submitted`, `accepted`, `received`, or `rejected`.

A relay `OK` response proves only what that relay reported about the outer event. Clients MUST NOT treat it as an application receipt. Multiple sightings of wraps containing the same rumor MUST be deduplicated at the rumor level. Raw relay topology, IP addresses, authentication challenges, and access tokens MUST NOT be copied into receipts.

## Replay and idempotency

Recipients MUST retain a replay record for each accepted inner rumor ID, message ID, nonce, sender, recipient, and purpose until at least the message expiry plus clock skew. Implementations SHOULD retain longer, privacy-minimized evidence when a reveal authorizes an irreversible action.

- An exact repeat of the same inner rumor MAY return the prior receipt but MUST NOT repeat a side effect.
- The same message ID or nonce with different content MUST be rejected as a replay conflict.
- A single-use reveal MUST move atomically from unconsumed to consumed before its action begins.
- Concurrent processing across devices or relays MUST share a trusted replay boundary or fail closed.
- A missing required receipt store MUST prevent a new sensitive action. If an irreversible action completed but its completion receipt failed, the outcome MUST be reported as `indeterminate`, not rolled back by assertion.

## Revocation

Revocation uses `TBD_RECEIPT` with `operation: "reveal.revoke"`, `outcome: "revoked"`, the target `reveal_event_id`, the exact purpose and recipient, and a `revocation_generation` exactly one greater than the latest issuer-authored generation. The value MUST remain in the inclusive integer range `1` through `4294967295`. The receipt's authenticated rumor and `kind:13` seal signer MUST equal the original reveal issuer. Key similarity, a higher untrusted counter, a skipped generation, or a recipient assertion is not authority to revoke.

For each reveal, a receiver MUST maintain `issuer_revocation_generation`, initialized to the issuer-authenticated reveal's committed value `1`. Only a valid `reveal.revoke` message from that same issuer may replace it, and the replacement MUST equal the stored value plus one. Any receipt from the requester, recipient, relay gateway, or other principal MUST carry exactly the current issuer-authored generation. A lower, higher, skipped, out-of-range, or missing value is invalid and MUST NOT change stored generation or terminal state. If advancing would exceed `4294967295`, the receiver MUST retain terminal revoked state and MUST NOT authorize another use. These rules prevent an attacker from poisoning revocation state by announcing an arbitrarily high generation.

A recipient MUST reject stale or conflicting issuer generations. Once a valid issuer revocation is observed, revocation is terminal. Let `max_action_duration_seconds` be the largest finite, locally configured duration for any action authorized by the reveal. The local tombstone MUST be retained until at least:

```text
max(
  reveal.created_at + reveal.retention_seconds,
  reveal.expires_at + max_clock_skew_seconds + max_action_duration_seconds
)
```

If an authorized action has no finite configured maximum duration, or the receiver cannot durably retain state through that deadline, the tombstone MUST be retained indefinitely or the action MUST fail closed. Expiry or relay deletion of the revocation message MUST NOT reactivate the reveal. After the required tombstone-retention deadline, the reveal's own expired state still cannot authorize new processing. Reinstatement requires a newly approved reveal with a new message and event ID. A revocation prevents future conforming retrieval and use after it is observed; it cannot recall plaintext already disclosed, undo an irreversible side effect, force an untrusted relay to delete a wrap, or prove deletion by a compromised recipient.

Relays are unordered and delivery is not guaranteed. For high-risk or delayed actions, policy SHOULD require a fresh online revocation check with the custodian immediately before use. If that required authority is unavailable, the action MUST fail closed. Public NIP-09 deletion events are not application revocation receipts and SHOULD NOT be used when they would expose recipient or relationship metadata.

## Synthetic envelope illustration

All repeated-character values below are synthetic and are not real keys or signatures. `TBD_REQUEST` is an editorial placeholder, so the rumor example is not valid for relay publication.

Decoded unsigned rumor shape:

```json
{
  "id": "abababababababababababababababababababababababababababababababab",
  "pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
  "created_at": 1787306400,
  "kind": "TBD_REQUEST",
  "tags": [],
  "content": "<compact JSON request payload>"
}
```

Relay-visible asynchronous gift-wrap shape:

```json
{
  "id": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "pubkey": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "created_at": 1787299200,
  "kind": 1059,
  "tags": [
    [
      "p",
      "2222222222222222222222222222222222222222222222222222222222222222"
    ]
  ],
  "content": "<NIP-44-v2 ciphertext containing a signed kind-13 seal>",
  "sig": "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
}
```

Only `kind`, the one-time wrapper pubkey, perturbed wrapper time, ciphertext size, wrapper event ID, signature, and direct-recipient `p` tag are relay-visible. Recipient relay selection, network metadata, and traffic timing can still leak information.

## Optional NIP-98 HTTP gateway

A deployment MAY expose an HTTPS gateway for clients that cannot connect directly to relays. The request and response bodies MUST still carry the same NIP-59 gift wraps. The gateway MUST NOT accept unwrapped raw context, result, reveal, or receipt payloads.

NIP-98 MAY authenticate the HTTP caller. For a request with a body, this profile elevates body binding to a requirement: the client MUST include the lowercase-hex SHA-256 `payload` tag and the gateway MUST verify it, in addition to NIP-98's exact absolute URL, method, signature, and freshness checks. Private payloads, NIP-98 events, and credentials MUST NOT be placed in URL query strings or application logs.

NIP-98 authenticates an HTTP request; it does not authorize a purpose, approve a reveal, provide end-to-end secrecy, prevent replay by itself, or replace NIP-44 and NIP-59 validation.

## Security and privacy considerations

### Metadata and traffic analysis

NIP-59 hides the real sender at the outer layer, but the relay still sees the recipient `p` tag, wrapper time, event size, relay account or AUTH session, connection IP, and traffic pattern. NIP-44 padding provides limited length hiding. Implementations SHOULD batch, delay, pad at the application level where justified, use recipient-selected AUTH-protected relays, and avoid stable timing or identifier patterns.

### NIP-44 limits and key handling

NIP-44 does not by itself provide deniability, forward secrecy, or post-compromise security and does not hide IP addresses or timestamps. Clients MUST validate signed NIP-01 events before decryption, use fresh cryptographic nonces and one-time wrapper keys from a CSPRNG, compare authentication data in constant time, zero secret key material when practical, and reject oversized data before expensive decoding or allocation.

### Discovery-oracle abuse

Repeated yes/no or coarse-result requests can reconstruct private attributes. Rate limits MUST account for requester identity, subject alias, purpose, semantic similarity, result pattern, time window, and coordinated clients, not only byte-identical requests or IP addresses. Deployments MAY use budgets, uniform responses, batching, delay, thresholds, or privacy-preserving matching appropriate to their threat model.

### Approval and issuer trust

A valid seal proves which Nostr key authored the encrypted message; it does not prove the issuer evaluated policy correctly, obtained meaningful consent, or computed a truthful match. Clients MUST bind trusted custodian keys to subjects out of band and MUST treat `approval.approval_ref` and `approval_commitment` as an issuer assertion, not public proof of consent. The exact commitment makes scope tampering detectable but does not expose or independently prove the underlying consent record. Key rotation, subject-controller approval evidence, and delegated approval verification need deployment-specific policy.

### Context and prompt injection

Approved reveal text is untrusted data. It MUST NOT expand its own purpose, recipient, actions, tools, retention, or receipt rules and MUST NOT be interpreted as executable agent instructions merely because a trusted custodian sent it.

### Receipts as sensitive data

Even content-free receipts expose relationships, timing, purposes, action classes, and behavior. Receipt storage and disclosure need independent access, retention, deletion, and export policy. Hashes of low-entropy values can enable guessing; use opaque identifiers or keyed commitments where the verifier model permits them.

### Availability, deletion, and compromise

Relays may delay, omit, duplicate, retain, or reorder wraps. Expiration is a processing rule, not proof of relay deletion. Revocation cannot claw back disclosed plaintext. A compromised requester, recipient, custodian, device, policy engine, or approval surface can defeat the boundary it controls. This microstandard reduces disclosure surface; it does not create a complete security system.

## Registration and open questions

Before any submission or interoperable relay test:

1. Decide whether to register four regular inner kinds or one kind plus `message_type`.
2. Select provisional integer kinds in the appropriate NIP-01 semantic range, check the current official kind registry for collisions, and avoid the NIP-90 `5000` through `7000` range.
3. Replace every `TBD_*` token only after that review; do not ship string-valued kinds.
4. Define a versioned JSON Schema, unknown-field behavior, numeric bounds, maximum encrypted/decrypted sizes, and canonical test vectors.
5. Decide whether `purpose_code` uses a small shared registry, collision-resistant `x.<domain>.*` extensions, or both.
6. Specify custodian discovery and trusted-key rotation without creating a public subject directory.
7. Specify how approval authority and delegated reveal issuance are verified across devices.
8. Define cross-device replay state, receipt durability, revocation freshness, and offline failure behavior.
9. Decide whether a separate metadata-leaking extension may add proof-of-work or outer expiration tags.
10. Produce at least two independent client implementations and, where relay behavior is claimed, interoperable relay evidence before requesting standardization.

Open design questions include whether a future profile may support reveal recipients other than requesters, whether one-time reveals need a shared online consume service, how relay aliases are canonicalized without correlation, and which inference defenses can be tested without exposing private match internals.

## References

- [NIP-01: Basic protocol flow description](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-09: Event Deletion Request](https://github.com/nostr-protocol/nips/blob/master/09.md) (not an application revocation mechanism)
- [NIP-13: Proof of Work](https://github.com/nostr-protocol/nips/blob/master/13.md) (excluded from the core wrapper profile)
- [NIP-42: Authentication of clients to relays](https://github.com/nostr-protocol/nips/blob/master/42.md)
- [NIP-44: Versioned Encrypted Payloads](https://github.com/nostr-protocol/nips/blob/master/44.md)
- [NIP-59: Gift Wrap](https://github.com/nostr-protocol/nips/blob/master/59.md)
- [NIP-90: Data Vending Machine](https://github.com/nostr-protocol/nips/blob/master/90.md) (`draft`, `unrecommended`; not a dependency)
- [NIP-98: HTTP Auth](https://github.com/nostr-protocol/nips/blob/master/98.md) (optional gateway authentication only)
- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785.html) (approval commitment encoding)
- [Official Nostr event-kind registry](https://github.com/nostr-protocol/registry-of-kinds)
