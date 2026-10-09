import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, cp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = fileURLToPath(new URL("../", import.meta.url));
const kit = join(root, "conformance/v0.2.0-draft.1");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = async (path) => JSON.parse(await readFile(path, "utf8"));

test("kit integrity manifest binds all exported assets and preserves original vector bytes", async () => {
  const manifest = await json(join(kit, "manifest.json"));
  assert.equal(manifest.kit_version, "context-layer-conformance/0.2.0-draft.1");
  for (const file of manifest.files) assert.equal(sha(await readFile(join(kit, file.path))), file.sha256, file.path);
  const vectorManifest = await json(join(root, "test-vectors/v0.2/manifest.json"));
  assert.equal(vectorManifest.files.length, 4);
  for (const file of ["manifest.json", ...vectorManifest.files.map((value) => value.path)]) assert.deepEqual(await readFile(join(kit, "vectors", file)), await readFile(join(root, "test-vectors/v0.2", file)), file);
  assert.equal((await readdir(join(kit, "fixtures"))).length, 6);
  for (const name of await readdir(join(kit, "fixtures"))) assert.deepEqual(await readFile(join(kit, "fixtures", name)), await readFile(join(root, "protocol/fixtures", name)));
  assert.deepEqual(await readFile(join(kit, "profiles/local-core-0.2-draft.1.md")), await readFile(join(root, "protocol/profiles/local-core-0.2-draft.1.md")));
});

test("versioned schemas compile offline and publication candidates preserve exact identities and refs", async () => {
  for (const version of ["0.2.0-draft.1", "0.3.0-draft.1"]) {
    // Existing companion conditionals use valid parent constraints that Ajv strict
    // heuristics do not infer. Preserve snapshots; validate the JSON Schema meta-schema.
    const ajv = new Ajv2020({ strict: version.startsWith("0.2"), allErrors: true }); addFormats(ajv);
    const directory = join(root, "protocol/schemas", version);
    const names = await readdir(directory);
    assert.equal(names.length, version.startsWith("0.2") ? 5 : 6);
    for (const name of names) {
      const bytes = await readFile(join(directory, name)); const schema = JSON.parse(bytes);
      assert.equal(schema.$id, `https://sierracatalina.com/context-layer/schemas/${version}/${name}`);
      assert.deepEqual(await readFile(join(root, "site/context-layer/schemas", version, name)), bytes);
      assert.equal(ajv.validateSchema(schema), true);
      ajv.compile(schema); // resolves all local $ref fragments without HTTP
      const legacyDirectory = version.startsWith("0.2") ? "protocol/schemas" : "protocol/companions/0.3-draft/schemas";
      const legacy = await json(join(root, legacyDirectory, name));
      const normalized = { ...schema, $id: legacy.$id };
      assert.deepEqual(normalized, legacy, "version snapshot changes only identity: " + name);
      const legacySite = version.startsWith("0.2") ? "implementation" : "primitives";
      assert.deepEqual(await json(join(root, "site/context-layer", legacySite, name)), legacy);
      if (version.startsWith("0.2")) assert.deepEqual(await readFile(join(kit, "schemas", name)), bytes);
    }
  }
});

test("schema catalog binds every versioned source and site candidate", async () => {
  const catalog = await json(join(root, "protocol/schemas/schema-catalog.json"));
  assert.equal(catalog.publication_status, "prepared-not-deployment-verified");
  assert.equal(catalog.schemas.length, 11);
  assert.deepEqual(await json(join(root, "site/context-layer/schemas/index.json")), catalog);
  for (const item of catalog.schemas) {
    const bytes = await readFile(join(root, "protocol/schemas", item.path));
    assert.equal(sha(bytes), item.sha256);
    assert.equal(JSON.parse(bytes).$id, item.id);
  }
});

