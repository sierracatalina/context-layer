interface DocumentPageOptions {
  canonicalPath: string;
  description: string;
  eyebrow: string;
  rawPath: string;
  status: string;
  subtitle: string;
}

interface TocItem {
  depth: number;
  id: string;
  label: string;
}

const SITE_ORIGIN = 'https://sierracatalina.com';
const CONTEXT_ROOT = '/context-layer';
const ESSAY_PATH = '/signal/the-context-layer';
const REFERENCE_MODULE_PATH = CONTEXT_ROOT + '/implementation/context-layer-reference.mjs';

export function renderLandingPage(): string {
  const body = [
    '<main id="main" class="context-main">',
    '<header class="context-hero shell">',
    '<div class="context-hero__copy">',
    '<p class="context-meta">dossier 001 / public working proposal / 2026.08.14</p>',
    '<h1>the <em>Context Layer</em>.</h1>',
    '<p class="context-deck">a user-controlled contract for moving the minimum useful context across models, agents & applications.</p>',
    '<div class="context-actions">',
    '<a class="context-action context-action--primary" href="' + ESSAY_PATH + '">read the essay</a>',
    '<a class="context-action" href="' + CONTEXT_ROOT + '/architecture">read the architecture</a>',
    '</div>',
    '</div>',
    '<aside class="context-hero__status" aria-label="protocol status">',
    '<span>status</span><strong>public working proposal</strong>',
    '<span>implementation</span><strong>phase 0 reference starter</strong>',
    '<span>authority</span><strong>user-owned vault</strong>',
    '</aside>',
    '</header>',
    '<section class="context-contract shell" aria-labelledby="contract-heading">',
    '<header class="context-section-head">',
    '<p class="context-meta">protocol invariant</p>',
    '<h2 id="contract-heading">one boundary. six recorded steps.</h2>',
    '<p>each exchange starts with a declared purpose & ends with a receipt. raw vault access never crosses the boundary.</p>',
    '</header>',
    renderPrimaryFlow(),
    '<div class="receipt-rail"><span>receipt rail</span><p>request → decision → disclosure → action → writeback</p></div>',
    '</section>',
    '<section class="context-index shell" aria-labelledby="reading-heading">',
    '<header class="context-section-head">',
    '<p class="context-meta">reading order</p>',
    '<h2 id="reading-heading">from argument to implementation.</h2>',
    '</header>',
    '<div class="context-index__grid">',
    indexLink('01', 'essay', 'the argument in plain language', ESSAY_PATH),
    indexLink('02', 'architecture', 'the system as responsive flows & trust zones', CONTEXT_ROOT + '/architecture'),
    indexLink('03', 'specification', 'objects, lifecycles, policy & conformance', CONTEXT_ROOT + '/specification'),
    indexLink('04', 'implementation', 'profiles, adapters & deployment sequence', CONTEXT_ROOT + '/implementation'),
    indexLink('05', 'code', 'tested phase 0 schemas & a runnable reduction example', CONTEXT_ROOT + '/code'),
    '</div>',
    '</section>',
    '<section class="context-start shell" aria-labelledby="start-heading">',
    '<p class="context-meta">implementation boundary</p>',
    '<div><h2 id="start-heading">start with the contract.</h2>',
    '<p>the reference starter covers request validation, deterministic policy reduction, scoped bundle issuance & receipts. it does not claim a production vault, identity system or signing suite.</p></div>',
    '<a class="context-action" href="' + CONTEXT_ROOT + '/code">inspect the starter</a>',
    '</section>',
    '</main>',
  ].join('\n');

  return pageShell(
    'the Context Layer',
    'A user-controlled contract for moving minimum useful context across models, agents and applications.',
    CONTEXT_ROOT,
    body,
  );
}

