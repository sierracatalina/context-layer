import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import {
  extractRequirements,
  generate,
  generateSpecArtifacts,
  keywordCounts,
  normalizeText,
  parseSpec,
  renderBlock,
  renderInline,
  specPath,
  stripGeneratedNavigation,
} from "../scripts/generate-spec-docs.mjs";
import { formatContextLayerHtml } from "../scripts/format-context-layer-site.mjs";

const root = resolve(import.meta.dirname, "..");
const read = async path => normalizeText(await readFile(resolve(root, path), "utf8"));
const source = await read(specPath);
const page = await read("site/context-layer/_pages/specification.html");
const blocks = parseSpec(source);
const requirements = extractRequirements(blocks);
const digest = text => createHash("sha256").update(text).digest("hex");

test("core count explicitly separates definitions, occurrences, and source passages", () => {
  assert.deepEqual(keywordCounts(stripGeneratedNavigation(source)), { MUST: 98, SHOULD: 25 });
  assert.deepEqual(keywordCounts(requirements.map(item => item.text).join("\n")), { MUST: 96, SHOULD: 23 });
  assert.equal(requirements.length, 56);
  const definition = blocks.filter(block => block.section?.number === "1").map(block => block.text).join("\n");
  assert.deepEqual(keywordCounts(definition), { MUST: 2, SHOULD: 2 });
});

test("navigation and citation edits preserve all normative excerpts and code examples", () => {
  // Review baseline: main 0a8d016c822f38e8fc857422e133d0699c42a21f.
  // Intentional future normative changes require reviewing these baselines as well.
  assert.equal(digest(requirements.map(item => item.text).join("\n\n")), "c50bb09a387492040d5a0f77a52fdef1d4fdef160301cd54b828f057145d306e");
  assert.equal(digest(blocks.filter(block => block.kind === "code").map(block => block.text).join("\n\n")), "007e0387eadb36492c95b702101f548e11f6762e53d3b9cb73ea679ee6d253bf");
});

test("governing keywords include all list children and the envelope table", () => {
  const byId = new Map(requirements.map(item => [item.id, item]));
  const expected = new Map([
    ["cl-r-9-1-01", 11], ["cl-r-9-2-02", 9], ["cl-r-9-3-01", 8],
    ["cl-r-10-5-01", 8], ["cl-r-11-4-02", 5], ["cl-r-12-01", 8], ["cl-r-12-02", 7],
  ]);
  for (const [id, count] of expected) {
    assert.equal((byId.get(id)?.text.match(/^- /gm) ?? []).length, count, id);
  }
  assert.match(byId.get("cl-r-6-1-01").text, /\| `issuer` \| object \| MUST identify/);
  assert.equal((byId.get("cl-r-14-01").text.match(/^\d+\. /gm) ?? []).length, 14);
});

