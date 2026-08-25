import assert from "node:assert/strict";
import test from "node:test";
import {
  contextLayerPageNames,
  formatContextLayerHtml,
  formatContextLayerPages,
} from "../scripts/format-context-layer-site.mjs";
import { verifyContextLayerEditorial } from "../scripts/verify-context-layer-editorial.mjs";

test("editorial formatter is idempotent across all seven public pages", async () => {
  assert.equal(contextLayerPageNames.length, 7);
  assert.deepEqual(await formatContextLayerPages({ check: true }), []);
});

test("editorial formatter protects technical and user-authored boundaries", () => {
  const source = [
    "<h1>USEFUL CONTEXT AND OpenAI APIs</h1>",
    "<pre><code>API AND UI</code></pre>",
    "<textarea>User AND API</textarea>",
    '<input value="User AND API" placeholder="ASK OpenAI AND CONTINUE">',
    '<a href="https://Example.com/Foo-and-Bar">Link AND OpenAI</a>',
  ].join("");
  const once = formatContextLayerHtml(source);

  assert(once.includes("<h1>useful context &amp; OpenAI APIs</h1>"));
  assert(once.includes("<pre><code>API AND UI</code></pre>"));
  assert(once.includes("<textarea>User AND API</textarea>"));
  assert(once.includes('value="User AND API"'));
  assert(once.includes('href="https://Example.com/Foo-and-Bar"'));
  assert.equal(formatContextLayerHtml(once), once);
});

test("site editorial verifier covers static, runtime, and typography contracts", async () => {
  await assert.doesNotReject(verifyContextLayerEditorial());
});