export function renderDocumentPage(markdown: string, options: DocumentPageOptions): string {
  const parsed = parseDocument(markdown);
  const toc: TocItem[] = [];
  const article = renderMarkdown(parsed.body, toc);
  const subtitle = parsed.metadata.subtitle || options.subtitle;
  const publishedDate = parsed.metadata.date ? formatDate(parsed.metadata.date) : '2026.08';
  const body = [
    '<main id="main" class="context-main document-main">',
    '<header class="document-hero shell">',
    '<p class="context-meta">' + escapeHtml(formatEditorialText(options.eyebrow)) + '</p>',
    '<h1>' + inlineMarkdown(parsed.title) + '</h1>',
    '<p class="document-deck">' + inlineMarkdown(subtitle) + '</p>',
    '<div class="document-meta" aria-label="publication details">',
    '<span>' + escapeHtml(formatEditorialText(options.status)) + '</span>',
    '<span>' + escapeHtml(publishedDate) + '</span>',
    '<span>sierra catalina</span>',
    '</div>',
    '</header>',
    '<div class="document-layout shell">',
    renderToc(toc),
    '<article class="document-body">' + article + '</article>',
    '</div>',
    '<aside class="document-source shell" aria-label="document source">',
    '<div><p class="context-meta">source & implementation</p>',
    '<p>the rendered page follows the signal editorial contract. code, normative keywords, protocol names & RFC references retain their technical casing.</p></div>',
    '<div class="document-source__links">',
    '<a href="' + escapeAttribute(options.rawPath) + '" download>source markdown ↓</a>',
    '<a href="' + CONTEXT_ROOT + '/code">implementation starter →</a>',
    '</div>',
    '</aside>',
    '</main>',
  ].join('\n');

  return pageShell(parsed.title, options.description, options.canonicalPath, body);
}

export function renderArchitecturePage(): string {
  const body = [
    '<main id="main" class="context-main architecture-main">',
    '<header class="architecture-hero shell">',
    '<div><p class="context-meta">architecture / responsive system map</p>',
    '<h1>the whole system.<br><em>no canvas required.</em></h1></div>',
    '<p>the map is split into readable protocol views. every node remains legible at the current viewport. the page scroll is the only navigation surface.</p>',
    '</header>',
    '<section class="architecture-section shell" aria-labelledby="flow-heading">',
    '<header class="context-section-head">',
    '<p class="context-meta">01 / primary exchange</p>',
    '<h2 id="flow-heading">purpose-bound context flow.</h2>',
    '<p>the vault remains authoritative. each consumer receives an expiring bundle with explicit capabilities & restrictions.</p>',
    '</header>',
    renderPrimaryFlow(true),
    '<div class="receipt-rail"><span>evidence</span><p>capture receipt → policy receipt → disclosure receipt → action receipt</p></div>',
    '</section>',
    '<section class="architecture-section shell" aria-labelledby="trust-heading">',
    '<header class="context-section-head">',
    '<p class="context-meta">02 / trust zones</p>',
    '<h2 id="trust-heading">three zones. one explicit crossing.</h2>',
    '</header>',
    '<div class="trust-grid">',
    trustZone('vault zone', 'user controlled', ['source events', 'claims & summaries', 'identity bindings', 'policies & keys']),
    trustZone('controlled exchange', 'decision boundary', ['request validation', 'policy evaluation', 'semantic proxy', 'bundle issuer']),
    trustZone('consumer zone', 'separate authority', ['apps & agents', 'models & tools', 'discovery systems', 'interface surfaces']),
    '</div>',
    '<p class="architecture-note">local execution does not establish authorization. policy, recipient binding & expiry still apply.</p>',
    '</section>',
    '<section class="architecture-section shell" aria-labelledby="control-heading">',
    '<header class="context-section-head">',
    '<p class="context-meta">03 / control plane</p>',
    '<h2 id="control-heading">the decision is inspectable.</h2>',
    '</header>',
    '<div class="control-grid">',
    controlItem('requester', 'authenticated client & delegated authority'),
    controlItem('purpose', 'declared task class & intended outcome'),
    controlItem('scope', 'requested selectors, actions & sensitivity'),
    controlItem('recipient', 'model, agent, tool or application binding'),
    controlItem('time', 'expiry, retention & revocation state'),
    controlItem('approval', 'human review when policy requires it'),
    '<div class="control-decision"><span>policy decision</span><strong>grant / reduce / deny</strong><p>record the exact policy snapshot & inputs.</p></div>',
    '</div>',
    '</section>',
    '<section class="architecture-section shell" aria-labelledby="lifecycle-heading">',
    '<header class="context-section-head">',
    '<p class="context-meta">04 / lifecycle</p>',
    '<h2 id="lifecycle-heading">each state has a receipt.</h2>',
    '</header>',
    '<ol class="lifecycle-list">',
    lifecycleItem('request', 'name the purpose, recipient, scope, actions & validity window'),
    lifecycleItem('decision', 'evaluate identity, policy, sensitivity, expiry & approval'),
    lifecycleItem('bundle', 'issue the minimum approved facts, capabilities & restrictions'),
    lifecycleItem('action', 'bind side effects to the granted capability set'),
    lifecycleItem('receipt', 'record the outcome without copying private payloads'),
    lifecycleItem('writeback', 'stage memory updates for review, supersession or rejection'),
    '</ol>',
    '</section>',
    '<section class="architecture-download shell" aria-labelledby="download-heading">',
    '<div><p class="context-meta">secondary artifact</p>',
    '<h2 id="download-heading">full-resolution system plate.</h2>',
    '<p>the detailed SVG is a self-contained dark download. it carries its own palette, background & typography without an external stylesheet.</p></div>',
    '<div class="architecture-download__links">',
    '<a class="context-action context-action--primary" href="' + CONTEXT_ROOT + '/downloads/context-layer-architecture.svg" download>download dark SVG ↓</a>',
    '<a class="context-action" href="' + CONTEXT_ROOT + '/specification">read the specification</a>',
    '</div>',
    '</section>',
    '</main>',
  ].join('\n');

  return pageShell(
    'Context Layer architecture',
    'A responsive system map for the Context Layer protocol, trust zones and receipt lifecycle.',
    CONTEXT_ROOT + '/architecture',
    body,
  );
}

