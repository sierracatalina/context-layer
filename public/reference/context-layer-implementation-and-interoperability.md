# Context Layer Implementation and Interoperability Profiles

| Field | Value |
| --- | --- |
| Status | Working Draft - informative companion to the technical specification |
| Date | 2026-08-12 |
| Applies to | `context-layer/0.2-draft` |
| Primary audience | Application architects, adapter authors, agent developers, mobile and web teams, security reviewers |

## 1. Purpose

This document explains how to implement the Context Layer draft with existing sources, transports, agent protocols, models, storage systems, and user interfaces.

It uses **adapter compatibility** as a precise term:

> A system is adapter-compatible when its native objects and security metadata can be mapped to Context Layer objects without violating the core invariants.

Adapter compatibility does not imply that an adapter exists in this repository, that two vendors have tested interoperability, or that the Context Layer is part of the external protocol's official specification.

The current repository is a static interactive demonstrator with synthetic data and a local presentation voice server. The profiles below define a target for implementation.

## 2. Where the Context Layer fits

The Context Layer should be implemented as a control and representation layer above existing protocols:

```text
sources and networks
  HTTP | email | files | ActivityPub | AT Protocol | Nostr | Matrix | devices
        |
        v
capture adapters -> normalize -> extract -> user-controlled vault
        |
        v
ContextRequest -> policy -> semantic/discovery proxy -> ScopedContextBundle
        |
        v
MCP tools/resources | A2A tasks | models | workflows | web/iOS/voice UI
        |
        v
receipts + proposed memory updates
```

Existing protocols remain authoritative for transport, native identity, signatures, federation, and domain behavior. The Context Layer adds a user-owned decision about what private context may cross into those systems.

## 3. Deployment profiles

### 3.1 Personal local-first profile

**Audience:** an individual using local agents and selected cloud services.

**Topology:**

- Vault, policy engine, semantic proxy, and receipt store run on a trusted personal device or private home service.
- Source adapters ingest selected local files, browser events, mail, calendars, or messages.
- Local agents connect through process-local IPC or authenticated loopback endpoints.
- Cloud model requests receive short-lived scoped bundles.
- Writeback requires approval by default.

**Required controls:**

- Operating-system credential storage
- Encrypted vault at rest
- Loopback-only local HTTP by default
- Per-client or per-launch authorization
- Explicit source onboarding
- Clear bundle and writeback approval surfaces
- Backup and recovery separate from application caches

This is the recommended first implementation profile because it keeps the trust boundary small and testable.

### 3.2 Organization or team profile

**Audience:** a company or team that needs shared project context with individual and organizational boundaries.

**Topology:**

- Separate personal, team, and organization-owned subjects and vault partitions
- Central identity and authorization with purpose-aware policy
- Shared receipt service with independent access policy
- Remote agents and tools connected through authenticated gateways
- Administrative policy layered beneath, not silently replacing, user or data-owner consent where required

**Additional requirements:**

- Tenant isolation
- Delegation and revocation
- Service identities and workload authentication
- Data-region and retention policy
- Administrative and user-visible receipts
- Export, legal hold, deletion, and incident response procedures
- Policy simulation before deployment

### 3.3 Federated discovery profile

**Audience:** marketplaces, social discovery, opportunity matching, community recommendations, or cross-organization agent discovery.

**Topology:**

- External systems submit narrow discovery requests.
- A discovery proxy evaluates requests inside the subject's private boundary.
- Results use minimum reveal and expiring contact routes.
- Higher-detail exchange requires a second policy decision and often user approval.

**Additional requirements:**

- Strong requester identity or explicit anonymous classification
- Semantic query budgets and coordinated-probe detection
- Response uniformity where negative results could leak private attributes
- Abuse reporting and requester revocation
- Receipts for queries and reveals
- A clear distinction between public profile data and private match features

## 4. Compatibility matrix

