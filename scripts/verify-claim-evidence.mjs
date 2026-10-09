import { readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const allowedStatuses = new Set([
  "implemented-tested", "implemented-inspected", "proposed-untested", "not-established",
]);

export async function loadClaimEvidence() {
  const ledger = JSON.parse(await readFile(resolve(root, "docs/claim-evidence.json"), "utf8"));
  if (ledger.format !== "context-layer-claim-evidence/1" || !/^[a-f0-9]{40}$/.test(ledger.baseline_revision)) {
    throw new Error("Invalid ledger format or pinned baseline revision");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ledger.review_date) || !Array.isArray(ledger.claims) || ledger.claims.length === 0) {
    throw new Error("Ledger needs a review date and claims");
  }
  const ids = new Set();
  for (const claim of ledger.claims) {
    if (!/^C\d{2}$/.test(claim.id) || ids.has(claim.id)) throw new Error(`Invalid or duplicate claim ID: ${claim.id}`);
    ids.add(claim.id);
    if (!allowedStatuses.has(claim.status)) throw new Error(`Invalid claim status: ${claim.id}`);
    for (const key of ["claim", "scope", "limits", "next_evidence", "date", "revision"]) {
      if (typeof claim[key] !== "string" || claim[key].trim() === "") throw new Error(`Missing ${key}: ${claim.id}`);
    }
    if (!/^[a-f0-9]{40}$/.test(claim.revision)) throw new Error(`Claim needs immutable evidence revision: ${claim.id}`);
    if (!Array.isArray(claim.evidence) || claim.evidence.length === 0) throw new Error(`No evidence pointers: ${claim.id}`);
    for (const evidence of claim.evidence) {
      if (typeof evidence.path !== "string" || evidence.path.startsWith("/") || evidence.path.split("/").includes("..")) {
        throw new Error(`Unsafe evidence path: ${claim.id}`);
      }
      await access(resolve(root, evidence.path));
      if (evidence.test && !(await readFile(resolve(root, evidence.path), "utf8")).includes(evidence.test)) {
        throw new Error(`Missing named test for ${claim.id}: ${evidence.test}`);
      }
    }
  }
  return ledger;
}

export function renderClaimEvidence(ledger) {
  const lines = [
    "# Claims and evidence", "",
    `Evidence review date: ${ledger.review_date}. Baseline revision: \`${ledger.baseline_revision}\`.`, "",
    "This is a repository-wide inventory of material capability claims, not a security",
    "score, certification, exhaustive proof, or record of every normative obligation.",
    "The structured source is [claim-evidence.json](claim-evidence.json). Links pin the",
    "revision actually inspected. A later implementation can improve these results",
    "only after its exact commit and evidence are recorded; branch work is not silently",
    "treated as merged, deployed or externally adopted.", "",
    `Baseline CI: [Ubuntu and Windows run](${ledger.baseline_ci_url}). ${ledger.baseline_ci_scope}`, "",
    "## Status meanings", "",
    "- **implemented-tested:** code and named automated coverage exist at the linked",
    "  revision, with baseline CI evidence. Read limits; finite tests are not guarantees.",
    "- **implemented-inspected:** an artifact or configuration was inspected; the",
    "  corresponding operational outcome is not established by that inspection.",
    "- **proposed-untested:** a design, scenario or planned integration, not a shipped claim.",
    "- **not-established:** the required evidence is absent from this baseline inventory;",
    "  this does not assert that no private or unrecorded work exists elsewhere.", "",
    "A normative requirement states what an implementation should do. It does not",
    "demonstrate that any implementation does it. Schema validity alone is not",
    "behavioral conformance. A passed synthetic test does not establish adoption,",
    "human comprehension, outside review, production interoperability or certification.", "",
    "## Claim index", "",
    "| ID | Claim | Status |", "| --- | --- | --- |",
    ...ledger.claims.map(c => `| [${c.id}](#${c.id.toLowerCase()}) | ${c.claim} | ${c.status} |`), "",
    "## Evidence by claim", "",
  ];
  for (const claim of ledger.claims) {
    lines.push(`### ${claim.id}`, "", claim.claim, "",
      `- Status: **${claim.status}**. Reviewed ${claim.date}.`,
      `- Scope: ${claim.scope}`,
      `- Evidence revision: \`${claim.revision}\`.`,
      ...claim.evidence.map(e => `- [${e.path}](https://github.com/sierracatalina/context-layer/blob/${claim.revision}/${e.path})${e.test ? `: “${e.test}”` : ""}.`),
      `- Limits: ${claim.limits}`,
      `- Next evidence: ${claim.next_evidence}`, "");
  }
  lines.push("## Keeping claims honest", "",
    "This inventory covers root positioning, specifications and informative guides,",
    "companion/Nostr proposals, local implementation and test artifacts, security/release",
    "docs, and public site source/mirrors. For every changed claim, update the row,",
    "evidence revision, exact test or review artifact, date, scope and remaining limit.",
    "Preserve historical release notes as historical statements; correct current copy",
    "rather than rewriting old snapshots to imply present capabilities existed then.", "",
    "Keep planned/experimental labels close to the relevant documentation and site",
    "claim. Do not publish unsupported numerical security ratings, certified status,",
    "production-proven language, independent-review assertions or adopter counts.",
    "The [goals](../GOALS.md) and [roadmap](../ROADMAP.md) are proposed targets; they",
    "are not evidence. Release promotion follows [RELEASE.md](../RELEASE.md).", "",
    "Regenerate this file after editing the JSON with", "`node scripts/verify-claim-evidence.mjs --write`; verify it with",
    "`node scripts/verify-claim-evidence.mjs`. Link checks establish artifact presence",
    "and named-test references in the current checkout, not historical bytes at each",
    "pinned revision, the truth of all prose or a fresh test pass. Reviewers verify",
    "pinned references separately before changing evidence status.", "");
  return lines.join("\n");
}

export async function verifyClaimEvidence({ write = false } = {}) {
  const ledger = await loadClaimEvidence();
  const rendered = renderClaimEvidence(ledger);
  const path = resolve(root, "docs/CLAIM-EVIDENCE.md");
  if (write) await writeFile(path, rendered);
  else if ((await readFile(path, "utf8")).replace(/\r\n/g, "\n") !== rendered) throw new Error("Claim evidence Markdown is stale; regenerate from JSON");
  return ledger;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ledger = await verifyClaimEvidence({ write: process.argv.includes("--write") });
  process.stdout.write(`Claim evidence verified: ${ledger.claims.length} scoped claims; baseline ${ledger.baseline_revision}.\n`);
}