export function renderCodePage(): string {
  const example = [
    'import {',
    '  decideContextRequest,',
    '  issueScopedBundle,',
    '  writeReceipt,',
    '} from \'./context-layer-reference.mjs\';',
    '',
    'const decision = decideContextRequest(request, policy);',
    'const bundle = issueScopedBundle({',
    '  request,',
    '  decision,',
    '  claims,',
    '  issuer: \'did:example:alice\',',
    '});',
    'const receipt = writeReceipt({',
    '  operation: \'bundle.issue\',',
    '  request,',
    '  decision,',
    '  bundle,',
    '});',
  ].join('\n');

  const body = [
    '<main id="main" class="context-main code-main">',
    '<header class="document-hero shell">',
    '<p class="context-meta">phase 0 / reference starter</p>',
    '<h1>an implementable slice.</h1>',
    '<p class="document-deck">versioned schemas, deterministic policy reduction, scoped bundle issuance & receipts. small enough to inspect. explicit about what remains.</p>',
    '<div class="document-meta"><span>tested</span><span>dependency free</span><span>experimental v0.1</span></div>',
    '</header>',
    '<section class="code-layout shell">',
    '<aside class="code-status">',
    '<p class="context-meta">implementation status</p>',
    '<dl>',
    '<div><dt>included</dt><dd>request, decision, bundle & receipt contracts</dd></div>',
    '<div><dt>included</dt><dd>valid & invalid fixtures</dd></div>',
    '<div><dt>included</dt><dd>deterministic selector reduction</dd></div>',
    '<div><dt>excluded</dt><dd>production identity, storage, signing & remote adapters</dd></div>',
    '</dl>',
    '</aside>',
    '<div class="code-body">',
    '<section><p class="context-meta">quickstart</p><h2>run one complete exchange.</h2>',
    '<pre><code>' + escapeHtml(example) + '</code></pre>',
    '<p>the starter accepts a request & policy, reduces the requested selectors, issues an expiring bundle, then writes a payload-minimized receipt.</p></section>',
    '<section><p class="context-meta">download</p><h2>use the reviewed artifacts.</h2>',
    '<div class="download-list">',
    downloadLink('reference implementation', 'context-layer-reference.mjs', CONTEXT_ROOT + '/implementation/context-layer-reference.mjs'),
    downloadLink('context request schema', 'context-request.schema.json', CONTEXT_ROOT + '/implementation/context-request.schema.json'),
    downloadLink('scoped bundle schema', 'scoped-context-bundle.schema.json', CONTEXT_ROOT + '/implementation/scoped-context-bundle.schema.json'),
    downloadLink('receipt schema', 'receipt.schema.json', CONTEXT_ROOT + '/implementation/receipt.schema.json'),
    downloadLink('valid fixture', 'valid-exchange.json', CONTEXT_ROOT + '/implementation/valid-exchange.json'),
    downloadLink('invalid fixture', 'invalid-secret-receipt.json', CONTEXT_ROOT + '/implementation/invalid-secret-receipt.json'),
    '</div></section>',
    '<section><p class="context-meta">adjacent public code</p><h2>agent-aware application starter.</h2>',
    '<p>the AAA starter demonstrates agent-aware application structure. it does not claim Context Layer protocol conformance.</p>',
    '<p class="code-links"><a href="https://github.com/sierracatalina/agent-aware-starter" rel="noreferrer">open the AAA starter ↗</a>',
    '<a href="' + REFERENCE_MODULE_PATH + '" download>open the Context Layer reference module ↓</a></p></section>',
    '</div>',
    '</section>',
    '</main>',
  ].join('\n');

  return pageShell(
    'Context Layer reference starter',
    'A tested phase 0 starter for Context Layer requests, policy reduction, scoped bundles and receipts.',
    CONTEXT_ROOT + '/code',
    body,
  );
}

