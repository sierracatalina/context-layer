# Context Layer glossary

One-line definitions for the [v0.2 core](protocol/spec/context-layer-technical-specification.md) & [0.3 CL-Pass companion](protocol/companions/0.3-draft/spec.md). These are reading aids; the linked specifications set the rules. Companion terms describe a draft, not a live service.

Coverage includes both terminology sections, all named components, trust zones, core & companion objects, conformance roles, policy outcomes & purpose codes. Supporting terms explain the overview's security & data concepts; individual JSON fields remain documented in the specifications & schemas.

## Core terms & objects

- **Subject**: The person, group, project, device or other entity whose context is governed.
- **Source event** [`source_event`]: A record of something observed, with its origin; evidence does not by itself prove a fact.
- **Claim** [`context_claim`]: A statement drawn from sources, with links to evidence, confidence, validity & status.
- **Vault**: The user-controlled boundary that stores context & governs access; it need not be on the user's device.
- **Context request** [`context_request`]: An app's request for named context, purpose, recipient, task, retention & actions.
- **Policy decision** [`policy_decision`]: The recorded result of checking a request against a specific version of the rules.
- **Semantic proxy**: The outbound control that trims or changes context to fit what policy permits.
- **Discovery proxy**: The inbound control that checks a query against private context & reveals only approved results.
- **Scoped context bundle** [`scoped_context_bundle`]: A packet of approved context, evidence links, permissions & limits, with an expiry.
- **Minimum-reveal response** [`minimum_reveal_response`]: A discovery result that returns only fields approved for release.
- **Receipt** [`receipt`]: A record of a request, decision, disclosure, action or memory change, with private payloads minimized.
- **Memory update proposal** [`memory_update_proposal`]: A suggested memory addition, change, contradiction or removal that is not yet committed.
- **Error** [`error`]: A structured failure response in the optional HTTP binding, without secrets or denied private data.

## Components & trust zones

- **Capture adapter**: A bridge that turns a source's native data into source events while preserving origin & permissions.
- **Normalizer**: A vault-side component that turns different source formats into stable record types.
- **Extractor**: A vault-side component that derives claims, summaries, entities, links & contradictions from sources.
- **Context vault**: The component that stores private sources, claims, identities, rules & receipt references within the vault boundary.
- **Policy engine**: The trusted component that checks who is asking, why, what may be shared & what may be done.
- **Bundle issuer**: The trusted component that assembles a short-lived packet for one task & recipient.
- **Context consumer**: An app, agent, model or interface that uses approved context outside the vault or in a separate sandbox.
- **Receipt store**: The service that keeps operation evidence with append-only rules & its own access controls.
- **Approval surface**: The trusted interface where a person can review & approve a specific request.
- **Vault zone**: The trust zone holding private sources, claims, identity bindings, policy & keys.
- **Controlled exchange zone**: The trust zone containing policy checks, proxies, bundle issuance & receipt writing.
- **Consumer or untrusted zone**: The separate zone for apps, agents, models, relays & interfaces that receive context.

## Supporting terms

