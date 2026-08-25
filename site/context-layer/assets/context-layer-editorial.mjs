const canonicalIdentifiers = new Map([
  ["a2a", "A2A"],
  ["aes", "AES"],
  ["ai", "AI"],
  ["api", "API"],
  ["apis", "APIs"],
  ["activitypub", "ActivityPub"],
  ["activitystreams", "ActivityStreams"],
  ["agent2agent", "Agent2Agent"],
  ["anthropic", "Anthropic"],
  ["cl-adapter", "CL-Adapter"],
  ["cl-core-consumer", "CL-Core-Consumer"],
  ["cl-core-issuer", "CL-Core-Issuer"],
  ["cl-core-lite", "CL-Core-Lite"],
  ["cl-discovery", "CL-Discovery"],
  ["cl-memory", "CL-Memory"],
  ["cl-receipt-store", "CL-Receipt-Store"],
  ["css", "CSS"],
  ["dags", "DAGs"],
  ["datapart", "DataPart"],
  ["dom", "DOM"],
  ["dpop", "DPoP"],
  ["gcm", "GCM"],
  ["github", "GitHub"],
  ["gmail", "Gmail"],
  ["graphql", "GraphQL"],
  ["html", "HTML"],
  ["http", "HTTP"],
  ["https", "HTTPS"],
  ["ipfs", "IPFS"],
  ["ios", "iOS"],
  ["json", "JSON"],
  ["jwt", "JWT"],
  ["friday", "Friday"],
  ["macos", "macOS"],
  ["markdown", "Markdown"],
  ["message-id", "Message-ID"],
  ["mcp", "MCP"],
  ["oauth", "OAuth"],
  ["nostr", "Nostr"],
  ["openai", "OpenAI"],
  ["openid", "OpenID"],
  ["openapi", "OpenAPI"],
  ["postgresql", "PostgreSQL"],
  ["thursday", "Thursday"],
  ["rfc", "RFC"],
  ["sqlite", "SQLite"],
  ["swiftui", "SwiftUI"],
  ["tls", "TLS"],
  ["ui", "UI"],
  ["uri", "URI"],
  ["uris", "URIs"],
  ["url", "URL"],
  ["urls", "URLs"],
  ["utf", "UTF"],
  ["uuid", "UUID"],
  ["uuids", "UUIDs"],
  ["w3c", "W3C"],
  ["webauthn", "WebAuthn"],
  ["webrtc", "WebRTC"],
  ["websocket", "WebSocket"],
]);

const caseSensitiveIdentifiers = [
  "Bluetooth",
  "Codex",
  "Goose",
  "Harbor",
  "Linux",
  "Matrix",
  "Nostr",
  "North",
  "Planner",
  "Postgres",
  "React",
  "Rekor",
  "Saturday",
  "Signal",
  "Sigstore",
  "Solid",
  "Station",
  "Unix",
  "Windows",
];

const canonicalPhrases = new Map([
  ["harbor city", "Harbor City"],
  ["harbor planner", "Harbor Planner"],
  ["harbor street", "Harbor Street"],
  ["north station", "North Station"],
]);

const caseSensitiveTechnicalIdentifiers = [
  "AR",
  "AT",
  "BCP",
  "CID",
  "CSRF",
  "DID",
  "DIDs",
  "HMAC",
  "IANA",
  "ID",
  "IDs",
  "IP",
  "IPC",
  "LE",
  "MAY",
  "MIME",
  "MUST",
  "NIP",
  "NOT",
  "NSID",
  "OPTIONAL",
  "OS",
  "POST",
  "PROV",
  "PT2H",
  "RECOMMENDED",
  "REQUIRED",
  "REST",
  "SHA",
  "SHALL",
  "SHOULD",
  "SVG",
  "URN",
  "US",
  "UTC",
  "UX",
  "XRPC",
  "XChaCha20-Poly1305",
];

export const editorialCaseExceptions = Object.freeze([
  "I",
  ...new Set([
    ...canonicalIdentifiers.values(),
    ...[...canonicalPhrases.values()].flatMap((phrase) => phrase.split(" ")),
    ...caseSensitiveIdentifiers,
    ...caseSensitiveTechnicalIdentifiers,
  ]),
]);

