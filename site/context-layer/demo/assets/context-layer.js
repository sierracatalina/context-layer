import { formatEditorialText } from "../../assets/context-layer-editorial.mjs";

const demoStages = [
  {
    kicker: "Context request",
    title: "The app declares what it needs and why.",
    summary: "It requests enough context to plan a Saturday, not permission to browse an entire vault.",
    tag: ["Requested", "request"],
    callout: "Purpose: build a one-day itinerary. Recipient: Harbor Planner. Retention: none.",
    disclosure: 100,
    disclosureLabel: "Request defines five needed fields",
    next: "Review private vault",
    input: [
      ["available hours", "requested"],
      ["departure area", "requested"],
      ["dietary preference", "requested"],
      ["transit preference", "requested"],
      ["spending range", "requested"]
    ],
    output: [
      ["purpose: plan_day", "declared"],
      ["recipient: harbor_planner", "declared"],
      ["retention: none", "declared"],
      ["expires_in: 2h", "declared"],
      ["fields: 5", "declared"]
    ],
    data: {
      type: "context_request",
      requester: "harbor-planner.example",
      purpose: "plan_day",
      requested_fields: ["availability", "departure_area", "diet", "transit", "spending_range"],
      retention: "none",
      expires_in: "PT2H"
    }
  },
  {
    kicker: "Private vault",
    title: "The useful facts sit beside facts the app should never see.",
    summary: "The vault is the authority boundary. It can evaluate private context without copying the entire store into the requesting app.",
    tag: ["Private", "private"],
    callout: "Exact address, calendar titles, contacts, and unrelated notes remain inside the vault.",
    disclosure: 100,
    disclosureLabel: "Nine candidate fields remain inside the vault",
    next: "Apply policy",
    input: [
      ["10:00–18:00 free", "private"],
      ["14 Harbor Street", "private"],
      ["North Station area", "private"],
      ["vegetarian", "private"],
      ["public transit", "private"],
      ["exact account balance", "private"],
      ["under $80 preferred", "private"],
      ["calendar titles", "private"],
      ["personal contacts", "private"]
    ],
    output: [
      ["availability claim", "candidate"],
      ["departure claim", "candidate"],
      ["diet claim", "candidate"],
      ["transit claim", "candidate"],
      ["budget claim", "candidate"],
      ["four unrelated fields", "held back"]
    ],
    data: {
      type: "vault_evaluation",
      candidate_claims: 5,
      protected_fields: 4,
      raw_export: false,
      authority: "user_controlled"
    }
  },
  {
    kicker: "Policy decision",
    title: "Policy reduces precision before anything leaves.",
    summary: "Scope, consent, purpose, recipient, and expiration decide which claims are allowed, reduced, or denied.",
    tag: ["Reduced", "reduced"],
    callout: "The address becomes a neighborhood. Calendar content becomes free/busy. Exact finances are denied.",
    disclosure: 56,
    disclosureLabel: "Five of nine candidate fields can leave",
    next: "Issue scoped bundle",
    input: [
      ["10:00–18:00 free", "private"],
      ["14 Harbor Street", "private"],
      ["North Station area", "private"],
      ["vegetarian", "private"],
      ["public transit", "private"],
      ["exact account balance", "private"],
      ["under $80 preferred", "private"],
      ["calendar titles", "private"],
      ["personal contacts", "private"]
    ],
    output: [
      ["free/busy window", "reduced"],
      ["North Station area", "reduced"],
      ["vegetarian", "allowed"],
      ["public transit", "allowed"],
      ["under $80", "reduced"],
      ["exact address", "denied"],
      ["calendar titles", "denied"],
      ["account balance", "denied"],
      ["personal contacts", "denied"]
    ],
    data: {
      type: "policy_decision",
      decision: "allow_with_reductions",
      purpose: "plan_day",
      allowed: ["availability", "diet", "transit"],
      reduced: ["departure_area", "spending_range"],
      denied: ["exact_address", "calendar_titles", "account_balance", "contacts"]
    }
  },
  {
    kicker: "Scoped context bundle",
    title: "The recipient gets a small, expiring transfer object.",
    summary: "The bundle carries only approved claims plus purpose, audience, constraints, expiration, and a receipt reference.",
    tag: ["Allowed", "allowed"],
    callout: "Bound to Harbor Planner, expires in two hours, and cannot be retained or reused for another purpose.",
    disclosure: 44,
    disclosureLabel: "The bundle contains five minimized claims",
    next: "Assemble result",
    input: [
      ["five allowed claims", "allowed"],
      ["four denied fields", "denied"],
      ["purpose binding", "allowed"],
      ["recipient binding", "allowed"],
      ["expiration", "allowed"]
    ],
    output: [
      ["Saturday, 10:00–18:00", "allowed"],
      ["North Station area", "reduced"],
      ["vegetarian", "allowed"],
      ["public transit", "allowed"],
      ["budget under $80", "reduced"],
      ["expires in 2 hours", "allowed"]
    ],
    data: {
      type: "scoped_context_bundle",
      audience: "harbor-planner.example",
      purpose: "plan_day",
      claims: {
        availability: "2026-06-20T10:00/18:00",
        departure_area: "North Station",
        diet: "vegetarian",
        transit: "public",
        spending_range: "under_80_usd"
      },
      expires_in: "PT2H",
      retention: "none"
    }
  },
  {
    kicker: "User surface",
    title: "The interface assembles a useful result from less data.",
    summary: "A compact itinerary can be produced without exposing the underlying address, calendar titles, contacts, or financial record.",
    tag: ["Rendered", "allowed"],
    callout: "10:30 ferry market · 13:00 maritime museum · 16:00 garden walk · estimated total $64.",
    disclosure: 44,
    disclosureLabel: "No additional private context is disclosed",
    next: "Inspect receipt",
    input: [
      ["scoped bundle", "allowed"],
      ["public venue data", "allowed"],
      ["public transit data", "allowed"],
      ["venue prices", "allowed"]
    ],
    output: [
      ["three-stop itinerary", "allowed"],
      ["transit sequence", "allowed"],
      ["budget estimate: $64", "allowed"],
      ["memory proposal", "needs review"]
    ],
    data: {
      type: "interface_result",
      surface: "itinerary",
      actions: ["show_plan", "show_transit", "show_budget"],
      memory_update: {
        proposal: "Prefers small museums",
        status: "requires_confirmation"
      }
    }
  },
  {
    kicker: "Audit receipt",
    title: "The disclosure and resulting action become reviewable.",
    summary: "The receipt records the requester, purpose, decision, reductions, expiration, and action without copying the private source data into the audit trail.",
    tag: ["Recorded", "recorded"],
    callout: "The user can see what was shared and reject the proposed memory update. The receipt is evidence of a decision, not proof that every component is trustworthy.",
    disclosure: 44,
    disclosureLabel: "The receipt references decisions, not raw vault data",
    next: "Restart demo",
    input: [
      ["request identifier", "allowed"],
      ["policy decision", "allowed"],
      ["bundle digest", "allowed"],
      ["result action", "allowed"],
      ["memory proposal", "needs review"]
    ],
    output: [
      ["requester recorded", "recorded"],
      ["purpose recorded", "recorded"],
      ["5 allowed / 4 denied", "recorded"],
      ["expiration recorded", "recorded"],
      ["memory write: pending", "recorded"]
    ],
    data: {
      type: "receipt",
      requester: "harbor-planner.example",
      purpose: "plan_day",
      decision: "allow_with_reductions",
      fields: { allowed: 5, denied: 4 },
      retention: "none",
      action: "itinerary_rendered",
      memory_update: "pending_user_confirmation"
    }
  }
];