function renderPrimaryFlow(detailed = false): string {
  const items = [
    ['capture', detailed ? 'native source events retain origin, time, visibility & integrity' : 'preserve origin'],
    ['normalize', detailed ? 'claims remain linked to source evidence, confidence & validity' : 'derive with provenance'],
    ['vault', detailed ? 'private sources, policy, identity bindings & keys stay authoritative' : 'retain authority'],
    ['decide', detailed ? 'requester, purpose, scope, recipient, expiry & approval produce one decision' : 'grant, reduce or deny'],
    ['bundle', detailed ? 'the consumer receives only approved facts, capabilities & restrictions' : 'minimum useful context'],
    ['act', detailed ? 'tools & writeback remain bounded by the bundle, then create receipts' : 'execute & receipt'],
  ];

  return '<ol class="protocol-flow">' + items.map((item, index) => [
    '<li>',
    '<span>' + String(index + 1).padStart(2, '0') + '</span>',
    '<strong>' + item[0] + '</strong>',
    '<p>' + item[1] + '</p>',
    '</li>',
  ].join('')).join('') + '</ol>';
}

function indexLink(number: string, title: string, description: string, href: string): string {
  return '<a href="' + href + '"><span>' + number + '</span><strong>' + title + '</strong><p>' + description + '</p></a>';
}

function trustZone(title: string, label: string, items: string[]): string {
  return [
    '<article class="trust-zone">',
    '<p class="context-meta">' + label + '</p>',
    '<h3>' + title + '</h3>',
    '<ul>' + items.map((item) => '<li>' + item + '</li>').join('') + '</ul>',
    '</article>',
  ].join('');
}

function controlItem(title: string, body: string): string {
  return '<article><span>' + title + '</span><p>' + body + '</p></article>';
}

function lifecycleItem(title: string, body: string): string {
  return '<li><strong>' + title + '</strong><p>' + body + '</p></li>';
}

function downloadLink(title: string, filename: string, href: string): string {
  return '<a href="' + href + '" download><strong>' + title + '</strong><span>' + filename + ' ↓</span></a>';
}

