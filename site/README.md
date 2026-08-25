# Public documentation site

This directory contains the canonical public source for the Context Layer documentation experience served at `sierracatalina.com/context-layer`.

It is deliberately isolated from Sierra Catalina's personal-site application. The static route contract in `vercel.json` makes this directory independently previewable and deployable while preserving the production paths.

Public protocol claims must remain consistent with the authoritative objects, schemas, and proof artifacts at the repository root.

Before publication, run `npm run format:context-layer`, `npm run verify:context-layer`, `npm test`, `npm run lint`, and `npm run release:hygiene` from the repository root. Deploy this `site/` directory through the linked `context-layer-public` project; the Sierra host remains responsible for the apex homepage and proxies only the documented Context Layer routes.
