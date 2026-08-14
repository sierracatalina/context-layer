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

const SITE_ORIGIN = 'https://context-layer-protocol.sierra.chatgpt.site';

export function renderDocumentPage(markdown: string, options: DocumentPageOptions): string {
  const parsed = parseDocument(markdown);
  const toc: TocItem[] = [];
  const article = renderMarkdown(parsed.body, toc);
  const subtitle = parsed.metadata.subtitle || options.subtitle;
  const publishedDate = parsed.metadata.date ? formatDate(parsed.metadata.date) : 'August 2026';
  const body = [
    '<main id="main" class="document-main">',
    '<header class="document-hero shell">',
    '<p class="eyebrow">' + escapeHtml(options.eyebrow) + '</p>',
    '<h1>' + inlineMarkdown(parsed.title) + '</h1>',
    '<p class="document-deck">' + inlineMarkdown(subtitle) + '</p>',
    '<div class="document-meta" aria-label="Publication details">',
    '<span class="status-pill">' + escapeHtml(options.status) + '</span>',
    '<span>' + escapeHtml(publishedDate) + '</span>',
    '<span>By Sierra Catalina</span>',
    '</div></header>',
    '<div class="document-layout shell">',
    renderToc(toc),
    '<article class="document-body">' + article + '</article>',
    '</div>',
    '<aside class="document-source shell" aria-label="Document source">',
    '<p><strong>Inspect the source.</strong> The rendered page is canonical; the reviewed Markdown remains available for implementers.</p>',
    '<a class="button button--quiet" href="' + escapeAttribute(options.rawPath) + '" download>Download Markdown</a>',
    '</aside></main>',
  ].join('\n');
  return pageShell(parsed.title, options.description, options.canonicalPath, body);
}

export function renderArchitecturePage(): string {
  const body = [
    '<main id="main" class="architecture-main">',
    '<header class="architecture-hero shell"><div>',
    '<p class="eyebrow">Reference / complete system map</p>',
    '<h1>Read the whole system<br><em>without losing the details.</em></h1>',
    '</div><p>The map opens at a readable 75%. Pan to inspect each trust boundary, data path, and receipt, or use Fit for a whole-system overview.</p></header>',
    '<section class="diagram-section shell" aria-labelledby="diagram-title">',
    '<div class="diagram-toolbar"><div><p class="utility-label">Interactive figure</p><h2 id="diagram-title">Context Layer protocol map</h2></div>',
    '<div class="zoom-controls" aria-label="Diagram zoom controls">',
    '<button type="button" data-diagram-action="out" aria-label="Zoom out">−</button>',
    '<button type="button" data-diagram-action="fit">Fit</button>',
    '<button type="button" data-diagram-action="reading">75%</button>',
    '<button type="button" data-diagram-action="actual">100%</button>',
    '<button type="button" data-diagram-action="in" aria-label="Zoom in">+</button>',
    '<output data-diagram-zoom aria-live="polite">75%</output>',
    '</div></div>',
    '<div class="diagram-scroll" data-diagram-scroll tabindex="0" aria-label="Scrollable Context Layer architecture diagram">',
    '<img data-diagram-image src="/reference/context-layer-architecture-diagram.svg" width="2200" height="1960" alt="Context Layer architecture from ingestion through the user-owned vault, policy gates, scoped bundles, interface surfaces, discovery, and receipt rail">',
    '</div>',
    '<div class="diagram-caption"><p>Tip: at 100%, labels retain their intended 17–26px size. On a trackpad, hold Shift while scrolling to move horizontally.</p>',
    '<a href="/reference/context-layer-architecture-diagram.svg" download>Download the accessible SVG <span aria-hidden="true">↓</span></a></div>',
    '</section>',
    '<section class="architecture-links shell" aria-label="Related technical documentation">',
    '<a href="/reference/specification"><span>01</span><strong>Draft specification</strong><small>Core protocol objects and invariants</small></a>',
    '<a href="/reference/implementation"><span>02</span><strong>Implementation profiles</strong><small>Adapters and interoperability</small></a>',
    '<a href="/writing/context-layer"><span>03</span><strong>Read the essay</strong><small>The proposal in plain language</small></a>',
    '</section></main>',
  ].join('\n');
  return pageShell(
    'Context Layer architecture',
    'Explore the complete Context Layer architecture without shrinking its technical labels into unreadable text.',
    '/reference/architecture',
    body,
    '/assets/context-layer-reference.js?v=20260814',
  );
}

