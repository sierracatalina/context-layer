import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

export async function callContext(mode, selectors) {
  const wire = [];
  const transport = new StdioClientTransport({
    command: process.execPath, args: [fileURLToPath(new URL("./server.mjs", import.meta.url)), mode],
    stderr: "pipe",
  });
  let onmessage;
  Object.defineProperty(transport, "onmessage", {
    get: () => onmessage,
    set: handler => { onmessage = message => {
      wire.push({ at: new Date().toISOString(), direction: "server-to-client", message });
      handler?.(message);
    }; }, configurable: true,
  });
  const send = transport.send.bind(transport);
  transport.send = async message => {
    wire.push({ at: new Date().toISOString(), direction: "client-to-server", message });
    return send(message);
  };
  let stderr = "";
  transport.stderr.on("data", data => { stderr += data; });
  const client = new Client({ name: "context-layer-demo-bridge", version: "0.1.0" });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const result = await client.callTool({ name: "get_meeting_context", arguments: selectors ? { selectors } : {} });
    const payload = JSON.parse(result.content.find(item => item.type === "text").text);
    return { mode, server: client.getServerVersion(), tools: tools.tools.map(tool => tool.name),
      protocol_version: wire.find(item => item.message.result?.protocolVersion)?.message.result.protocolVersion,
      payload, is_error: result.isError === true, wire };
  } catch (error) {
    throw new Error(`${error.message}${stderr ? "\nServer stderr: " + stderr : ""}`);
  } finally { await client.close(); }
}