function pageShell(title: string, description: string, canonicalPath: string, body: string): string {
  const formattedTitle = formatEditorialText(title);
  const socialImage = SITE_ORIGIN + CONTEXT_ROOT + '/og.png';
  return [
    '<!doctype html>',
    '<html lang="en" data-sierra-theme="dark"><head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="theme-color" content="#0a0a0a">',
    '<meta name="description" content="' + escapeAttribute(description) + '">',
    '<meta property="og:type" content="article">',
    '<meta property="og:title" content="' + escapeAttribute(formattedTitle) + '">',
    '<meta property="og:description" content="' + escapeAttribute(description) + '">',
    '<meta property="og:image" content="' + socialImage + '">',
    '<meta property="og:image:width" content="1731">',
    '<meta property="og:image:height" content="909">',
    '<meta property="og:image:alt" content="the Context Layer">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:image" content="' + socialImage + '">',
    '<link rel="canonical" href="' + SITE_ORIGIN + canonicalPath + '">',
    '<title>' + escapeHtml(formattedTitle) + ' | sierra catalina</title>',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&amp;family=DM+Mono:wght@400;500&amp;family=Lora:wght@400;500&amp;display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="' + CONTEXT_ROOT + '/assets/context-layer-native.css?v=20260814a">',
    '<script src="' + CONTEXT_ROOT + '/assets/context-layer-native.js?v=20260814a" defer></script>',
    '</head><body>',
    '<a class="skip-link" href="#main">skip to content</a>',
    '<header class="context-header"><div class="context-header__inner">',
    '<a class="context-wordmark" href="https://sierracatalina.com/">sierra catalina</a>',
    '<nav aria-label="context layer navigation">',
    '<a href="' + CONTEXT_ROOT + '">context index</a>',
    '<a href="' + ESSAY_PATH + '">essay</a>',
    '<a href="' + CONTEXT_ROOT + '/architecture">architecture</a>',
    '<a href="' + CONTEXT_ROOT + '/specification">specification</a>',
    '<a href="' + CONTEXT_ROOT + '/implementation">implementation</a>',
    '<a href="' + CONTEXT_ROOT + '/code">code</a>',
    '<button type="button" data-context-theme>light</button>',
    '</nav>',
    '</div></header>',
    body,
    '<footer class="context-footer"><div class="shell">',
    '<p><strong>Context Layer</strong> / public working proposal</p>',
    '<p><a href="https://sierracatalina.com/">sierra catalina</a> / 2026</p>',
    '</div></footer>',
    '</body></html>',
  ].join('\n');
}

