import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const site = join(root, "site");

const routes = new Map([
  ["/context-layer", "context-layer/_pages/index.html"],
  ["/context-layer/architecture", "context-layer/_pages/architecture.html"],
  ["/context-layer/demo", "context-layer/_pages/demo.html"],
  ["/context-layer/specification", "context-layer/_pages/specification.html"],
  ["/context-layer/implementation", "context-layer/_pages/implementation.html"],
  ["/context-layer/code", "context-layer/_pages/code.html"],
  ["/signal/the-context-layer", "context-layer/_pages/essay.html"],
]);

test("standalone deployment maps every published route to versioned source", async () => {
  const config = JSON.parse(await readFile(join(site, "vercel.json"), "utf8"));
  const rewrites = new Map(config.rewrites.map(({ source, destination }) => [source, destination]));

  for (const [route, file] of routes) {
    assert.equal(rewrites.get(route), `/${file}`);
    await access(join(site, file));
  }
});

test("public dossier keeps the production identity and local asset contract", async () => {
  const index = await readFile(join(site, "context-layer/_pages/index.html"), "utf8");
  assert.match(index, /<h1>the <em>Context Layer<\/em>\.<\/h1>/);
  assert.match(index, /one boundary\. six recorded steps\./);
  assert.match(index, /href="\/context-layer\/architecture"/);
  assert.match(index, /href="\/signal\/the-context-layer"/);

  for (const asset of [
    "context-layer/assets/context-layer-native.css",
    "context-layer/assets/context-layer-native.js",
    "context-layer/downloads/context-layer-architecture.svg",
    "context-layer/og.png",
    "context-layer/llms.txt",
  ]) {
    await access(join(site, asset));
  }
});
