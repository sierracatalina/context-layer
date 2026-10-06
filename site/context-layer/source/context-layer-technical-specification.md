# Context Layer Protocol

## Draft Technical Specification v0.2

| Field | Value |
| --- | --- |
| Status | Working Draft - not an adopted standard |
| Version identifier | `context-layer/0.2-draft` |
| Date | 2026-08-17 |
| Editors' target | Reviewable core contract for implementation and interoperability experiments |

## Change log

- 2026.08.17 · v0.2 draft · purpose codes, Lite profile, expires_at unification

## Abstract

The Context Layer is an application-layer protocol for exchanging purpose-bound context between a user-controlled context vault and external applications, agents, models, discovery systems, and user interfaces. It defines source and provenance records, context requests, policy decisions, scoped context bundles, proposed memory updates, and operation receipts.

The protocol's central invariant is that a consumer receives an approved bundle rather than unrestricted raw-vault access. The specification is transport-neutral. An HTTP binding and adapter guidance are defined as profiles; existing transports and domain protocols retain their own semantics.

This document defines the target contract. The current project is an interactive demonstrator and does not yet implement the complete protocol.

## 1. Requirements language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14/) when, and only when, they appear in all capitals.

Normative requirements apply only to an implementation claiming conformance with the named profile. Descriptive text and examples are informative unless explicitly labeled normative.

## 2. Status and scope

### 2.1 In scope

This draft specifies:

- The trust boundary between a context vault and a context consumer
- Stable envelopes for source events, derived claims, context requests, policy decisions, scoped context bundles, discovery results, proposed memory updates, and receipts
- The lifecycle for outbound context, inbound discovery, and memory writeback
- Minimum policy inputs and disclosure constraints
- Provenance and expiry requirements
- A transport-neutral core and an optional HTTP binding
- Conformance roles and failure behavior
- Security and privacy requirements that are specific to context movement

### 2.2 Protocol boundary

Context Layer governs the context exchange: purpose-bound requests, policy decisions, scoped bundles, receipts, and proposed writeback. It composes with deployment-selected transport, identity, authentication, cryptography, storage, source authorization, and payment systems.

A conforming deployment MUST preserve source permissions and select identity, encryption, key-management, storage, audit, and redaction controls appropriate to its threat model. Conformance does not imply legal compliance or correct model output.

## 3. Design goals and invariants

A conforming implementation MUST preserve these invariants:

1. **No ambient raw-vault access.** A context consumer MUST NOT receive an unrestricted vault query interface as the default exchange mechanism.
2. **Purpose-bound requests.** Every disclosure MUST be tied to an authenticated requester, declared purpose, recipient, requested scope, and validity window.
3. **Reducible scope.** A policy engine MUST be able to grant a strict subset of a request.
4. **Provenance continuity.** Every disclosed derived claim MUST contain or reference enough provenance to identify its supporting source records within the authority boundary.
5. **Expiry.** Every scoped bundle MUST have an explicit expiration time or a single-use constraint. The `CL-Core-Lite` profile requires both a finite `expires_at` and `single_use: true`.
6. **Non-escalation.** A consumer MUST NOT infer permission for fields, tools, actions, retention, or onward disclosure that are absent from a bundle.
7. **Proposed writeback.** Agent-generated memory MUST enter as a proposal unless an explicit policy grants automatic commit for that exact proposal class.
8. **Receipted sensitive operations.** A required receipt path MUST be available before a sensitive operation begins. An implementation MUST NOT report success until its completion receipt is durable.
9. **Minimum reveal for discovery.** External matching MUST return only policy-approved result fields and MUST NOT expose private match features or scores unless explicitly granted.
10. **Native-protocol preservation.** Adapters MUST preserve security-relevant semantics from the source protocol rather than flattening them into unauthenticated text.

## 4. Architecture

### 4.1 Components

| Component | Responsibility | Trust position |
| --- | --- | --- |
| Capture adapter | Convert native source material into source events and provenance | May cross from an external or untrusted system into the vault boundary |
| Normalizer | Map source-specific shapes into stable typed records | Inside the vault boundary |
| Extractor | Derive claims, entities, relations, summaries, and contradictions | Inside the vault boundary |
| Context vault | Store private source records, derived context, identities, policies, and receipt references | User-controlled authority boundary |
| Policy engine | Evaluate requester, purpose, scope, recipient, action, consent, retention, and receipt requirements | Trusted decision point |
| Semantic proxy | Redact, alias, compress, transform, and route outbound context | Boundary enforcement point |
| Discovery proxy | Evaluate external matching requests and produce minimum-reveal responses | Inbound boundary enforcement point |
| Bundle issuer | Assemble immutable, short-lived, task-specific context | Trusted issuer |
| Context consumer | Use a bundle in an app, agent, model, workflow, or UI | Outside or separately sandboxed from the vault |
| Receipt store | Persist logically append-only operation evidence | Trusted evidence service; may be separately administered |
| Approval surface | Obtain and record a person's approval when required | Trusted user-interaction boundary |

One process MAY implement several components, but logical responsibilities and authorization checks MUST remain separable and testable.

### 4.2 Trust zones

The minimum deployment model contains three zones:

1. **Vault zone:** raw sources, private claims, identity bindings, policy, and keys.
2. **Controlled exchange zone:** policy engine, proxies, bundle issuer, and receipt writer.
3. **Consumer or untrusted zone:** external apps, remote agents, public discovery systems, relays, models, and UI plug-ins.

