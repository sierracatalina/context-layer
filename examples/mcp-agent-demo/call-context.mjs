// One-shot bridge for an actual model agent's shell tool. This is not a model.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { callContext } from "./client.mjs";
const [mode, outputPath, ...selectors] = process.argv.slice(2);
if (!outputPath) throw new Error("Usage: node call-context.mjs baseline|scoped OUTPUT_JSON [selectors ...]");
const result = await callContext(mode, selectors.length ? selectors : undefined);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result.payload, null, 2));
