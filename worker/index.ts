import { handleGuideRequest } from "./guide";
import {
  renderArchitecturePage,
  renderCodePage,
  renderDocumentPage,
  renderLandingPage,
} from "./native-documents";
import portableHeaders from "../public/_headers?raw";
import navigationManifest from "../public/agent-navigation-manifest.json?raw";
import diagramCss from "../public/assets/context-layer-diagram.css?raw";
import docsCss from "../public/assets/context-layer-docs.css?raw";
import socialImage from "../public/assets/context-layer-og.svg?raw";
import responsiveCss from "../public/assets/context-layer-responsive.css?raw";
import siteCss from "../public/assets/context-layer.css?raw";
import referenceJs from "../public/assets/context-layer-reference.js?raw";
import nativeCss from "../public/assets/context-layer-native.css?raw";
import nativeJs from "../public/assets/context-layer-native.js?raw";
import siteJs from "../public/assets/context-layer.js?raw";
import indexHtml from "../public/index.html?raw";
import socialPreview from "../public/og.png?inline";
import contextRequestSchema from "../public/implementation/context-request.schema.json?raw";
import invalidSecretReceipt from "../public/implementation/invalid-secret-receipt.json?raw";
import receiptSchema from "../public/implementation/receipt.schema.json?raw";
import referenceImplementation from "../public/implementation/context-layer-reference.mjs?raw";
import scopedBundleSchema from "../public/implementation/scoped-context-bundle.schema.json?raw";
import validExchange from "../public/implementation/valid-exchange.json?raw";
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
  body: string | Uint8Array;
  contentType: string;
  headers?: Record<string, string>;
}

const landingPage = renderLandingPage();

const blogPage = renderDocumentPage(blogPost, {
  canonicalPath: "/signal/the-context-layer",
  description: "Sierra Catalina's proposal for user-owned memory, purpose-bound disclosure, reversible agent writes, and inspectable receipts.",
  eyebrow: "signal editorial / dossier 001",
  rawPath: "/context-layer/source/context-layer-blog-post.md",
  status: "published",
  subtitle: "A proposal for user-owned memory, purpose-bound disclosure, reversible agent writes, and receipts people can inspect",
});

const specificationPage = renderDocumentPage(technicalSpecification, {
  canonicalPath: "/context-layer/specification",
  description: "The Context Layer v0.1 draft technical specification: objects, lifecycles, policies, trust boundaries, and conformance requirements.",
  eyebrow: "technical reference / v0.1 draft",
  rawPath: "/context-layer/source/context-layer-technical-specification.md",
  status: "working draft",
  subtitle: "A reviewable core contract for implementation and interoperability experiments.",
});

const implementationPage = renderDocumentPage(implementationReference, {
  canonicalPath: "/context-layer/implementation",
  description: "Implementation and interoperability profiles for Context Layer adapters, agents, web and mobile applications, and security review.",
  eyebrow: "technical reference / implementation",
  rawPath: "/context-layer/source/context-layer-implementation-and-interoperability.md",
  status: "working draft",
  subtitle: "Adapter guidance for building on existing protocols without flattening their security model.",
});

const architecturePage = renderArchitecturePage();
const codePage = renderCodePage();

