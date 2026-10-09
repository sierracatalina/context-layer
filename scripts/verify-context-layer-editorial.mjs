import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  editorialCaseExceptions,
  formatEditorialText,
} from "../site/context-layer/assets/context-layer-editorial.mjs";
import {
  contextLayerPageNames,
  formatContextLayerHtml,
} from "./format-context-layer-site.mjs";

const root = resolve(import.meta.dirname, "..");

export async function verifyContextLayerEditorial() {
  assert.equal(contextLayerPageNames.length, 7, "the editorial contract must cover all seven lowercase public pages");

  const requiredFiles = [
    "docs/context-layer-ui-copy-boundary.md",
    "docs/sierra-editorial-formatting.md",
    "site/icon.svg",
    "site/context-layer/assets/context-layer-editorial.mjs",
    "site/context-layer/assets/context-layer-native.css",
    "site/context-layer/assets/context-layer-native.js",
    "site/context-layer/demo/assets/context-layer.css",
    "site/context-layer/demo/assets/context-layer.js",
    "site/context-layer/demo/manifest.webmanifest",
    ...contextLayerPageNames.map((name) => `site/context-layer/_pages/${name}.html`),
  ];

  for (const file of requiredFiles) {
    assert((await stat(resolve(root, file))).isFile(), `required editorial file missing: ${file}`);
  }

  const pages = await Promise.all(
    contextLayerPageNames.map(async (name) => [
      name,
      await readFile(resolve(root, `site/context-layer/_pages/${name}.html`), "utf8"),
    ]),
  );

  const deployment = JSON.parse(await readFile(resolve(root, "site/vercel.json"), "utf8"));
  const rewriteMap = new Map(deployment.rewrites.map(({ source, destination }) => [source, destination]));
  const expectedRoutes = new Map([
    ["/context-layer", "/context-layer/_pages/index.html"],
    ["/context-layer/demo", "/context-layer/_pages/demo.html"],
    ["/context-layer/architecture", "/context-layer/_pages/architecture.html"],
    ["/context-layer/specification", "/context-layer/_pages/specification.html"],
    ["/context-layer/implementation", "/context-layer/_pages/implementation.html"],
    ["/context-layer/code", "/context-layer/_pages/code.html"],
    ["/signal/the-context-layer", "/context-layer/_pages/essay.html"],
  ]);

  for (const [route, destination] of expectedRoutes) {
    assert.equal(rewriteMap.get(route), destination, `published route drifted: ${route}`);
  }

  const allowedCasing = new Set(editorialCaseExceptions);
  const forbiddenPublishedPhrases = [
    "responsive system map",
    "every node remains legible at the current viewport",
    "page scroll is the only navigation surface",
    "secondary artifact",
    "full-resolution system plate",
    "compact map keeps",
    "visible in one frame",
    "page theme selects",
    "matching opaque canvas",
    "detailed sections continue below",
    "theme-aware overview",
    "sized to remain legible",
    "reference archive",
    "this view limits each pass",
    "only after the layer model is clear",
    "text is the default",
    "navigate only to approved sections",
    "without a configured api",
    "website publication and deployment source",
    "publication ui maintained separately",
    "canonical local context",
    "one-screen",
    "source & implementation",
    "rendered page follows",
    "signal editorial contract",
  ];
  for (const [name, html] of pages) {
    assert.equal(
      formatContextLayerHtml(html),
      html,
      `${name} page is not normalized; run npm run format:context-layer`,
    );

    const text = editorialText(html);
    for (const phrase of forbiddenPublishedPhrases) {
      assert(
        !text.toLowerCase().includes(phrase),
        `${name} page exposes internal authoring or rendering copy: ${phrase}`,
      );
    }
    assert(!text.includes("undefined"), `${name} page contains an unresolved render token`);
    assert(!/\band\b/i.test(text), `${name} page must use & instead of the standalone word and`);

    const commaBeforeAmpersand = text.match(/.{0,80},\s*&.{0,80}/);
    assert(
      !commaBeforeAmpersand,
      `${name} page must not place a comma before &: ${commaBeforeAmpersand?.[0] ?? ""}`,
    );

    for (const token of text.match(/\b[A-Za-z0-9-]*[A-Z][A-Za-z0-9-]*\b/g) ?? []) {
      assert(
        isAllowedEditorialCasing(token, allowedCasing),
        `${name} page exposes non-editorial casing: ${token}`,
      );
    }
  }

  verifyFormatterBoundaries();
  await verifyRuntimeBoundaries(pages);
  await verifyTypeRoles();
  await verifyMachineRoutes();

  const essayHtml = pages.find(([name]) => name === "essay")?.[1] ?? "";
  const essayText = visibleText(essayHtml);
  assert(!essayHtml.includes("&quot;"), "essay must use single quotation marks in reader prose");
  assert(!/\((?:MCP|A2A)\)/.test(essayText), "essay must use brackets for acronym asides");
  assert(!/[—]|&mdash;/.test(essayHtml), "essay must not use em dashes");
}