The consumer MAY be locally operated and still be treated as a separate trust zone. Process locality is not proof of authorization.

### 4.3 Core flow

```text
native source
  -> capture + source tagging
  -> normalize + deduplicate
  -> extract claims + provenance
  -> user-controlled vault
  -> authenticated ContextRequest
  -> PolicyDecision
  -> semantic or discovery proxy
  -> ScopedContextBundle or MinimumRevealResponse
  -> consumer action
  -> Receipt
  -> optional MemoryUpdateProposal
  -> validation + approval + commit receipt
```

## 5. Terminology

**Subject**
The person, organization, project, device, or other principal whose context is governed. The subject may be represented by a deployment-local pseudonymous identifier.

**Source event**
An immutable or versioned record of an observed native event plus origin metadata. It is evidence, not automatically a fact.

**Claim**
A typed statement derived from one or more source events. A claim has provenance, confidence, validity, and status.

**Vault**
The authority boundary that stores and governs source events, claims, summaries, identities, policies, and receipts. "User-owned" refers to control and delegation, not necessarily physical device location.

**Context request**
A request for specific context for a named purpose, recipient, task, retention period, and action set.

**Policy decision**
The versioned outcome of evaluating a request against identity, consent, sensitivity, purpose, recipient, action, expiry, and receipt rules.

**Semantic proxy**
The outbound enforcement component that produces the least-context representation allowed by policy.

**Discovery proxy**
The inbound enforcement component that evaluates an external query against private context and returns a minimum-reveal result.

**Scoped context bundle**
An immutable, expiring packet of approved context, provenance, instructions, capabilities, restrictions, and receipt requirements.

**Receipt**
A logically append-only record of a request, decision, transform, disclosure, model call, tool call, external action, or memory operation.

**Memory update proposal**
A candidate addition, change, contradiction, or retraction that has not yet been committed as durable context.

## 6. Common representation rules

### 6.1 Serialization

