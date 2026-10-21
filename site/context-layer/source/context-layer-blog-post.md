---
title: "The Context Layer: Give AI the Context It Needs Without Giving It Everything"
subtitle: "A proposal for user-owned memory, purpose-bound disclosure, reversible agent writes, and receipts people can inspect"
status: "Published"
date: "2026-08-12"
audience: "Product leaders, application developers, agent builders, protocol designers, privacy and security teams"
---

# The Context Layer: Give AI the Context It Needs Without Giving It Everything

AI systems become more useful when they understand the person, project, history, and constraints around a task. Today, the common way to provide that understanding is also the source of the problem: copy more private data into more applications, prompts, vendor databases, vector stores, and agent sessions.

That trade is not sustainable. People should not have to choose between an assistant that knows nothing and an assistant that can read everything.

The **Context Layer** is a proposed application-layer protocol for a different model. A person keeps a user-owned context vault containing source events, derived claims, summaries, provenance, identity bindings, and policies. Apps and agents do not receive an open-ended vault connection. They make a purpose-bound request. A policy boundary evaluates it. A semantic proxy releases the minimum useful context as a short-lived bundle. Sensitive operations leave receipts. Any new memory suggested by an agent returns as a proposal rather than silently becoming truth.

In one sentence:

> The Context Layer lets useful context move while keeping authority, provenance, and disclosure boundaries attached.

This project is currently a proposal and interactive architecture demonstrator. It is not yet a production vault, deployed standard, completed security system, or claim that every named integration already exists.

## The missing layer in today's AI stack

Most modern AI stacks have several well-developed layers:

- Networks and transports move bytes.
- Application APIs expose data and actions.
- Agent protocols connect models to tools or other agents.
- Models interpret information and generate outputs.
- User interfaces turn those outputs into workflows.

What is often missing is a durable contract for the context between them.

When context has no independent contract, every app invents its own memory model. A chat transcript becomes a profile. A profile becomes a retrieval index. A retrieval index becomes an implicit permission grant. An extracted guess becomes a durable fact. A helpful automation becomes an action whose inputs and authority are hard to reconstruct later.

The result is a set of recurring failures:

| Problem | Common behavior today | Context Layer response |
| --- | --- | --- |
| Context fragmentation | The same person or project is reconstructed separately in every app | Normalize sources into a user-controlled context model with provenance |
| Coarse access | An integration receives an entire mailbox, drive, or memory store | Require a purpose, requested fields, recipient, retention window, and policy decision |
| Prompt overexposure | Raw notes are pasted into a model because extracting the relevant part is difficult | Use a semantic proxy to redact, alias, compress, and route task-specific facts |
| Lost provenance | A summary survives after its source and confidence are forgotten | Keep source references and derivation metadata attached to claims |
| Stale or contradictory memory | The latest generated summary overwrites older nuance | Version summaries and preserve contradictory branches until they are resolved |
| Silent writeback | An agent observation becomes memory without review | Treat writeback as a proposal requiring validation and policy approval |
| Private discovery leakage | External search or matching services inspect a full private profile | Run matching behind an inbound discovery proxy and release only a minimum reveal |
| Invisible automation | Users cannot tell which context caused an action | Write reviewable receipts for policy decisions, model calls, tools, bundles, and external actions |

The Context Layer does not solve these problems by building a bigger shared database. It solves them by making movement itself explicit.

## A tour of the protocol