async function verifyMachineRoutes() {
  const manifest = JSON.parse(
    await readFile(resolve(root, "site/context-layer/source/agent-navigation-manifest.json"), "utf8"),
  );
  assert.deepEqual(
    manifest.public_routes.map(({ path }) => path),
    [
      "/signal/the-context-layer",
      "/context-layer/architecture",
      "/context-layer/specification",
      "/context-layer/implementation",
    ],
    "machine navigation must advertise canonical public routes",
  );

  const sourceEssay = await readFile(
    resolve(root, "site/context-layer/source/context-layer-blog-post.md"),
    "utf8",
  );
  assert(!sourceEssay.includes("](/reference/"), "source essay must not advertise retired reference routes");
  assert(!sourceEssay.includes("](/writing/"), "source essay must not advertise retired writing routes");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await verifyContextLayerEditorial();
  console.log(
    `PASS Context Layer editorial contract: ${contextLayerPageNames.length} public pages plus static and runtime boundaries verified.`,
  );
}

function verifyFormatterBoundaries() {
  assert.equal(
    formatEditorialText("Useful Context and OpenAI APIs"),
    "useful context & OpenAI APIs",
    "formatter must lowercase prose while preserving technical casing",
  );
  assert.equal(formatEditorialText("API AND UI"), "API & UI", "uppercase AND must become an ampersand");
  assert.equal(formatEditorialText("USEFUL CONTEXT"), "useful context", "all-caps prose must normalize");
  assert.equal(
    formatEditorialText("receivedAt and IDs"),
    "receivedAt & IDs",
    "camelCase identifiers and plural acronyms must retain casing",
  );
  assert.equal(
    formatEditorialText("https://Example.com/Foo-and-Bar"),
    "https://Example.com/Foo-and-Bar",
    "URLs must remain byte-for-byte intact",
  );
  assert.equal(
    formatEditorialText("Person@Example.com and OpenAI"),
    "Person@Example.com & OpenAI",
    "email addresses must remain byte-for-byte intact",
  );
  assert.equal(
    formatEditorialText("Ada Lovelace and José Álvarez use OpenAI APIs.", { preserveUnknownCase: true }),
    "Ada Lovelace & José Álvarez use OpenAI APIs.",
    "generated prose normalization must preserve unfamiliar proper names",
  );
  assert.equal(
    formatEditorialText("Use `API AND UI` and OpenAI."),
    "use `API AND UI` & OpenAI.",
    "inline code must remain byte-for-byte intact",
  );
  assert.equal(
    formatEditorialText("Before\n```js\nconst label = 'API AND UI';\n```\nAND after"),
    "before\n```js\nconst label = 'API AND UI';\n```\n& after",
    "fenced code must remain byte-for-byte intact",
  );

  const boundaryFixture = [
    '<meta name="description" content="Useful Context and OpenAI APIs">',
    "<h1>USEFUL CONTEXT AND OpenAI APIs</h1>",
    "<pre><code>API AND UI</code></pre>",
    "<textarea>User AND API</textarea>",
    '<input value="User AND API" placeholder="ASK OpenAI AND CONTINUE">',
    '<a href="https://Example.com/Foo-and-Bar" data-guide-prompt="ASK OpenAI AND CONTINUE">Link</a>',
  ].join("");
  const formatted = formatContextLayerHtml(boundaryFixture);

  assert(formatted.includes('content="useful context &amp; OpenAI APIs"'));
  assert(formatted.includes("<h1>useful context &amp; OpenAI APIs</h1>"));
  assert(formatted.includes("<pre><code>API AND UI</code></pre>"), "code elements must remain unchanged");
  assert(formatted.includes("<textarea>User AND API</textarea>"), "textarea input must remain unchanged");
  assert(formatted.includes('value="User AND API"'), "form values must remain unchanged");
  assert(formatted.includes('placeholder="ask OpenAI &amp; continue"'));
  assert(formatted.includes('href="https://Example.com/Foo-and-Bar"'), "URL attributes must remain unchanged");
  assert(formatted.includes('data-guide-prompt="ask OpenAI &amp; continue"'));
}