function pageShell(title: string, description: string, canonicalPath: string, body: string, extraScript = ''): string {
  return [
    '<!doctype html>',
    '<html lang="en" data-theme="dark"><head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="theme-color" content="#0d1117">',
    '<meta name="description" content="' + escapeAttribute(description) + '">',
    '<meta property="og:type" content="article">',
    '<meta property="og:title" content="' + escapeAttribute(title) + '">',
    '<meta property="og:description" content="' + escapeAttribute(description) + '">',
    '<meta property="og:image" content="/assets/context-layer-og.svg">',
    '<link rel="canonical" href="' + SITE_ORIGIN + canonicalPath + '">',
    '<link rel="icon" href="/assets/context-layer-og.svg" type="image/svg+xml">',
    '<title>' + escapeHtml(title) + ' | Context Layer</title>',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&amp;family=DM+Mono:wght@400;500&amp;family=DM+Sans:wght@400;500;600&amp;display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="/assets/context-layer.css">',
    '<link rel="stylesheet" href="/assets/context-layer-docs.css?v=20260814c">',
    extraScript ? '<script src="' + extraScript + '" defer></script>' : '',
    '</head><body class="reference-page">',
    '<a class="skip-link" href="#main">Skip to content</a>',
    '<header class="doc-site-header"><div class="doc-site-header__inner">',
    '<a class="wordmark" href="/">Context Layer</a>',
    '<nav aria-label="Context Layer navigation">',
    '<a href="/writing/context-layer">Essay</a>',
    '<a href="/reference/architecture">Architecture</a>',
    '<a href="/reference/specification">Specification</a>',
    '<a href="/reference/implementation">Implementation</a>',
    '</nav>',
    '<a class="sierra-link" href="https://sierracatalina.com" rel="author">Sierra Catalina ↗</a>',
    '</div></header>',
    body,
    '<footer class="doc-footer"><div class="shell">',
    '<p><strong>Context Layer</strong> / a public working proposal</p>',
    '<p><a href="/">Return to the interactive overview</a></p>',
    '</div></footer></body></html>',
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
      const label = stripMarkdown(heading[2]);
      const baseId = slugify(label);
      const count = usedIds.get(baseId) || 0;
      usedIds.set(baseId, count + 1);
      const id = count ? baseId + '-' + (count + 1) : baseId;
      if (depth <= 3) toc.push({ depth, id, label });
      html.push(
        '<h' + depth + ' id="' + id + '">' + inlineMarkdown(heading[2])
        + '<a class="heading-anchor" href="#' + id + '" aria-label="Link to ' + escapeAttribute(label) + '">#</a>'
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
      html.push('<div class="table-scroll"><table><thead><tr>' + tableHead + '</tr></thead><tbody>' + tableBody + '</tbody></table></div>');
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

function isTable(lines: string[], index: number): boolean {
  return lines[index].trim().startsWith('|')
    && index + 1 < lines.length
    && /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[index + 1]);
}

function startsBlock(lines: string[], index: number): boolean {
  return /^(?:#{2,6}\s+|\x60{3}|>\s?|[-*]\s+|\d+\.\s+|(?:-{3,}|\*{3,})\s*$)/.test(lines[index])
    || isTable(lines, index);
}

function inlineMarkdown(value: string): string {
  const code: string[] = [];
  let output = value.replace(/\x60([^\x60]+)\x60/g, (_match, contents: string) => {
    const token = '\uE000CODE' + code.length + '\uE001';
    code.push('<code>' + escapeHtml(contents) + '</code>');
    return token;
  });
  output = escapeHtml(output);
  output = output.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: string, href: string) => {
    const normalized = normalizeHref(href);
    const external = /^https?:\/\//.test(normalized);
    return '<a href="' + escapeAttribute(normalized) + '"' + (external ? ' rel="noreferrer"' : '') + '>' + label + '</a>';
  });
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  output = output.replace(/\uE000CODE(\d+)\uE001/g, (_match, codeIndex: string) => code[Number(codeIndex)]);
  return output;
}

function normalizeHref(href: string): string {
  const routeMap: Record<string, string> = {
    '../context-layer-overview.html': '/',
    '../demos/flow-carousel.html': '/#demo',
    'context-layer-blog-post.md': '/writing/context-layer',
    'context-layer-technical-specification.md': '/reference/specification',
    'context-layer-implementation-and-interoperability.md': '/reference/implementation',
    '../agent-navigation-manifest.json': '/agent-navigation-manifest.json',
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
    '<nav class="document-toc document-toc--desktop" aria-label="On this page"><p class="toc-label">On this page</p><ol>' + links + '</ol></nav>',
    '<details class="document-toc document-toc--mobile"><summary>On this page</summary><ol>' + links + '</ol></details>',
    '</aside>',
  ].join('');
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
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])));
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