const PUBLIC_ASSETS = new Map<string, PublicAsset>([
  ["/_headers", text(portableHeaders)],
  ["/agent-navigation-manifest.json", json(navigationManifest)],
  ["/assets/context-layer-diagram.css", css(diagramCss)],
  ["/assets/context-layer-docs.css", css(docsCss)],
  ["/assets/context-layer-native.css", css(nativeCss)],
  ["/assets/context-layer-native.js", javascript(nativeJs)],
  ["/assets/context-layer-og.svg", svg(socialImage)],
  ["/assets/context-layer-responsive.css", css(responsiveCss)],
  ["/assets/context-layer.css", css(siteCss)],
  ["/assets/context-layer-reference.js", javascript(referenceJs)],
  ["/assets/context-layer.js", javascript(siteJs)],
  ["/index.html", html(landingPage)],
  ["/legacy/index.html", noIndex(html(indexHtml))],
  ["/essay", html(blogPage)],
  ["/essay/", html(blogPage)],
  ["/architecture", html(architecturePage)],
  ["/architecture/", html(architecturePage)],
  ["/specification", html(specificationPage)],
  ["/specification/", html(specificationPage)],
  ["/implementation", html(implementationPage)],
  ["/implementation/", html(implementationPage)],
  ["/code", html(codePage)],
  ["/code/", html(codePage)],
  ["/llms.txt", text(llms)],
  ["/manifest.webmanifest", { body: webManifest, contentType: "application/manifest+json; charset=utf-8" }],
  ["/og.png", dataUrlAsset(socialPreview, "image/png")],
  ["/ouroboros-architecture-v4-legible.html", html(architectureAlias)],
  ["/writing/context-layer", html(blogPage)],
  ["/writing/context-layer/", html(blogPage)],
  ["/signal/the-context-layer", html(blogPage)],
  ["/signal/the-context-layer/", html(blogPage)],
  ["/reference/architecture", html(architecturePage)],
  ["/reference/architecture/", html(architecturePage)],
  ["/reference/specification", html(specificationPage)],
  ["/reference/specification/", html(specificationPage)],
  ["/reference/implementation", html(implementationPage)],
  ["/reference/implementation/", html(implementationPage)],
  ["/reference/context-layer-architecture-diagram.svg", noIndex(svg(architectureDiagram))],
  ["/downloads/context-layer-architecture.svg", downloadable(svg(architectureDiagram), "context-layer-architecture.svg")],
  ["/implementation/context-layer-reference.mjs", downloadable(javascript(referenceImplementation), "context-layer-reference.mjs")],
  ["/implementation/context-request.schema.json", downloadable(json(contextRequestSchema), "context-request.schema.json")],
  ["/implementation/scoped-context-bundle.schema.json", downloadable(json(scopedBundleSchema), "scoped-context-bundle.schema.json")],
  ["/implementation/receipt.schema.json", downloadable(json(receiptSchema), "receipt.schema.json")],
  ["/implementation/valid-exchange.json", downloadable(json(validExchange), "valid-exchange.json")],
  ["/implementation/invalid-secret-receipt.json", downloadable(json(invalidSecretReceipt), "invalid-secret-receipt.json")],
  ["/reference/context-layer-blog-post.md", noIndex(markdown(blogPost))],
  ["/reference/context-layer-implementation-and-interoperability.md", noIndex(markdown(implementationReference))],
  ["/reference/context-layer-technical-specification.md", noIndex(markdown(technicalSpecification))],
  ["/source/context-layer-blog-post.md", noIndex(markdown(blogPost))],
  ["/source/context-layer-implementation-and-interoperability.md", noIndex(markdown(implementationReference))],
  ["/source/context-layer-technical-specification.md", noIndex(markdown(technicalSpecification))],
  ["/source/agent-navigation-manifest.json", noIndex(json(navigationManifest))],
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
    let pathname = url.pathname;

    if (pathname === "/context-layer") {
      pathname = "/";
    } else if (pathname.startsWith("/context-layer/")) {
      pathname = pathname.slice("/context-layer".length);
    }

    if (pathname === "/api/guide") {
      return withSecurityHeaders(await handleGuideRequest(request, env || {}));
    }

    const assetPath = pathname === "/" ? "/index.html" : pathname;
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

function dataUrlAsset(dataUrl: string, contentType: string): PublicAsset {
  const marker = ";base64,";
  const markerIndex = dataUrl.indexOf(marker);
  if (markerIndex === -1) throw new Error("Expected an inline base64 asset");
  const binary = atob(dataUrl.slice(markerIndex + marker.length));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return { body: bytes, contentType };
}

function noIndex(asset: PublicAsset): PublicAsset {
  return { ...asset, headers: { ...asset.headers, "X-Robots-Tag": "noindex, nofollow" } };
}

function downloadable(asset: PublicAsset, filename: string): PublicAsset {
  return noIndex({
    ...asset,
    headers: {
      ...asset.headers,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    },
  });
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
