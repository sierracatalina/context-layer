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

NIP-90 is explicitly not a dependency.

## Non-negotiable privacy invariants

1. Matching MUST execute inside the custodian's controlled boundary.
2. A request MUST contain criteria, never exported raw subject context or raw-vault credentials.
3. A result MUST NOT contain raw vault context, private match features, private negative evidence, similarity vectors, rankings, or private match scores.
4. A reveal MUST contain only fields approved for the exact purpose, recipient, actions, and validity window.
5. A purpose code is an exact authorization input. Human-readable purpose text MUST NOT broaden it.
6. Any change to the requester, reveal recipient, purpose code, selectors, requested fields, or requested actions requires a new request and policy decision.
7. Receipts MUST be minimized and MUST contain `"payload_included": false`.
8. Missing identity, ambiguous purpose, expired state, replay conflict, missing required approval, or unavailable required receipt/revocation state MUST fail closed.

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

For every message, the receiver MUST compare the encrypted payload's sender and recipient with the envelope, compare purpose and references with the active request chain, enforce expiry using the rumor time and a documented clock-skew allowance, and reject conflicting duplicates.

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
- `approval`: a signed-in-reveal summary containing a fresh opaque `ref`, `approved_at`, `expires_at`, recipient, purpose, reveal field names, valid actions, and retention;
- `reveal`: the minimum policy-approved fields and values;
- `valid_actions`: the exact actions the reveal may support;
- `retention_seconds`: no longer than the approved request value;
- `single_use`: whether only one action may consume the reveal;
- `revocation_generation`: a positive integer beginning at `1`;
- `receipt_required`;
- `raw_vault_context_included`: exact value `false`;
- `private_match_score_included`: exact value `false`.

Every value in `approval` MUST exactly match the corresponding request and reveal value. The reveal expiry MUST be no later than the request, result, and `approval.expires_at` values. A changed recipient, purpose, field set, action set, or retention period requires new approval; it MUST NOT be patched in transit.

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
  "approval": {
    "ref": "approval-opaque-91d2",
    "approved_at": 1787306500,
    "expires_at": 1787307000,
    "recipient_pubkey": "1111111111111111111111111111111111111111111111111111111111111111",
    "purpose_code": "discover.minimum_reveal",
    "reveal_field_names": [
      "availability_statement",
      "reply_route"
    ],
    "valid_actions": [
      "contact.reply"
    ],
    "retention_seconds": 3600
  },
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
- `revocation_generation` when a reveal is referenced; non-issuer receipts MUST echo the reveal's generation and MUST NOT advance it;
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
5. The request's `requested_reveal_recipient_pubkey` equals the reveal's direct recipient.
6. Request, result, approval, and reveal expiries are monotonically non-increasing and still in the future within documented clock skew. A receipt's processing expiry MAY extend beyond the referenced message, but it MUST NOT authorize a new use of expired state.
7. Causal times satisfy request `created_at` <= result `created_at` <= `approval.approved_at` <= reveal `created_at`; a deployment MUST also reject sender times outside its local freshness window and durations above its published per-message maximum TTL.
8. The selected reveal fields, actions, and retention are subsets of the request and exactly match the signed-in-reveal approval summary.
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

Revocation uses `TBD_RECEIPT` with `operation: "reveal.revoke"`, `outcome: "revoked"`, the target `reveal_event_id`, the exact purpose and recipient, and a `revocation_generation` greater than the reveal generation and any prior issuer-authored revocation generation. Only the reveal issuer may advance this counter or revoke the reveal in this profile; recipient-authored receipts merely echo the generation they processed.

A recipient MUST reject stale or conflicting generations. Once observed, revocation is terminal and its local tombstone MUST be retained through at least the later of the reveal expiry and its approved retention/action-audit window. Expiry or deletion of the revocation message MUST NOT reactivate the reveal; reinstatement requires a newly approved reveal with a new message and event ID. A revocation prevents future conforming retrieval and use after it is observed; it cannot recall plaintext already disclosed, undo an irreversible side effect, force an untrusted relay to delete a wrap, or prove deletion by a compromised recipient.

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

A valid seal proves which Nostr key authored the encrypted message; it does not prove the issuer evaluated policy correctly, obtained meaningful consent, or computed a truthful match. Clients MUST bind trusted custodian keys to subjects out of band and MUST treat the opaque `approval.ref` as a reference, not public proof of consent. The signed-in-reveal approval summary binds scope but does not expose or independently prove the underlying consent record. Key rotation and approval verification need deployment-specific policy.

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
- [NIP-44: Versioned Encrypted Payloads](https://github.com/nostr-protocol/nips/blob/master/44.md)
- [NIP-59: Gift Wrap](https://github.com/nostr-protocol/nips/blob/master/59.md)
- [NIP-90: Data Vending Machine](https://github.com/nostr-protocol/nips/blob/master/90.md) (`draft`, `unrecommended`; not a dependency)
- [NIP-98: HTTP Auth](https://github.com/nostr-protocol/nips/blob/master/98.md) (optional gateway authentication only)
- [Official Nostr event-kind registry](https://github.com/nostr-protocol/registry-of-kinds)
