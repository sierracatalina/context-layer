# Goals and measurement

Status: proposed targets, 2026-10-09. These are planning hypotheses, not accepted
commitments, adoption claims, or release promises. Role owners below are proposed;
no person or outside project has agreed to deliver them. Dates are review targets
in UTC. Missing a date triggers a recorded reassessment, never an automatic release.

## What success would mean

Context Layer should let an implementer exchange a small, purpose-bound piece of
context without granting access to the whole source. A useful specification is
understandable, independently implementable, and supported by reproducible evidence.
The [claim ledger](docs/CLAIM-EVIDENCE.md) separates those ambitions from tested work.

| ID | Proposed measurable target | Proposed owner | Proposed target date | Measurement and acceptance evidence | Baseline as of 2026-10-09 |
| --- | --- | --- | --- | --- | --- |
| G-IMPLEMENT | One implementation maintained outside this repository passes every applicable case in the pinned core conformance corpus without importing the JavaScript reference runtime. | External implementer, unassigned; maintainer coordinates review | 2026-12-15 | Public source/revision, license, declared profile, implementation provenance, exact kit/version/hash, command, environment and complete result report; all applicable cases pass and omissions are explained. Record specification ambiguities separately. | No qualifying outside implementation established by the pinned baseline. A second language implementation created within this project alone does not satisfy outside ownership. |
| G-ADOPT | Three outside projects each demonstrate a useful source-to-consumer flow using a pinned Context Layer profile. | Integration coordinator, unassigned; each outside project opts in separately | 2027-03-31 | Count distinct independently maintained projects with an owner-confirmed, reviewable integration link, revision, synthetic reproduction, purpose/recipient/expiry checks and negative-case results. Record profile, date and limitations for each. | Zero verified qualifying projects in this ledger; this is not a claim that no private experiments exist. Stars, forks, internal examples and announced intent do not count. |
| G-FREEZE | Freeze a v1 core contract after every freeze gate below has evidence and an explicit maintainer decision. | Specification/release maintainer, acceptance pending | 2027-06-30 | A signed-off freeze decision identifies exact spec, schema, kit and implementation revisions, linked evidence for each gate, compatibility policy and disposition of open issues. | Proposed. No v1 freeze, v1 release, certification or stability guarantee exists. |

Maintainers should review these targets monthly while they remain useful. This
paragraph creates no scheduled task, outreach permission, spending commitment, or
promise from an outside contributor. Record a target's accepted owner and revised
date only after that person agrees; retain the reason for a missed or changed target.

## Concrete user stories

These stories are proposed acceptance scenarios, not accounts of actual users.
All evaluation data is synthetic.

### 1. Prepare for one meeting without sharing a whole notebook

As a person using an assistant, I want to share the confirmed time, agenda and two
relevant project facts for one meeting with one assistant, so unrelated notes remain
private. The request declares the meeting-preparation purpose, named recipient,
short expiry and allowed action. The bundle contains only the approved facts.

Acceptance: a fixture with ten unrelated facts releases none of them; a wrong
recipient, expired grant and replay each fail before an action; the receipt records
the decision without copying notes. Existing local-core tests cover pieces of this
boundary; a real calendar/meeting integration and user evaluation are untested.

### 2. Move an approved summary between independently built tools

As an integration developer, I want my implementation to consume an approved
project summary produced by another implementation, so I can avoid giving my tool
raw source access. I need the same canonical bytes, recipient binding and failure
semantics on both sides.

Acceptance: two separately implemented adapters exchange the same pinned fixtures;
valid cases agree and tampered, revoked and unknown-field cases reject consistently.
Record every supported/unsupported profile and any ambiguity. A local demo alone
does not establish independent project interoperability.

### 3. Review a suggested memory change before it becomes a fact

As a person reviewing assistant memory, I want an inferred preference to remain a
proposal with provenance until I explicitly approve it, so a guess does not silently
replace my records.

Acceptance: the synthetic consumer produces a pending proposal; direct-write fields
are rejected; no consumer call commits to the vault. The current local-core proof
covers proposal-only behavior. A usable approval UI, approved-commit workflow and
human comprehension study are planned and untested.

## v1 freeze gates

All gates are proposed requirements for a future freeze decision; none is asserted
complete by its presence here.

- [ ] Core requirements have stable IDs and an exhaustive inventory; every applicable
  obligation maps to a test or a documented review procedure. Open normative
  ambiguities affecting wire bytes, authorization or failure behavior are resolved.
- [ ] G-IMPLEMENT has qualifying evidence, and the project implementation plus the
  outside implementation pass the same immutable conformance corpus. Reconcile the
  current four core vector sets with any proposed expanded corpus; do not count
  fixtures or prose oracles as additional executable sets.
- [ ] G-ADOPT has three qualifying, independently maintained project records,
  including the three story categories or a documented explanation of replacements.
- [ ] Versioned schema URLs resolve to the release bytes, profiles have explicit
  identifiers, and old versions remain available with a tested migration policy.
- [ ] Independent protocol/cryptography review has actually occurred. Publish a
  consented summary and disposition of every finding; no unresolved critical/high
  issue affecting the frozen profile remains. Internal tests do not substitute.
- [ ] Security assumptions, supported platforms, key custody, receipt rollback,
  revocation limits and recovery boundaries are documented and tested where
  feasible. Unsupported guarantees remain explicitly out of scope.
- [ ] The change process, public compatibility contract, deprecation policy and
  maintainer responsibility are recorded; all release gates in [RELEASE.md](RELEASE.md)
  pass on one exact candidate commit.
- [ ] At least three nontechnical readers independently explain purpose, restricted
  disclosure and proposal-only memory in their own words. Record method and
  anonymized outcomes with permission. Automated readability is supplementary.

## Reporting

Use the [roadmap](ROADMAP.md) to track sequencing and the
[claim ledger](docs/CLAIM-EVIDENCE.md) to record evidence, scope and limitations.
A status update should state the measurement date, accepted owner if any, target,
observed result, evidence link and next decision. Do not turn a proposed date or a
passing internal fixture into an adoption claim.
