# Context Layer Sites adapter

This isolated project publishes the verified, person-neutral Context Layer microsite through OpenAI Sites. It deliberately excludes the legacy project root and serves only the explicit files in `public/`.

## Local validation

```sh
npm test
```

The build emits a Cloudflare-compatible worker at `dist/server/index.js`. The tests verify the static allowlist, security headers, route boundary, deterministic fallback, and strict model navigation tool.

## Runtime behavior

The worker:

- Serves the exact public HTML, CSS, JavaScript, metadata, and references
- Applies restrictive security headers to every response
- Returns a real 404 for paths outside the allowlist
- Exposes an optional `/api/guide` OpenAI Responses API route
- Keeps navigation actions limited to known same-page demo and map states
- Returns `guide_unavailable` when no server key exists so the browser visibly uses its deterministic local guide

`OPENAI_API_KEY` is optional and must be configured only as an encrypted Sites secret. `OPENAI_GUIDE_MODEL` can override the default guide model.

## Public source boundary

The source repository contains only the supported Sites adapter and the 15 audited public files. It does not include prior drafts, named meeting pages, local credentials, source images, browser artifacts, or the broader working directory.

The static release remains useful without a server key or account. The Harbor City scenario is synthetic and is not a standards-adoption or security-certification claim.