async function verifyRuntimeBoundaries(pages) {
  const demoHtml = pages.find(([name]) => name === "demo")?.[1] ?? "";
  const demoJs = await readFile(resolve(root, "site/context-layer/demo/assets/context-layer.js"), "utf8");
  const demoCss = await readFile(resolve(root, "site/context-layer/demo/assets/context-layer.css"), "utf8");
  const nativeJs = await readFile(resolve(root, "site/context-layer/assets/context-layer-native.js"), "utf8");
  const manifest = JSON.parse(
    await readFile(resolve(root, "site/context-layer/demo/manifest.webmanifest"), "utf8"),
  );

  assert(
    demoHtml.includes('<script type="module" src="/context-layer/demo/assets/context-layer.js"></script>'),
    "demo must load the shared formatter through the module runtime",
  );
  assert(
    demoJs.includes('import { formatEditorialText } from "../../assets/context-layer-editorial.mjs";'),
    "runtime-generated UI must import the shared editorial formatter",
  );
  assert(demoJs.includes("const editorial = (value)"), "authored runtime copy must use strict formatting");
  assert(
    demoJs.includes("const editorialGenerated = (value)") && demoJs.includes("preserveUnknownCase: true"),
    "generated guide copy must use conservative formatting",
  );
  assert(
    demoJs.includes("let answerFormatter = editorialGenerated") &&
      demoJs.includes("answerFormatter = editorial;") &&
      demoJs.includes("const answer = answerFormatter(response.answer)"),
    "guide answers must select the generated or authored boundary explicitly",
  );
  assert(
    demoJs.includes('addTranscript("Guide", answer, null)'),
    "formatted guide answers must not be transformed twice",
  );
  assert(
    demoJs.includes('addTranscript("You", question, null)'),
    "user-authored questions must cross the transcript boundary unchanged",
  );
  assert(
    demoJs.includes("new SpeechSynthesisUtterance(answer)"),
    "voice output must use the same normalized answer shown on screen",
  );
  assert(
    demoJs.includes('qs("[data-stage-code]").textContent = JSON.stringify(stage.data, null, 2);'),
    "JSON renderings must bypass the prose formatter",
  );

  const transcriptRoleRule = demoCss.match(/\.guide-transcript strong\s*\{([^}]*)\}/)?.[1] ?? "";
  assert(
    !transcriptRoleRule.includes("text-transform"),
    "transcript labels must not rely on CSS casing",
  );
  assert(
    nativeJs.includes("`copy code snippet ${index + 1} to clipboard`"),
    "copy control accessible names must comply in source",
  );
  assert.equal(manifest.name, "context layer");
  assert.equal(manifest.short_name, "context layer");
  assert.equal(
    manifest.description,
    "a public interactive demonstration of the context layer working proposal.",
  );
}

async function verifyTypeRoles() {
  const nativeCss = await readFile(resolve(root, "site/context-layer/assets/context-layer-native.css"), "utf8");
  const demoCss = await readFile(resolve(root, "site/context-layer/demo/assets/context-layer.css"), "utf8");

  for (const [label, css] of [["native", nativeCss], ["demo", demoCss]]) {
    assert(css.includes("Cormorant Garamond"), `${label} CSS must retain the display typeface`);
    assert(css.includes("Lora"), `${label} CSS must retain the body typeface`);
    assert(css.includes("DM Mono"), `${label} CSS must retain the interface typeface`);
  }
}

function editorialText(html) {
  const withoutTechnicalContent = html.replace(
    /<(code|kbd|pre|samp|script|style|svg|textarea|var)\b[^>]*>[\s\S]*?<\/\1>/gi,
    " technicalvalue ",
  );
  const attributeValues = [
    ...withoutTechnicalContent.matchAll(
      /\b(?:alt|aria-description|aria-label|data-guide-prompt|placeholder|title)=(?:"([^"]*)"|'([^']*)')/gi,
    ),
  ].map((match) => match[1] ?? match[2] ?? "");
  const metaValues = [...withoutTechnicalContent.matchAll(/<meta\b[^>]*>/gi)]
    .map(([tag]) => {
      if (
        !/\b(?:name|property)=["'](?:description|og:description|og:image:alt|og:title|twitter:description|twitter:image:alt|twitter:title)["']/i.test(tag)
      ) {
        return "";
      }
      const match = tag.match(/\bcontent=(?:"([^"]*)"|'([^']*)')/i);
      return match?.[1] ?? match?.[2] ?? "";
    })
    .filter(Boolean);

  return visibleText([withoutTechnicalContent, ...attributeValues, ...metaValues].join(" "));
}

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function isAllowedEditorialCasing(token, exceptions) {
  if (exceptions.has(token)) return true;
  if (/^[a-z]+(?:[A-Z][A-Za-z0-9]*)+$/.test(token)) return true;
  if (
    /^(?=[A-Za-z0-9]*[a-z])(?=(?:[A-Za-z0-9]*[A-Z]){2})[A-Z][A-Za-z0-9]*$/.test(token)
  ) {
    return true;
  }

  const parts = token.split("-");
  return (
    parts.length > 1 &&
    parts.some((part) => exceptions.has(part) || /^[a-z]+(?:[A-Z][A-Za-z0-9]*)+$/.test(part)) &&
    parts.every(
      (part) =>
        exceptions.has(part) ||
        /^[a-z0-9]+$/.test(part) ||
        /^[a-z]+(?:[A-Z][A-Za-z0-9]*)+$/.test(part),
    )
  );
}
