# Real MCP transport, scoped meeting context

This example compares an intentionally over-disclosing tool with a Context Layer
policy boundary. The task is to draft a three-bullet kickoff agenda. All six input
facts are invented; only three concern the task.

## What is real?

- The official MCP TypeScript SDK **1.32.1**, pinned in a separate package and lockfile.
- Separate client/server processes using **stdio JSON-RPC**, including `initialize`,
  `notifications/initialized`, `tools/list`, and `tools/call`. The observed negotiated
  MCP version is recorded by each run, rather than assumed.
- The repository's local-core policy, Ed25519 bundle verification, single-use
  consumer, and receipt log run before the scoped tool result leaves the server.
- The recorded model-agent comparison uses an actual native model agent calling
  the SDK client through a shell bridge, then generating its own agenda from the
  returned tool result. It is **agent → shell bridge → MCP client → MCP server**.
  It is not direct native MCP host/plugin integration. See [recorded evidence](../../docs/demo/README.md).

`npm run demo` is an automated protocol test client, **not an AI agent**. It does
not generate prose or call a model. Agent outputs are recorded separately.

## Fresh-clone quick start

Prerequisites: Git, Node.js **22.13 or newer**, npm, and access to the public npm
registry. No API key, paid API call, personal account, or persistent MCP setup is
needed for the protocol demo. A model host is a separate prerequisite for the
optional real-agent paths below; it may have its own plan or usage costs.

From a fresh clone of the revision containing this example:

```sh
git clone https://github.com/sierracatalina/context-layer.git
cd context-layer
npm --prefix examples/mcp-agent-demo ci --ignore-scripts --no-audit --no-fund
npm --prefix examples/mcp-agent-demo test
node examples/mcp-agent-demo/protocol-demo.mjs outputs/mcp-protocol-demo
```

Expected: before 6 fields; after 3; private-only request denied with 0 fields;
8 tests pass. Typical target: under 10 minutes **after installing prerequisites**.
The measured environment and exact timing scope are in [the evidence record](../../docs/demo/README.md).
Do not present a protocol-only timing as a complete model-host setup timing.

## Use the real tool from an existing model agent

Give an existing shell-capable agent the task in `TASK_PROMPT` from `fixture.mjs`
and offer this command as its `get_meeting_context` tool bridge:

```sh
node examples/mcp-agent-demo/call-context.mjs scoped outputs/agent-scoped/mcp-tool-call.json
```

The agent should choose to call it, read its actual output, and generate an agenda.
Use a fresh, independent agent context for the baseline comparison, changing
`scoped` to `baseline`. Do not show baseline results to the scoped agent. This
bridge works with the agent's existing authorized shell; it grants no ongoing
account access. The JSON file records the real transport transcript.

For an already installed and signed-in Codex CLI, an **optional, unverified here**
direct-host runner registers the server only for its ephemeral invocation:

```sh
node examples/mcp-agent-demo/run-agent.mjs outputs/codex-mcp-demo
```

The runner disables shell, apps, browser and web search for the nested task. It
never logs in or creates credentials. Our managed environment stops before model
execution with a read-only runtime-state error, even using writable SQLite/log
paths. The bridge path is the recorded model-agent evidence; direct-host success
remains unclaimed. A successful exit elsewhere still requires reviewing tool
call events and the generated agenda.

## Read the boundary correctly

The baseline's problem is **data delivered to the model**, even if the model does
not repeat it in its answer. The after result retains the agenda facts while
excluding health, finances, and a journal value. No quality superiority or general
privacy guarantee is inferred from two agendas.

The MCP adapter is trusted and owns both the disclosure policy and the synthetic
source. Recipient identity is deployment-bound to the local process; this example
is not OAuth, remote identity verification, or hostile-host isolation. The bridge
and host receive disclosed values. Expiry controls future local operations, not
copies already seen, model-provider retention, or proof of deletion. Receipts
record bundle issue/consume and `context.disclose`, not proof that a model obeyed
retention rules or completed a later action. No raw personal vault is connected.

The negative tests cover explicit private selectors, wildcard requests, altered
bundles, replay, and expired local sessions. They are regression evidence, not an
external security review. No external messages or other business actions occur.

## Source references

- [Official MCP SDK server documentation](https://ts.sdk.modelcontextprotocol.io/server)
- [Official MCP SDK repository](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP stdio transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Codex startup report matching the observed managed-runtime symptom](https://github.com/openai/codex/issues/51293)
