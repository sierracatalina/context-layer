import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { formatContextLayerHtml } from "./format-context-layer-site.mjs";

const root = resolve(import.meta.dirname, "..");
export const specPath = "protocol/spec/context-layer-technical-specification.md";
const mirrorPath = "site/context-layer/source/context-layer-technical-specification.md";
const pagePath = "site/context-layer/_pages/specification.html";
const tocStart = "<!-- BEGIN GENERATED SPEC NAVIGATION -->";
const tocEnd = "<!-- END GENERATED SPEC NAVIGATION -->";
const keyword = /\b(?:MUST|SHOULD)\b/g;

export const normalizeText = text => text.replace(/\r\n?/g, "\n");

export function keywordCounts(text) {
  return {
    MUST: (text.match(/\bMUST\b/g) ?? []).length,
    SHOULD: (text.match(/\bSHOULD\b/g) ?? []).length,
  };
}

export function stripGeneratedNavigation(text) {
  return normalizeText(text)
    .replace(new RegExp(`${tocStart}[\\s\\S]*?${tocEnd}\\n\\n`, "g"), "")
    .replace(/^<a id="cl-(?:s|r)-[0-9-]+"><\/a>\n\n/gm, "");
}

/** Deliberately limited to this spec's grammar; unsupported constructs fail loudly. */
export function parseSpec(text) {
  const lines = stripGeneratedNavigation(text).trimEnd().split("\n");
  const blocks = [];
  let section = null;
  for (let i = 0; i < lines.length;) {
    if (!lines[i].trim()) { i++; continue; }
    const start = i;
    const heading = lines[i].match(/^(#{1,4}) (.+)$/);
    const fence = lines[i].match(/^```([a-z0-9-]*)$/);
    let kind = "paragraph";
    if (heading) {
      kind = "heading";
      const number = heading[2].match(/^(\d+(?:\.\d+)*)(?:\.|\s) /)?.[1]
        ?? heading[2].match(/^(\d+(?:\.\d+)*)\s/)?.[1];
      if (number) section = { number, title: heading[2], level: heading[1].length };
      i++;
    } else if (fence) {
      kind = "code";
      i++;
      while (i < lines.length && lines[i] !== "```") i++;
      assert(i < lines.length, `Unclosed code fence at line ${start + 1}`);
      i++;
    } else {
      while (i < lines.length && lines[i].trim()) {
        assert(!/^(?:>|<|!\[|\s+[-*]|#{5,}|~~~)/.test(lines[i]), `Unsupported Markdown at line ${i + 1}`);
        assert(!/^(?:#{1,4} |```)/.test(lines[i]), `Missing block boundary at line ${i + 1}`);
        i++;
      }
      if (/^\|/.test(lines[start])) kind = "table";
      else if (/^(?:- |\d+\. )/.test(lines[start])) kind = "list";
    }
    blocks.push({ kind, text: lines.slice(start, i).join("\n"), section, line: start + 1 });
  }
  return blocks;
}

export function extractRequirements(blocks) {
  const requirements = [];
  const perSection = new Map();
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.kind === "code" || block.kind === "heading" || block.section?.number === "1") continue;
    if (!(block.text.match(keyword)?.length)) continue;
    assert(block.section, `Requirement outside a numbered section at line ${block.line}`);
    const included = [block];
    // A keyword governing a list/table also governs its keyword-free children.
    if (block.text.endsWith(":")) {
      assert(["list", "table"].includes(blocks[i + 1]?.kind), `Unrecognized governed block at line ${block.line}`);
      included.push(blocks[++i]);
    }
    // The test cases are introduced after the requirement to publish results.
    if (block.section.number === "14") {
      assert.equal(blocks[i + 1]?.text, "Minimum tests include:");
      assert.equal(blocks[i + 2]?.kind, "list");
      included.push(blocks[++i], blocks[++i]);
    }
    const sequence = (perSection.get(block.section.number) ?? 0) + 1;
    perSection.set(block.section.number, sequence);
    const id = `cl-r-${block.section.number.replaceAll(".", "-")}-${String(sequence).padStart(2, "0")}`;
    requirements.push({ id, section: block.section, blocks: included, text: included.map(item => item.text).join("\n\n") });
  }
  return requirements;
}

const sectionId = section => `cl-s-${section.number.replaceAll(".", "-")}`;
const legacyId = title => title.replaceAll("`", "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const escapeHtml = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function renderInline(text) {
  assert(!/!\[|~~/.test(text), `Unsupported inline Markdown: ${text}`);
  const tokens = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^\s()]+)\)/g;
  let output = "";
  let start = 0;
  const plain = value => {
    assert(!/[`*]|!\[|\]\(/.test(value), `Unsupported inline Markdown: ${value}`);
    return escapeHtml(value);
  };
  for (const match of text.matchAll(tokens)) {
    output += plain(text.slice(start, match.index));
    if (match[1] !== undefined) output += `<code>${escapeHtml(match[1])}</code>`;
    else if (match[2] !== undefined) output += `<strong>${renderInline(match[2])}</strong>`;
    else {
      let href = match[4];
      assert(/^(?:https:\/\/|#[a-zA-Z0-9-]+$|(?:\.\.\/)?[a-zA-Z0-9][a-zA-Z0-9./_-]*\.md(?:#[a-zA-Z0-9-]+)?$|(?:\.\.\/)+[a-zA-Z0-9./_-]+$)/.test(href), `Unsupported link: ${href}`);
      if (href === "../../PRIOR-ART.md") href = "https://github.com/sierracatalina/context-layer/blob/main/PRIOR-ART.md";
      else if (href === "context-layer-implementation-and-interoperability.md") href = "/context-layer/implementation";
      output += `<a href="${escapeHtml(href)}"${href.startsWith("https://") ? ' rel="noreferrer"' : ""}>${renderInline(match[3])}</a>`;
    }
    start = match.index + match[0].length;
  }
  return output + plain(text.slice(start));
}

export function renderBlock(block) {
  const lines = block.text.split("\n");
  if (block.kind === "code") {
    const language = lines[0].slice(3);
    return `<pre><code${language ? ` class="language-${language}"` : ""}>${escapeHtml(lines.slice(1, -1).join("\n"))}\n</code></pre>`;
  }
  if (block.kind === "heading") {
    const [, hashes, title] = lines[0].match(/^(#+) (.+)$/);
    if (hashes.length === 1) return ""; // The page shell already contains the document title.
    const id = legacyId(title);
    return `<h${hashes.length} id="${id}">${renderInline(title)}<a class="heading-anchor" href="#${id}" aria-label="link to ${escapeHtml(title.replaceAll("`", ""))}">#</a></h${hashes.length}>`;
  }
  if (block.kind === "table") {
    const cells = line => line.replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
    const headers = cells(lines[0]);
    assert(lines[1] && cells(lines[1]).every(cell => /^:?-+:?$/.test(cell)), `Invalid table at line ${block.line}`);
    const rows = lines.slice(2).map(cells);
    assert(rows.every(row => row.length === headers.length), `Irregular table at line ${block.line}`);
    // This source-location metadata is not reader-facing content or a requirement.
    const visibleRows = rows.filter(row => row[0] !== "Canonical local context");
    return `<div class="table-wrap"><table><thead><tr>${headers.map(cell => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead><tbody>${visibleRows.map(row => `<tr>${row.map(cell => `<td>${renderInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  if (block.kind === "list") {
    const ordered = /^\d+\./.test(lines[0]);
    const itemPattern = ordered ? /^\d+\. (.+)$/ : /^- (.+)$/;
    const items = lines.map(line => {
      const match = line.match(itemPattern);
      assert(match, `Unsupported list shape at line ${block.line}: ${line}`);
      return `<li>${renderInline(match[1])}</li>`;
    });
    const tag = ordered ? "ol" : "ul";
    return `<${tag}>${items.join("")}</${tag}>`;
  }
  return `<p>${renderInline(lines.join(" "))}</p>`;
}

export function generateSpecArtifacts(source, page) {
  source = normalizeText(source);
  page = normalizeText(page);
  const blocks = parseSpec(source);
  const requirements = extractRequirements(blocks);
  const anchorByBlock = new Map(requirements.map(requirement => [requirement.blocks[0], requirement.id]));
  const headings = blocks.filter(block => block.kind === "heading" && block.section?.title === block.text.replace(/^#+ /, ""));
  const toc = headings.map(block => `${"  ".repeat(block.section.level - 2)}- [${block.section.title}](#${sectionId(block.section)})`).join("\n");
  const navigation = `${tocStart}\n## Contents\n\n[One-page normative summary](../../NORMATIVE-SUMMARY.md) · [Complete requirement index](../../NORMATIVE-INDEX.md) · [Prior art](../../PRIOR-ART.md)\n\n${toc}\n${tocEnd}`;
  const markdown = blocks.map(block => {
    const headingAnchor = headings.includes(block) ? `<a id="${sectionId(block.section)}"></a>\n\n` : "";
    const requirementAnchor = anchorByBlock.has(block) ? `<a id="${anchorByBlock.get(block)}"></a>\n\n` : "";
    const nav = block.kind === "heading" && block.section?.number === "1" ? `${navigation}\n\n` : "";
    return `${nav}${headingAnchor}${requirementAnchor}${block.text}`;
  }).join("\n\n") + "\n";
  const readerLinks = '<p class="spec-reader-links"><a href="https://github.com/sierracatalina/context-layer/blob/main/NORMATIVE-SUMMARY.md" rel="noreferrer">one-page normative summary</a> · <a href="https://github.com/sierracatalina/context-layer/blob/main/NORMATIVE-INDEX.md" rel="noreferrer">complete requirement index</a> · <a href="https://github.com/sierracatalina/context-layer/blob/main/PRIOR-ART.md" rel="noreferrer">prior art</a></p>';
  const article = readerLinks + "\n" + blocks.map(block => {
    const headingAnchor = headings.includes(block) ? `<a id="${sectionId(block.section)}"></a>` : "";
    const requirementAnchor = anchorByBlock.has(block) ? `<a id="${anchorByBlock.get(block)}"></a>` : "";
    return `${headingAnchor}${requirementAnchor}${renderBlock(block)}`;
  }).filter(Boolean).join("\n");
  const siteToc = `<ol>${blocks.filter(block => block.kind === "heading" && !block.text.startsWith("# ")).map(block => {
    const title = block.text.replace(/^#+ /, "");
    return `<li class="toc-depth-${block.text.match(/^#+/)[0].length}"><a href="#${legacyId(title)}">${renderInline(title)}</a></li>`;
  }).join("")}</ol>`;
  assert.equal((page.match(/<article class="document-body">/g) ?? []).length, 1, "Expected one specification article");
  let rendered = page.replace(/<article class="document-body">[\s\S]*?<\/article>/, `<article class="document-body">${article}</article>`);
  let tocReplacements = 0;
  rendered = rendered.replace(/(<(?:nav|details) class="document-toc[^>]*>[\s\S]*?)(<ol>[\s\S]*?<\/ol>)/g, (_, intro) => { tocReplacements++; return intro + siteToc; });
  assert.equal(tocReplacements, 2, "Expected desktop and mobile specification ToCs");
  rendered = formatContextLayerHtml(rendered);
  const mirror = markdown
    .replace(/^\| Canonical local context \|.*\n/gm, "")
    .replace(/\]\(\.\.\/\.\.\/(NORMATIVE-SUMMARY|NORMATIVE-INDEX|PRIOR-ART)\.md\)/g, "](https://github.com/sierracatalina/context-layer/blob/main/$1.md)");
  const raw = keywordCounts(stripGeneratedNavigation(source));
  const selected = keywordCounts(requirements.map(requirement => requirement.text).join("\n"));
  return { markdown, mirror, rendered, requirements, raw, selected, headings };
}

export function renderRequirementIndex({ requirements, raw, selected }) {
  let currentSection = "";
  const entries = requirements.map(requirement => {
    const group = requirement.section.number.split(".")[0];
    const heading = group === currentSection ? "" : `\n## Section ${group}\n`;
    currentSection = group;
    const count = keywordCounts(requirement.text);
    return `${heading}\n### ${requirement.id}\n\n[§${requirement.section.number}: ${requirement.section.title.replace(/^\d+(?:\.\d+)*\.? /, "")}](${specPath}#${requirement.id}) · ${count.MUST} MUST / ${count.SHOULD} SHOULD occurrences\n\n${requirement.text}\n`;
  }).join("");
  return `# Complete core requirement index\n\nGenerated by \`node scripts/generate-spec-docs.mjs\`. Do not edit excerpts here; edit the canonical source and regenerate. Verify with \`node scripts/generate-spec-docs.mjs --check\` and \`node --test tests/spec-documentation.test.mjs\`.\n\nThis informative index complements the [one-page summary](NORMATIVE-SUMMARY.md). The [technical specification](${specPath}) is authoritative. Excerpts are verbatim; section links preserve surrounding conditions. Lists and tables governed by a keyword are reproduced in full. One entry is a source passage, not an atomic requirement, implementation test, or claim of conformance.\n\n## Scope and counting\n\n- Scope: only the core technical specification, \`context-layer/0.2-draft\`. Site mirrors are not counted again.\n- Raw count: **${raw.MUST} MUST + ${raw.SHOULD} SHOULD = ${raw.MUST + raw.SHOULD}** uppercase word occurrences, including negative forms.\n- Excluded: **2 MUST + 2 SHOULD** occurrences in §1's BCP 14 keyword definition. These define the language rather than impose implementation obligations.\n- Indexed: **${selected.MUST} MUST + ${selected.SHOULD} SHOULD = ${selected.MUST + selected.SHOULD}** occurrences in **${requirements.length} source passages**. Keyword-free children of governing lists/tables are included, notably §§6.1, 9.1–9.3, 10.5, 11.4, and 12. Section 14's test list is also included.\n- A numeric occurrence total is not an atomic requirement count: conjunctive clauses, governed bullets, overlapping invariants, and profile applicability prevent that equivalence. No extraction method here yields 371 core requirements.\n- Separate material: [0.3 companion draft](protocol/companions/0.3-draft/spec.md), [Nostr discussion draft](docs/nostr/NIP-XX-purpose-bound-context.md), and [informative implementation profiles](protocol/spec/context-layer-implementation-and-interoperability.md) have distinct scope/status. They are not silently merged into core conformance.\n\n## Wording ambiguity retained\n\n[Section 13](${specPath}#cl-s-13) uses mixed-case “Must implement” or “Must document” for six role lists. Section 1 assigns BCP 14 meanings only to all-capital keywords. Those lists still describe role conformance, but whether to make each item an explicit normative obligation needs an editorial/specification decision. This index does not change their strength; consult all six source lists alongside applicable core requirements. The [supplement below](#role-list-supplement) reproduces them without adding their mixed-case words to the counts.\n\n## Reading the excerpts\n\nEach entry links to an explicit source anchor shared by GitHub and the website. Numbers group passages by the existing source section. Conditions and recommendations remain as written. This index is complete for the stated uppercase-keyword scope, not an exhaustive validator for obligations expressed elsewhere in prose, schemas, or profile definitions.\n${entries}`;
}

export async function generate({ check = false } = {}) {
  const source = await readFile(resolve(root, specPath), "utf8");
  const page = await readFile(resolve(root, pagePath), "utf8");
  const artifacts = generateSpecArtifacts(source, page);
  const blocks = parseSpec(source);
  const roleBlocks = blocks.filter(block => block.section?.number.startsWith("13"));
  const supplement = `\n## Role-list supplement\n\nVerbatim §13 text, retained as mixed-case wording rather than counted as uppercase keyword requirements.\n\n${roleBlocks.map(block => block.kind === "heading" ? `${block.text.replace(/^#{2,3}/, "###")}\n\n[Source](${specPath}#${sectionId(block.section)})` : block.text).join("\n\n")}\n`;
  const outputs = new Map([
    [specPath, artifacts.markdown],
    [mirrorPath, artifacts.mirror],
    [pagePath, artifacts.rendered],
    ["NORMATIVE-INDEX.md", renderRequirementIndex(artifacts) + supplement],
  ]);
  for (const [path, value] of outputs) {
    if (check) assert.equal(normalizeText(await readFile(resolve(root, path), "utf8")), value, `${path} is stale; run node scripts/generate-spec-docs.mjs`);
    else await writeFile(resolve(root, path), value, "utf8");
  }
  console.log(`${check ? "Verified" : "Generated"} core spec documentation: ${artifacts.raw.MUST + artifacts.raw.SHOULD} raw keywords; ${artifacts.selected.MUST + artifacts.selected.SHOULD} indexed in ${artifacts.requirements.length} passages.`);
  return artifacts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await generate({ check: process.argv.includes("--check") });
}