function parseDocument(markdown: string): {
  body: string;
  metadata: Record<string, string>;
  title: string;
} {
  let body = markdown.replace(/\r\n?/g, '\n').trim();
  const metadata: Record<string, string> = {};
  if (body.startsWith('---\n')) {
    const closing = body.indexOf('\n---\n', 4);
    if (closing !== -1) {
      for (const line of body.slice(4, closing).split('\n')) {
        const match = line.match(/^([a-z_]+):\s*(.*)$/i);
        if (match) metadata[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
      body = body.slice(closing + 5).trim();
    }
  }
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = metadata.title || (titleMatch ? titleMatch[1] : 'Context Layer');
  if (titleMatch && titleMatch.index === 0) body = body.slice(titleMatch[0].length).trimStart();
  return { body, metadata, title };
}

function renderMarkdown(markdown: string, toc: TocItem[]): string {
  const lines = markdown.split('\n');
  const html: string[] = [];
  const usedIds = new Map<string, number>();
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\x60{3}([\w+-]*)\s*$/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^\x60{3}\s*$/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      const language = fence[1] ? ' class="language-' + escapeAttribute(fence[1]) + '"' : '';
      html.push('<pre><code' + language + '>' + escapeHtml(code.join('\n')) + '</code></pre>');
      continue;
    }

    const heading = line.match(/^(#{2,6})\s+(.+)$/);
    if (heading) {
      const depth = heading[1].length;
      const rawLabel = stripMarkdown(heading[2]);
      const label = formatEditorialText(rawLabel);
      const baseId = slugify(rawLabel);
      const count = usedIds.get(baseId) || 0;
      usedIds.set(baseId, count + 1);
      const id = count ? baseId + '-' + (count + 1) : baseId;
      if (depth <= 3) toc.push({ depth, id, label });
      html.push(
        '<h' + depth + ' id="' + id + '">' + inlineMarkdown(heading[2])
        + '<a class="heading-anchor" href="#' + id + '" aria-label="link to ' + escapeAttribute(label) + '">#</a>'
        + '</h' + depth + '>',
      );
      index += 1;
      continue;
    }

    if (isTable(lines, index)) {
      const rows: string[][] = [splitTableRow(line)];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith('|')) rows.push(splitTableRow(lines[index++]));
      const head = rows.shift() || [];
      const tableHead = head.map((cell) => '<th>' + inlineMarkdown(cell) + '</th>').join('');
      const tableBody = rows.map((row) => '<tr>' + row.map((cell) => '<td>' + inlineMarkdown(cell) + '</td>').join('') + '</tr>').join('');
      html.push('<div class="table-wrap"><table><thead><tr>' + tableHead + '</tr></thead><tbody>' + tableBody + '</tbody></table></div>');
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ''));
      html.push('<blockquote><p>' + inlineMarkdown(quote.join(' ')) + '</p></blockquote>');
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) items.push(lines[index++].replace(/^[-*]\s+/, ''));
      html.push('<ul>' + items.map((item) => '<li>' + inlineMarkdown(item) + '</li>').join('') + '</ul>');
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) items.push(lines[index++].replace(/^\d+\.\s+/, ''));
      html.push('<ol>' + items.map((item) => '<li>' + inlineMarkdown(item) + '</li>').join('') + '</ol>');
      continue;
    }

    if (/^(?:-{3,}|\*{3,})\s*$/.test(line)) {
      html.push('<hr>');
      index += 1;
      continue;
    }

    const paragraph: string[] = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !startsBlock(lines, index)) paragraph.push(lines[index++].trim());
    html.push('<p>' + inlineMarkdown(paragraph.join(' ')) + '</p>');
  }

  return html.join('\n');
}

function inlineMarkdown(value: string): string {
  const tokens: string[] = [];
  const store = (html: string): string => {
    const token = '\uE000' + tokens.length + '\uE001';
    tokens.push(html);
    return token;
  };

  let output = value.replace(/\x60([^\x60]+)\x60/g, (_match, contents: string) => {
    return store('<code>' + escapeHtml(contents) + '</code>');
  });
  output = output.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: string, href: string) => {
    const normalized = normalizeHref(href);
    const external = /^https?:\/\//.test(normalized);
    return store(
      '<a href="' + escapeAttribute(normalized) + '"' + (external ? ' rel="noreferrer"' : '') + '>'
      + escapeHtml(formatEditorialText(stripMarkdown(label))) + '</a>',
    );
  });
  output = escapeHtml(formatEditorialText(output));
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  output = output.replace(/\uE000(\d+)\uE001/g, (_match, tokenIndex: string) => tokens[Number(tokenIndex)]);
  return output;
}