test("every indexed passage renders in full and has shared GitHub/site anchors", () => {
  const indexIds = new Set();
  for (const item of requirements) {
    assert(!indexIds.has(item.id), `Duplicate requirement anchor: ${item.id}`);
    indexIds.add(item.id);
    assert.equal(source.split(`<a id="${item.id}"></a>`).length - 1, 1);
    assert.equal(page.split(`<a id="${item.id}"></a>`).length - 1, 1);
    for (const block of item.blocks) {
      assert(page.includes(formatContextLayerHtml(renderBlock(block))), `Missing rendered passage: ${item.id}`);
    }
  }
  const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "Duplicate page IDs");
  for (const [, anchor] of page.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(anchor), `Broken site anchor: ${anchor}`);
  for (const [, anchor] of source.matchAll(/\]\(#(cl-s-[0-9-]+)\)/g)) assert(source.includes(`id="${anchor}"`), `Broken Markdown ToC: ${anchor}`);
});

test("complete role lists remain visible without silently changing mixed-case strength", async () => {
  const roleBlocks = blocks.filter(block => block.section?.number.startsWith("13"));
  assert.equal(roleBlocks.filter(block => /^Must (implement|document):$/.test(block.text)).length, 6);
  const index = await read("NORMATIVE-INDEX.md");
  for (const block of roleBlocks.filter(block => block.kind !== "heading")) assert(index.includes(block.text));
  assert.match(index, /not an exhaustive validator/);
});

test("rendered specification includes current Ed25519 behavior and all sections", () => {
  assert.match(page, /Ed25519/);
  assert.match(page, /legacy HMAC/);
  assert(!page.includes("HMAC-authenticated bundle envelopes"));
  assert.match(page, /id="cl-s-7-3-1"/);
  assert.match(page, /id="cl-s-18-3"/);
  assert.match(page, /id="7-3-1-purpose-code-registry"/);
  assert.match(page, /id="7-5-scoped-context-bundle"/);
});

test("renderer escapes literal HTML and code, and rejects unsafe or unsupported links", () => {
  assert.equal(renderInline('A <img src=x onerror="bad()"> & B'), 'A &lt;img src=x onerror=&quot;bad()&quot;&gt; &amp; B');
  assert.equal(renderBlock({ kind: "code", text: '```html\n<script>alert("x")</script>\n```' }), '<pre><code class="language-html">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;\n</code></pre>');
  for (const link of ["javascript:evil", "data:text/html,test", "//evil.test/path"]) {
    assert.throws(() => renderInline(`[unsafe](${link})`), /Unsupported link/);
  }
  assert.throws(() => renderInline("![image](https://example.test/image.png)"), /Unsupported inline/);
  assert.throws(() => renderInline("~~deleted~~"), /Unsupported inline/);
  assert.throws(() => parseSpec("# Example\n\n> hidden MUST\n"), /Unsupported Markdown/);
  assert.throws(() => parseSpec("# Example\n\n<script>hidden</script>\n"), /Unsupported Markdown/);
  assert.throws(() => parseSpec("# Example\n\n```json\n{}\n"), /Unclosed code/);
});

test("new unsupported governing structure fails rather than dropping its children", () => {
  const input = "# Example\n\n## 2. Example\n\nClients MUST:\n\nSome unsupported child shape.\n";
  assert.throws(() => extractRequirements(parseSpec(input)), /Unrecognized governed block/);
});

test("generation preserves the page shell and is idempotent", () => {
  const output = generateSpecArtifacts(source, page);
  assert.equal(output.markdown, source);
  assert.equal(output.rendered, page);
  assert.equal(output.rendered.split('<article class="document-body">')[0], page.split('<article class="document-body">')[0]);
  assert.equal(output.rendered.split("</article>")[1], page.split("</article>")[1]);
});

test("generated index, website source mirror, and rendering are fresh", async () => {
  await generate({ check: true });
});

test("each prior-art comparison includes the required decision dimensions and primary links", async () => {
  const prior = await read("PRIOR-ART.md");
  const sections = prior.split(/^## /m).slice(1, 9);
  assert.equal(sections.length, 8);
  for (const section of sections) {
    assert.match(section, /\*\*What (?:it|they) provides?:\*\*/);
    assert.match(section, /\*\*Overlap:\*\*/);
    assert.match(section, /\*\*Difference:\*\*/);
    assert.match(section, /\*\*Why not just use/);
    assert.match(section, /\]\(https:\/\//);
  }
  assert.match(prior, /not a new cryptographic primitive/);
  assert.match(prior, /not a W3C Recommendation/);
});


test("authored documentation links resolve to repository files and explicit anchors", async () => {
  const paths = [specPath, "NORMATIVE-SUMMARY.md", "NORMATIVE-INDEX.md", "PRIOR-ART.md"];
  for (const path of paths) {
    const content = await read(path);
    for (const [, href] of content.matchAll(/\]\(([^\s)]+)\)/g)) {
      if (href.startsWith("https://")) continue;
      const [file, fragment] = href.split("#");
      const target = file ? resolve(root, dirname(path), file) : resolve(root, path);
      const targetText = await readFile(target, "utf8");
      if (fragment?.startsWith("cl-")) assert(targetText.includes(`id="${fragment}"`), `${path}: ${href}`);
    }
  }
});

test("downloadable site source preserves all normative text with usable document links", async () => {
  const mirror = await read("site/context-layer/source/context-layer-technical-specification.md");
  assert.deepEqual(extractRequirements(parseSpec(mirror)).map(item => item.text), requirements.map(item => item.text));
  assert(!mirror.includes("](../../NORMATIVE-"));
  assert(!mirror.includes("](../../PRIOR-ART.md)"));
  assert(!mirror.includes("Canonical local context"));
});


test("full artifact generation normalizes CRLF and CR while retaining canonical LF output", () => {
  for (const newline of ["\r\n", "\r"]) {
    const output = generateSpecArtifacts(source.replaceAll("\n", newline), page.replaceAll("\n", newline));
    assert.equal(output.markdown, source);
    assert.equal(output.rendered, page);
    assert.deepEqual(output.requirements.map(item => item.text), requirements.map(item => item.text));
    assert(!output.mirror.includes("\r"));
  }
});

test("the actual --check CLI accepts a CRLF checkout", async () => {
  const checkout = await mkdtemp(resolve(tmpdir(), "context-spec-crlf-"));
  const files = [
    specPath, "NORMATIVE-INDEX.md", "site/context-layer/_pages/specification.html",
    "site/context-layer/source/context-layer-technical-specification.md",
    "scripts/generate-spec-docs.mjs", "scripts/format-context-layer-site.mjs",
    "site/context-layer/assets/context-layer-editorial.mjs",
  ];
  try {
    for (const path of files) {
      await mkdir(dirname(resolve(checkout, path)), { recursive: true });
      await writeFile(resolve(checkout, path), (await read(path)).replaceAll("\n", "\r\n"), "utf8");
    }
    const result = execFileSync(process.execPath, [resolve(checkout, "scripts/generate-spec-docs.mjs"), "--check"], { encoding: "utf8" });
    assert.match(result, /Verified core spec documentation: 123 raw keywords; 119 indexed in 56 passages/);
    // Checking freshness is read-only; it does not rewrite checkout line endings.
    assert((await readFile(resolve(checkout, specPath), "utf8")).includes("\r\n"));
  } finally {
    await rm(checkout, { recursive: true, force: true });
  }
});
