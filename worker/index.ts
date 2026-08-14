import { handleGuideRequest } from "./guide";
import { renderArchitecturePage, renderDocumentPage } from "./documents";
import portableHeaders from "../public/_headers?raw";
import navigationManifest from "../public/agent-navigation-manifest.json?raw";
import diagramCss from "../public/assets/context-layer-diagram.css?raw";
import docsCss from "../public/assets/context-layer-docs.css?raw";
import socialImage from "../public/assets/context-layer-og.svg?raw";
import responsiveCss from "../public/assets/context-layer-responsive.css?raw";
import siteCss from "../public/assets/context-layer.css?raw";
import referenceJs from "../public/assets/context-layer-reference.js?raw";
import siteJs from "../public/assets/context-layer.js?raw";
import indexHtml from "../public/index.html?raw";
import llms from "../public/llms.txt?raw";
import webManifest from "../public/manifest.webmanifest?raw";
import architectureAlias from "../public/ouroboros-architecture-v4-legible.html?raw";
import architectureDiagram from "../public/reference/context-layer-architecture-diagram.svg?raw";
import blogPost from "../public/reference/context-layer-blog-post.md?raw";
import implementationReference from "../public/reference/context-layer-implementation-and-interoperability.md?raw";
import technicalSpecification from "../public/reference/context-layer-technical-specification.md?raw";
import robots from "../public/robots.txt?raw";

interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_GUIDE_MODEL?: string;
}

interface PublicAsset {
  body: string;
  contentType: string;
  headers?: Record<string, string>;
}

const blogPage = renderDocumentPage(blogPost, {
  canonicalPath: "/writing/context-layer",
  description: "Sierra Catalina's proposal for user-owned memory, purpose-bound disclosure, reversible agent writes, and inspectable receipts.",
  eyebrow: "Published essay / Context Layer",
  rawPath: "/reference/context-layer-blog-post.md",
  status: "Published",
  subtitle: "A proposal for user-owned memory, purpose-bound disclosure, reversible agent writes, and receipts people can inspect",
});

const specificationPage = renderDocumentPage(technicalSpecification, {
  canonicalPath: "/reference/specification",
  description: "The Context Layer v0.1 draft technical specification: objects, lifecycles, policies, trust boundaries, and conformance requirements.",
  eyebrow: "Technical reference / v0.1 draft",
  rawPath: "/reference/context-layer-technical-specification.md",
  status: "Working Draft",
  subtitle: "A reviewable core contract for implementation and interoperability experiments.",
});

const implementationPage = renderDocumentPage(implementationReference, {
  canonicalPath: "/reference/implementation",
  description: "Implementation and interoperability profiles for Context Layer adapters, agents, web and mobile applications, and security review.",
  eyebrow: "Technical reference / implementation",
  rawPath: "/reference/context-layer-implementation-and-interoperability.md",
  status: "Working Draft",
  subtitle: "Adapter guidance for building on existing protocols without flattening their security model.",
});

const architecturePage = renderArchitecturePage();

const PUBLIC_ASSETS = new Map<string, PublicAsset>([
  ["/_headers", text(portableHeaders)],
  ["/agent-navigation-manifest.json", json(navigationManifest)],
  ["/assets/context-layer-diagram.css", css(diagramCss)],
  ["/assets/context-layer-docs.css", css(docsCss)],
  ["/assets/context-layer-og.svg", svg(socialImage)],
  ["/assets/context-layer-responsive.css", css(responsiveCss)],
  ["/assets/context-layer.css", css(siteCss)],
  ["/assets/context-layer-reference.js", javascript(referenceJs)],
  ["/assets/context-layer.js", javascript(siteJs)],
  ["/index.html", html(indexHtml)],
  ["/llms.txt", text(llms)],
  ["/manifest.webmanifest", { body: webManifest, contentType: "application/manifest+json; charset=utf-8" }],
  ["/ouroboros-architecture-v4-legible.html", html(architectureAlias)],
  ["/writing/context-layer", html(blogPage)],
  ["/writing/context-layer/", html(blogPage)],
  ["/reference/architecture", html(architecturePage)],
  ["/reference/architecture/", html(architecturePage)],
  ["/reference/specification", html(specificationPage)],
  ["/reference/specification/", html(specificationPage)],
  ["/reference/implementation", html(implementationPage)],
  ["/reference/implementation/", html(implementationPage)],
  ["/reference/context-layer-architecture-diagram.svg", noIndex(svg(architectureDiagram))],
  ["/reference/context-layer-blog-post.md", noIndex(markdown(blogPost))],
  ["/reference/context-layer-implementation-and-interoperability.md", noIndex(markdown(implementationReference))],
  ["/reference/context-layer-technical-specification.md", noIndex(markdown(technicalSpecification))],
  ["/robots.txt", text(robots)],
]);

const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), geolocation=(), payment=(), usb=()",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
} as const;

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/guide") {
      return withSecurityHeaders(await handleGuideRequest(request, env || {}));
    }

    const assetPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const asset = PUBLIC_ASSETS.get(assetPath);
    if (asset) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return withSecurityHeaders(new Response("Method not allowed", {
          status: 405,
          headers: { Allow: "GET, HEAD" },
        }));
      }
      return withSecurityHeaders(new Response(request.method === "HEAD" ? null : asset.body, {
        status: 200,
        headers: {
          "Content-Type": asset.contentType,
          "Cache-Control": asset.contentType.startsWith("text/html") || asset.contentType === "image/svg+xml"
            ? "no-cache"
            : "public, max-age=3600",
          ...asset.headers,
        },
      }));
    }

    return withSecurityHeaders(new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    }));
  },
};

function withSecurityHeaders(response: Response): Response {
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

function typed(body: string, contentType: string): PublicAsset {
  return { body, contentType };
}

function noIndex(asset: PublicAsset): PublicAsset {
  return { ...asset, headers: { ...asset.headers, "X-Robots-Tag": "noindex, nofollow" } };
}

function html(body: string): PublicAsset {
  return typed(body, "text/html; charset=utf-8");
}

function css(body: string): PublicAsset {
  return typed(body, "text/css; charset=utf-8");
}

function javascript(body: string): PublicAsset {
  return typed(body, "text/javascript; charset=utf-8");
}

function json(body: string): PublicAsset {
  return typed(body, "application/json; charset=utf-8");
}

function markdown(body: string): PublicAsset {
  return typed(body, "text/markdown; charset=utf-8");
}

function svg(body: string): PublicAsset {
  return typed(body, "image/svg+xml");
}

function text(body: string): PublicAsset {
  return typed(body, "text/plain; charset=utf-8");
}

export default worker;