test("exported kit runs outside repository and tests real reference adapter results", { timeout: 30_000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "context-layer-exported-kit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(kit, directory, { recursive: true });
  const runner = await readFile(join(directory, "run.mjs"), "utf8");
  assert.doesNotMatch(runner, /(?:from|import\()\s*["'](?:\.\.|[^"']*(?:packages\/local-core|protocol\/reference))/);
  const result = spawnSync(process.execPath, [join(directory, "run.mjs"), "--", process.execPath, join(root, "scripts/conformance-reference-adapter.mjs")], { cwd: directory, encoding: "utf8", timeout: 25_000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "passed"); assert.equal(report.original_vector_sets, 4); assert.equal(report.separate_fixture_files, 6); assert.equal(report.passed, 45);
});

test("kit rejects corrupt corpus and unsupported adapter instead of false green", { timeout: 30_000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "context-layer-bad-kit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(kit, directory, { recursive: true });
  const command = ["--", process.execPath, "-e", "process.stdout.write(JSON.stringify({ok:false,error:{code:'UNSUPPORTED_OPERATION'}})+'\\n')"];
  const unsupported = spawnSync(process.execPath, [join(directory, "run.mjs"), ...command], { encoding: "utf8", timeout: 20_000 });
  assert.equal(unsupported.status, 1, unsupported.stderr);
  assert.equal(JSON.parse(unsupported.stdout).status, "failed");
  await writeFile(join(directory, "vectors/canonicalization.json"), "{}\n");
  const corrupt = spawnSync(process.execPath, [resolve(directory, "run.mjs"), ...command], { encoding: "utf8", timeout: 3000 });
  assert.equal(corrupt.status, 2); assert.equal(JSON.parse(corrupt.stdout).status, "setup_failed");
});

test("full-object profile oracles satisfy independent closed schemas and explicit scope", async () => {
  const expected = await json(join(kit, "local-profile-expectations.json"));
  for (const [path, hash] of Object.entries(expected.reference_runtime_sha256)) assert.equal(sha(await readFile(join(root, path))), hash, "oracle reference source changed without review: " + path);
  const ajv = new Ajv2020({ strict: true, allErrors: true }); addFormats(ajv);
  for (const [name, objects] of [
    ["policy-decision", [...Object.values(expected.decisions), ...Object.values(expected.approvals), expected.exchange_decision]],
    ["scoped-context-bundle", [expected.envelope.bundle]],
    ["memory-update-proposal", [expected.proposal]],
    ["receipt", expected.receipts],
  ]) {
    const validate = ajv.compile(await json(join(kit, "schemas", name + ".schema.json")));
    for (const object of objects) assert.equal(validate(object), true, name + ": " + JSON.stringify(validate.errors));
  }
  assert.deepEqual(expected.decisions.allow.granted_selectors, [{ predicate: "file.text" }]);
  assert.deepEqual(expected.decisions.allow.granted_actions, ["model.generate_text"]);
  assert.deepEqual(expected.decisions["allow-with-reductions"].denied_selectors, [{ predicate: "private.note" }]);
  assert.deepEqual(expected.decisions["allow-with-reductions"].denied_actions, ["email.delete"]);
  assert.deepEqual(expected.decisions["needs-approval"].granted_actions, []);
  assert.deepEqual(expected.decisions["needs-approval"].denied_actions, ["email.send"]);
  assert.deepEqual(expected.approvals["authenticated-and-bound"].granted_actions, ["model.generate_text", "email.send"]);
  assert.deepEqual(expected.approvals["authenticated-and-bound"].granted_selectors, [{ predicate: "file.text" }, { predicate: "sensitive.fact" }]);
});

for (const mode of ["scope", "unknown-field", "approval", "retention"]) {
  test("malicious adapter cannot hide rehashed " + mode + " mutation", { timeout: 45_000 }, () => {
    const result = spawnSync(process.execPath, [join(kit, "run.mjs"), "--", process.execPath, join(root, "tests/fixtures/conformance-malicious-adapter.mjs"), mode], { cwd: root, encoding: "utf8", timeout: 40_000, killSignal: "SIGKILL" });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.ok(report.failed > 0);
    assert.ok(report.results.some((item) => item.status === "failed" && item.id.startsWith(mode === "approval" ? "approval/" : "policy/")));
  });
}


test("workflow shell commands avoid unquoted YAML mapping separators", async () => {
  const workflow = await readFile(join(root, ".github/workflows/ci.yml"), "utf8");
  for (const line of workflow.split(/\r?\n/)) {
    const match = /^\s*run:\s+(.+)$/.exec(line);
    if (!match || /^[>|'"]/.test(match[1])) continue;
    assert.doesNotMatch(match[1], /:\s/, "quote or block-format shell command: " + line);
  }
  assert.match(workflow, /run: >-\r?\n\s+python -m pip install[^\n]*--only-binary=:all:/);
});


test("Git checkout protects every hash-bound artifact from CRLF conversion", async () => {
  const paths = new Set();
  const kitManifest = await json(join(kit, "manifest.json"));
  for (const item of kitManifest.files) paths.add("conformance/v0.2.0-draft.1/" + item.path);
  const pythonManifest = await json(join(root, "implementations/python/artifact-manifest.json"));
  for (const item of pythonManifest.files) paths.add("implementations/python/" + item.path);
  const expected = await json(join(kit, "local-profile-expectations.json"));
  for (const path of Object.keys(expected.reference_runtime_sha256)) paths.add(path);
  const catalog = await json(join(root, "protocol/schemas/schema-catalog.json"));
  for (const item of catalog.schemas) { paths.add("protocol/schemas/" + item.path); paths.add("site/context-layer/schemas/" + item.path); }
  for (const path of paths) {
    const result = spawnSync("git", ["check-attr", "text", "eol", "--", path], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(": text: unset") || result.stdout.includes(": eol: lf"), path + " can be rewritten by core.autocrlf");
  }
});
