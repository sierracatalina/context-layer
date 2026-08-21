const CANONICAL_ORIGIN = "https://sierracatalina.com";

const DIRECT_REDIRECTS = new Map<string, string>([
  ["/", "/context-layer"],
  ["/index.html", "/context-layer"],
  ["/context-layer", "/context-layer"],
  ["/context-layer/index.html", "/context-layer"],
  ["/essay", "/signal/the-context-layer"],
  ["/writing/context-layer", "/signal/the-context-layer"],
  ["/signal/the-context-layer", "/signal/the-context-layer"],
  ["/architecture", "/context-layer/architecture"],
  ["/reference/architecture", "/context-layer/architecture"],
  ["/specification", "/context-layer/specification"],
  ["/reference/specification", "/context-layer/specification"],
  ["/implementation", "/context-layer/implementation"],
  ["/reference/implementation", "/context-layer/implementation"],
  ["/code", "/context-layer/code"],
  ["/ouroboros-architecture-v4-legible.html", "/context-layer/demo"],
  ["/legacy/index.html", "/context-layer/demo"],
  ["/context-layer/ouroboros-architecture-v4-legible.html", "/context-layer/demo"],
  ["/context-layer/legacy/index.html", "/context-layer/demo"],
  ["/manifest.webmanifest", "/context-layer/demo/manifest.webmanifest"],
  ["/context-layer/manifest.webmanifest", "/context-layer/demo/manifest.webmanifest"],
  ["/og.png", "/context-layer/og.png"],
  ["/llms.txt", "/context-layer/llms.txt"],
  ["/agent-navigation-manifest.json", "/context-layer/source/agent-navigation-manifest.json"],
  ["/robots.txt", "/robots.txt"],
  ["/api/guide", "/api/context-layer/guide"],
  ["/api/context-layer/guide", "/api/context-layer/guide"],
  ["/reference/context-layer-blog-post.md", "/context-layer/source/context-layer-blog-post.md"],
  ["/reference/context-layer-implementation-and-interoperability.md", "/context-layer/source/context-layer-implementation-and-interoperability.md"],
  ["/reference/context-layer-technical-specification.md", "/context-layer/source/context-layer-technical-specification.md"],
  ["/reference/context-layer-architecture-diagram.svg", "/context-layer/reference/context-layer-architecture-diagram.svg"],
]);

const NATIVE_ASSETS = new Set([
  "context-layer-diagram.css",
  "context-layer-docs.css",
  "context-layer-native.css",
  "context-layer-native.js",
  "context-layer-reference.js",
]);

const DEMO_ASSETS = new Set([
  "context-layer-og.svg",
  "context-layer-responsive.css",
  "context-layer.css",
  "context-layer.js",
]);

const IMPLEMENTATION_FILES = new Set([
  "context-layer-reference.mjs",
  "context-request.schema.json",
  "invalid-memory-update-proposal.json",
  "invalid-policy-decision.json",
  "invalid-secret-receipt.json",
  "memory-update-proposal.schema.json",
  "policy-decision.schema.json",
  "receipt.schema.json",
  "scoped-context-bundle.schema.json",
  "valid-exchange.json",
  "valid-memory-update-proposal.json",
  "valid-policy-decision.json",
]);

const SOURCE_FILES = new Set([
  "agent-navigation-manifest.json",
  "context-layer-blog-post.md",
  "context-layer-implementation-and-interoperability.md",
  "context-layer-technical-specification.md",
]);

const CANONICAL_PATHS = new Set([
  "/context-layer",
  "/context-layer/architecture",
  "/context-layer/code",
  "/context-layer/demo",
  "/context-layer/demo/manifest.webmanifest",
  "/context-layer/downloads/context-layer-architecture.svg",
  "/context-layer/implementation",
  "/context-layer/llms.txt",
  "/context-layer/og.png",
  "/context-layer/reference/context-layer-architecture-diagram.svg",
  "/context-layer/specification",
  "/signal/the-context-layer",
]);

const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

const worker = {
  async fetch(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);
    const pathname = normalizePath(requestUrl.pathname);
    const targetPath = canonicalPath(pathname);

    if (!targetPath) {
      return secured(new Response("Not found", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        },
      }));
    }

    const isGuideRoute = pathname === "/api/guide" || pathname === "/api/context-layer/guide";
    if (!isGuideRoute && request.method !== "GET" && request.method !== "HEAD") {
      return secured(new Response("Method not allowed", {
        status: 405,
        headers: {
          Allow: "GET, HEAD",
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        },
      }));
    }

    const target = new URL(targetPath, CANONICAL_ORIGIN);
    target.search = requestUrl.search;

    return secured(new Response(null, {
      status: 308,
      headers: {
        "Cache-Control": "public, max-age=300",
        Link: `<${target.href}>; rel="canonical"`,
        Location: target.href,
      },
    }));
  },
};

function canonicalPath(pathname: string): string | null {
  const direct = DIRECT_REDIRECTS.get(pathname);
  if (direct) return direct;

  if (CANONICAL_PATHS.has(pathname)) return pathname;

  const implementationPrefix = pathname.startsWith("/context-layer/implementation/")
    ? "/context-layer/implementation/"
    : pathname.startsWith("/implementation/")
      ? "/implementation/"
      : null;
  if (implementationPrefix) {
    const filename = pathname.slice(implementationPrefix.length);
    return IMPLEMENTATION_FILES.has(filename)
      ? `/context-layer/implementation/${filename}`
      : null;
  }

  if (pathname === "/downloads/context-layer-architecture.svg") {
    return "/context-layer/downloads/context-layer-architecture.svg";
  }

  const sourcePrefix = pathname.startsWith("/context-layer/source/")
    ? "/context-layer/source/"
    : pathname.startsWith("/source/")
      ? "/source/"
      : null;
  if (sourcePrefix) {
    const filename = pathname.slice(sourcePrefix.length);
    return SOURCE_FILES.has(filename)
      ? `/context-layer/source/${filename}`
      : null;
  }

  const nativeAssetPrefix = pathname.startsWith("/context-layer/assets/")
    ? "/context-layer/assets/"
    : pathname.startsWith("/assets/")
      ? "/assets/"
      : null;
  if (nativeAssetPrefix) {
    const filename = pathname.slice(nativeAssetPrefix.length);
    return NATIVE_ASSETS.has(filename)
      ? `/context-layer/assets/${filename}`
      : DEMO_ASSETS.has(filename)
        ? `/context-layer/demo/assets/${filename}`
        : null;
  }

  if (pathname.startsWith("/context-layer/demo/assets/")) {
    const filename = pathname.slice("/context-layer/demo/assets/".length);
    return DEMO_ASSETS.has(filename)
      ? `/context-layer/demo/assets/${filename}`
      : null;
  }

  return null;
}

function normalizePath(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

function secured(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default worker;
