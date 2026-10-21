import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ALL_SELECTORS, CLAIMS } from "./fixture.mjs";
import { createBoundary } from "./boundary.mjs";

const mode = process.argv[2];
if (!["baseline", "scoped"].includes(mode)) throw new Error("Expected baseline or scoped mode");
const boundary = mode === "scoped" ? await createBoundary() : null;
const server = new McpServer({ name: "context-layer-meeting-demo", version: "0.1.0" });
server.registerTool("get_meeting_context", {
  description: "Get synthetic facts for fictional Jordan's Atlas kickoff. Omit selectors for all available fields; the deployment policy controls disclosure.",
  inputSchema: { selectors: z.array(z.string()).min(1).max(12).optional() },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async ({ selectors = ALL_SELECTORS }) => {
  let result;
  if (mode === "baseline") {
    const context = CLAIMS.filter(claim => selectors.includes(claim.predicate))
      .map(({ predicate, value }) => ({ predicate, value }));
    result = { synthetic: true, mode, decision: "unscoped_baseline", context,
      disclosed_fields: context.length, warning: "This intentionally over-disclosing baseline has no Context Layer policy boundary." };
  } else {
    const disclosure = await boundary.disclose(selectors);
    delete disclosure.test;
    const receipts = disclosure.receipts;
    delete disclosure.receipts;
    result = { ...disclosure, receipts: receipts.map(({ id, operation, outcome, payload_included }) =>
      ({ id, operation, outcome, payload_included })) };
  }
  return { content: [{ type: "text", text: JSON.stringify(result) }],
    isError: result.decision === "deny" };
});
const transport = new StdioServerTransport();
await server.connect(transport);
process.stdin.on("end", async () => { await boundary?.close(); });
