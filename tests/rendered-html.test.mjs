import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = join(projectRoot, "public");
const expectedFiles = [
  "_headers",
  "agent-navigation-manifest.json",
  "assets/context-layer-diagram.css",
  "assets/context-layer-docs.css",
  "assets/context-layer-native.css",
  "assets/context-layer-native.js",
  "assets/context-layer-og.svg",
  "assets/context-layer-reference.js",
  "assets/context-layer-responsive.css",
  "assets/context-layer.css",
  "assets/context-layer.js",
  "implementation/context-layer-reference.mjs",
  "implementation/context-request.schema.json",
  "implementation/invalid-secret-receipt.json",
  "implementation/receipt.schema.json",
  "implementation/scoped-context-bundle.schema.json",
  "implementation/valid-exchange.json",
  "index.html",
  "llms.txt",
  "manifest.webmanifest",
  "og.png",
  "ouroboros-architecture-v4-legible.html",
  "reference/context-layer-architecture-diagram.svg",
  "reference/context-layer-blog-post.md",
  "reference/context-layer-implementation-and-interoperability.md",
  "reference/context-layer-technical-specification.md",
  "robots.txt",
].sort();

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

function testEnv(extra = {}) {
  return {
    ASSETS: { fetch: fetchPublicAsset },
    ...extra,
  };
}