**Proposed architecture.** This tour describes the intended system, including planned extraction, semantic redaction, discovery and review interfaces. It is not a list of shipped capabilities. The experimental local proof implements only the narrower behavior linked in the [claim ledger](https://github.com/sierracatalina/context-layer/blob/main/docs/CLAIM-EVIDENCE.md).

The architecture has seven stages. They form a continuous path, but each stage has a distinct responsibility.

### 1. Capture source events

Context begins as events: a message arrived, a file was imported, a browser page was clipped, a meeting ended, a payment completed, a voice note was recorded, or a device reported a signal.

Capture does not immediately declare what an event means. It records what happened and where it came from. Source tagging adds the app, account, device, URL, author, transport, timestamp, integrity data, confidence, and whether a user confirmed the source.

This distinction matters. A source event is evidence. An interpretation is a claim derived from that evidence.

### 2. Normalize and extract without erasing origin

Email, Matrix events, ActivityPub activities, browser clips, files, and agent messages all have different shapes. Normalization maps them into stable event records. Deduplication can recognize that two channels carried the same underlying event while preserving both sightings as provenance.

Extraction then derives entities, relationships, claims, time ranges, locations, commitments, embeddings, and possible contradictions. Derived records keep links back to the source events that support them. Confidence and validity are attributes, not afterthoughts.

The goal is not to force the world's data into one universal ontology. The goal is to provide a small stable envelope that can carry typed domain data without losing evidence.

### 3. Keep the vault as the authority boundary

The user-owned context vault is the private authority boundary. It may be local-first, self-hosted, organization-hosted, or provided as a managed service, but the ownership contract stays the same: consumers request context; they do not receive unrestricted raw-vault reads by default.

The vault can contain:

- Raw source events and attachments
- Normalized records and extracted claims
- A memory graph of entities and relationships
- Versioned summaries
- Contradictions and alternate branches
- Provenance and integrity records
- Identity and permission bindings
- Policy rules and consent state
- Scoped bundles and receipt references

"User-owned" therefore means more than where bytes are stored. It means the user, or an explicitly delegated authority, controls access, export, correction, deletion, key recovery, and policy.

### 4. Turn access into a request and a decision

An external agent should not ask, "Can I see the memory?" It should submit an egress request that says:

- What task is being performed?
- Which context fields or claim types are needed?
- Who is requesting them?
- Which model, tool, agent, or organization will receive them?
- What actions might follow?
- How long may the context be retained?
- Does the request permit onward disclosure?
- Which receipt must be produced?

The policy boundary evaluates identity, scope, purpose, consent, expiration, requested action, sensitivity, and current user rules. Its result can be allow, deny, allow with reduced scope, or require approval.

Consent is not a checkbox that permanently legalizes every future use. In this model, consent is bound to a purpose, recipient, scope, and time window.

### 5. Use proxies to reveal less

The semantic proxy is the outbound gate. It can:

- Remove fields unrelated to the task
- Redact confidential values
- Replace identities with stable aliases or pseudonyms
- Compress many source records into a few task-level claims
- Route different fields to different recipients
- Preserve provenance handles without exposing raw source payloads

The discovery proxy performs the inverse pattern for inbound matching. An opportunity feed, public relay, recruiter, marketplace, or other external system can ask whether a private profile matches a condition. The query is authenticated, rate-limited, and evaluated inside the user's boundary. The response reveals the smallest useful next step, such as "available for a paid prototype engagement," rather than the underlying skills graph, private notes, or work history.

Minimum reveal is not perfect privacy. Repeated yes/no queries can still leak information. That is why discovery needs identity checks, query budgets, correlation defenses, receipts, and escalation to user approval.

### 6. Deliver a scoped context bundle

The output is a **scoped context bundle**: a task-ready, short-lived packet containing only the approved material.

A bundle can carry:

- Approved facts and summaries
- Provenance references
- Purpose and task definition
- Instructions and behavioral constraints
- Allowed tools and actions
- Explicitly denied actions
- Expiration and retention rules
- Surface hints for cards, tables, maps, timelines, or workspaces
- A receipt contract

For an agent, this is the difference between "here is my entire memory" and "draft this reply using the deadline and stakeholder, do not send it, do not mention the confidential budget note, and expire the context after 24 hours."

The bundle is where policy becomes executable context.

### 7. Make actions and writeback reviewable

Approved bundles can be consumed by a local agent, cloud model, workflow runner, voice interface, search surface, browser overlay, or self-assembling UI. The consuming surface should show enough policy and provenance state for a person to understand why information is present and what actions are available.

Sensitive operations write receipts. A receipt records who or what acted, which policy decision authorized it, which bundle was used, what kind of operation occurred, when it happened, and whether it succeeded. Input and output digests can support later integrity checks without storing sensitive payloads in the receipt itself.

Receipts are evidence, not magic. A signed record can prove that a component reported an action; it cannot prove that the action was wise, that the source was true, or that no undisclosed side effect occurred. Useful receipt systems still need trustworthy implementations, readable summaries, retention policy, and audit tooling.

Finally, an agent's new observation returns as a **proposed memory update**. The system can check its sources, compare it with existing claims, score contradictions, and request user approval. Only then can it become durable context.

## A concrete example

Imagine that an email says:

> Can you send the launch timeline by Friday? Do not disclose the budget delta yet.

The Context Layer flow could look like this:

1. **Capture:** Record the email as a private source event with sender, account, timestamp, and message identity.
2. **Extract:** Derive two claims: a timeline is requested by Friday, and a budget detail is restricted.
3. **Request:** An email-drafting agent asks for the context needed to draft a reply.
4. **Policy:** Permit the deadline and stakeholder; deny the confidential budget note; allow drafting but not sending; set a 24-hour expiry.
5. **Proxy:** Produce a concise task summary and retain opaque provenance handles.
6. **Bundle:** Deliver the approved facts, `email_draft` tool permission, "do not send" instruction, expiry, and receipt requirement.
7. **Interface:** Show a draft with preview, edit, and approve controls.
8. **Receipt:** Record bundle creation, model use, and draft generation.
9. **Writeback:** If the agent suspects the deadline moved to Thursday, store that as a proposal requiring a source or user confirmation, not as an automatic correction.

The assistant remains useful. The budget note never needed to leave the vault. The user can see what happened.

## Who this is for

### People using several AI products

Individuals should not have to rebuild their preferences, projects, relationships, and history inside every assistant. A portable context layer can let them switch models or interfaces while retaining control over the source material and disclosure rules.

### Agent and application developers

Developers need a predictable input contract. Scoped bundles give agents structured facts, instructions, tool limits, and expiry instead of a pile of unbounded retrieved text. Receipts and proposed writebacks also make evaluation and debugging more concrete.

### Product teams building AI-enabled workflows

Teams can use the layer to separate context governance from each product surface. A search view, dashboard, voice interface, and automation can consume the same approved bundle while presenting different interfaces.

### Organizations with audit or privacy obligations

Purpose binding, provenance, short-lived access, user approval, and receipts map well to environments where data use must be explainable. The Context Layer is not itself a compliance certification, but it creates better places to enforce and test organizational controls.

### Open-protocol and decentralized-web communities

Open social, messaging, storage, and agent protocols move information across independent systems. Context Layer adapters can add a user-owned decision boundary before those systems receive private context, without replacing their native transport or data models.

### Marketplaces and discovery systems

Private matching can support opportunities, collaborators, services, or communities without publishing a complete personal graph. The discovery profile is aimed at exactly this class of use case.

## What it can work with

**Proposed integrations; untested unless explicitly evidenced.** The mappings below do not establish implemented adapters, outside adoption or official endorsement by the named protocols.

The Context Layer is designed to sit above existing protocols, not compete with them.

### Web and messaging sources

HTTP APIs, email, files, browser events, audio, device signals, Matrix rooms, ActivityPub activities, AT Protocol records, Nostr events, and application-specific webhooks can all be represented through capture adapters. The adapter's responsibility is to preserve source identity, timing, integrity information, and native semantics.

ActivityPub, for example, defines client-to-server and federated server-to-server social interactions over ActivityStreams. AT Protocol has its own self-authenticating identity, repositories, and Lexicon schemas. Nostr uses signed events distributed through relays. Matrix defines JSON-over-HTTP APIs and federated room state. Context Layer should map these systems into source and provenance records; it should not flatten away their security or consistency models.

### Agent protocols

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/specification/2025-11-25) standardizes how AI hosts connect to resources, prompts, and tools. Context Layer can expose an approved bundle as an MCP resource or require a Context Layer request before a sensitive MCP tool executes. MCP remains the tool and resource protocol; Context Layer supplies the user-owned context policy around it.