| System or category | Context Layer role | Mapping | Current repository state | Primary caveat |
| --- | --- | --- | --- | --- |
| HTTP + TLS | Network binding | Carry requests, bundles, receipts, and adapter traffic over authenticated HTTPS | Linked as official references; no complete Context Layer API | HTTP transports data but does not supply purpose policy |
| Email | Source adapter and action target | Message becomes `source_event`; draft/send are separate capabilities | Synthetic email flow only | Mailbox access is broader than permission to disclose every message |
| Files and browser clips | Source adapters | File metadata and content references become source events | Synthetic examples only | Preserve origin, MIME type, path privacy, and integrity |
| Audio and voice notes | Source adapter | Media reference plus transcript and confidence | Synthetic examples; separate Realtime voice presentation demo | Transcript is derived data and must retain media provenance |
| ActivityPub | Social source and outbound adapter | ActivityStreams object and delivery metadata map to source/provenance; outbound posts require action policy | Reference link only | Federated content is untrusted input and HTML must be sanitized |
| AT Protocol | Social source and outbound adapter | DID, repo record, CID, Lexicon type, and verification map to source/provenance | Reference link only | Public repositories are not a private vault |
| Nostr | Signed-event source and discovery channel | Event ID, pubkey, kind, tags, signature, and relay sightings map to source/provenance | Reference link and discovery illustration only | Relay visibility and key custody require separate policy |
| Matrix | Messaging source and action adapter | Event ID, room, sender, origin timestamp, state relation, and auth context map to source/provenance | Reference link only | Room history and encryption state must not be flattened away |
| IPFS | Content-addressed reference and artifact transport | CID may identify encrypted/public bundle artifacts or receipt batches | Reference link only | Public IPFS does not make unencrypted content private |
| MCP | Agent-to-tool/resource bridge | Approved bundles exposed as resources; context requests and actions exposed as tools | Bundle mentions MCP manifests; no production server | MCP authorization does not replace Context Layer purpose policy |
| A2A | Agent-to-agent task transport | Bundle carried as structured task data or artifact; remote agent bound as recipient | Reference link only | Remote agent retention and onward disclosure must be explicit |
| Local/cloud models | Context consumers | Prompt or model input assembled only from a scoped bundle | Illustrative runtime references | Provider retention and logging remain part of recipient policy |
| OpenAI Realtime | Voice or multimodal consumer | WebRTC session receives scoped instructions and context through a backend | Public site uses browser speech controls; no vault access | Standard API keys must remain server-side and the demo is not hardened production infrastructure |
| Web UI | Approval and consumption surface | Show bundle provenance, permissions, expiry, actions, and receipts | Multiple static interactive demos exist | Static demos do not enforce policy |
| iOS/mobile | Approval and consumption surface | Native app consumes bundles and short-lived sessions; credentials use platform storage | Not implemented | Never embed provider API keys in an app binary |
| x402 | Optional payment condition | Request or action can reference a payment requirement and payment receipt | Reference link only | Payment does not grant context permission |

## 5. Generic adapter contract

Every adapter should have an adapter manifest:

```json
{
  "adapter_id": "com.example.context-layer.matrix",
  "adapter_version": "0.1.0",
  "native_protocol": "matrix",
  "native_protocol_versions": ["v1.x"],
  "directions": ["capture", "action"],
  "object_mappings": ["source_event", "receipt"],
  "auth_profile": "oauth2-or-access-token",
  "preserves": [
    "event_id",
    "room_id",
    "sender",
    "origin_server_ts",
    "relation",
    "encryption_state"
  ],
  "lossy_fields": [],
  "test_fixtures": "fixtures/matrix/"
}
```

### 5.1 Capture requirements

An inbound adapter MUST:

1. Verify native signatures or authentication when the native protocol supports them.
2. Record verification outcome separately from source content.
3. Preserve a native identifier or its collision-resistant digest.
4. Preserve source, capture, edit, and deletion times.
5. Preserve visibility and audience semantics.
6. Classify external content as untrusted data.
7. Store raw payload inside the vault or an approved encrypted object store.
8. Emit a source event referencing that payload.
9. Document fields lost during normalization.
10. Avoid triggering outbound actions during capture.

### 5.2 Action requirements

An outbound adapter MUST:

1. Receive a valid scoped bundle addressed to its runtime.
2. Enforce the exact allowed action.
3. Obtain step-up approval for side effects when required.
4. Avoid substituting broader native credentials for narrower bundle permissions.
5. Record the native transaction identifier and outcome.
6. Write the required receipt before reporting final success.
7. Return any new observations as proposals, not direct vault mutations.

### 5.3 Edit and deletion behavior

Adapters MUST document whether the native system supports edits, redactions, deletions, tombstones, or immutable events. A normalized event MUST NOT be silently rewritten when a native record changes. The adapter SHOULD append a new event or version that references the prior record.

## 6. Source profiles

### 6.1 HTTP APIs and webhooks

[HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) is the default transport for many adapters.

Recommended mapping:

