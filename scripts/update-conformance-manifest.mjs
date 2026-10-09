// Maintainer helper for the proposed kit. Released versions must never be rewritten.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../conformance/v0.2.0-draft.1/", import.meta.url));
async function list(directory, prefix = "") {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = prefix + item.name;
    if (item.isDirectory()) files.push(...await list(join(directory, item.name), path + "/"));
    else if (path !== "manifest.json") files.push(path);
  }
  return files.sort();
}
const files = [];
for (const path of await list(root)) files.push({ path, sha256: createHash("sha256").update(await readFile(join(root, path))).digest("hex") });
await writeFile(join(root, "manifest.json"), JSON.stringify({ kit_version: "context-layer-conformance/0.2.0-draft.1", status: "proposed-unreleased", spec_version: "context-layer/0.2-draft", profile: "local-core/0.2-draft.1", files }, null, 2) + "\n");