[Agent2Agent (A2A)](https://a2a-protocol.org/latest/) standardizes collaboration between independent agents. A Context Layer bundle can be carried as structured task data or an artifact, with recipient and retention constraints bound to the remote agent. A2A remains the agent communication protocol; Context Layer defines which private context the task may receive.

### Storage and content addressing

Local databases, encrypted object stores, and content-addressed systems can hold vault or receipt data. [IPFS](https://docs.ipfs.tech/concepts/how-ipfs-works/) can provide verifiable content identifiers and portable references, but public IPFS is not private storage: unencrypted content and provider metadata can be exposed. Raw private vault material should not be published to a public content-addressed network merely because its address is a hash.

### Models, agents, and voice systems

Local models, cloud models, Codex-style coding agents, Goose-style local agents, workflow engines, and custom runtimes can consume scoped bundles. The current public proof includes one capability-bound local-agent consumer. Realtime voice remains an informative future profile, not a conforming implementation.

### Payment and metering

Payment protocols such as [x402](https://docs.x402.org/introduction) can be used by an application to require payment for a service or agent action. A Context Layer request could carry a payment requirement or receipt reference, but payment authorization is separate from permission to disclose private context. Paying for an operation must never imply blanket access to the vault.

"Works with" in this proposal means there is a coherent adapter mapping. It does not mean the current static demonstrator ships production adapters for every system listed above.

## What the Context Layer is not

Clear boundaries are more useful than ambitious labels. The Context Layer is not:

- A replacement for HTTP, TLS, Matrix, ActivityPub, AT Protocol, Nostr, MCP, A2A, or IPFS
- A universal identity provider or a new authentication standard
- A particular graph database, vector database, model, or cloud vendor
- A promise that semantic redaction is infallible
- A way to bypass the source system's terms, permissions, or access controls
- A guarantee that a signed receipt describes a correct or safe action
- A license for autonomous agents to write permanent memory
- A production implementation in its current repository form

It is a contract for context objects, decisions, bundles, and evidence at the boundary between private memory and external computation.

## Design principles

The proposal can be judged by a small set of principles:

1. **Useful without total access.** A task should receive enough context to succeed without receiving unrelated private material.
2. **Provenance survives transformation.** Summaries and claims remain traceable to evidence, even after compression.
3. **Purpose is part of authorization.** Who, what, why, how long, and which action are evaluated together.
4. **Disclosure is reducible.** Policy can narrow a request rather than only allow or deny everything.
5. **Discovery reveals the minimum.** Matching happens inside the private boundary whenever possible.
6. **Writes are proposals first.** Generated observations do not silently become durable truth.
7. **Sensitive operations leave evidence.** Receipts are portable, readable, and append-only at the logical level.
8. **Interfaces show authority state.** Users can see provenance, permissions, expiry, and pending approvals where decisions happen.
9. **Protocols compose.** Context Layer adapters preserve the native semantics and security model of the system they connect.
10. **Failure closes the gate.** Missing identity, ambiguous purpose, expired policy, invalid signatures, and unavailable receipt storage do not produce broader access.

## What exists today

The current project contains:

- A plain-language overview of the problem and proposed layer
- A reviewed v0.2 technical specification and implementation profiles
- A complete protocol architecture map
- Five v0.2 core schemas and a dependency-free reference runtime
- An experimental encrypted local core with four policy states, authenticated bundle envelopes, and anchored receipts
- One narrow UTF-8 files adapter, one local-agent consumer, a minimized demo, and executable test vectors
- An unsubmitted Nostr interoperability discussion draft

These artifacts make the current contract and tested single-user profile reviewable as one flow. They do not prove production security, third-party interoperability, managed key custody, hostile-administrator resistance, or independent conformance.

The next implementation milestone should harden this narrow profile rather than widen the architecture map: stabilize the v0.2 contracts, move key and rollback-anchor custody onto deployment-defined protected boundaries, connect an authenticated real-world source and consumer, and run an independent security review.

## The practical test

Every context-driven interaction should be able to answer three questions:

1. **What context is involved?**
2. **Who gets to use it, for what purpose, and for how long?**
3. **What receipt proves the decision and resulting operation?**

If an AI product cannot answer those questions, it does not yet have a context architecture. It has data access.

The Context Layer is an attempt to make the better architecture portable.

## Further reading

- [Context Layer interactive overview](/)
- [Context Layer end-to-end demo](/#demo)
- [Draft technical specification](/context-layer/specification)
- [Implementation and interoperability profiles](/context-layer/implementation)
- [HTTP Semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)
- [TLS 1.3, RFC 8446](https://www.rfc-editor.org/info/rfc8446/)
- [ActivityPub, W3C Recommendation](https://www.w3.org/TR/activitypub/)
- [AT Protocol specification](https://atproto.com/specs/atp)
- [Nostr NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [Matrix specification](https://spec.matrix.org/latest/)
- [Model Context Protocol](https://modelcontextprotocol.io/specification/2025-11-25)
- [Agent2Agent Protocol](https://a2a-protocol.org/latest/)
- [IPFS privacy and encryption](https://docs.ipfs.tech/concepts/privacy-and-encryption/)
- [OpenAI Realtime API with WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