const layerData = {
  data: {
    number: "01",
    label: "Data plane",
    title: "Turn many source formats into attributable context.",
    summary: "This layer captures events, preserves origin, normalizes schemas, and extracts claims without erasing provenance.",
    examples: "Current examples: browser tabs, Gmail and other email, Signal messages, local files, audio notes, web APIs, GitHub webhooks, and connected devices.",
    nodes: [
      ["Open protocols", "Standard transports and social or agent protocols carry source events.", "HTTP, TLS, ActivityPub, AT Protocol, Nostr, IPFS, Matrix, MCP, A2A"],
      ["Raw data transport", "Webhooks, APIs, files, messages, and streams deliver unmodified payloads.", "REST APIs, WebSocket, Bluetooth LE, email, file watchers"],
      ["Capture", "Create a source event with origin, time, adapter, and integrity metadata.", "Gmail message event, GitHub issue event, browser-tab snapshot"],
      ["Normalize", "Map source-specific fields into a stable event and claim representation.", "sender → actor, receivedAt → observed_at, URL canonicalization"],
      ["Extract", "Identify entities, relations, claims, and embeddings while retaining source links.", "person, project, due date, preference, contradiction candidate"]
    ]
  },
  vault: {
    number: "02",
    label: "Vault",
    title: "Keep private context under the user's authority.",
    summary: "The vault is a trust boundary and decision point, not a brand of database. It can run locally, on user-controlled infrastructure, or through a trusted service profile.",
    examples: "Current building blocks: encrypted SQLite or Postgres, OS key stores, passkeys and capability tokens, Solid-style personal data stores, local-first sync, and append-only provenance logs.",
    nodes: [
      ["Memory graph", "Connect entities, relations, claims, and time without flattening every source.", "Knowledge graph, temporal tables, vector and lexical indexes"],
      ["Versioned summaries", "Compact context while retaining prior versions and source coverage.", "Rolling project summary, contact history, preference history"],
      ["Contradiction handling", "Preserve conflicting claims and score trust instead of silently overwriting.", "Old address vs. new address, changed preference, disputed fact"],
      ["Provenance ledger", "Record where a claim came from, when it was observed, and what transformed it.", "W3C PROV concepts, content hashes, signed adapter events"],
      ["Identity and permissions", "Bind people, apps, devices, and agents to capabilities.", "Passkeys, OAuth grants, DIDs, macaroons or capability tokens"],
      ["Policy bindings", "Attach scope, consent, purpose, and expiry rules to context.", "Allow work availability; deny medical notes; expire after task"]
    ]
  },
  policy: {
    number: "03",
    label: "Policy",
    title: "Decide what may cross a trust boundary.",
    summary: "A request is evaluated before data leaves the vault. Proxies transform or match context so the recipient learns the minimum needed for a declared purpose.",
    examples: "Current analogues: OAuth scopes, mobile privacy prompts, data-loss-prevention rules, attribute-based access control, privacy budgets, selective disclosure, and API gateways.",
    nodes: [
      ["Policy boundary", "Evaluate requester, purpose, consent, field scope, retention, and expiration.", "allow, deny, require approval, or allow with reductions"],
      ["Semantic proxy", "Redact, alias, summarize, compress, or route context before egress.", "exact address → neighborhood; calendar titles → free/busy"],
      ["Discovery proxy", "Match against private context without exposing the underlying private record.", "Does any trusted contact know this skill? Return yes, not the contact list"],
      ["Untrusted zone", "Treat public search, relays, third-party APIs, and external agents as outside the vault's authority.", "Search engines, Nostr relays, marketplace APIs, remote model calls"],
      ["Scoped context bundle", "Issue the smallest recipient-bound transfer object with constraints and expiry.", "claims + audience + purpose + tools + expiration + receipt reference"]
    ]
  },
  interface: {
    number: "04",
    label: "Interface",
    title: "Let agents and surfaces use the same bounded context.",
    summary: "Runtimes consume a scoped bundle, select tools, and assemble the interface a task needs. Proposed writes return through policy for explicit review.",
    examples: "Current examples: OpenAI Codex, Goose, local models, cloud model APIs, MCP clients, React dashboards, SwiftUI apps, chat, search, browser, voice, and spatial surfaces.",
    nodes: [
      ["Agent runtime", "Run local or cloud agents against the allowed bundle and declared tools.", "Codex, Goose, MCP hosts, local model runners, cloud model APIs"],
      ["Self-assembling UI", "Select task-specific views from a constrained component registry.", "Cards, tables, maps, timelines, forms, workspaces"],
      ["User experience", "Present the result and current authority state across surfaces.", "Chat, search, browser, voice, mobile, AR"],
      ["Proposed memory update", "Return agent-suggested writes to policy instead of changing memory silently.", "Confirm new preference, reject inferred relationship, edit summary"]
    ]
  },
  receipts: {
    number: "05",
    label: "Receipts",
    title: "Make sensitive operations inspectable after the fact.",
    summary: "Every disclosure, proxy operation, model call, agent action, and proposed write can emit a signed, append-only record with privacy-preserving references.",
    examples: "Current building blocks: append-only event logs, transparency logs such as Sigstore Rekor, W3C PROV-style lineage, signed webhooks, audit-event schemas, and content-addressed digests.",
    nodes: [
      ["Receipt write", "Record the decision and operation at each sensitive boundary.", "capture, normalize, extract, policy, proxy, bundle, model call, action"],
      ["Data minimization", "Store identifiers, digests, and decision metadata without duplicating raw private context.", "bundle hash rather than bundle contents; policy version rather than policy text"],
      ["User readable", "Explain what happened in language a person can verify.", "who asked, why, what fields, what changed, how long, what action"],
      ["Portable evidence", "Allow receipts to move with an export or be verified across compatible systems.", "signed JSON, stable identifiers, integrity digests, revocation references"]
    ]
  }
};

