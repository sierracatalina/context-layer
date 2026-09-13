# Context Layer — Whiteboard Daddy capture recipe

status: working draft · not a new spec card
audience: Whiteboard Daddy (draws). Context Layer owns whether a record is well-formed.
published: 2026-08-29
revised: 2026-08-29 (completed-items addendum)
board folder: https://drive.google.com/drive/folders/15lt1Ow-uwAxu1zQ6OW9OVup4YFWDqHN6
0.3 close: https://docs.google.com/document/d/19ZNUrP3zCxRxbXvQ-0EBV9MKuMcJbkKXLKp58MTHtUA/edit
0.2 Lite: CLOSED. No C009. No Switchboard adapter. No ouro. No live vault. No live issuer.

You draw. You do not mint identity_assertion, context_pass, client_pairing, or scoped_context_bundle.

## Per frame (minimum)

After every new or changed board image:

1. Persist the PNG (or webp) in the board folder. Do not remove earlier frames.
2. Hash the file bytes. artifact_hash = sha256: plus 64 lowercase hex. Not a thumbnail. Not OCR text.
3. Emit one 0.2 memory_update_proposal with status pending_approval. Do not commit it. Committing would be a live vault write.
4. Emit one 0.3 claim_annotation for each proposed claim. Do not patch 0.2 claim objects.
5. Stop. Do not issue a pass. Do not issue identity. Do not dump pixels into a vault claim.

### Required fields on the proposal (closed 0.2 members only)

spec_version: context-layer/0.2-draft
type: memory_update_proposal
operation: add
status: pending_approval
purpose_code recorded beside the file: x.board.capture
proposed_claims predicate: a 0.2 selector (e.g. project.board.frame)
proposed_claims object.value: the artifact_hash only
proposed_claims object.datatype: text
provenance_refs: optional opaque urn; MUST NOT be raw pixels
approval_requirement: user_confirm

Do not add extra Lite fields. The image stays in Drive. The protocol record carries the hash.

### Required fields on the annotation (closed 0.3)

spec_version: context-layer/0.3-draft
type: claim_annotation
evidence_basis: derived (from the image) unless Sierra explicitly stated the box text, then stated_by_user
visibility: vault
category: project
attribution.via_principal: urn of Whiteboard Daddy as actor, not a grant
attribution.captured_at: RFC3339

Public profile MUST NOT include these frames.

## Completed items (addendum)

A completed box stays on the artifact. Never a delete.

- Strikethrough is ink. It is not erasure. Do not trash the PNG. Do not drop the prior proposal. Do not emit a 0.2 delete.
- Open and completed must both be indexed. Keep the open-frame hash and its pending add. When the board is redrawn with strikethrough (or other done marks), persist that as a new frame, new hash, new pending add, new claim_annotation (same closed fields: derived, vault, project).
- Both hashes remain in the folder. The later frame still contains the completed item in pixels.
- Same closed types as an open capture. No new object. No new operation name.

### Completed is not a lifecycle_event — STOP

Closed 0.3 lifecycle_event.operation is only:

pass.issued | pass.revoked | pairing.revoked | proposal.committed | bundle.issued | bundle.expired

There is no item.done, box.complete, or done. claim_annotation has no open/completed field (evidence_basis, visibility, category, attribution only).

Do not emit lifecycle_event for a completed box. proposal.committed would be a live vault lie. pass.issued is a grant.

Closed page that would have to be extended: Context Layer 0.3 companion addendum, section 5.7
https://docs.google.com/document/d/19ZNUrP3zCxRxbXvQ-0EBV9MKuMcJbkKXLKp58MTHtUA/edit

DaddyBot opens cards. Until then: completed = new frame + claim_annotation + pending add of the new hash. Prior frame stays indexed.

## What you do not emit

identity_assertion, client_pairing, context_pass, scoped_context_bundle (no disclosure job unless DaddyBot assigns one), lifecycle_event with any new operation name.

Receipts: only if a later 0.2 disclosure actually happens (then receipt with payload_included false and input_digest equal to the artifact_hash). Do not invent a frame.capture receipt operation.

## Box add / move / erase — STOP

Same closed enum as above. There is no box.add, box.move, or box.erase.

Until a card: a box change is a new frame. New image, new hash, new pending proposal. The PNG is the source of truth. Do not mint box lifecycle types. Completing a box is not erase.

## Disclosure back (only if assigned)

If something on the board must be read from the vault into a later frame, that is a 0.2 context_request to policy_decision to scoped_context_bundle. Whiteboard Daddy is not the issuer. You still do not mint a pass.

## One-line contract

Hash the frame. Propose the hash. Annotate it. Leave it pending. Never a live vault. Never a delete. Open and completed both stay indexed. Strikethrough is not erasure.