The core representation is [JSON](https://www.rfc-editor.org/info/rfc8259/) encoded as UTF-8.

Every top-level object MUST contain:

| Field | Type | Requirement |
| --- | --- | --- |
| `spec_version` | string | MUST equal a supported protocol identifier such as `context-layer/0.2-draft` |
| `type` | string | MUST identify the object type |
| `id` | string | MUST be unique within the issuing authority |
| `created_at` | string | MUST be an RFC 3339 timestamp |
| `issuer` | object | MUST identify the issuing component or authority |

Identifiers SHOULD be opaque URIs such as `urn:cl:bundle:019...`. Identifiers MUST NOT embed email addresses, names, access tokens, raw content, or other unnecessary private data.

Timestamps MUST use [RFC 3339](https://www.rfc-editor.org/info/rfc3339/) format and SHOULD be normalized to UTC. Implementations MUST preserve the original timestamp and timezone when they are material to the source.

### 6.2 Media type

This draft uses `application/vnd.context-layer+json` as an experimental media-type string. It is not IANA registered. Production interoperability work MUST either register an appropriate media type or negotiate a deployment-specific type without misrepresenting registration status.

### 6.3 Extension fields

The five CL-Core-Lite object schemas in this draft are closed: implementations MUST reject unknown top-level fields. Version `0.2-draft` does not define portable `extensions` or `required_extensions` members.

An experimental profile MAY publish a derived schema with a collision-resistant namespace, but an object using that profile is not a core `0.2-draft` object unless the profile is explicitly negotiated. A future specification revision may define optional and required extension negotiation; implementations MUST NOT silently treat unknown fields as authorized extensions before then.

### 6.4 Integrity

Objects MAY include an `integrity` object with a digest, canonicalization method, and signature reference. A signature MUST cover the protocol version, object type, identifier, issuer, timestamps, and all security-relevant fields.

This draft does not mandate a signing suite. Deployments MUST define canonical serialization and key verification before claiming cryptographically verifiable receipts or bundles.

## 7. Core data objects

The examples in this section use synthetic values and omit optional fields for readability.

### 7.1 `source_event`

A `source_event` records evidence captured from a native source.

Required fields:

- `subject_ref`
- `occurred_at` or an explicit `occurred_at_unknown: true`
- `captured_at`
- `source.adapter`
- `source.native_id_ref` or `source.native_id_digest`
- `payload_ref`
- `classification`
- `provenance`

```json
{
  "spec_version": "context-layer/0.2-draft",
  "type": "source_event",
  "id": "urn:cl:event:evt_1042",
  "created_at": "2026-08-12T14:31:04Z",
  "issuer": { "id": "urn:cl:adapter:email-local" },
  "subject_ref": "vault://subjects/primary",
  "occurred_at": "2026-08-12T14:30:55Z",
  "captured_at": "2026-08-12T14:31:04Z",
  "source": {
    "adapter": "email",
    "account_ref": "vault://accounts/work-mail",
    "native_id_digest": "sha256:EXAMPLE"
  },
  "payload_ref": {
    "ref": "vault://objects/message-1042",
    "media_type": "message/rfc822"
  },
  "classification": ["private", "communications"],
  "provenance": [{ "kind": "direct_capture", "confidence": 1.0 }]
}
```

The event envelope SHOULD reference raw payload stored inside the vault rather than duplicate sensitive payload into every index. A capture adapter MUST preserve native signatures, event identifiers, authorization context, and deletion markers when the source protocol provides them.

### 7.2 `context_claim`

A `context_claim` is a typed statement supported by source events or other claims.

Required fields:

- `subject_ref`
- `predicate`
- `object`
- `status`
- `confidence`
- `provenance_refs`
- `validity`

```json
{
  "spec_version": "context-layer/0.2-draft",
  "type": "context_claim",
  "id": "urn:cl:claim:deadline-1042",
  "created_at": "2026-08-12T14:31:10Z",
  "issuer": { "id": "urn:cl:extractor:commitments-v2" },
  "subject_ref": "vault://projects/launch",
  "predicate": "requested_delivery_date",
  "object": { "value": "2026-08-14", "datatype": "date" },
  "status": "derived",
  "confidence": 0.93,
  "validity": { "from": "2026-08-12T14:30:55Z", "expires_at": null },
  "provenance_refs": ["urn:cl:event:evt_1042"]
}
```

Valid `status` values are `asserted`, `derived`, `disputed`, `superseded`, and `retracted`. A contradiction MUST NOT be resolved by silently deleting the losing branch. The resolution SHOULD identify which claim supersedes another and why.

### 7.3 `context_request`

A `context_request` asks the vault to release or use context.

Required fields:

- `subject_ref`
- `requester`
- `recipient`
- `purpose_code`
- `task`
- `selectors`
- `requested_actions`
- `retention`
- `receipt_requirement`
- `expires_at`

```json
{
  "spec_version": "context-layer/0.2-draft",
  "type": "context_request",
  "id": "urn:cl:request:req_701",
  "created_at": "2026-08-12T14:33:00Z",
  "issuer": { "id": "urn:agent:reply-drafter" },
  "subject_ref": "vault://subjects/primary",
  "requester": {
    "principal": "urn:agent:reply-drafter",
    "authenticated_by": "oauth2",
    "client_instance": "urn:device:local-workstation"
  },
  "recipient": {
    "principal": "urn:model:configured-drafting-model",
    "onward_disclosure": "forbidden"
  },
  "purpose_code": "draft.response",
  "purpose": "draft a response to the launch-timeline request",
  "task": { "kind": "draft_only", "user_visible": true },
  "selectors": [
    { "predicate": "requested_delivery_date" },
    { "predicate": "requesting_stakeholder" }
  ],
  "requested_actions": ["model.generate_text", "email.create_draft"],
  "retention": { "mode": "ephemeral", "max_seconds": 86400 },
  "receipt_requirement": { "level": "operation", "required": true },
  "expires_at": "2026-08-12T14:38:00Z"
}
```

In request and decision receipt requirements, `level` and `required` MUST agree: `none` requires `required: false`, while `decision` and `operation` require `required: true`. All other pairings are invalid.

`purpose_code` is the normative policy input. Optional `purpose` text is informative and MUST NOT broaden authorization beyond the registered code. A request MUST NOT use wildcards for selectors or actions unless a separate policy explicitly permits that wildcard for the requester and subject.

#### 7.3.1 Purpose code registry

The v0.2 core registry is deliberately small:

| Code | Intended use |
| --- | --- |
| `draft.response` | Draft a response without sending it |
| `summarize.material` | Summarize supplied or authorized material |
| `retrieve.context` | Retrieve approved context for a declared task |
| `plan.task` | Produce a plan without executing side effects |
| `execute.approved_action` | Execute an action already covered by explicit approval |
| `discover.minimum_reveal` | Evaluate discovery while returning only approved fields |
| `propose.memory_update` | Submit a proposal for later validation and approval |

Core codes are lowercase dotted names. Deployment extensions MUST use a collision-resistant lowercase namespace beginning with `x.`, for example `x.example.review.contract`. An unknown code MUST be denied unless policy lists the exact code. Implementations MUST NOT authorize a purpose by prefix matching, semantic similarity, or inference from optional `purpose` text.

### 7.4 `policy_decision`

A `policy_decision` records the result of evaluating a context request.

Required fields:

- `request_ref`
- `decision`
- `policy_snapshot`
- `granted_selectors`
- `denied_selectors`
- `granted_actions`
- `denied_actions`
- `transform_requirements`
- `retention`
- `onward_disclosure`
- `receipt_requirement`
- `expires_at`
- `reason_codes`

Valid decisions are:

- `allow`
- `allow_with_reductions`
- `deny`
- `needs_approval`

```json
{
  "spec_version": "context-layer/0.2-draft",
  "type": "policy_decision",
  "id": "urn:cl:decision:dec_701",
  "created_at": "2026-08-12T14:33:01Z",
  "issuer": { "id": "urn:cl:policy-engine:local" },
  "request_ref": "urn:cl:request:req_701",
  "decision": "allow_with_reductions",
  "policy_snapshot": {
    "version": "personal-policy/42",
    "digest": "sha256:d12c2f24d4cb6a6b45014e3d355ad50a2e1492670635c9c2783e81e3684283bb"
  },
  "granted_selectors": [
    { "predicate": "requested_delivery_date" },
    { "predicate": "requesting_stakeholder" }
  ],
  "denied_selectors": [{ "predicate": "confidential-budget" }],
  "granted_actions": ["model.generate_text", "email.create_draft"],
  "denied_actions": ["email.send"],
  "transform_requirements": ["redact:confidential-budget", "compress:task-facts"],
  "retention": { "mode": "ephemeral", "max_seconds": 86400 },
  "onward_disclosure": "forbidden",
  "receipt_requirement": { "level": "operation", "required": true },
  "expires_at": "2026-08-12T14:38:00Z",
  "reason_codes": ["PURPOSE_ALLOWED", "SCOPE_REDUCED", "SEND_NOT_APPROVED"]
}
```

A decision MUST reference the exact policy snapshot evaluated. A later policy change MUST NOT silently broaden an already-issued decision or bundle.

### 7.5 `scoped_context_bundle`

A `scoped_context_bundle` is the only standard object through which a general context consumer receives disclosed context.

Required fields:

- `subject_alias`
- `request_ref`
- `decision_ref`
- `recipient`
- `purpose_code`
- `issued_at`
- `expires_at`
- `single_use` with the exact value `true` for `CL-Core-Lite`
- `context`
- `provenance`
- `instructions`
- `capabilities`
- `restrictions`
- `receipt_contract`

```json
{
  "spec_version": "context-layer/0.2-draft",
  "type": "scoped_context_bundle",
  "id": "urn:cl:bundle:ctxb_209",
  "created_at": "2026-08-12T14:33:02Z",
  "issuer": { "id": "urn:cl:bundle-issuer:local" },
  "subject_alias": "urn:cl:alias:subject-for-req-701",
  "request_ref": "urn:cl:request:req_701",
  "decision_ref": "urn:cl:decision:dec_701",
  "recipient": "urn:model:configured-drafting-model",
  "purpose_code": "draft.response",
  "purpose": "draft a response to the launch-timeline request",
  "issued_at": "2026-08-12T14:33:02Z",
  "expires_at": "2026-08-12T14:38:00Z",
  "single_use": true,
  "context": [
    {
      "claim": "The launch timeline was requested by Friday.",
      "predicate": "requested_delivery_date",
      "value": "2026-08-14",
      "confidence": 0.93,
      "provenance_handles": ["prov_1"]
    }
  ],
  "provenance": {
    "prov_1": {
      "kind": "opaque_vault_reference",
      "ref": "urn:cl:provenance:opaque-1042"
    }
  },
  "instructions": ["Draft only", "Do not send", "Do not infer budget status"],
  "capabilities": ["model.generate_text", "email.create_draft"],
  "restrictions": {
    "onward_disclosure": "forbidden",
    "memory_write": "proposal_only",
    "raw_vault_resolution": "forbidden",
    "retention_seconds": 300
  },
  "receipt_contract": {
    "required": true,
    "required_operations": ["bundle.consume", "model.call", "email.create_draft"]
  }
}
```

The bundle MUST NOT contain resolvable raw-vault credentials. A provenance handle exposed to a consumer SHOULD be opaque and SHOULD require a separate authorized request to resolve. Consumers MUST stop using a bundle after expiry and SHOULD delete cached material according to the retention contract.

Bundles SHOULD be immutable. A change in scope, context, actions, or expiry SHOULD create a new bundle with a reference to the prior bundle.

### 7.6 `minimum_reveal_response`

A discovery proxy returns a `minimum_reveal_response`.

Required fields:

- `request_ref`
- `result`
- `reveal`
- `requires_user_approval`
- `query_budget_state`
- `expires_at`

```json
{
  "spec_version": "context-layer/0.2-draft",
  "type": "minimum_reveal_response",
  "id": "urn:cl:discovery-result:mr_88",
  "created_at": "2026-08-12T15:00:00Z",
  "issuer": { "id": "urn:cl:discovery-proxy:local" },
  "request_ref": "urn:cl:discovery-request:dr_88",
  "result": "possible_match",
  "reveal": {
    "statement": "Available for a paid prototype engagement",
    "contact_route": "approval_required"
  },
  "requires_user_approval": true,
  "query_budget_state": { "remaining": 4, "window_ends_at": "2026-08-12T16:00:00Z" },
  "expires_at": "2026-08-12T15:15:00Z"
}
```

The response MUST NOT expose private match features, raw similarity scores, or negative evidence unless policy explicitly grants them. Implementations MUST rate-limit and correlate semantically similar queries, not only byte-identical requests.

### 7.7 `memory_update_proposal`

A `memory_update_proposal` carries a candidate change without granting durable truth status.

Required fields:

- `subject_ref`
- `operation`
- `proposed_claims`
- `provenance_refs`
- `rationale`
- `submitted_by`
- `status`
- `approval_requirement`
- `expires_at`

```json
{
  "spec_version": "context-layer/0.2-draft",
  "type": "memory_update_proposal",
  "id": "urn:cl:proposal:mup_17",
  "created_at": "2026-08-12T15:12:00Z",
  "issuer": { "id": "urn:agent:reply-drafter" },
  "subject_ref": "vault://projects/launch",
  "operation": "add_or_contradict",
  "proposed_claims": [
    {
      "predicate": "requested_delivery_date",
      "object": { "value": "2026-08-13", "datatype": "date" },
      "confidence": 0.55
    }
  ],
  "provenance_refs": [],
  "rationale": "The latest conversation may imply Thursday, but no source was captured.",
  "submitted_by": "urn:agent:reply-drafter",
  "status": "pending_validation",
  "approval_requirement": ["source_required", "user_confirm"],
  "expires_at": "2026-08-13T15:12:00Z"
}
```

An implementation MUST NOT commit a proposal lacking required provenance or approval. Rejection and expiry MUST be recorded without deleting the proposal's audit history when policy requires that history.

### 7.8 `receipt`

A `receipt` records a security-relevant operation.

Required fields:

- `operation`
- `actor`
- `subject_ref` or a policy-approved alias
- `request_ref` and/or `decision_ref` when applicable
- `bundle_ref` when applicable
- `started_at`
- `completed_at`
- `outcome`
- `policy_snapshot`
- `input_digest`
- `output_digest`
- `user_summary`

```json
{
  "spec_version": "context-layer/0.2-draft",
  "type": "receipt",
  "id": "urn:cl:receipt:rcpt_812",
  "created_at": "2026-08-12T15:13:02Z",
  "issuer": { "id": "urn:cl:receipt-writer:local" },
  "operation": "semantic_proxy.redact",
  "actor": "urn:cl:semantic-proxy:local",
  "subject_ref": "urn:cl:alias:subject-for-req-701",
  "request_ref": "urn:cl:request:req_701",
  "decision_ref": "urn:cl:decision:dec_701",
  "bundle_ref": "urn:cl:bundle:ctxb_209",
  "started_at": "2026-08-12T15:13:01Z",
  "completed_at": "2026-08-12T15:13:02Z",
  "outcome": "success",
  "policy_snapshot": "sha256:d12c2f24d4cb6a6b45014e3d355ad50a2e1492670635c9c2783e81e3684283bb",
  "input_digest": "sha256:9236d81bdff6b52fd2a51b455332f2454feff22544471d57bd1e928498cb56b7",
  "output_digest": "sha256:64983d082c66338e0231cca68110160043e79ef13f792c1ff6c043846fedea09",
  "user_summary": "Removed confidential budget context before creating the drafting bundle.",
  "payload_included": false
}
```

Receipts MUST NOT contain secrets, raw authorization headers, model API keys, full private prompts, or raw source payloads. The receipt contract exposes an optional nullable `supersedes_ref` field. A correction MUST be represented by a new receipt with `supersedes_ref` set to the exact receipt URN of the prior record. A non-correction receipt MAY omit `supersedes_ref` or set it to `null`.

## 8. Protocol lifecycles

### 8.1 Ingestion lifecycle

1. Authenticate or classify the native source.
2. Capture a source event and native integrity metadata.
3. Classify sensitivity before broad indexing.
4. Normalize into stable event fields.
5. Deduplicate while retaining every provenance path.
6. Extract claims with confidence and validity.
7. Detect contradictions and preserve branches.
8. Store source and derived records under vault policy.
9. Write ingestion receipts where policy requires them.

An untrusted source MUST NOT be promoted to a trusted claim solely because a model summarized it confidently.

### 8.2 Outbound context lifecycle

1. Authenticate the requester and bind it to a client instance where possible.
2. Validate the request schema, expiry, purpose, recipient, and requested actions.
3. Evaluate policy against a versioned snapshot.
4. Obtain human approval when required.
5. Resolve only granted selectors.
6. Apply required redaction, aliasing, compression, and routing.
7. Assemble and optionally sign an immutable bundle.
8. Deliver the bundle to the named recipient.
9. Receive operation receipts from the consumer or trusted gateway.
10. Expire and revoke the bundle according to policy.

Any change to recipient, purpose, action, or requested scope MUST trigger a new decision.

### 8.3 Inbound discovery lifecycle

1. Authenticate or classify the requester.
2. Enforce request, identity, semantic, and time-window rate limits.
3. Validate that the query purpose is eligible for private matching.
4. Evaluate the query inside the vault or controlled exchange zone.
5. Apply minimum-reveal policy.
6. Require approval before exposing a contact route or sensitive attribute.
7. Return an expiring response.
8. Write a receipt including query class, requester, decision, and reveal class.

Discovery systems SHOULD add noise, thresholds, batching, or other privacy defenses when repeated aggregate results could reveal private features. This draft does not mandate one privacy-preserving matching algorithm.

### 8.4 Memory writeback lifecycle

1. Accept a proposal, not a direct mutation, from a consumer.
2. Validate schema and submitter authority.
3. Require source references for factual claims unless policy marks the claim type as subjective or explicitly source-free.
4. Compare with current claims and detect contradictions.
5. Calculate any required confidence or trust signals.
6. Obtain approval according to claim sensitivity and automation policy.
7. Commit, reject, or expire the proposal.
8. Write a receipt and preserve supersession links.

Automatic commit MAY be enabled only for narrowly defined, low-risk proposal classes with explicit policy and rollback behavior.

## 9. Policy evaluation

### 9.1 Mandatory policy inputs

The policy engine MUST evaluate at least:

- Authenticated requester and client instance
- Subject and delegated authority
- Recipient and onward-disclosure status
- Registered `purpose_code` and task class, plus optional explanatory purpose text
- Requested selectors and sensitivity labels
- Requested actions and side-effect class
- Retention and bundle expiry
- Applicable consent or approval state
- Source trust and claim confidence where material
- Receipt availability and required receipt level
- Current rate limits and anomaly state

### 9.2 Decision properties

Policy decisions MUST be deterministic with respect to their recorded inputs and policy snapshot, except for explicitly identified external signals such as risk scores. When nondeterministic or time-varying signals are used, the decision MUST record their values or stable references.

Policies SHOULD deny by default when:

- Requester identity cannot be verified to the required assurance level
- `purpose_code` is absent, unknown, or not authorized for the requester
- Recipient is ambiguous
- Requested scope uses an unauthorized wildcard
- Consent or approval is missing
- Retention exceeds policy
- A required receipt service is unavailable
- The request or bundle has expired
- An untrusted discovery requester exceeds its query budget

### 9.3 Human approval

An approval surface MUST show, in user-readable form:

- Who is asking
- What context categories will be disclosed
- Why they are requested
- Which recipient will receive them
- Which actions may occur
- How long access lasts
- Whether onward disclosure is permitted
- What evidence will be written

Approval identifiers MUST be single-use or bound to the exact request digest. A changed request MUST invalidate the prior approval.

### 9.4 Writeback isolation

Consumer writeback MUST enter the authority boundary as a `memory_update_proposal`. A Core consumer MUST NOT receive a direct raw-vault mutation capability. Validation, contradiction handling, approval, commit, and the resulting receipt remain distinct authority-side operations. A future companion profile MAY define those authority-side operations, but it MUST preserve proposal-only submission at the consumer boundary.

## 10. Optional HTTP binding

The Context Layer core is transport-neutral. This section defines an experimental HTTP profile using [HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html).

### 10.1 Transport requirements

- Production endpoints MUST use HTTPS with current TLS guidance.
- Clients and servers MUST authenticate according to the deployment's identity profile.
- OAuth deployments SHOULD follow [OAuth 2.0 Security Best Current Practice, RFC 9700](https://www.rfc-editor.org/info/rfc9700/).
- Bearer tokens MUST be audience-restricted and least-privilege.
- Credentials MUST NOT appear in URLs.
- Mutating requests SHOULD support an `Idempotency-Key` header.
- Requests MUST include `Context-Layer-Version: 0.2-draft` or negotiate an equivalent version.
- Request and response bodies use `application/vnd.context-layer+json` for this experimental profile.

### 10.2 Capability document

An implementation MAY expose a capability document at:

```http
GET /.well-known/context-layer
```

This path is an unregistered draft convention. The response should list protocol versions, roles, endpoint URLs, supported object types, auth metadata, extensions, receipt capabilities, maximum bundle lifetime, and conformance report location.

### 10.3 Suggested resource endpoints

| Method and path | Purpose |
| --- | --- |
| `POST /context/v1/requests` | Submit a context request |
| `GET /context/v1/requests/{id}` | Read request status as an authorized principal |
| `POST /context/v1/requests/{id}/decisions` | Record a policy or approval decision; restricted to trusted decision roles |
| `GET /context/v1/bundles/{id}` | Retrieve an authorized bundle, preferably once or with strong replay controls |
| `POST /context/v1/bundles/{id}/receipts` | Submit a consumer operation receipt |
| `POST /context/v1/discovery` | Submit a discovery request |
| `POST /context/v1/memory-proposals` | Submit a proposed memory update |
| `GET /context/v1/receipts/{id}` | Retrieve a receipt subject to receipt privacy policy |

These paths are a draft binding, not globally registered endpoints.

The following minimal [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0) fragment is informative. It illustrates schema reuse without defining authentication or deployment-specific error policy:

```yaml
openapi: 3.1.0
info:
  title: Context Layer Core Lite
  version: 0.2-draft
paths:
  /context/v1/requests:
    post:
      operationId: submitContextRequest
      requestBody:
        required: true
        content:
          application/vnd.context-layer+json:
            schema:
              $ref: https://sierracatalina.com/context-layer/implementation/context-request.schema.json
      responses:
        "201":
          description: Policy decision recorded
          content:
            application/vnd.context-layer+json:
              schema:
                $ref: https://sierracatalina.com/context-layer/implementation/policy-decision.schema.json
```

### 10.4 Status and error behavior

Recommended HTTP statuses:

- `200 OK`: synchronous successful read or decision result
- `201 Created`: request, bundle, proposal, or receipt created
- `202 Accepted`: asynchronous evaluation or approval pending
- `400 Bad Request`: invalid syntax or schema
- `401 Unauthorized`: authentication absent or invalid
- `403 Forbidden`: authenticated principal lacks permission
- `404 Not Found`: unknown object or intentionally concealed existence
- `409 Conflict`: idempotency conflict, stale policy, or contradictory state transition
- `410 Gone`: expired or revoked bundle
- `413 Content Too Large`: payload exceeds limits
- `415 Unsupported Media Type`: unsupported representation
- `422 Unprocessable Content`: valid syntax with invalid protocol semantics
- `429 Too Many Requests`: rate or query budget exceeded
- `503 Service Unavailable`: required policy, approval, vault, or receipt component unavailable

Error bodies MUST use a stable machine code and a safe user message. They MUST NOT expose policy internals, private match features, secrets, stack traces, or raw upstream responses.

```json
{
  "spec_version": "context-layer/0.2-draft",
  "type": "error",
  "id": "urn:cl:error:err_44",
  "created_at": "2026-08-12T16:00:00Z",
  "issuer": { "id": "urn:cl:gateway:local" },
  "code": "BUNDLE_EXPIRED",
  "message": "The scoped context bundle is no longer valid.",
  "retryable": false
}
```

### 10.5 `CL-Core-Lite` profile

`CL-Core-Lite` is the smallest v0.2 implementation profile intended for interoperable experiments. A conforming implementation MUST:

- Validate the v0.2 `context_request`, `policy_decision`, `scoped_context_bundle`, `memory_update_proposal`, and `receipt` contracts
- Support `allow`, `allow_with_reductions`, `deny`, and `needs_approval`
- Authorize the exact registered or explicitly extended `purpose_code`; optional purpose text is never an authorization input
- Require every scoped bundle to carry a finite `expires_at` and `single_use: true`, and reject expired or replayed bundles
- Bind every decision to the exact policy snapshot and every bundle to its request, decision, and recipient
- Keep raw vault objects and resolvable vault credentials outside consumer bundles
- Accept consumer memory writeback only as a proposal
- Produce the receipts required by the request and decision before reporting success

Lite conformance does not imply production security, adoption as a standard, or conformance with the optional discovery, adapter, signature, or network deployment profiles.

## 11. Security and privacy requirements

### 11.1 Authentication and authorization

Authentication proves a principal; policy authorizes a context use. Implementations MUST keep those decisions distinct.

- Every network requester MUST be authenticated or explicitly assigned an `untrusted_anonymous` class.
- Tokens MUST be validated for issuer, audience, expiry, and required scope.
- A service MUST NOT pass a client token through to an unrelated downstream service.
- Local HTTP servers SHOULD bind to loopback and require a per-launch authorization token or equivalent process boundary.
- Browser endpoints MUST validate origin and CSRF defenses where credentials or session creation are involved.
- Static public assets MUST be separated from credential-bearing session endpoints in production.

### 11.2 Secret handling

- Long-lived provider credentials MUST remain server-side or in platform-appropriate secure storage.
- Credentials MUST NOT be embedded in bundles, receipts, HTML, mobile binaries, source-control archives, logs, prompts, or query strings.
- Client-facing realtime or model sessions SHOULD use short-lived, narrowly scoped client credentials when the provider supports them.
- Credential rotation and revocation MUST be operationally documented.

### 11.3 Data minimization

- Source payloads SHOULD remain inside the vault.
- Bundles MUST contain only fields granted by the decision.
- Provenance exposed outside the vault SHOULD use opaque handles.
- Logs and metrics MUST avoid raw context unless separately authorized.
- Receipts SHOULD use digests and categories rather than duplicate sensitive content.

### 11.4 Prompt and content injection

Captured content is untrusted data, even when it came from a known account. Implementations MUST prevent source content from becoming executable agent instructions merely because it appears in retrieved context.

Bundles SHOULD separate:

- Facts and source quotations
- System or policy instructions
- User instructions
- Tool manifests
- Untrusted content

Consumers MUST NOT allow a source document to expand its own permissions, tools, retention, or recipient list.

### 11.5 Semantic transformation risk

Redaction and summarization can fail. High-risk deployments SHOULD combine deterministic field-level policy with semantic transforms and MUST test for under-redaction, indirect identifiers, reconstruction, and context leakage.

The semantic proxy SHOULD report which transformations ran and their confidence. A policy MAY require human review when a transform cannot establish sufficient confidence.

### 11.6 Discovery inference

Rate limiting by requester IP alone is insufficient. Discovery implementations SHOULD account for requester identity, semantic similarity, target subject, result pattern, time window, and coordinated clients.

Negative responses can reveal information. Deployments MAY return uniform responses, add delay, batch approvals, or use privacy-preserving matching techniques according to threat model.

### 11.7 Revocation and deletion

Bundle revocation cannot guarantee deletion by an already-compromised recipient. Implementations MUST state this limitation. Revocation MUST prevent future authorized retrieval and use within conforming components.

Source deletion MUST propagate according to legal, user, and provenance requirements. Receipts MAY need to retain non-content evidence after source deletion, but such retention MUST be explicit and minimized.

### 11.8 Receipt privacy

Receipts create a second sensitive dataset. They can reveal relationships, timing, tools, models, and behavior even when payloads are omitted. Receipt access MUST have independent policy, retention, export, and deletion rules.

### 11.9 Availability and fail-closed behavior

When the policy engine, approval surface, key verifier, or required receipt store is unavailable before an operation, sensitive disclosure MUST fail closed. Implementations MAY permit explicitly defined low-risk offline operations using a cached, unexpired policy snapshot.

If an irreversible external side effect succeeds but its completion receipt cannot be stored, the implementation MUST report the result as indeterminate, retry the receipt idempotently, and block dependent actions. It MUST NOT claim that the external side effect was rolled back merely because receipt persistence failed.

## 12. Interoperability rules

Adapters MUST:

- Declare the native protocol and adapter version
- Preserve native identifiers or collision-resistant digests
- Preserve original and capture timestamps
- Preserve signatures, verification status, deletion markers, and authorization context when available
- Map source trust and visibility explicitly
- Avoid converting untrusted content into trusted instructions
- Document lossy transformations
- Support deterministic export fixtures for conformance testing

Consumers MUST:

- Validate bundle version, issuer, recipient, expiry, and integrity before use
- Enforce capability and action allowlists
- Treat missing permissions as denied
- Isolate untrusted context from control instructions
- Produce required receipts
- Delete or make inaccessible expired context according to the retention contract
- Submit proposed memory updates through the protocol rather than direct vault writes

See [Implementation and Interoperability Profiles](context-layer-implementation-and-interoperability.md) for protocol-specific mappings.

## 13. Conformance profiles

An implementation may claim one or more roles.

### 13.1 `CL-Core-Issuer`

Must implement:

- `context_request` validation
- Versioned `policy_decision`
- Scope reduction
- `scoped_context_bundle` issuance
- Expiry and recipient binding
- Required receipt contract
- Raw-vault isolation tests

### 13.2 `CL-Core-Consumer`

Must implement:

- Bundle validation
- Capability and restriction enforcement
- Expiry handling
- Required receipts
- Proposal-only memory writeback
- Context deletion or inaccessibility after expiry

### 13.3 `CL-Discovery`

Must implement:

- Authenticated or explicitly classified discovery requests
- Query budgets and semantic probe correlation
- Private evaluation
- Minimum-reveal responses
- Approval escalation
- Discovery receipts

### 13.4 `CL-Memory`

Must implement:

- Source events and derived claims
- Provenance continuity
- Contradiction and supersession handling
- Memory update proposals
- Approval and commit receipts

### 13.5 `CL-Receipt-Store`

Must implement:

- Logical append-only semantics
- Correction by supersession
- Integrity and ordering strategy
- Independent receipt access policy
- Secret and payload minimization
- Export and verification tooling

### 13.6 `CL-Adapter`

Must document:

- Native protocol and version
- Inbound and outbound mapping
- Authentication boundary
- Lossy fields
- Trust and visibility mapping
- Deletion and edit behavior
- Test fixtures

## 14. Required conformance tests

Every claimed role MUST publish machine-readable test results for applicable cases.

Minimum tests include:

1. Reject an expired request.
2. Reject a bundle addressed to another recipient.
3. Reduce a request containing one allowed and one denied selector.
4. Prove that denied source payload text is absent from the serialized bundle.
5. Preserve provenance for each disclosed derived claim.
6. Reject an unauthorized action even when an instruction string asks for it.
7. Fail closed when a required receipt path is unavailable before execution; report and recover an indeterminate outcome when an irreversible action succeeds but completion-receipt persistence fails.
8. Reject replay of a single-use bundle.
9. Keep a memory update as pending when required provenance is missing.
10. Preserve contradictory claims rather than overwrite them silently.
11. Rate-limit semantically equivalent discovery probes.
12. Ensure errors and receipts contain no credentials or raw private payloads.
13. Round-trip each adapter fixture without losing documented security-relevant fields.
14. Verify that logs do not contain access tokens, API keys, or raw vault objects.

A test that merely confirms valid JSON is insufficient evidence of policy or privacy conformance.

## 15. Versioning

Objects carry an explicit `spec_version`. Implementations MUST reject unsupported major versions. A compatible minor version MUST NOT change the meaning of existing required fields or weaken an invariant.

Draft identifiers are unstable. Production data SHOULD NOT be committed to `0.2-draft` schemas without a migration plan.

Schema evolution rules:

- Additive optional fields MAY be introduced in a compatible minor version.
- Required fields MUST NOT be added without a new major version or negotiated required extension.
- Enum values MAY be added only where consumers are required to handle unknown values safely.
- Security-sensitive default changes require a major version.
- Deprecation MUST include an alternative and a migration window.

## 16. Implementation status of this repository

As of 2026-08-21, the public project provides:

- Five v0.2 JSON schemas for requests, decisions, bundles, memory proposals, and receipts
- A dependency-free reference module with deterministic reduction, validation, transforms, and minimized receipts
- An experimental single-user local core with an AES-256-GCM vault, four-state policy evaluation, Ed25519-signed bundle envelopes over RFC 8785 canonical JSON, and an authenticated append-only receipt log
- One narrow UTF-8 files adapter and one local-agent consumer as conformance evidence
- Synthetic positive and negative fixtures, a minimized demo, and SHA-bound test vectors
- A reviewed v0.2 technical specification and informative implementation profiles
- An unsubmitted Nostr interoperability discussion draft

It does **not** currently provide:

- A production context vault
- A production policy engine or approval service
- A portable third-party signature suite, managed key custody, or hostile-administrator protection
- Production source adapters or consumer integrations for the listed external protocols
- An independent conformance program or security certification
- A hardened multi-user network service
- A completed iOS client

The local Ed25519 envelope and receipt anchor demonstrate integrity inside the tested single-user profile. Envelopes carry `algorithm: "Ed25519"`, `kid`, and `sig` so recipients can verify bundles independently with the issuer's public key; legacy HMAC bundles are readable only behind an explicit opt-in and are never written. This remains an experimental profile: managed key custody, hardware-rooted audit, and hostile-administrator protection are still absent. The files adapter, local consumer, and HTML demo use synthetic data and MUST NOT be treated as production integrations.

## 17. Open design questions

The next specification revision needs decisions on:

- Canonical JSON and signature suite
- Identifier and pseudonym rotation strategy
- Standard sensitivity and purpose vocabularies
- Policy language and delegation model
- Receipt ordering, transparency, and selective disclosure
- Bundle revocation and consumer attestation
- Privacy-preserving discovery algorithms and leakage budgets
- Portable encrypted provenance references
- Cross-device vault sync and recovery
- Deletion propagation across derived claims and receipts
- User-readable consent and receipt UX requirements
- Registration of media types and well-known metadata
- Governance, change control, and an independent conformance process

## 18. Normative and informative references

### 18.1 Normative foundations for this draft

- [BCP 14: RFC 2119 and RFC 8174](https://www.rfc-editor.org/info/bcp14/)
- [RFC 8259: JSON](https://www.rfc-editor.org/info/rfc8259/)
- [RFC 3339: Internet timestamps](https://www.rfc-editor.org/info/rfc3339/)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 8446: TLS 1.3](https://www.rfc-editor.org/info/rfc8446/)
- [RFC 9700: OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/info/rfc9700/)

### 18.2 Informative interoperability references

- [ActivityPub](https://www.w3.org/TR/activitypub/)
- [AT Protocol](https://atproto.com/specs/atp)
- [Nostr NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [Matrix specification](https://spec.matrix.org/latest/)
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
- [Agent2Agent Protocol](https://a2a-protocol.org/latest/)
- [IPFS concepts](https://docs.ipfs.tech/concepts/)
- [IPFS privacy and encryption](https://docs.ipfs.tech/concepts/privacy-and-encryption/)
- [OpenAI Realtime API with WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [x402 documentation](https://docs.x402.org/introduction)