const guideFallbacks = [
  {
    terms: ["demo", "show", "try", "plan", "day"],
    answer: "The synthetic demo shows a fictional itinerary request moving through a private vault, policy reductions, a scoped bundle, a result, and a receipt. I’m taking you there now.",
    target: "demo"
  },
  {
    terms: ["policy", "scope", "consent", "minimum", "reduce", "reveal"],
    answer: "Policy evaluates the requester, declared purpose, consent, field scope, retention, and expiration. It can allow, deny, require approval, or reduce precision before context leaves the vault.",
    target: "demo-policy"
  },
  {
    terms: ["receipt", "audit", "prove", "record"],
    answer: "A receipt records who requested context, the declared purpose, what was allowed or denied, the bundle digest, expiration, and the resulting action. It is evidence of a decision, not a claim that every component is trustworthy.",
    target: "demo-receipt"
  },
  {
    terms: ["vault", "private", "memory", "store"],
    answer: "The vault is the user-controlled authority boundary. It evaluates private context and can issue claims without exporting the raw memory store. I’ll open the vault layer.",
    target: "map-vault"
  },
  {
    terms: ["bundle", "transfer", "expires", "recipient"],
    answer: "A scoped context bundle is the minimum transfer object: approved claims bound to a recipient and purpose, with constraints, expiration, tools, and a receipt reference.",
    target: "demo-bundle"
  },
  {
    terms: ["map", "architecture", "layer", "component"],
    answer: "The progressive map separates ingestion, the private vault, policy gates, interfaces, and receipts. It shows one responsibility at a time so the complete architecture stays readable.",
    target: "map"
  },
  {
    terms: ["spec", "reference", "document", "implement"],
    answer: "The reference section links the draft specification, implementation profiles, plain-language introduction, and machine-readable navigation manifest.",
    target: "reference"
  },
  {
    terms: ["why", "problem", "context layer", "what is"],
    answer: "Context Layer proposes a user-controlled boundary between private memory and the apps or agents that need task-specific context. The goal is useful context without unrestricted access.",
    target: "why"
  }
];