async function fetchPublicAsset(request) {
  const pathname = new URL(request.url).pathname.replace(/^\//, "");
  try {
    const body = await readFile(join(publicRoot, pathname));
    return new Response(request.method === "HEAD" ? null : body, {
      status: 200,
      headers: { "Content-Type": contentType(pathname) },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

test("isolated public source is the exact allowlisted release surface", async () => {
  assert.deepEqual((await walk(publicRoot)).sort(), expectedFiles);
});

test("deployment output cannot bypass the worker with direct public-file copies", async () => {
  for (const pathname of ["index.html", "assets/context-layer.js", "llms.txt"]) {
    await assert.rejects(access(join(projectRoot, "dist", "client", pathname)));
  }
});

test("worker serves the verified public document with security headers", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("https://context.example/"), testEnv());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>the Context Layer \| sierra catalina<\/title>/i);
  assert.match(html, /minimum useful context/i);
  assert.match(html, /one boundary\. six recorded steps\./i);
  assert.match(html, /href="\/context-layer\/architecture"/);
  assert.match(html, /href="\/context-layer\/code"/);
  assert.match(html, /property="og:image" content="https:\/\/sierracatalina\.com\/context-layer\/og\.png"/);
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
});

test("worker serves the validated social preview as PNG", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://context.example/context-layer/og.png"),
    testEnv(),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.ok((await response.arrayBuffer()).byteLength > 100_000);
});

test("worker publishes canonical essay and technical reference pages", async () => {
  const worker = await loadWorker();
  const essay = await worker.fetch(new Request("https://context.example/signal/the-context-layer"), testEnv());
  assert.equal(essay.status, 200);
  assert.match(essay.headers.get("content-type") ?? "", /^text\/html\b/i);
  const essayHtml = await essay.text();
  assert.match(essayHtml, /the Context Layer: give AI the context it needs without giving it everything/);
  assert.match(essayHtml, /signal editorial \/ dossier 001/);
  assert.match(essayHtml, /<article class="document-body">/);
  assert.match(essayHtml, /href="\/context-layer\/specification"/);
  assert.doesNotMatch(essayHtml, /Publication draft/);

  const specification = await worker.fetch(new Request("https://context.example/context-layer/specification"), testEnv());
  assert.equal(specification.status, 200);
  assert.match(await specification.text(), /working draft/i);

  const implementation = await worker.fetch(new Request("https://context.example/context-layer/implementation"), testEnv());
  assert.equal(implementation.status, 200);
  assert.match(await implementation.text(), /implementation &amp; interoperability profiles/i);
});

test("architecture page is responsive without a pan or zoom canvas", async () => {
  const worker = await loadWorker();
  const viewer = await worker.fetch(new Request("https://context.example/context-layer/architecture"), testEnv());
  assert.equal(viewer.status, 200);
  const viewerHtml = await viewer.text();
  assert.match(viewerHtml, /class="protocol-flow"/);
  assert.match(viewerHtml, /class="trust-grid"/);
  assert.match(viewerHtml, /class="lifecycle-list"/);
  assert.match(viewerHtml, /\/context-layer\/downloads\/context-layer-architecture\.svg/);
  assert.doesNotMatch(viewerHtml, /data-diagram-action|data-diagram-scroll|wheel to zoom|drag to pan/i);

  const diagram = await worker.fetch(new Request("https://context.example/context-layer/downloads/context-layer-architecture.svg"), testEnv());
  assert.equal(diagram.status, 200);
  assert.equal(diagram.headers.get("cache-control"), "no-cache");
  assert.equal(diagram.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(diagram.headers.get("content-disposition") ?? "", /attachment; filename="context-layer-architecture\.svg"/);
  const svg = await diagram.text();
  assert.doesNotMatch(svg, /xml-stylesheet|(?:href|src)="https?:\/\//);
  assert.match(svg, /<rect[^>]+width="2200"[^>]+height="1960"[^>]+fill="#0[aA]0[aA]0[aA]"/);
  assert.doesNotMatch(svg, /ouro\.chat|linearGradient|radialGradient|url\(#glow\)/i);
  assert.doesNotMatch(svg, /<style>/);
});

test("native prefix routes keep the Sierra URL surface intact", async () => {
  const worker = await loadWorker();
  for (const path of ["/context-layer", "/context-layer/code", "/context-layer/assets/context-layer-native.css"]) {
    const response = await worker.fetch(new Request("https://context.example" + path), testEnv());
    assert.equal(response.status, 200, path);
  }
});

test("rendered prose follows the Signal editorial formatting contract", async () => {
  const worker = await loadWorker();
  for (const path of ["/context-layer", "/signal/the-context-layer", "/context-layer/specification", "/context-layer/implementation"]) {
    const response = await worker.fetch(new Request("https://context.example" + path), testEnv());
    const visible = visibleText(await response.text());
    assert.doesNotMatch(visible, /\band\b/i, path + " contains 'and'");
    assert.doesNotMatch(visible, /—|[“”"]/u, path + " contains forbidden punctuation");
    assert.doesNotMatch(visible, /\b(?:leverage|unlock|harness|robust|seamless)\b/i, path + " contains forbidden filler");
  }
});

test("worker limits the hosted surface to reviewed paths", async () => {
  const worker = await loadWorker();
  const asset = await worker.fetch(new Request("https://context.example/assets/context-layer.js"), testEnv());
  assert.equal(asset.status, 200);
  assert.match(await asset.text(), /const demoStages/);

  const reference = await worker.fetch(new Request("https://context.example/context-layer/source/context-layer-technical-specification.md"), testEnv());
  assert.equal(reference.status, 200);
  assert.equal(reference.headers.get("x-robots-tag"), "noindex, nofollow");

  const unknown = await worker.fetch(new Request("https://context.example/private-notes.txt"), testEnv());
  assert.equal(unknown.status, 404);
  assert.equal(await unknown.text(), "Not found");
});

test("guide fails closed without a key and rejects cross-origin requests", async () => {
  const worker = await loadWorker();
  const request = () => new Request("https://context.example/api/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://context.example", "CF-Connecting-IP": `${Math.random()}` },
    body: JSON.stringify({ question: "What does policy do?" }),
  });
  const unavailable = await worker.fetch(request(), testEnv());
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: "guide_unavailable" });

  const crossOrigin = new Request("https://context.example/api/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://attacker.example", "CF-Connecting-IP": `${Math.random()}` },
    body: JSON.stringify({ question: "What does policy do?" }),
  });
  assert.equal((await worker.fetch(crossOrigin, testEnv())).status, 403);
});

test("model guide sends a non-stored request and preserves only allowlisted navigation", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  let upstreamRequest;
  globalThis.fetch = async (url, init) => {
    upstreamRequest = { url, init, body: JSON.parse(init.body) };
    return Response.json({
      output: [
        { type: "message", content: [{ type: "output_text", text: "Policy reduces disclosed fields." }] },
        { type: "function_call", name: "navigate", arguments: JSON.stringify({ target_id: "demo-policy" }) },
      ],
    });
  };

  try {
    const response = await worker.fetch(new Request("https://context.example/api/guide", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://context.example", "CF-Connecting-IP": `${Math.random()}` },
      body: JSON.stringify({ question: "Show policy" }),
    }), testEnv({ OPENAI_API_KEY: "test-placeholder" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      answer: "Policy reduces disclosed fields.",
      action: { target_id: "demo-policy" },
    });
    assert.equal(upstreamRequest.url, "https://api.openai.com/v1/responses");
    assert.equal(upstreamRequest.body.store, false);
    assert.equal(upstreamRequest.body.tools[0].strict, true);
    assert.equal(upstreamRequest.body.tools[0].parameters.additionalProperties, false);
    assert.ok(upstreamRequest.body.tools[0].parameters.properties.target_id.enum.includes("demo-policy"));
    assert.doesNotMatch(JSON.stringify(upstreamRequest.body.tools), /https?:|\bselector\b|\bscript\b/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

async function walk(base, prefix = "") {
  const files = [];
  for (const entry of await readdir(join(base, prefix), { withFileTypes: true })) {
    const name = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await walk(base, name));
    if (entry.isFile()) files.push(name.replaceAll("\\", "/"));
  }
  return files;
}

function contentType(pathname) {
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
  }[extname(pathname)] || "application/octet-stream";
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code\b[\s\S]*?<\/code>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");
}