- Target URI and method -> source operation metadata
- Authenticated principal -> source actor
- Provider event ID or idempotency key -> native identifier
- `Date` and provider timestamps -> source time fields
- `ETag`, digest, or signature -> integrity metadata
- Content type -> payload media type
- Response status -> capture or action outcome

Webhook endpoints MUST validate provider signatures where available, enforce content limits, reject replay, and rate-limit before parsing expensive content. Server-side request forgery defenses are required when captured payloads contain fetchable URLs.

### 6.2 Email

Email capture should preserve:

- Message-ID and thread references
- Envelope sender and recipient separately from display headers
- Original date and received-chain metadata
- MIME structure and attachments
- Authentication results when available
- Account and folder source
- User-applied labels

An agent capability such as `email.create_draft` is distinct from `email.send`. A bundle granting draft creation MUST NOT authorize send, forward, mailbox search, or attachment access unless listed separately.

### 6.3 Files and local workspace data

File adapters should preserve:

- Stable file identity where the platform provides one
- Original path as a vault-private field
- File name, media type, size, modification time, and digest
- Source repository or workspace
- Version-control commit when applicable
- Access-control context

Bundles should expose an opaque file handle, excerpt, derived claim, or approved copy rather than an unrestricted local path. A consumer must not use path traversal or symlink resolution to escape the granted workspace.

### 6.4 Audio and transcripts

Audio should be modeled as a media source event. A transcript is a derived artifact with:

- Model or service identifier
- Language
- Timing segments when available
- Confidence
- Speaker-attribution status
- Link to the source media
- Redaction state

Transcript text MUST NOT be represented as direct human assertion when it was produced by automatic speech recognition.

### 6.5 ActivityPub

