import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

test("deployment output contains only the worker entrypoint and hosting metadata", async () => {
  const dist = new URL("../dist/", import.meta.url);
  await access(new URL("server/index.js", dist));
  await access(new URL(".openai/hosting.json", dist));
  const entries = await readdir(dist);
  assert(!entries.includes("public"), "static dossier files must not bypass the redirect worker");
});

test("all public entrypoints redirect permanently to Sierra", async () => {
  const worker = await loadWorker();
  const cases = new Map([
    ["/", "/context-layer"],
    ["/context-layer", "/context-layer"],
    ["/essay", "/signal/the-context-layer"],
    ["/signal/the-context-layer", "/signal/the-context-layer"],
    ["/architecture", "/context-layer/architecture"],
    ["/specification", "/context-layer/specification"],
    ["/implementation", "/context-layer/implementation"],
    ["/code", "/context-layer/code"],
    ["/ouroboros-architecture-v4-legible.html", "/context-layer/demo"],
    ["/context-layer/legacy/index.html", "/context-layer/demo"],
    ["/context-layer/demo", "/context-layer/demo"],
  ]);

  for (const [source, target] of cases) {
    const response = await worker.fetch(new Request(`https://context.example${source}?from=gpt`), {});
    assert.equal(response.status, 308, source);
    assert.equal(response.headers.get("location"), `https://sierracatalina.com${target}?from=gpt`, source);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow", source);
    assert.equal(response.headers.get("x-frame-options"), "DENY", source);
    assert.match(response.headers.get("link") || "", /rel="canonical"/, source);
    assert.equal(await response.text(), "", source);
  }
});

test("legacy assets and implementation artifacts redirect to native Sierra paths", async () => {
  const worker = await loadWorker();
  const cases = new Map([
    ["/assets/context-layer-native.css", "/context-layer/assets/context-layer-native.css"],
    ["/assets/context-layer.js", "/context-layer/demo/assets/context-layer.js"],
    ["/manifest.webmanifest", "/context-layer/demo/manifest.webmanifest"],
    ["/og.png", "/context-layer/og.png"],
    ["/llms.txt", "/context-layer/llms.txt"],
    ["/implementation/policy-decision.schema.json", "/context-layer/implementation/policy-decision.schema.json"],
    ["/reference/context-layer-technical-specification.md", "/context-layer/source/context-layer-technical-specification.md"],
    ["/reference/context-layer-architecture-diagram.svg", "/context-layer/reference/context-layer-architecture-diagram.svg"],
  ]);

  for (const [source, target] of cases) {
    const response = await worker.fetch(new Request(`https://context.example${source}`), {});
    assert.equal(response.status, 308, source);
    assert.equal(response.headers.get("location"), `https://sierracatalina.com${target}`, source);
  }
});

test("guide requests preserve POST while moving to the native Sierra API", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("https://context.example/api/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "What is a receipt?" }),
  }), {});

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://sierracatalina.com/api/context-layer/guide");
});

test("the redirect host refuses unsafe page methods and unknown paths", async () => {
  const worker = await loadWorker();
  const unsafe = await worker.fetch(new Request("https://context.example/context-layer", {
    method: "POST",
  }), {});
  assert.equal(unsafe.status, 405);
  assert.equal(unsafe.headers.get("allow"), "GET, HEAD");

  const unknown = await worker.fetch(new Request("https://context.example/private-notes.txt"), {});
  assert.equal(unknown.status, 404);
  assert.equal(unknown.headers.get("cache-control"), "no-store");
  assert.equal(unknown.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("source remains a protocol archive while hosting no longer serves a duplicate dossier", async () => {
  const expectedArchiveFiles = [
    "public/reference/context-layer-technical-specification.md",
    "public/implementation/context-layer-reference.mjs",
  ];
  for (const path of expectedArchiveFiles) {
    await access(new URL(`../${path}`, import.meta.url));
  }

  const workerSource = await readFile(join(projectRoot, "worker/index.ts"), "utf8");
  assert(!workerSource.includes("renderLandingPage"));
  assert(!workerSource.includes("PUBLIC_ASSETS"));
  assert(workerSource.includes("https://sierracatalina.com"));
});
