import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { verifyClaimEvidence } from "../scripts/verify-claim-evidence.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("claim ledger has pinned evidence, existing paths, named tests and a synchronized summary", async () => {
  const ledger = await verifyClaimEvidence();
  assert(ledger.claims.length >= 20);
  for (const claim of ledger.claims.filter(c => c.status === "implemented-tested")) {
    assert(claim.evidence.some(e => e.test && (e.path.endsWith(".test.mjs") || /(?:^|\/)tests\/test_[^/]+\.py$/.test(e.path))), claim.id);
  }
  for (const claim of ledger.claims.filter(c => c.status === "not-established")) {
    assert(claim.next_evidence.length > 20, claim.id);
    assert(claim.limits.length > 20, claim.id);
  }
});

test("release policy matches package metadata and distinguishes versions without claiming a release", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const lock = JSON.parse(await read("package-lock.json"));
  const release = await read("RELEASE.md");
  assert.equal(pkg.version, lock.version);
  assert.equal(pkg.version, lock.packages[""].version);
  assert(release.includes(`\`${pkg.version}\``));
  assert.match(release, /context-layer\/0\.2-draft/);
  assert.match(release, /context-layer\/0\.3-draft/);
  assert.match(release, /No tag or release is created/);
  assert.match(release, /## v0\.3 readiness criteria/);
  assert.match(release, /site\/context-layer\//);
  assert.doesNotMatch(release, /0\.2\.0-draft\.1|source are intentionally maintained outside/);
});

test("adoption and freeze goals remain proposed with owners, dates and measurements", async () => {
  const goals = await read("GOALS.md");
  for (const id of ["G-IMPLEMENT", "G-ADOPT", "G-FREEZE"]) assert(goals.includes(id));
  for (const field of ["Proposed owner", "Proposed target date", "Measurement and acceptance evidence"]) assert(goals.includes(field));
  assert.match(goals, /not accepted\s+commitments/);
  assert.equal((goals.match(/^### [123]\. /gm) ?? []).length, 3);
  assert.match(goals, /Zero verified qualifying projects/);
  assert.match(await read("ROADMAP.md"), /not proof of completion/);
});

test("security reporting routes privately and public forms discourage sensitive details", async () => {
  const config = await read(".github/ISSUE_TEMPLATE/config.yml");
  assert.match(config, /blank_issues_enabled: false/);
  assert.match(config, /https:\/\/github\.com\/sierracatalina\/context-layer\/security\/advisories\/new/);
  for (const name of ["bug_report.yml", "spec_question.yml"]) {
    const source = await read(`.github/ISSUE_TEMPLATE/${name}`);
    assert.match(source, /public/i);
    assert.match(source, /private reporting/);
    assert.match(source, /synthetic/i);
  }
  const template = await read(".github/SECURITY_REPORT_TEMPLATE.md");
  assert.match(template, /not a public issue template/);
  assert.match(template, /No fallback email/);
});

test("broader implementation and essay claims are labeled in source and site mirrors", async () => {
  for (const path of ["protocol/spec/context-layer-implementation-and-interoperability.md", "site/context-layer/source/context-layer-implementation-and-interoperability.md"]) {
    const source = await read(path);
    assert.match(source, /Proposed, untested recipes/);
    assert.match(source, /site\/context-layer\//);
  }
  for (const path of ["protocol/spec/context-layer-blog-post.md", "site/context-layer/source/context-layer-blog-post.md"]) {
    assert.match(await read(path), /Proposed integrations; untested unless explicitly evidenced/);
  }
  assert.match(await read("site/context-layer/_pages/implementation.html"), /proposed, untested recipes/);
  assert.match(await read("site/context-layer/_pages/essay.html"), /proposed integrations; untested unless explicitly evidenced/);
});