[ActivityPub](https://www.w3.org/TR/activitypub/) defines client-to-server and server-to-server social activity using ActivityStreams 2.0.

Mapping guidance:

- Activity or Object `id` -> native identifier
- `actor` -> source actor
- `published`, `updated` -> source times
- `to`, `cc`, `bto`, `bcc`, `audience` -> native visibility metadata
- Activity type -> source event type
- Object content -> untrusted payload
- Delivery inbox/outbox -> source route

Adapters MUST sanitize active content, preserve audience semantics, handle recursive objects defensively, and rate-limit federation traffic. A public ActivityPub object is evidence from an external source, not automatically a trusted claim.

### 6.6 AT Protocol

[AT Protocol](https://atproto.com/specs/atp) provides DID-based identity, self-authenticating repositories, content-addressed records, XRPC, and Lexicon schemas.

Mapping guidance:

- DID -> native principal
- Handle -> mutable display identifier, not the stable identity
- Record URI and CID -> native object identity and integrity
- Lexicon NSID -> source schema type
- Repository commit and signature verification -> provenance
- Firehose or subscription sequence -> capture ordering

AT Protocol repositories contain public account records. They should be treated as a source or publication target, not as storage for raw private vault content. Context Layer extensions for AT Protocol should use properly governed Lexicons rather than inventing conflicting fields.

### 6.7 Nostr

[NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) defines signed Nostr events distributed through relays.

Mapping guidance:

- Event `id` -> native identifier and content digest
- `pubkey` -> source principal
- `created_at` -> source time
- `kind` -> native event type
- `tags` -> typed native metadata
- `sig` and verification outcome -> integrity metadata
- Relay URL and first-seen time -> provenance sighting

One event received from several relays should normally become one canonical source event with several relay sightings, not several independent facts. Deletion requests are protocol events and do not guarantee that every relay removed prior content.

Private context MUST NOT be published to public relays by default. Key custody and signing approval remain separate action-policy concerns.

### 6.8 Matrix

The [Matrix Client-Server API](https://spec.matrix.org/latest/client-server-api/) uses JSON over HTTP for clients to send events and synchronize room history.

Mapping guidance:

- `event_id` -> native identifier
- `room_id` -> native context container
- `sender` -> source actor
- `origin_server_ts` -> source time
- Event `type` and state key -> native schema and state identity
- Relation metadata -> edit, reply, thread, or replacement relationship
- Encryption and decryption status -> source trust metadata

Adapters MUST preserve room visibility, membership context, encryption state, redaction, and replacement relationships. A decrypted event remains private according to room and user policy; decryption is not permission to forward it to a model.

### 6.9 IPFS and content-addressed storage

[IPFS](https://docs.ipfs.tech/concepts/how-ipfs-works/) identifies content by CID and can transport content-addressed files or DAGs.

Safe Context Layer uses include:

- Public schema documents
- Encrypted bundle artifacts where key distribution is separately controlled
- Content digests for exported receipt batches
- Public conformance fixtures
- Portable non-sensitive documentation

Unsafe default uses include:

- Raw private source events
- Unencrypted context bundles
- Direct personal identifiers
- Secrets or capability tokens
- Sensitive receipt logs

[IPFS privacy documentation](https://docs.ipfs.tech/concepts/privacy-and-encryption/) notes that public network metadata and unencrypted content can be exposed. A CID verifies content identity; it does not create confidentiality, authorization, deletion, or guaranteed persistence.

## 7. Agent and model profiles

### 7.1 Model Context Protocol

[MCP](https://modelcontextprotocol.io/specification/2025-11-25) standardizes connections between AI hosts and resources, prompts, and tools.

Recommended mapping:

| Context Layer concept | MCP representation |
| --- | --- |
| Approved bundle | Read-only MCP resource with expiring authorization, or structured tool result |
| Context request | MCP tool such as `request_context` with a narrow JSON schema |
| User approval | Host-controlled elicitation or separate approval surface |
| Action capability | Separate MCP tool with explicit input schema and scope |
| Proposed writeback | Tool such as `propose_memory_update`, never an unrestricted storage resource |
| Receipt | Structured tool result plus durable Context Layer receipt |

MCP servers that expose user-specific data should use its authorization framework and security guidance. Context Layer policy remains an additional resource-use decision. An OAuth token proving access to an MCP server does not by itself authorize every vault field or purpose.

The host should keep bundle facts separate from tool descriptions and untrusted resource content. Tool calls must remain allowlisted by the bundle even if the model requests another tool.

### 7.2 Agent2Agent Protocol

[A2A](https://a2a-protocol.org/latest/) defines communication and task collaboration between independent agents.

Recommended mapping:

- A2A Agent Card -> requester or recipient capability metadata
- A2A Task -> Context Layer task reference
- A2A structured DataPart -> scoped bundle or bundle reference
- A2A Artifact -> generated output governed by bundle action and retention policy
- A2A task status -> operation receipt input
- Remote agent identity -> bundle recipient

The bundle should be encrypted for and bound to the intended remote agent or trusted gateway. A remote agent must not forward bundle contents to sub-agents or tools unless onward disclosure and those recipients are granted.

A2A and MCP are complementary: A2A connects agents to agents; MCP connects AI hosts to tools and resources. Context Layer constrains the private context carried into either relationship.

### 7.3 Direct model API

For a direct local or cloud model call:

1. Validate the bundle.
2. Build the prompt from `context`, `instructions`, `capabilities`, and `restrictions` as separate sections.
3. Include only approved facts and source excerpts.
4. Record the exact model/provider category, not a secret credential.
5. Apply provider retention and region behavior as recipient-policy inputs.
6. Restrict tool calling to bundle capabilities.
7. Validate model output before an external action.
8. Write a model-call receipt with safe digests and token or cost metadata as permitted.
9. Convert suggested new facts to memory proposals.

Model context windows, embeddings, and vector retrieval are implementation details. They do not define authorization.

### 7.4 OpenAI Realtime voice profile

The [OpenAI Realtime WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc) describes browser or mobile WebRTC connection setup through a developer-controlled backend or short-lived client credential.

Recommended Context Layer flow:

1. The UI requests a voice-capable bundle for a named task.
2. Policy grants the required facts, tools, duration, and audio behavior.
3. A backend creates a short-lived Realtime session; the standard provider key stays server-side.
4. Session instructions contain the bundle's approved context and restrictions.
5. Tool calls route through policy-aware backend handlers.
6. Transcripts are classified and captured only when consent and retention policy permit.
7. Session creation, model calls, tools, and any writeback proposals create receipts.
8. The session and bundle expire together or the earlier expiry wins.

The public demonstrator uses browser speech controls and an optional server-side protocol guide. It does not connect to a production vault or provide evidence of a conforming Realtime voice profile. Any future Realtime implementation must add public-user authentication, durable abuse controls, policy-aware tool handlers, explicit consent, and receipt behavior before deployment.

## 8. User interface profiles

### 8.1 Required authority state

Any approval or action surface should expose:

- Current subject or vault
- Requester and recipient
- Purpose
- Context categories, with sensitive categories highlighted
- Allowed and denied actions
- Expiration
- Whether onward disclosure is allowed
- Whether memory writeback is disabled, proposed, or approved
- Receipt status
- Provenance access appropriate to the user

Interfaces must not rely on color alone for policy state.

### 8.2 Self-assembling UI

A bundle may include surface hints:

```json
{
  "surface_hints": {
    "data_shapes": ["deadline", "people", "timeline"],
    "preferred_surfaces": ["summary_card", "timeline", "draft_editor"],
    "required_controls": ["provenance", "edit", "approve"],
    "forbidden_controls": ["send_without_approval"]
  }
}
```

Surface hints are not executable code. A renderer must map them to trusted components from an allowlisted design system. Generated markup, scripts, and remote component URLs should not be accepted from untrusted bundles.

### 8.3 Web profile

- Keep approvals and receipts in first-class views, not hidden settings.
- Use accessible focus, keyboard, and screen-reader behavior.
- Avoid rendering untrusted source HTML without sanitization.
- Keep secrets and standard provider credentials off the client.
- Use strict Content Security Policy and origin checks for privileged routes.
- Make expiry and revoked state visible.

### 8.4 iOS and mobile profile

An iOS client can act as an approval surface, context consumer, capture adapter, or local vault host.

Recommended boundaries:

- Store OAuth tokens and local encryption keys using platform-secure facilities.
- Never embed a standard model-provider API key in the app.
- Request short-lived provider sessions from an authenticated backend.
- Use per-feature OS permissions and explain which source adapter needs each one.
- Keep background capture opt-in, visible, and bounded.
- Handle protected-data unavailability when the device is locked.
- Bind local cached bundles to the app instance and expiration.
- Queue receipts safely offline and fail closed for operations whose receipt is mandatory.
- Expose pending memory proposals and approvals in a durable review queue.

The current repository does not include an iOS project, so this is a target profile rather than implemented behavior.

## 9. Payments and x402

[x402](https://docs.x402.org/introduction) uses HTTP payment requirements for services and agents. It can compose with Context Layer in three places:

- A discovery request may require payment before expensive private matching.
- An action capability may require a payment authorization.
- A receipt may reference an external payment receipt.

The policy engine must evaluate payment and context separately:

```text
payment satisfied != context disclosure authorized
context disclosure authorized != payment action authorized
```

Payment credentials, wallet keys, and transaction secrets must not be included in context bundles. Only minimal payment status and receipt references should cross the boundary.

## 10. End-to-end integration recipes

### 10.1 Email source to drafting agent

1. Capture a native email and preserve Message-ID, MIME, account, sender, recipient, and timestamp.
2. Extract deadline and stakeholder claims; classify a budget note as restricted.
3. Agent submits a request for `deadline` and `stakeholder` with `email.create_draft`.
4. Policy denies the budget field and `email.send`.
5. Semantic proxy emits a short bundle.
6. Agent generates a draft and calls the draft-only adapter.
7. Receipt records model call and native draft ID.
8. Any inferred deadline change becomes a proposal.

### 10.2 Nostr opportunity discovery

1. A capture adapter verifies a signed event from one or more relays.
2. It records one source event and several relay sightings.
3. The opportunity service submits an authenticated discovery query.
4. The proxy checks query budget and evaluates private skills locally.
5. It returns `possible_match` and an approval-required contact route.
6. User approval creates a second bundle containing only the chosen contact detail.
7. Both the query and reveal produce receipts.

### 10.3 MCP tool using private project context

1. MCP host invokes `request_context` with task, selectors, tool, and expiry.
2. Context Layer returns `needs_approval` or an approved bundle resource.
3. Host makes the bundle available only to the current model turn or workflow.
4. Model requests an allowlisted MCP tool.
5. Tool handler validates the bundle capability again before side effects.
6. Tool output and receipt return as structured data.
7. MCP server cannot resolve opaque provenance without a new request.

### 10.4 A2A delegation

1. Local agent discovers a remote agent's capabilities.
2. Local policy binds the remote agent as recipient and prohibits onward disclosure.
3. Bundle is encrypted or delivered through a trusted gateway as structured task data.
4. Remote agent completes the task within listed actions.
5. Remote result includes task metadata; a Context Layer gateway writes the receipt.
6. Any follow-up requiring more context creates a new request.

### 10.5 Voice assistant on web or iOS

1. User chooses voice mode and a task.
2. UI displays which context categories and tools will be available.
3. Policy issues a short-lived bundle.
4. Backend creates a short-lived Realtime session; long-lived credentials remain outside the client.
5. Voice model receives only approved facts and tools.
6. Tool actions require server-side capability checks and any step-up approval.
7. Transcript capture follows a separate consent and retention rule.
8. Session, bundle, and voice indicators end together.

## 11. Implementation sequence

The architecture map should not be implemented all at once. A practical sequence is:

### Phase 0: Contract and fixtures

- Freeze draft object names and invariants.
- Publish JSON Schemas for request, decision, bundle, proposal, and receipt.
- Create valid and invalid synthetic fixtures.
- Implement deterministic schema and secret scans.

### Phase 1: Local core

- Build one local vault with encrypted source payloads.
- Implement one policy engine with explicit allow, reduce, deny, and approval states.
- Implement semantic field filtering plus a simple deterministic bundle issuer.
- Write append-only local receipts.
- Prove raw-vault isolation in tests.

### Phase 2: One real source and one consumer

- Add one source adapter, preferably files or email with a narrow scope.
- Add one consumer, preferably a local agent or MCP host.
- Implement proposal-only writeback.
- Test expiry, revocation, and receipt failure.

### Phase 3: Discovery and remote agents

- Add query budgets and minimum-reveal responses.
- Add an A2A or remote-agent profile.
- Introduce recipient-bound encryption and stronger identity.
- Perform privacy and abuse testing.

### Phase 4: UI and platform expansion

- Build consistent web and iOS approval/receipt surfaces.
- Add Realtime voice using short-lived sessions.
- Add trusted self-assembling UI components.
- Publish a cross-language conformance kit.

## 12. Verification checklist

### Architecture

- [ ] External consumers cannot enumerate raw vault objects.
- [ ] Request, decision, bundle, and receipt IDs form a traceable chain.
- [ ] Policy can reduce scope, not only allow or deny.
- [ ] Every bundle is recipient-bound and expiring.
- [ ] Proposed writeback is separated from committed memory.

### Adapter fidelity

- [ ] Native identifiers and security metadata are preserved.
- [ ] Edits, deletions, and relay sightings have explicit mappings.
- [ ] Untrusted content cannot become control instructions.
- [ ] Lossy fields are documented and tested.

### Security

- [ ] Secrets are absent from client bundles, logs, archives, and receipts.
- [ ] Local network services are not exposed beyond their intended boundary.
- [ ] Network tokens are validated for issuer, audience, expiry, and scope.
- [ ] Prompt injection cannot expand capabilities.
- [ ] Discovery probes are rate-limited by semantic and identity context.
- [ ] Receipt preflight failure closes the operation; post-action persistence failure enters an indeterminate recovery state.

### User experience

- [ ] Approval shows requester, purpose, fields, actions, recipient, and expiry.
- [ ] Denied and withheld context is represented without leaking it.
- [ ] Receipts are readable and searchable.
- [ ] Pending memory proposals have approve, reject, and inspect-source paths.
- [ ] Voice and background capture states are continuously visible.

### Operations

- [ ] Key rotation, backup, recovery, revocation, and deletion are documented.
- [ ] Conformance fixtures run deterministically.
- [ ] Version migrations are tested before policy or schema rollout.
- [ ] Incident response can identify affected bundles and recipients from receipts.

## 13. Known limitations and research areas

- Semantic redaction is probabilistic and can leak indirect identifiers.
- Provenance does not guarantee source truth.
- Signed receipts attest to reported operations, not complete behavioral correctness.
- Recipient deletion and retention may be impossible to enforce after disclosure without trusted hardware or legal controls.
- Minimum-reveal matching remains vulnerable to inference without robust query accounting.
- Cross-device user ownership requires difficult recovery and delegation choices.
- Policy language can become too complex for users to understand.
- Self-assembling interfaces can obscure authority unless constrained to trusted components.
- Interoperability requires governance, registered schemas, test suites, and multiple independent implementations.

These limitations are part of the protocol design problem, not reasons to hide the boundary behind a generic "AI memory" feature.

## 14. Primary references

- [Context Layer Draft Technical Specification](context-layer-technical-specification.md)
- [HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [TLS 1.3](https://www.rfc-editor.org/info/rfc8446/)
- [OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/info/rfc9700/)
- [ActivityPub](https://www.w3.org/TR/activitypub/)
- [AT Protocol](https://atproto.com/specs/atp)
- [Nostr NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [Matrix specification](https://spec.matrix.org/latest/)
- [IPFS concepts](https://docs.ipfs.tech/concepts/)
- [Model Context Protocol](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
- [Agent2Agent Protocol](https://a2a-protocol.org/latest/)
- [OpenAI Realtime with WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [x402 documentation](https://docs.x402.org/introduction)
