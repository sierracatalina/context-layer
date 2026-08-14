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
  "assets/context-layer-og.svg",
  "assets/context-layer-reference.js",
  "assets/context-layer-responsive.css",
  "assets/context-layer.css",
  "assets/context-layer.js",
  "index.html",
  "llms.txt",
  "manifest.webmanifest",
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
  assert.match(html, /<title>Context Layer \| Useful context, without total access<\/title>/i);
  assert.match(html, /Synthetic protocol demo/i);
  assert.match(html, /Progressive protocol map/i);
  assert.match(html, /Ask the site to explain or move/i);
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
});

test("worker publishes canonical essay and technical reference pages", async () => {
  const worker = await loadWorker();
  const essay = await worker.fetch(new Request("https://context.example/writing/context-layer"), testEnv());
  assert.equal(essay.status, 200);
  assert.match(essay.headers.get("content-type") ?? "", /^text\/html\b/i);
  const essayHtml = await essay.text();
  assert.match(essayHtml, /The Context Layer: Give AI the Context It Needs Without Giving It Everything/);
  assert.match(essayHtml, /Published essay \/ Context Layer/);
  assert.match(essayHtml, /<article class="document-body">/);
  assert.match(essayHtml, /href="\/reference\/specification"/);
  assert.doesNotMatch(essayHtml, /Publication draft/);

  const specification = await worker.fetch(new Request("https://context.example/reference/specification"), testEnv());
  assert.equal(specification.status, 200);
  assert.match(await specification.text(), /Working Draft - not an adopted standard/);

  const implementation = await worker.fetch(new Request("https://context.example/reference/implementation"), testEnv());
  assert.equal(implementation.status, 200);
  assert.match(await implementation.text(), /Implementation and Interoperability Profiles/);
});

test("architecture viewer keeps the full map legible and SVG styling CSP-safe", async () => {
  const worker = await loadWorker();
  const viewer = await worker.fetch(new Request("https://context.example/reference/architecture"), testEnv());
  assert.equal(viewer.status, 200);
  const viewerHtml = await viewer.text();
  assert.match(viewerHtml, /data-diagram-action="fit"/);
  assert.match(viewerHtml, /data-diagram-action="reading"/);
  assert.match(viewerHtml, /data-diagram-action="actual"/);
  assert.match(viewerHtml, /data-diagram-scroll/);
  assert.match(viewerHtml, /context-layer-architecture-diagram\.svg/);

  const diagram = await worker.fetch(new Request("https://context.example/reference/context-layer-architecture-diagram.svg"), testEnv());
  assert.equal(diagram.status, 200);
  assert.equal(diagram.headers.get("cache-control"), "no-cache");
  assert.equal(diagram.headers.get("x-robots-tag"), "noindex, nofollow");
  const svg = await diagram.text();
  assert.match(svg, /xml-stylesheet[^>]+context-layer-diagram\.css/);
  assert.match(svg, /fill="#0d1117"/);
  assert.match(svg, /font-family="DM Sans, Segoe UI, sans-serif"/);
  assert.doesNotMatch(svg, /<style>/);
  assert.doesNotMatch(svg, /href="(?:context-layer-overview|demos\/)/);
});

test("worker limits the hosted surface to reviewed paths", async () => {
  const worker = await loadWorker();
  const asset = await worker.fetch(new Request("https://context.example/assets/context-layer.js"), testEnv());
  assert.equal(asset.status, 200);
  assert.match(await asset.text(), /const demoStages/);

  const reference = await worker.fetch(new Request("https://context.example/reference/context-layer-technical-specification.md"), testEnv());
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
