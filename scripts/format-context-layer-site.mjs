import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { formatEditorialText } from "../site/context-layer/assets/context-layer-editorial.mjs";

const root = resolve(import.meta.dirname, "..");

export const contextLayerPageNames = Object.freeze([
  "index",
  "demo",
  "architecture",
  "specification",
  "implementation",
  "code",
  "essay",
]);

const protectedElements = new Set([
  "code",
  "kbd",
  "pre",
  "samp",
  "script",
  "style",
  "svg",
  "textarea",
  "var",
]);

const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Format authored reader-facing HTML while retaining technical elements,
 * URL-bearing attributes, form values, and data payloads exactly as supplied.
 */
export function formatContextLayerHtml(html) {
  const stack = [];

  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (!part.startsWith("<")) {
        return stack.some((name) => protectedElements.has(name))
          ? part
          : formatEditorialText(part, { html: true });
      }

      const closing = part.match(/^<\/([a-z0-9-]+)/i);
      if (closing) {
        const name = closing[1].toLowerCase();
        const index = stack.lastIndexOf(name);
        if (index !== -1) stack.splice(index, 1);
        return formatEditorialAttributes(part);
      }

      const opening = part.match(/^<([a-z0-9-]+)/i);
      if (opening && !/\/>$/.test(part)) {
        const name = opening[1].toLowerCase();
        if (!voidElements.has(name)) stack.push(name);
      }

      return formatEditorialAttributes(part);
    })
    .join("");
}

export async function formatContextLayerPages({ check = false } = {}) {
  const changed = [];

  for (const pageName of contextLayerPageNames) {
    const pagePath = resolve(root, `site/context-layer/_pages/${pageName}.html`);
    const html = await readFile(pagePath, "utf8");
    const formatted = formatContextLayerHtml(html);
    if (formatted === html) continue;

    changed.push(pageName);
    if (!check) await writeFile(pagePath, formatted, "utf8");
  }

  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const check = process.argv.includes("--check");
  const changed = await formatContextLayerPages({ check });

  if (check && changed.length > 0) {
    throw new Error(`editorial formatting required: ${changed.join(", ")}`);
  }

  const action = check ? "verified" : "formatted";
  console.log(`${action} ${contextLayerPageNames.length} Context Layer pages with the Sierra editorial contract.`);
}

function formatEditorialAttributes(tag) {
  if (isProtectedTag(tag)) return tag;

  let formatted = tag.replace(
    /\b(alt|aria-description|aria-label|data-guide-prompt|placeholder|title)=("([^"]*)"|'([^']*)')/gi,
    (match, name, quotedValue, doubleValue, singleValue) => {
      const quote = quotedValue[0];
      const value = doubleValue ?? singleValue ?? "";
      return `${name}=${quote}${formatEditorialText(value, { html: true })}${quote}`;
    },
  );

  if (
    /^<meta\b/i.test(formatted) &&
    /\b(?:name|property)=["'](?:description|og:description|og:image:alt|og:title|twitter:description|twitter:image:alt|twitter:title)["']/i.test(formatted)
  ) {
    formatted = formatted.replace(
      /\bcontent=("([^"]*)"|'([^']*)')/i,
      (match, quotedValue, doubleValue, singleValue) => {
        const quote = quotedValue[0];
        const value = doubleValue ?? singleValue ?? "";
        return `content=${quote}${formatEditorialText(value, { html: true })}${quote}`;
      },
    );
  }

  return formatted;
}

function isProtectedTag(tag) {
  const name = tag.match(/^<\/?([a-z0-9-]+)/i)?.[1]?.toLowerCase();
  return name ? protectedElements.has(name) : false;
}
