import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

const requiredProtocolFiles = [
  "protocol/spec/context-layer-technical-specification.md",
  "protocol/spec/context-layer-implementation-and-interoperability.md",
  "protocol/spec/context-layer-architecture-diagram.svg",
  "protocol/reference/context-layer-reference.mjs",
  "protocol/schemas/context-request.schema.json",
  "protocol/schemas/policy-decision.schema.json",
  "protocol/schemas/scoped-context-bundle.schema.json",
  "protocol/schemas/memory-update-proposal.schema.json",
  "protocol/schemas/receipt.schema.json",
  "protocol/fixtures/valid-exchange.json",
  "packages/local-core/index.mjs",
  "docs/context-layer-threat-model.md",
  "test-vectors/v0.2/manifest.json",
  "examples/local-core-demo.mjs",
];

test("repository root is protocol-first and excludes website deployment source", async () => {
  for (const path of requiredProtocolFiles) {
    await access(join(root, path));
  }

  const entries = new Set(await readdir(root));
  for (const siteOnlyEntry of [
    ".openai",
    "app",
    "build",
    "public",
    "worker",
    "next.config.ts",
    "vite.config.ts",
  ]) {
    assert.equal(entries.has(siteOnlyEntry), false, siteOnlyEntry);
  }
});

test("canonical protocol objects and proof artifacts remain on the v0.2 draft line", async () => {
  const specification = await readFile(
    join(root, "protocol/spec/context-layer-technical-specification.md"),
    "utf8",
  );
  const reference = await readFile(
    join(root, "protocol/reference/context-layer-reference.mjs"),
    "utf8",
  );
  assert.match(specification, /Draft Technical Specification v0\.2/);
  assert.match(specification, /context-layer\/0\.2-draft/);
  assert.match(reference, /context-layer\/0\.2-draft/);
});
