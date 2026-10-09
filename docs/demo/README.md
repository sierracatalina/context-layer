# MCP meeting demo: evidence and limits

Recorded **2026-10-09 UTC**, on the Context Layer `0.2-draft` local runtime based
on main `0a8d016c822f38e8fc857422e133d0699c42a21f`.

## Result

Two separate native model-agent contexts prepared fictional Jordan's Atlas kickoff
agenda. Each invoked `get_meeting_context` through the official MCP SDK client
bridge and generated its own answer from the received tool result. Neither agenda
was a deterministic template or a canned model response.

- Before: the intentionally broad tool delivered **6 fields**, including three
  irrelevant synthetic personal facts. The agent omitted those facts from its answer,
  but it had already received them.
- After: policy reduced the same broad request to **3 task-relevant fields** before
  the MCP tool result reached the client. The full received trace contains none of
  the three personal sentinel values.
- Both actual agendas covered the pilot scope, an owner, and a Friday check-in.
  This shows this task remained possible; it is not a statistically established
  quality comparison.
- A separate, actual MCP request for only `private.journal` was denied with
  **0 fields**. Eight transport/boundary regression tests passed.

**Observed route:** native model agent → shell tool → official SDK client bridge
→ stdio MCP server → Context Layer disclosure boundary. The native agent's model
identifier was not exposed to the run; the provenance files say `unavailable`.
This is one bridge-based local integration, not native host/plugin integration,
independent adopter evidence, or general MCP interoperability certification.

## Inspect the actual artifacts

| Artifact | What it records |
| --- | --- |
| [Baseline MCP trace](evidence/agent-baseline/mcp-tool-call.json) | Timestamped initialization, tool discovery, call, and six-field result |
| [Baseline agenda](evidence/agent-baseline/agenda.txt) | Unedited model-generated answer |
| [Baseline provenance](evidence/agent-baseline/provenance.json) | Exact bridge command and agent statement |
| [Scoped MCP trace](evidence/agent-scoped/mcp-tool-call.json) | Timestamped three-field result and minimized receipt metadata |
| [Scoped agenda](evidence/agent-scoped/agenda.txt) | Unedited, separately generated model answer |
| [Scoped provenance](evidence/agent-scoped/provenance.json) | Exact bridge command, timestamps and bundle ID |
| [Protocol report](evidence/protocol/report.json) | Actual automatic before/after/deny run |
| [Negative trace](evidence/protocol/denied.json) | Actual private-only request and zero-field denial |
| [Terminal recording](evidence/terminal-recording.json) | Timed stdout capture used for the walkthrough |
| [Host attempt](evidence/codex-host-attempt/status.json) | Direct-host failure before model execution |
| [File hashes](evidence/SHA256SUMS) | Integrity inventory for evidence, implementation, and media |

Public evidence replaces absolute checkout-path prefixes with `[CHECKOUT]` and the
installed Node path with `[NODE_EXECUTABLE]`. Synthetic tool payloads, timestamps,
and final agendas are unchanged. No private task IDs, system prompts, session links,
credentials, or hidden model reasoning are included.

The official SDK is pinned to **1.32.1**, Zod to **4.3.6**. The client and server
negotiated MCP **2025-11-25**. The scope boundary uses the existing Ed25519 local
profile and the actual consumer checks. Receipts cover `bundle.issue`,
`bundle.consume`, and `context.disclose` only.

## Under-two-minute walkthrough

[Watch or download the MP4](../../site/context-layer/demo/media/mcp-agent-walkthrough.mp4)
(**87.5 seconds**, 1280×720, silent with visible explanatory text).
[Poster](../../site/context-layer/demo/media/mcp-agent-walkthrough.png) ·
[Stage subtitles](../../site/context-layer/demo/media/mcp-agent-walkthrough.srt).

The video is a rendering of **actual timed terminal output**, not a simulated
terminal session. Its live protocol and test commands really ran during capture.
The model-result sections visibly say **recorded agent result** because those two
sessions were captured earlier. No model call is depicted as live inside the
walkthrough. The rendering uses editorial pauses, not fabricated successes.

To reproduce the media capture after generating or retaining the labeled agent
artifacts, run `node examples/mcp-agent-demo/record-walkthrough.mjs`, then use
`render-recording.py` with the captured JSON and an MP4 output path. Media tooling
requires Python, Pillow, ffmpeg and the configured DejaVu fonts; none is required
for the runnable protocol example.

## Fresh-clone timing and prerequisites

See [the runnable quick start](../../examples/mcp-agent-demo/README.md). Prerequisites
are Git, Node ≥22.13, npm, and public npm access. The no-credential command runs real
MCP transport and policy tests; it does not start a model. Repeating the model-agent
comparison needs an existing authorized model-agent session with shell access.
Model availability, plan limits, and provider costs are outside this local demo.

Measured public fresh clone at immutable revision
`12bdad60bb34ac0bc47bd1e6b322d032c14a8110`: **14.26 seconds** total on
Linux / Node 24.19.0 / npm 11.9.0, using a new empty npm cache. This includes Git
clone [7.03 s], checkout [0.01 s], locked install [4.94 s], 8 passing tests
[1.43 s], and the actual MCP demonstration [0.74 s]. Network/proxy caches were
not controlled. [Machine-readable timing](evidence/fresh-clone.json) ·
[Actual command transcript](evidence/fresh-clone-transcript.txt).

That measurement establishes the protocol quick-start target under the stated
prerequisites. It excludes installing Git/Node and starting/authenticating a model
host. No complete clone-to-model-output timing is claimed. This evidence was added
in a documentation-only follow-up; the measured implementation revision is pinned
above rather than relabeled as a later commit.

## Direct host blocker

The optional `run-agent.mjs` uses an already signed-in Codex CLI and invocation-only
MCP configuration, with shell/apps/browser/web tools disabled. In this managed
runtime it exited before a model response with:

> failed to initialize in-process app-server client: Read-only file system (os error 30)

A supported writable SQLite/log-directory override produced the same observed
startup error. No credentials were read or copied, no security settings changed,
and no persistent MCP registration was added. An upstream
[matching symptom report](https://github.com/openai/codex/issues/51293) exists; it
does not prove the exact root cause of this environment's failure.

## Limits and validation scope

The source is synthetic fixture data behind a trusted local adapter, not a live
personal vault. Recipient identity is deployment-bound to a local process, not
remotely authenticated by MCP. The host and its model provider can see disclosed
values. Local expiry and receipts do not prove provider-side retention compliance,
erasure of copies, or a model's later behavior. No messages, bookings, purchases,
or real-world actions were made.

The source was developed on the pinned base and validated after the recorded
sessions. One unused-variable cleanup after the model sessions did not change
payloads or policy behavior. Evidence hashes pin the delivered artifacts; they do
not imply deterministic reproduction of model wording. The complete combined
hardening branch requires its own final test run after integration.
