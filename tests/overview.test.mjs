import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  glossaryInventory,
  markdownText,
  readability,
  renderOverview,
  syllables,
  verifyGlossary,
  verifyLocalLinks,
  verifyOverview,
  verifyReadable,
  words,
} from "../scripts/verify-context-layer-overview.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("overview, TLDR, glossary, rendered page and local links satisfy the G1 contract", async () => {
  const result = await verifyOverview();
  assert(result.overview.readingEase >= 50);
  assert(result.tldr.readingEase >= 50);
  assert(result.glossary.sourceTerms > 80);
});

test("readability counts visible link labels, ampersands and headings, but excludes diagram from prose", () => {
  const text = "# A short guide\n\n[We](https://example.test/long/path) read & write.\n\n```text\nA → B\n```";
  assert.equal(words(markdownText(text)).length, 9);
  assert.equal(readability(text).proseWords, 4);
  assert.equal(readability(text).sentences, 1);
  assert.equal(syllables("AI"), 2);
  assert.equal(syllables("people"), 2);
  assert.equal(syllables("rules"), 1);
  assert.equal(syllables("context"), 2);
  assert.equal(syllables("0"), 1);
  assert.throws(() => verifyReadable("We read. We write.", 2, "fixture"), /words exceeds/);
  assert.throws(() => verifyReadable("Interoperability institutionalization internationalization operationalization.", 100, "fixture"), /below 50/);
});

test("glossary derives coverage from both specifications and fails on an omitted term", async () => {
  const [core, companion, guide, glossary] = await Promise.all([
    "protocol/spec/context-layer-technical-specification.md",
    "protocol/companions/0.3-draft/spec.md",
    "protocol/spec/context-layer-implementation-and-interoperability.md",
    "GLOSSARY.md",
  ].map(read));
  const inventory = glossaryInventory(core, companion, guide);
  for (const term of ["Subject", "Claim annotation", "Policy engine", "CL-Discovery", "minimum_reveal_response", "execute.approved_action", "needs_approval", "preference", "bundle.expired"]) assert(inventory.some((entry) => entry.term === term), term);
  assert.throws(() => verifyGlossary(glossary.replace(/^- \*\*Claim annotation\*\*.*\n/m, ""), inventory), /missing glossary term/);
  assert.throws(() => verifyGlossary(`${glossary}\n- **Subject**: Duplicate.\n`, inventory), /duplicate/);
  assert.throws(() => verifyGlossary(`${glossary}\n  A wrapped definition.\n`, inventory), /cannot wrap/);
  const changedCore = core.replace("## 5. Terminology", "## 5. Terminology\n\n**New term**\nA new definition.");
  assert.throws(() => verifyGlossary(glossary, glossaryInventory(changedCore, companion, guide)), /New term/);
});

test("overview rendering preserves sentence case and safely maps links", async () => {
  const [overview, index] = await Promise.all(["OVERVIEW.md", "site/context-layer/_pages/index.html"].map(read));
  const html = renderOverview(overview, index);
  assert.match(html, /<h2 id="what-it-is">What it is<\/h2>/);
  assert.match(html, /href="\/context-layer\/source\/glossary.md"/);
  assert.match(html, /href="\/context-layer\/specification"/);
  assert.equal((html.match(/<figure /g) ?? []).length, 1);
  assert.match(html, /class="context-menu-toggle"[^>]+hidden/);
  assert.match(html, /class="skip-link" href="#main"/);
  assert(!html.includes("text-transform"));
  assert(renderOverview(overview.replace("Context means", "<script> Context means"), index).includes("&lt;script&gt; Context means"));
});

test("offline link checks reject missing files, missing anchors and traversal", async () => {
  const config = JSON.parse(await read("site/vercel.json"));
  await assert.rejects(verifyLocalLinks('[Bad](missing.md)', "OVERVIEW.md", config), /broken local link/);
  await assert.rejects(verifyLocalLinks('<a href="#missing">Bad</a>', "site/context-layer/_pages/overview.html", config), /broken fragment/);
  await assert.rejects(verifyLocalLinks('[Bad](../missing.md)', "OVERVIEW.md", config), /escapes repository/);
});
