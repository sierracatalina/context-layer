import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { contextLayerPageNames } from "./format-context-layer-site.mjs";

const root = resolve(import.meta.dirname, "..");
const corePath = "protocol/spec/context-layer-technical-specification.md";
const companionPath = "protocol/companions/0.3-draft/spec.md";
const overviewPath = "site/context-layer/_pages/overview.html";
const glossaryPath = "site/context-layer/source/glossary.md";
const lf = (text) => text.replace(/\r\n?/g, "\n");
const source = async (path) => lf(await readFile(resolve(root, path), "utf8"));
const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "");
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function markdownText(markdown) {
  return lf(markdown).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^```[^\n]*$/gm, "").replace(/^[#>]+\s*/gm, "").replace(/^\d+\.\s*/gm, "").replace(/[*`]/g, "").replace(/&/g, " and ");
}

export function words(text) {
  return text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? [];
}

// Deterministic English heuristic, not a dictionary or a human reading test.
export function syllables(token) {
  if (token.includes("-")) return token.split("-").reduce((sum, part) => sum + syllables(part), 0);
  let word = token.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 1;
  const exceptions = { ai: 2, api: 3, cl: 2, json: 2, one: 1, once: 1, rules: 1, people: 2, every: 2, different: 3, business: 2 };
  if (exceptions[word]) return exceptions[word];
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (word.match(/[aeiouy]{1,2}/g) ?? []).length);
}