const allowedTargets = new Set([
  "why", "demo", "demo-policy", "demo-bundle", "demo-receipt",
  "map", "map-data", "map-vault", "map-policy", "map-interface", "map-receipts",
  "guide", "reference"
]);

let currentStage = 0;
let heroTimer = null;

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
const editorial = (value) => formatEditorialText(String(value));
const editorialGenerated = (value) => formatEditorialText(String(value), { preserveUnknownCase: true });

function setHeroStage(index) {
  qsa("[data-hero-stage]").forEach((item, itemIndex) => {
    item.classList.toggle("is-active", itemIndex === index);
    item.classList.toggle("is-past", itemIndex < index);
  });
  const packet = qs("[data-hero-packet]");
  if (packet) packet.style.transform = `translateY(${index * 68}px)`;
}

function playHeroFlow() {
  if (heroTimer) window.clearInterval(heroTimer);
  let index = 0;
  setHeroStage(index);
  heroTimer = window.setInterval(() => {
    index += 1;
    if (index >= demoStages.length) {
      window.clearInterval(heroTimer);
      heroTimer = null;
      return;
    }
    setHeroStage(index);
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 720);
}

function fieldList(target, fields) {
  const list = qs(target);
  list.replaceChildren(...fields.map(([label, state]) => {
    const item = document.createElement("li");
    item.dataset.state = state;
    const value = document.createElement("span");
    value.textContent = editorial(label);
    const status = document.createElement("small");
    status.textContent = editorial(state);
    item.append(value, status);
    return item;
  }));
}

function setDemoStage(index, announce = true) {
  currentStage = Math.max(0, Math.min(index, demoStages.length - 1));
  const stage = demoStages[currentStage];

  qs("[data-stage-kicker]").textContent = editorial(stage.kicker);
  qs("[data-stage-title]").textContent = editorial(stage.title);
  qs("[data-stage-summary]").textContent = editorial(stage.summary);
  qs("[data-stage-callout]").replaceChildren();
  const tag = document.createElement("span");
  tag.className = `status-tag status-tag--${stage.tag[1]}`;
  tag.textContent = editorial(stage.tag[0]);
  const callout = document.createElement("p");
  callout.textContent = editorial(stage.callout);
  qs("[data-stage-callout]").append(tag, callout);

  fieldList("[data-stage-input]", stage.input);
  fieldList("[data-stage-output]", stage.output);
  qs("[data-input-count]").textContent = editorial(`${stage.input.length} ${stage.input.length === 1 ? "field" : "fields"}`);
  qs("[data-output-count]").textContent = editorial(`${stage.output.length} ${stage.output.length === 1 ? "field" : "fields"}`);
  qs("[data-stage-code]").textContent = JSON.stringify(stage.data, null, 2);
  qs("[data-progress-label]").textContent = editorial(`Step ${currentStage + 1} of ${demoStages.length}`);
  qs("[data-disclosure-label]").textContent = editorial(stage.disclosureLabel);
  qs("[data-meter]").setAttribute("aria-valuenow", String(stage.disclosure));
  qs("[data-meter-fill]").style.width = `${stage.disclosure}%`;
  qs("[data-meter-value]").textContent = `${stage.disclosure}%`;

  const prev = qs("[data-prev-stage]");
  const next = qs("[data-next-stage]");
  prev.disabled = currentStage === 0;
  next.innerHTML = `${editorial(stage.next)} <span aria-hidden="true">→</span>`;

  qsa("[data-stage-button]").forEach((button, buttonIndex) => {
    button.setAttribute("aria-selected", String(buttonIndex === currentStage));
    button.classList.toggle("is-complete", buttonIndex < currentStage);
    button.tabIndex = buttonIndex === currentStage ? 0 : -1;
  });

  setHeroStage(currentStage);
  if (announce) qs("[data-announcer]").textContent = editorial(`Step ${currentStage + 1}: ${stage.kicker}. ${stage.title}`);
}

function setLayer(layerKey, moveFocus = false) {
  const layer = layerData[layerKey] || layerData.data;
  const panel = qs("[data-layer-panel]");
  panel.replaceChildren();

  const intro = document.createElement("div");
  intro.className = "layer-panel__intro";
  const heading = document.createElement("div");
  const label = document.createElement("p");
  label.className = "utility-label";
  label.textContent = editorial(`${layer.number} / ${layer.label}`);
  const title = document.createElement("h3");
  title.textContent = editorial(layer.title);
  heading.append(label, title);
  const copy = document.createElement("div");
  const summary = document.createElement("p");
  summary.textContent = editorial(layer.summary);
  const examples = document.createElement("p");
  examples.textContent = editorial(layer.examples);
  examples.style.marginTop = "14px";
  copy.append(summary, examples);
  intro.append(heading, copy);

  const nodes = document.createElement("ol");
  nodes.className = "layer-nodes";
  layer.nodes.forEach((node, index) => {
    const item = document.createElement("li");
    const number = document.createElement("span");
    number.className = "node-index";
    number.textContent = String(index + 1).padStart(2, "0");
    const body = document.createElement("div");
    const name = document.createElement("h4");
    name.textContent = editorial(node[0]);
    const description = document.createElement("p");
    description.textContent = editorial(node[1]);
    const currentExamples = document.createElement("small");
    currentExamples.textContent = editorial(`Examples: ${node[2]}`);
    body.append(name, description, currentExamples);
    item.append(number, body);
    nodes.append(item);
  });

  panel.append(intro, nodes);
  qsa("[data-layer]").forEach((button) => {
    const selected = button.dataset.layer === layerKey;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  qs("[data-announcer]").textContent = editorial(`${layer.label} selected. ${layer.title}`);
  if (moveFocus) panel.focus({ preventScroll: true });
}

function fallbackGuide(question) {
  const normalized = question.toLowerCase();
  let best = guideFallbacks[guideFallbacks.length - 1];
  let score = -1;
  guideFallbacks.forEach((candidate) => {
    const candidateScore = candidate.terms.reduce((total, term) => total + (normalized.includes(term) ? 1 : 0), 0);
    if (candidateScore > score) {
      best = candidate;
      score = candidateScore;
    }
  });
  if (score === 0) {
    return {
      answer: "I can explain the problem, vault, policy gates, scoped bundles, interfaces, receipts, or implementation references. I’ll start with the public thesis.",
      target: "why"
    };
  }
  return best;
}

function navigateToTarget(target) {
  if (!allowedTargets.has(target)) return;
  let section = target;
  if (target.startsWith("demo-")) {
    const stages = { "demo-policy": 2, "demo-bundle": 3, "demo-receipt": 5 };
    setDemoStage(stages[target]);
    section = "demo";
  }
  if (target.startsWith("map-")) {
    setLayer(target.slice(4));
    section = "map";
  }
  const element = document.getElementById(section);
  if (element) element.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

function addTranscript(role, message, formatter = editorial) {
  const transcript = qs("[data-guide-transcript]");
  const row = document.createElement("p");
  if (role === "You") row.className = "is-user";
  const label = document.createElement("strong");
  label.textContent = editorial(role);
  row.append(label, document.createTextNode(formatter ? formatter(message) : message));
  transcript.append(row);
  transcript.scrollTop = transcript.scrollHeight;
}

async function askGuide(question) {
  const status = qs("[data-guide-status]");
  const mode = qs("[data-guide-mode]");
  status.textContent = editorial("Thinking…");
  let response = null;
  let answerFormatter = editorialGenerated;

  if (location.protocol === "http:" || location.protocol === "https:") {
    try {
      const result = await fetch("/api/context-layer/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      if (result.ok) {
        const body = await result.json();
        if (typeof body.answer === "string") {
          response = { answer: body.answer, target: body.action?.target_id };
          mode.textContent = editorial("OpenAI guide");
        }
      }
    } catch {
      response = null;
    }
  }

  if (!response) {
    response = fallbackGuide(question);
    answerFormatter = editorial;
    mode.textContent = editorial("Local guide");
  }

  const answer = answerFormatter(response.answer);
  addTranscript("Guide", answer, null);
  status.textContent = editorial(response.target ? "Answering and navigating" : "Answered");
  if (response.target) window.setTimeout(() => navigateToTarget(response.target), 350);

  if (qs("[data-voice-output]").checked && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer));
  }
}

function initializeVoice() {
  const button = qs("[data-voice-input]");
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    button.disabled = true;
    button.textContent = editorial("Voice input unavailable");
    return;
  }
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.addEventListener("start", () => {
    button.textContent = editorial("Listening…");
    qs("[data-guide-status]").textContent = editorial("Listening");
  });
  recognition.addEventListener("result", (event) => {
    const transcript = [...event.results].map((result) => result[0].transcript).join("");
    qs("#guide-input").value = transcript;
  });
  recognition.addEventListener("end", () => {
    button.textContent = editorial("Voice input");
    qs("[data-guide-status]").textContent = editorial("Ready");
    qs("#guide-input").focus();
  });
  recognition.addEventListener("error", () => {
    button.textContent = editorial("Voice input");
    qs("[data-guide-status]").textContent = editorial("Voice input could not start");
  });
  button.addEventListener("click", () => recognition.start());
}

function initialize() {
  setDemoStage(0, false);
  setLayer("data");
  setHeroStage(0);

  qs("[data-play-demo]").addEventListener("click", () => {
    playHeroFlow();
    window.setTimeout(() => document.getElementById("demo").scrollIntoView({ behavior: "smooth" }), 1300);
  });
  qs("[data-next-stage]").addEventListener("click", () => setDemoStage(currentStage === demoStages.length - 1 ? 0 : currentStage + 1));
  qs("[data-prev-stage]").addEventListener("click", () => setDemoStage(currentStage - 1));
  qs("[data-reset-demo]").addEventListener("click", () => setDemoStage(0));
  qsa("[data-stage-button]").forEach((button) => button.addEventListener("click", () => setDemoStage(Number(button.dataset.stageButton))));
  qsa("[data-layer]").forEach((button) => button.addEventListener("click", () => setLayer(button.dataset.layer)));

  const form = qs("[data-guide-form]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = qs("#guide-input");
    const question = input.value.trim();
    if (!question) return;
    addTranscript("You", question, null);
    input.value = "";
    await askGuide(question);
  });
  qsa("[data-guide-prompt]").forEach((button) => button.addEventListener("click", () => {
    qs("#guide-input").value = button.dataset.guidePrompt;
    form.requestSubmit();
  }));
  initializeVoice();
}

document.addEventListener("DOMContentLoaded", initialize);