export function formatEditorialText(value: string): string {
  const protectedValues: string[] = [];
  const protect = (input: string, pattern: RegExp): string => input.replace(pattern, (match) => {
    const token = '\uE100' + protectedValues.length + '\uE101';
    protectedValues.push(match);
    return token;
  });

  let output = String(value || '');
  const names = [
    /\bContext Layer\b/gi,
    /\bSierra Catalina\b/gi,
    /\bModel Context Protocol\b/g,
    /\bAgent2Agent Protocol\b/g,
    /\bOpenAI Realtime\b/g,
    /\bActivityPub\b/g,
    /\bAT Protocol\b/g,
    /\bWebRTC\b/g,
    /\bJavaScript\b/g,
    /\bNode\.js\b/g,
    /\biOS\b/g,
    /\bx402\b/g,
    /\bOAuth\b/g,
    /\bNostr\b/g,
    /\bMatrix\b/g,
  ];
  for (const name of names) output = protect(output, name);
  output = protect(output, /\b(?:MUST NOT|SHOULD NOT|SHALL NOT|NOT RECOMMENDED|MUST|SHOULD|SHALL|REQUIRED|RECOMMENDED|MAY|OPTIONAL)\b/g);
  output = protect(output, /\b[A-Z][A-Z0-9+._-]{1,}(?:'s)?\b/g);

  output = output
    .replace(/[“”"]/g, '\'')
    .replace(/—/g, ':')
    .replace(/\(/g, '[')
    .replace(/\)/g, ']')
    .replace(/\bnot just\b/gi, 'beyond')
    .replace(/\bis not\b/gi, 'differs from')
    .replace(/\bare not\b/gi, 'differ from')
    .replace(/\bno longer\b/gi, 'has ceased to be')
    .replace(/\band\b/gi, '&')
    .replace(/\bleverage\b/gi, 'use')
    .replace(/\bunlock\b/gi, 'open')
    .replace(/\bharness\b/gi, 'use')
    .replace(/\bnavigate\b/gi, 'move through')
    .replace(/\brobust\b/gi, 'durable')
    .replace(/\bseamless\b/gi, 'continuous')
    .replace(/\bdeep dive\b/gi, 'technical review')
    .replace(/\bat its core\b/gi, 'in operation')
    .toLowerCase();

  output = output.replace(/\uE100(\d+)\uE101/g, (_match, tokenIndex: string) => {
    const preserved = protectedValues[Number(tokenIndex)];
    if (/^context layer$/i.test(preserved)) return 'Context Layer';
    if (/^sierra catalina$/i.test(preserved)) return 'Sierra Catalina';
    return preserved;
  });

  return output;
}

function normalizeHref(href: string): string {
  const routeMap: Record<string, string> = {
    '/': CONTEXT_ROOT,
    '/#demo': CONTEXT_ROOT + '/architecture',
    '/reference/specification': CONTEXT_ROOT + '/specification',
    '/reference/implementation': CONTEXT_ROOT + '/implementation',
    '../context-layer-overview.html': CONTEXT_ROOT,
    '../demos/flow-carousel.html': CONTEXT_ROOT + '/architecture',
    'context-layer-blog-post.md': ESSAY_PATH,
    'context-layer-technical-specification.md': CONTEXT_ROOT + '/specification',
    'context-layer-implementation-and-interoperability.md': CONTEXT_ROOT + '/implementation',
    '../agent-navigation-manifest.json': CONTEXT_ROOT + '/source/agent-navigation-manifest.json',
  };
  if (routeMap[href]) return routeMap[href];
  if (/^(?:https?:\/\/|mailto:|\/|#)/.test(href)) return href;
  return '#';
}

function renderToc(items: TocItem[]): string {
  if (!items.length) return '';
  const links = items.map((item) => {
    return '<li class="toc-depth-' + item.depth + '"><a href="#' + item.id + '">' + escapeHtml(item.label) + '</a></li>';
  }).join('');
  return [
    '<aside class="document-rail">',
    '<nav class="document-toc document-toc--desktop" aria-label="on this page"><p class="context-meta">on this page</p><ol>' + links + '</ol></nav>',
    '<details class="document-toc document-toc--mobile"><summary>on this page</summary><ol>' + links + '</ol></details>',
    '</aside>',
  ].join('');
}

function isTable(lines: string[], index: number): boolean {
  return lines[index].trim().startsWith('|')
    && index + 1 < lines.length
    && /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[index + 1]);
}

function startsBlock(lines: string[], index: number): boolean {
  return /^(?:#{2,6}\s+|\x60{3}|>\s?|[-*]\s+|\d+\.\s+|(?:-{3,}|\*{3,})\s*$)/.test(lines[index])
    || isTable(lines, index);
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

function stripMarkdown(value: string): string {
  return value.replace(/[\x60*_]/g, '').replace(/\[([^\]]+)]\([^)]+\)/g, '$1');
}

function formatDate(value: string): string {
  const parts = value.split('-').map(Number);
  if (!parts[0] || !parts[1] || !parts[2]) return value;
  return [parts[0], String(parts[1]).padStart(2, '0'), String(parts[2]).padStart(2, '0')].join('.');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
