# Prior art and composition choices

Informative comparison for `context-layer/0.2-draft`. Sources checked on 2026-10-09. This is a design comparison, not an interoperability result, security audit, or claim of novelty.

Context Layer combines a purpose-bound disclosure request, policy decision, minimized context bundle, provenance, receipts, and proposal-only memory writeback. Delegation, attenuation, scoped tokens, consent, and contextual restrictions already have substantial prior art. The distinctions below describe the application contract this draft chooses to specify; they do not imply that another system cannot represent that contract through an application profile.

## UCAN

- **What it provides:** Public-key-verifiable capabilities, delegation chains, and invocation of delegated authority. The current overview identifies UCAN 1.0.0 and separates delegation, invocation, promise, and revocation specifications. [UCAN specification](https://github.com/ucan-wg/spec), [delegation specification](https://github.com/ucan-wg/delegation)
- **Overlap:** Restricted authority, audience binding, validity intervals, and authority-chain verification overlap with Context Layer's scope, recipient, expiry, and non-escalation requirements.
- **Difference:** UCAN concerns authority to invoke operations. Context Layer's core objects also describe the released context, source provenance, memory proposals, and disclosure receipts. Authority provenance is not automatically the provenance of a derived context claim.
- **Why not just use it?** Use UCAN alone when capability delegation and invocation are the needed contract. A Context Layer deployment could use UCAN for delegated authorization, but would still need a reviewed mapping for its context objects, exact purpose codes, receipt requirements, and replay behavior. This repository does not provide that mapping or claim wire compatibility.

## GNAP, RFC 9635

- **What it provides:** Authorization negotiation between a client instance and an authorization server, including access-token issuance, interaction, continuation, and direct subject-information release. It is broader than merely minting an API token. [RFC 9635](https://www.rfc-editor.org/rfc/rfc9635.html)
- **Overlap:** Requested access, reduced grants, user interaction, and release of subject information substantially overlap with requesting and approving context disclosure.
- **Difference:** Context Layer adds a particular context-data vocabulary: provenance-bearing claims, scoped bundles, proposed memory changes, and operation receipts. GNAP leaves application resource and subject-information semantics to profiles.
- **Why not just use it?** Use GNAP where negotiated authorization and subject-information release meet the application's needs. A GNAP profile might carry Context Layer requests or authorize its endpoints. That profile would need to define how grant, continuation, recipient, and policy-snapshot state map together; the draft has not specified or tested it.

## Macaroons

- **What they provide:** Bearer credentials built using chained message authentication codes, with caveats that restrict authority and support decentralized delegation. Contextual restrictions, including purpose, predate this draft. [Birgisson et al., NDSS 2014](https://research.google/pubs/macaroons-cookies-with-contextual-caveats-for-decentralized-authorization-in-the-cloud/)
- **Overlap:** Attenuation and contextual caveats overlap with reduced scope, purpose, expiry, and recipient restrictions.
- **Difference:** A macaroon is an authorization credential. Context Layer also specifies what context is disclosed and how its provenance, writeback proposals, and evidence are represented. A caveat's presence does not establish that a recipient deleted information already disclosed.
- **Why not just use them?** Use macaroons when attenuable credentials and application-defined caveat checks are sufficient. They could implement part of a deployment's authorization boundary. The application would still have to define interoperable caveat semantics and the context-exchange contract; this draft does not choose a macaroon format or verifier.

## Biscuit

- **What it provides:** Public-key-verifiable authorization tokens with offline attenuation and Datalog-based facts, rules, and checks; authorizers supply their own allow/deny policies. Additional token blocks restrict authority. [Eclipse Biscuit specification](https://doc.biscuitsec.org/reference/specifications)
- **Overlap:** Attenuation, contextual checks, and policy evaluation overlap with least privilege, scope reduction, and Context Layer policy inputs.
- **Difference:** Biscuit gives a concrete token format and authorization language. Context Layer core leaves the policy language and signing suite open while defining context objects and lifecycle obligations.
- **Why not just use it?** Use Biscuit alone when token authorization and its policy language solve the problem. It could evaluate a Context Layer deployment's policy, but context selectors, purpose codes, retention, provenance, and receipt decisions would require an explicit mapping. No Biscuit integration or equivalence proof is claimed here.

## zcap-ld

- **What it provides:** Linked-data capability documents, signed delegation and invocation proofs, capability chains, and caveats that restrict use. The cited v0.4.0 document is community specification work, not a W3C Recommendation. [Authorization Capabilities v0.4.0](https://w3c-ccg.github.io/zcap-spec/v0.4.0/)
- **Overlap:** Delegation, attenuation, invocation targets, actions, expiry, and proof verification overlap with scoped authority and recipient/action constraints.
- **Difference:** zcap-ld expresses authority through linked-data capabilities. Context Layer does not require JSON-LD or a zcap proof suite; it additionally describes context provenance, disclosure bundles, and proposed memory updates.
- **Why not just use it?** Use zcap-ld where its capability model matches the application and ecosystem. A Context Layer profile could use it to authorize requests, with explicit mappings for subjects, recipients, purpose, and revocation. Neither naming similar fields nor serializing a bundle makes it a valid zcap.

## OAuth 2.0 and Token Exchange, RFC 8693

- **What they provide:** OAuth 2.0 grants limited access to HTTP resources. Token Exchange specifies obtaining a token using subject and optional actor tokens, with resource, audience, and scope parameters and delegation/impersonation semantics. [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html), [RFC 8693](https://www.rfc-editor.org/rfc/rfc8693.html)
- **Overlap:** Scope, audience restriction, delegated access, and reduced authority overlap with the authorization boundary around context disclosure. This is not a contrast between OAuth and fine-grained policy: resource servers can enforce application-specific policy.
- **Difference:** Those RFCs do not define Context Layer's context-claim, bundle, memory-proposal, or operation-receipt formats. Exchanging a token does not generally revoke the input token or tightly link the lifetime of both tokens. [RFC 8693 §2.1](https://www.rfc-editor.org/rfc/rfc8693.html#section-2.1)
- **Why not just use them?** Use OAuth and an application API when that is enough. Context Layer may add a shared context-exchange vocabulary behind OAuth-protected endpoints, following the already-cited [OAuth security BCP, RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html). It does not replace OAuth, define a token-exchange profile, or authorize forwarding a token to unrelated services.

## Model Context Protocol, MCP

- **What it provides:** A protocol connecting AI applications to resources, prompts, and tools, with capability negotiation and authorization/security guidance. This comparison uses the dated 2025-11-25 specification rather than assuming an unversioned page is stable. [MCP specification](https://modelcontextprotocol.io/specification/2025-11-25)
- **Overlap:** Resources and structured tool results can carry context; tool calls can request context or submit a memory proposal. MCP already discusses consent and authorization.
- **Difference:** Context Layer describes one application-level policy and data contract that an MCP server could expose. A valid MCP connection does not itself demonstrate compliance with that contract's exact purpose, provenance, retention, or receipt rules.
- **Why not just use it?** Use MCP alone for tool/resource interoperability when the server's existing application policy is sufficient. Add a Context Layer profile only if these shared context semantics are needed. The [informative MCP mapping](protocol/spec/context-layer-implementation-and-interoperability.md#71-model-context-protocol) is design guidance, not an implemented or officially adopted MCP extension.

## Agent2Agent Protocol, A2A

- **What it provides:** Agent discovery and interaction through Agent Cards, messages, tasks, artifacts, and task-status updates, including authentication and authorization considerations. This comparison cites the released 1.0.0 specification. [A2A v1.0.0](https://a2a-protocol.org/v1.0.0/specification/)
- **Overlap:** A task may carry context, identify a recipient agent, produce artifacts, and generate evidence useful to an operation receipt.
- **Difference:** A2A describes interactions between agents; Context Layer proposes additional constraints on the particular private context moving in those interactions. An A2A task status is not automatically a durable Context Layer receipt or proof of downstream deletion.
- **Why not just use it?** Use A2A alone when agent collaboration and existing application policy are sufficient. Context Layer's [informative A2A mapping](protocol/spec/context-layer-implementation-and-interoperability.md#72-agent2agent-protocol) proposes where bundles and task references could fit, but is not a tested version-specific adapter. Field names and transport details need checking against the selected A2A version before implementation.

## What this comparison establishes

The proposed contribution is an experimental composition and context-specific contract, not a new cryptographic primitive or proof that the listed protocols are inadequate. Implementers may need only one of these established mechanisms. Adopting Context Layer is justified only if sharing its context objects and lifecycle semantics reduces application-specific integration work.

There is no universal token conversion, production adapter, or demonstrated interoperability with the systems above in this repository. A future integration needs a versioned mapping, preserved native security semantics, negative conformance fixtures, and threat-model review. The [technical specification](protocol/spec/context-layer-technical-specification.md#cl-s-2-2) remains authoritative for this draft's own requirements.
