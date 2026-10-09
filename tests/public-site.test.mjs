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
  assert.match(index, /<h1>the <em>context layer<\/em>\.<\/h1>/);
  assert.match(index, /one boundary\. six recorded steps\./);
  assert.match(index, /href="\/context-layer\/architecture"/);
  assert.match(index, /href="\/signal\/the-context-layer"/);

  for (const asset of [
    "icon.svg",
    "context-layer/assets/context-layer-native.css",
    "context-layer/assets/context-layer-native.js",
    "context-layer/downloads/context-layer-architecture.svg",
    "context-layer/og.png",
    "context-layer/llms.txt",
  ]) {
    await access(join(site, asset));
  }
});

test("all public routes expose a progressive mobile menu with the full navigation", async () => {
  for (const file of routes.values()) {
    const html = await readFile(join(site, file), "utf8");
    assert.match(html, /class="context-menu-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="context-navigation"[^>]*hidden/);
    assert.equal((html.match(/id="context-navigation"/g) ?? []).length, 1);
    for (const route of routes.keys()) assert(html.includes(`href="${route}"`));
    assert.match(html, /context-layer-native\.js\?v=20261009a/);
  }
});

test("overview explains an everyday example before technical detail and separates prototype status", async () => {
  const index = await readFile(join(site, "context-layer/_pages/index.html"), "utf8");
  assert(index.indexOf('id="everyday-example"') < index.indexOf('class="context-contract shell"'));
  assert.match(index, /illustrative flow with fictional notes/);
  assert.match(index, /requests are prepared, not sent/);
  for (const id of ["why-context", "everyday-example", "contract-heading", "current-status", "reading-heading"]) {
    assert(index.includes(`href="#${id}"`));
    assert.equal((index.match(new RegExp(`id="${id}"`, "g")) ?? []).length, 1);
  }
  const implementation = await readFile(join(site, "context-layer/_pages/implementation.html"), "utf8");
  assert.match(implementation, /id="poppy-adapter"/);
  assert.match(implementation, /PCP \[personal context protocol\]/);
  assert(!implementation.includes("personal consent protocol"));
  assert.match(implementation, /OAuth, DPoP, live transport, business actions &amp; external interoperability remain unimplemented/);
  assert.match(implementation, /the adapter does not implement session authentication/);
});

test("mobile menu supports repeat toggles, dismissal, responsive changes and history restore", async () => {
  const { runInNewContext } = await import("node:vm");
  const handlers = new Map();
  const attributes = new Map();
  const indicator = { textContent: "+" };
  let focused = false;
  const listen = (target, event, handler) => handlers.set(`${target}:${event}`, handler);
  const header = {
    dataset: {},
    removeAttribute: (key) => { attributes.delete(key); delete header.dataset.menuOpen; },
    hasAttribute: (key) => key === "data-menu-open" && "menuOpen" in header.dataset,
    contains: (target) => target === menu,
  };
  const menu = {
    hidden: true,
    setAttribute: (key, value) => attributes.set(key, value),
    getAttribute: (key) => attributes.get(key),
    querySelector: () => indicator,
    addEventListener: (event, handler) => listen("menu", event, handler),
    focus: () => { focused = true; },
  };
  const current = { href: "https://example.org/context-layer", setAttribute: (key, value) => attributes.set(`link:${key}`, value) };
  const nav = {
    addEventListener: (event, handler) => listen("nav", event, handler),
    querySelectorAll: () => [current],
  };
  const document = {
    documentElement: { dataset: {} },
    querySelector: (selector) => ({ ".context-header": header, ".context-menu-toggle": menu, "#context-navigation": nav })[selector] ?? null,
    querySelectorAll: () => [],
    addEventListener: (event, handler) => listen("document", event, handler),
  };
  const window = {
    location: { pathname: "/context-layer" },
    matchMedia: () => ({ addEventListener: (event, handler) => listen("media", event, handler) }),
    addEventListener: (event, handler) => listen("window", event, handler),
  };
  const script = await readFile(join(site, "context-layer/assets/context-layer-native.js"), "utf8");
  runInNewContext(script, { document, window, URL, localStorage: { getItem: () => null } });
  assert.equal(menu.hidden, false);
  assert.equal(attributes.get("link:aria-current"), "page");
  const click = () => handlers.get("menu:click")();
  click(); assert.equal(attributes.get("aria-expanded"), "true");
  click(); assert.equal(attributes.get("aria-expanded"), "false");
  click(); handlers.get("document:keydown")({ key: "Escape" });
  assert.equal(attributes.get("aria-expanded"), "false"); assert(focused);
  for (const dismiss of [
    () => handlers.get("document:click")({ target: {} }),
    () => handlers.get("nav:click")({ target: { closest: () => current } }),
    () => handlers.get("media:change")(),
    () => handlers.get("window:pageshow")(),
  ]) {
    click(); dismiss();
    assert.equal(attributes.get("aria-expanded"), "false");
    assert.equal(indicator.textContent, "+");
  }
});
