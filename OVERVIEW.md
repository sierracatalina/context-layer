# Context Layer overview

## What it is

Context Layer is a draft set of rules for sharing useful context with an app or AI agent. Context means facts, notes or preferences that help with a task. The aim is to share only what that task needs, while the user controls the purpose, who receives it & how long it may be used. The draft describes how to ask, check permission, share a small packet of context & keep a record.

## The problem

When you switch tools, you often have to explain yourself again. Giving each tool your full history saves effort but may expose far more than it needs. A meeting-prep agent might need a project's due date, for example, without needing your private journal.

## How it works

1. Keep source notes & facts in a vault, a store governed by the user. Keep links to where each fact came from.
2. An app asks for named facts for one task. It states the purpose, who will use them & which actions it wants to take.
3. Rules check the request. They can allow it, share less, ask the user to approve it or deny it. A denied request or one waiting for approval gets no context.
4. The app gets an approved bundle, a small packet for the named recipient. In the core Lite profile, it expires & can be opened only once. This can allow more than one action, but only those listed. Required receipts record the exchange without copying private source text.
5. If the app wants to save new memory, it submits a proposal. That change is checked inside the vault's boundary before it can become stored context.

```text
Vault
  ↓
Request
  ↓
Rules check
  ↓
Approved bundle
  ↓
Action + receipt
  ↓
Proposed memory
```

## What it is not

This is not a new AI model, a finished app or a way to give agents free access to your files. It does not replace sign-in, encryption or the rules of a source service. Access to context alone does not authorize real-world actions. When PCP [Personal Context Protocol] is used, it uses a separate user- or principal-signed grant for acting authority. It cannot make a false fact true, ensure an AI gives a correct answer or pull back data after a recipient has seen it.

## Status

Version 0.2 is an experimental draft, not an adopted standard or a security certification. This repository has a working local proof for one user, with an encrypted vault, policy checks, signed bundles, receipts, a files adapter & a local agent. Tests & demos use made-up data. Production key management, a hardened shared service & live use across vendors remain unproven.

The separate 0.3 CL-Pass draft adds proposed rules for standing permission. It contains specifications, schemas & examples, not a live service.

Read the [glossary](GLOSSARY.md), inspect the [specification](protocol/spec/context-layer-technical-specification.md) or try the [synthetic demo](https://sierracatalina.com/context-layer/demo).