/**
 * Apply Sierra's reader-facing editorial casing without altering technical
 * identifiers. Pass { html: true } when the return value will be written into
 * an HTML text node so the ampersand is encoded exactly once. Generated prose
 * that was already asked to use lowercase ordinary casing can opt into
 * preserveUnknownCase so unfamiliar proper names and acronyms survive.
 */
export function formatEditorialText(
  value,
  { html = false, preserveUnknownCase = false } = {},
) {
  if (typeof value !== "string" || value.length === 0) return value;

  const protectedValues = [];
  const protect = (match) => {
    const token = `\uE000${protectedValues.length}\uE001`;
    protectedValues.push(match);
    return token;
  };

  const ampersand = html ? "&amp;" : "&";
  let text = protectMarkdownCode(value, protect)
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi, protect)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, protect)
    .replace(/\band\b/gi, ampersand);

  for (const [phrase, canonical] of canonicalPhrases) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "gi"), () => protect(canonical));
  }

  text = text
    .replace(/\bmatrix(?=\s+(?:defines|events?|rooms?|specification))\b/gi, () => protect("Matrix"))
    .replace(/\bmatrix(?=,\s*ActivityPub\b)/gi, () => protect("Matrix"));

  for (const [identifier, canonical] of canonicalIdentifiers) {
    text = text.replace(
      new RegExp(`\\b${escapeRegExp(identifier)}\\b`, "gi"),
      () => protect(canonical),
    );
  }

  for (const identifier of [...caseSensitiveIdentifiers, ...caseSensitiveTechnicalIdentifiers]) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(identifier)}\\b`, "g"), protect);
  }

  if (preserveUnknownCase) {
    text = text.replace(
      /\p{L}[\p{L}\p{M}'’\u2010-\u2015-]*/gu,
      (word) => (/\p{Lu}/u.test(word) ? protect(word) : word),
    );
  }

  text = text.replace(/\bat protocol\b/gi, () => `${protect("AT")} protocol`);
  text = text
    .replace(/\b[a-z]+(?:[A-Z][A-Za-z0-9]*)+\b/g, protect)
    .replace(
      /\b(?=[A-Za-z0-9]*[a-z])(?=(?:[A-Za-z0-9]*[A-Z]){2})[A-Z][A-Za-z0-9]*\b/g,
      protect,
    )
    .replace(/\bI\b/g, protect);

  text = text
    .replace(/,\s+(?=&(?:amp;)?)/g, " ")
    .toLowerCase();

  return text.replace(
    /\uE000(\d+)\uE001/g,
    (_, index) => protectedValues[Number(index)],
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function protectMarkdownCode(value, protect) {
  let result = "";
  let cursor = 0;
  let index = 0;

  while (index < value.length) {
    if (index === 0 || value[index - 1] === "\n") {
      const opening = value.slice(index).match(/^( {0,3})(`{3,}|~{3,})([^\r\n]*)(?:\r?\n|$)/);
      if (opening && !(opening[2][0] === "`" && opening[3].includes("`"))) {
        const marker = opening[2];
        const closingFence = new RegExp(
          `^ {0,3}${escapeRegExp(marker[0])}{${marker.length},}[\\t ]*(?:\\r?\\n|$)`,
          "gm",
        );
        closingFence.lastIndex = index + opening[0].length;
        const closing = closingFence.exec(value);
        const end = closing ? closingFence.lastIndex : value.length;
        result += value.slice(cursor, index);
        result += protect(value.slice(index, end));
        cursor = end;
        index = end;
        continue;
      }
    }

    if (value[index] !== "`") {
      index += 1;
      continue;
    }

    const openingStart = index;
    while (value[index] === "`") index += 1;
    const delimiterLength = index - openingStart;
    let searchIndex = index;
    let closingEnd = -1;

    while (searchIndex < value.length) {
      const closingStart = value.indexOf("`", searchIndex);
      if (closingStart === -1) break;
      let runEnd = closingStart;
      while (value[runEnd] === "`") runEnd += 1;
      if (runEnd - closingStart === delimiterLength) {
        closingEnd = runEnd;
        break;
      }
      searchIndex = runEnd;
    }

    if (closingEnd === -1) continue;
    result += value.slice(cursor, openingStart);
    result += protect(value.slice(openingStart, closingEnd));
    cursor = closingEnd;
    index = closingEnd;
  }

  return result + value.slice(cursor);
}