- **Context**: Facts, notes or preferences that help an app or agent carry out a task.
- **Purpose-bound Capability Protocol** [`PCP`]: An optional, separate protocol using a user- or principal-signed grant for acting authority, distinct from context disclosure. [Public source](https://github.com/sierracatalina/PCP/blob/cc84982fb57c9a8f4d3a90a023fde10747a2662b/README.md).
- **Protocol**: Shared rules for what systems exchange & how they must handle it.
- **Profile**: A named set of protocol requirements for a particular role or deployment.
- **Principal**: The identified person, app or service taking part in a request.
- **Requester**: The principal asking for context, with its client & role recorded.
- **Recipient**: The specific destination allowed to receive a bundle.
- **Client instance** [`client_instance`]: The exact installation or device participating in a request or pairing.
- **Authentication**: Checking the identity of a principal; it does not itself grant access to context.
- **Authorization**: Deciding which context or actions a principal is allowed to use.
- **Authority boundary**: The point separating control of the vault from systems that may receive limited access.
- **Purpose code** [`purpose_code`]: The exact machine-readable task label policy checks; free-text purpose cannot expand it.
- **Selector**: A request entry naming a predicate whose context is sought.
- **Predicate**: The named attribute or relationship used to select claims.
- **Scope**: The context & actions a request asks for or a decision grants.
- **Capability**: An explicit permission for an action; a bundle grants no unlisted actions.
- **Provenance**: The links & records showing where a claim came from.
- **Provenance handle**: An opaque reference to evidence that should require separate permission to resolve outside the vault.
- **Policy snapshot**: The exact version & digest of the rules used to make a decision.
- **Expiry** [`expires_at`]: The time after which an object can no longer be used.
- **Single use** [`single_use`]: A limit allowing a bundle to be opened only once; the bundle may permit more than one action.
- **Replay**: An attempt to use a single-use bundle again.
- **Retention**: The permitted duration & conditions for keeping shared data.
- **Onward disclosure** [`onward_disclosure`]: Sharing received context with another party, which needs permission.
- **Writeback**: A consumer's proposed change to stored context, checked inside the authority boundary.
- **Commit**: Making a validated, approved memory change durable inside the vault boundary.
- **Revocation**: Ending a grant for future use; it cannot erase data a recipient has already seen.
- **Append-only**: Keeping old evidence intact & recording corrections as new entries rather than silent edits.
- **Digest**: A fixed-size value used to check whether data has changed; it is not encryption.
- **Signature**: A cryptographic check of who signed data & whether it changed; it does not prove its claims true.
- **Receipt anchor**: The local proof's signed record used to check the receipt log's integrity & history.
- **Encryption**: Protecting stored or sent data so it can be read only with the required key.
- **Key custody**: How signing & encryption keys are stored, protected, rotated & recovered.
- **Fail closed**: Refusing an operation when a required security check cannot succeed.
- **Synthetic data**: Made-up test data that does not contain real people's private records.
- **Conformance**: Meeting the requirements of a named profile with evidence from its required tests.
- **Interoperability**: Separate implementations successfully exchanging data under the same rules.
- **JSON**: The structured text format used for protocol objects.
- **Schema**: A machine-readable definition of an object's allowed fields, types & values.
- **Closed schema**: An object contract that rejects extra fields.
- **HTTP binding**: The draft mapping of protocol messages onto web requests & responses.
- **Capability document**: Optional server metadata that advertises versions, roles, endpoints & supported features.

## Profiles & roles

- **CL-Core-Lite**: The smallest v0.2 profile, with five closed object contracts, exact-purpose checks & expiring single-use bundles.
- **CL-Core-Issuer**: The role that checks requests, records decisions, reduces scope & issues constrained bundles.
- **CL-Core-Consumer**: The role that validates bundles, obeys permissions & limits, writes receipts & proposes memory changes.
- **CL-Discovery**: The role for private matching with limited results, probe controls, approval & receipts.
- **CL-Memory**: The role for sourced claims, contradictions, proposed updates & approved memory commits.
- **CL-Receipt-Store**: The role for append-only, minimized evidence with integrity checks, access policy & export tools.
- **CL-Adapter**: The role that documents & tests how a native source's data, permissions & edits map into the protocol.
- **Personal local-first profile**: An informative deployment design that keeps the main vault & policy near one user.
- **Organization or team profile**: An informative deployment design with shared administration, role separation & organizational controls.
- **Federated discovery profile**: An informative deployment design for private matching across separate trust domains.
- **CL-Pass**: A proposed companion profile for identity, exact-client pairing & standing grants beside the unchanged v0.2 core.

## Policy outcomes & purpose codes

- **Allow** [`allow`]: Grant the request as permitted by the evaluated policy.
- **Allow with reductions** [`allow_with_reductions`]: Grant only a permitted subset of the requested context or actions.
- **Deny** [`deny`]: Reject the request without issuing a bundle.
- **Needs approval** [`needs_approval`]: Wait for approval of this request without disclosing context first.
- **draft.response**: Prepare a response without sending it.
- **summarize.material**: Summarize material that was supplied or authorized.
- **retrieve.context**: Retrieve approved context for a declared task.
- **plan.task**: Make a plan without carrying out side effects.
- **execute.approved_action**: Carry out an action already covered by explicit approval.
- **discover.minimum_reveal**: Match a discovery request while returning only approved fields.
- **propose.memory_update**: Submit a memory change for later checks & approval.

## Draft companion terms

- **Identity assertion** [`identity_assertion`]: A time-limited statement that a principal signed in at a client; it grants no context.
- **Client pairing** [`client_pairing`]: Admission of one exact client to take part in pass issuance & requests; it grants no context by itself.
- **Memory category** [`memory_category`]: One of four grant categories, distinct from the predicates used to select claims.
- **Context pass** [`context_pass`]: A standing, expiring category & purpose grant for one principal & client; each disclosure still needs a new request & decision.
- **Approval handle** [`approval_handle`]: A content-free link between a needs-approval decision, its request & missing category grants.
- **Claim annotation** [`claim_annotation`]: A companion record of a claim's evidence basis, visibility, category & attribution.
- **Lifecycle event** [`lifecycle_event`]: A content-free record of a pass, pairing, proposal or bundle changing state, distinct from a receipt.
- **Preference** [`preference`]: A memory category for tastes & constraints the subject states.
- **Fact** [`fact`]: A memory category for statements about the subject or their world, still subject to evidence labels.
- **Project** [`project`]: A memory category for project, task or work-stream context.
- **Instruction** [`instruction`]: A memory category for standing directions to consumers.
- **Evidence basis** [`evidence_basis`]: The label distinguishing saved, stated, derived & inferred claims.
- **Direct user save** [`direct_user_save`]: Evidence that the subject stored the claim as such.
- **Stated by user** [`stated_by_user`]: Evidence that the subject stated the claim, even if another tool captured it.
- **Derived** [`derived`]: A claim extracted from sources with provenance.
- **Inferred** [`inferred`]: A model or heuristic's inference that the subject did not state as fact.
- **Visibility** [`visibility`]: The companion label choosing vault-only storage or eligibility for a public profile.
- **Public profile** [`public_profile`]: A public export limited to claims marked for that visibility; it is not a pass or a bundle.
- **Attribution** [`attribution`]: The companion record of which principal captured a claim & when.
- **Pass gap** [`pass_gap`]: The requested categories missing from an active pass, recorded without claim values.
- **Active** [`active`]: A pass state valid only while its expiry is still in the future.
- **Revoked** [`revoked`]: A pass or pairing state that blocks future disclosure under that grant.
- **Expired** [`expired`]: A pass whose permitted time has ended, even if its stored status still says active.
- **Paired** [`paired`]: The client-pairing state admitting that exact client, without itself granting disclosure.
- **pass.issued**: A content-free lifecycle event recording a new pass.
- **pass.revoked**: A content-free lifecycle event recording revocation of a pass.
- **pairing.revoked**: A content-free lifecycle event recording revocation of a client pairing.
- **proposal.committed**: A content-free lifecycle event recording an approved memory commit, without granting new read access.
- **bundle.issued**: A content-free lifecycle event recording a new bundle.
- **bundle.expired**: A content-free lifecycle event recording a bundle's expiry.