export function readability(markdown) {
  const prose = markdownText(markdown.replace(/```[\s\S]*?```/g, "").replace(/^#{1,6} .+$/gm, ""));
  const tokens = words(prose);
  const sentenceText = prose.replace(/(\d)\.(?=\d)/g, "$1");
  const sentences = sentenceText.split(/[.!?]+(?:\s|$)/).filter((part) => words(part).length).length;
  const count = tokens.reduce((sum, token) => sum + syllables(token), 0);
  assert(tokens.length > 0 && sentences > 0, "readability needs prose");
  return { words: words(markdownText(markdown)).length, proseWords: tokens.length, sentences, syllables: count, readingEase: 206.835 - 1.015 * tokens.length / sentences - 84.6 * count / tokens.length };
}

export function verifyReadable(markdown, maximum, label) {
  const score = readability(markdown);
  assert(score.words <= maximum, `${label}: ${score.words} words exceeds ${maximum}`);
  assert(score.readingEase >= 50, `${label}: reading ease ${score.readingEase.toFixed(2)} is below 50`);
  return score;
}

function section(text, heading) {
  const lines = lf(text).split("\n");
  const start = lines.findIndex((line) => line === heading);
  assert(start >= 0, `source section not found: ${heading}`);
  const depth = heading.match(/^#+/)[0].length;
  let end = start + 1;
  while (end < lines.length && !new RegExp(`^#{1,${depth}} `).test(lines[end])) end++;
  return lines.slice(start + 1, end).join("\n");
}

export function glossaryInventory(core, companion, guide) {
  const terms = [];
  const add = (value, origin) => terms.push({ term: value, origin });
  for (const [doc, heading, origin] of [[core, "## 5. Terminology", "core terminology"], [companion, "## 4. Terminology", "companion terminology"]]) {
    for (const match of section(doc, heading).matchAll(/^\*\*([^*]+)\*\*$/gm)) add(match[1], origin);
  }
  for (const match of section(core, "### 4.1 Components").matchAll(/^\| ([^|]+) \|/gm)) {
    if (!/Component|---/.test(match[1])) add(match[1].trim(), "core components");
  }
  for (const match of section(core, "### 4.2 Trust zones").matchAll(/\*\*([^*]+):\*\*/g)) add(match[1], "trust zones");
  for (const match of section(core, "## 7. Core data objects").matchAll(/^### 7\.\d+ `([^`]+)`/gm)) add(match[1], "core objects");
  for (const match of section(core, "## 13. Conformance profiles").matchAll(/^### 13\.\d+ `([^`]+)`/gm)) add(match[1], "core roles");
  for (const match of section(core, "#### 7.3.1 Purpose code registry").matchAll(/^\| `([^`]+)` \|/gm)) add(match[1], "purpose registry");
  for (const match of section(core, "### 7.4 `policy_decision`").split("Valid decisions are:")[1].split("```", 1)[0].matchAll(/^- `([^`]+)`$/gm)) add(match[1], "policy outcomes");
  for (const match of section(companion, "## 5. Objects").matchAll(/^### 5\.\d+ `([^`]+)`/gm)) add(match[1], "companion objects");
  for (const match of section(companion, "## 5. Objects").matchAll(/^\| `([^`]+)` \|/gm)) add(match[1], "companion named values");
  for (const match of section(guide, "## 3. Deployment profiles").matchAll(/^### 3\.\d+ (.+)$/gm)) add(match[1], "deployment profiles");
  for (const term of ["CL-Core-Lite", "CL-Pass", "purpose_code", "Capability", "Provenance", "Policy snapshot", "Selector", "Predicate", "Authentication", "Authorization", "Retention", "onward_disclosure", "client_instance", "Receipt anchor", "Writeback"]) add(term, "supporting contract concepts");
  return terms;
}

export function verifyGlossary(glossary, inventory) {
  glossary = lf(glossary);
  const entries = glossary.split("\n").filter((line) => line.startsWith("- **"));
  const labels = new Set();
  for (const line of entries) {
    const match = line.match(/^- \*\*([^*]+)\*\*(?: \[`([^`]+)`\])?: (.+)$/);
    assert(match, `glossary entry must be one complete line: ${line}`);
    assert(!labels.has(normalize(match[1])), `duplicate glossary term: ${match[1]}`);
    labels.add(normalize(match[1]));
    if (match[2]) labels.add(normalize(match[2]));
  }
  assert(entries.length > 0, "glossary must have entries");
  for (const { term, origin } of inventory) assert(labels.has(normalize(term)), `missing glossary term ${term} [${origin}]`);
  for (const line of glossary.split("\n")) assert(!/^\s+\S/.test(line), "glossary entries cannot wrap onto another source line");
  return { entries: entries.length, sourceTerms: new Set(inventory.map(({ term }) => normalize(term))).size, sourceReferences: inventory.length };
}

function siteLink(url) {
  if (url === "GLOSSARY.md") return "/context-layer/source/glossary.md";
  if (url === corePath) return "/context-layer/specification";
  return url;
}

function inline(markdown) {
  return markdown.split(/(\[[^\]]+\]\([^)]+\))/g).map((part) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    return match ? `<a href="${escape(siteLink(match[2]))}">${escape(match[1])}</a>` : escape(part);
  }).join("");
}

export function renderOverview(markdown, index) {
  markdown = lf(markdown);
  index = lf(index);
  const title = markdown.match(/^# (.+)$/m)?.[1];
  assert(title, "overview title missing");
  const blocks = markdown.replace(/^# .+\n+/, "").trim().split(/\n\n+/);
  const body = blocks.map((block) => {
    if (block.startsWith("## ")) {
      const text = block.slice(3);
      return `<h2 id="${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${escape(text)}</h2>`;
    }
    if (block.startsWith("```text\n")) return `<figure aria-label="Context exchange flow"><pre>${escape(block.replace(/^```text\n|\n```$/g, ""))}</pre><figcaption>Context leaves the vault only after a rules check allows it.</figcaption></figure>`;
    if (/^1\. /.test(block)) return `<ol>${block.split("\n").map((line) => `<li>${inline(line.replace(/^\d+\. /, ""))}</li>`).join("")}</ol>`;
    return `<p>${inline(block)}</p>`;
  }).join("\n");
  const nav = [...markdown.matchAll(/^## (.+)$/gm)].map(([, text]) => `<li><a href="#${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${escape(text)}</a></li>`).join("");
  const description = "A short guide to sharing useful context with an app or AI agent, with clear rules & user control.";
  let shell = index.slice(0, index.indexOf('<main id="main"'));
  shell = shell.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)} | sierra catalina</title>`)
    .replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="https://sierracatalina.com/context-layer/overview">')
    .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*/g, `$1${escape(description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${escape(title)}`);
  return `${shell}<main id="main" class="context-main document-main">
<header class="document-hero shell"><p class="context-meta">a short introduction / v0.2 draft</p><h1>${escape(title)}</h1></header>
<div class="document-layout shell"><aside class="document-rail"><nav class="document-toc" aria-label="Overview sections"><ol>${nav}</ol></nav></aside>
<article class="document-body" data-overview-content>
${body}
</article></div>
</main>
${index.slice(index.indexOf('<footer class="context-footer"'))}`;
}

export async function verifyLocalLinks(text, path, config) {
  const links = path.endsWith(".html") ? [...text.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]) : [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((m) => m[1]);
  for (const url of links) {
    if (/^https?:\/\//.test(url)) continue; // Network availability is not part of this offline check.
    const [pathname, fragment] = url.split("#");
    const clean = pathname.split("?")[0];
    let target = resolve(root, path);
    if (clean.startsWith("/")) {
      const route = config.rewrites.find(({ source }) => source === clean);
      target = resolve(root, "site", (route?.destination ?? clean).slice(1));
    } else if (clean) target = resolve(root, dirname(path), clean);
    assert(!relative(root, target).startsWith(".."), `link escapes repository: ${url}`);
    await stat(target).catch(() => assert.fail(`${path}: broken local link ${url}`));
    if (fragment) {
      const targetText = await readFile(target, "utf8");
      assert(targetText.includes(`id="${fragment}"`), `${path}: broken fragment ${url}`);
    }
  }
}

export async function verifyOverview({ write = false } = {}) {
  const [overview, readme, glossary, core, companion, guide, index, configText] = await Promise.all(["OVERVIEW.md", "README.md", "GLOSSARY.md", corePath, companionPath, "protocol/spec/context-layer-implementation-and-interoperability.md", "site/context-layer/_pages/index.html", "site/vercel.json"].map(source));
  const config = JSON.parse(configText);
  const headings = [...overview.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(headings, ["What it is", "The problem", "How it works", "What it is not", "Status"]);
  assert.equal(section(overview, "## What it is").trim().split(/\n\n+/).length, 1, "what it is must be one paragraph");
  const steps = [...section(overview, "## How it works").matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
  assert(steps.length > 0 && steps.length <= 5, "overview must use at most five steps");
  assert.deepEqual(steps, steps.map((_, i) => i + 1));
  assert.equal((overview.match(/^```text$/gm) ?? []).length, 1, "overview needs exactly one diagram");
  assert(!/[—]|\([^)]*\)/.test(overview.replace(/\]\([^)]+\)/g, "]")), "overview prose uses square-bracket asides & no em dash");
  const overviewScore = verifyReadable(overview, 700, "overview");
  const tldrScore = verifyReadable(section(readme, "## TL;DR"), 150, "README TL;DR");
  const glossaryResult = verifyGlossary(glossary, glossaryInventory(core, companion, guide));
  const html = renderOverview(overview, index);
  const publishedGlossary = glossary.replaceAll(`](${corePath})`, "](/context-layer/specification)").replaceAll(`](${companionPath})`, `](https://github.com/sierracatalina/context-layer/blob/main/${companionPath})`);
  if (write) {
    await writeFile(resolve(root, overviewPath), html);
    await writeFile(resolve(root, glossaryPath), publishedGlossary);
  }
  assert.equal(await source(overviewPath), html, "overview HTML drifted; run node scripts/verify-context-layer-overview.mjs --write");
  assert.equal(await source(glossaryPath), publishedGlossary, "published glossary drifted; regenerate the overview");
  assert.equal(config.rewrites.find(({ source }) => source === "/context-layer/overview")?.destination, "/context-layer/_pages/overview.html");
  assert(index.includes('href="/context-layer/overview"'), "home page must lead to the plain-language overview");
  const pageNames = (await readdir(resolve(root, "site/context-layer/_pages"))).filter((name) => name.endsWith(".html")).sort();
  assert.deepEqual(pageNames, [...contextLayerPageNames, "overview"].map((name) => `${name}.html`).sort(), "every page must have an editorial contract");
  for (const [text, path] of [[overview, "OVERVIEW.md"], [glossary, "GLOSSARY.md"], [readme, "README.md"], [html, overviewPath], [publishedGlossary, glossaryPath]]) await verifyLocalLinks(text, path, config);
  // Include navigation & diagram labels in the page word budget, but measure
  // reading ease on article prose rather than interface labels or diagram arrows.
  const visible = (text) => text.replace(/<[^>]+>/g, " ").replace(/&amp;/g, " and ").replace(/&[a-z]+;/g, " ");
  const bodyText = visible(html.slice(html.indexOf("<body>")));
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/)[1];
  const articleProse = visible(article.replace(/<h2[^>]*>[\s\S]*?<\/h2>/g, "").replace(/<pre>[\s\S]*?<\/pre>/g, ""));
  const renderedScore = verifyReadable(articleProse, 700, "rendered overview");
  const pageWords = words(bodyText).length;
  assert(pageWords <= 700, "complete rendered overview exceeds 700 words");
  return { overview: overviewScore, rendered: { ...renderedScore, pageWords }, tldr: tldrScore, glossary: glossaryResult };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await verifyOverview({ write: process.argv.includes("--write") });
  console.log(JSON.stringify(result, null, 2));
}
