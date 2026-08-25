# Context Layer UI copy boundary

This file contains implementation guidance for agents and maintainers. None of
this guidance is public page copy.

## Public copy contract

The site-wide casing, punctuation, and type-role rules live in
[`sierra-editorial-formatting.md`](./sierra-editorial-formatting.md). Apply that
contract to every reader-facing Context Layer route and to copy generated after
page load.

Reader-visible prose must do one of two things:

- explain the Context Layer protocol, its limits, or its current implementation
  status;
- describe an action the reader can take.

Do not publish sentences about how the page, renderer, asset, or editorial
pipeline was constructed. Keep theme selection, canvas opacity, viewport
behavior, layout order, breakpoint goals, stylesheet packaging, archive
location, API configuration, allowlisted navigation, and publication workflow
in internal notes or verification code.

Machine-facing artifacts such as `llms.txt`, schemas, source documents, and the
agent navigation manifest remain public when the protocol needs them. Do not
promote those endpoints as ordinary reader metadata unless a reader explicitly
enters a developer or machine-integration surface.

## Deployment boundary

- `site/context-layer/` is the canonical public documentation source.
- Vercel project `context-layer-public` must deploy with `site/` as its root.
- The standalone deployment rewrites `/` to the Context Layer index. It must not
  replace the Sierra Catalina apex deployment.
- The Sierra host owns `/`, `robots.txt`, `sitemap.xml`, and the guide API. Its
  scoped proxy exposes only the Context Layer routes from this deployment.

## Publication checks

- Run `npm run format:context-layer` after regenerating public HTML.
- Run `npm run verify:context-layer`, `npm run test`, `npm run lint`, and
  `npm run release:hygiene` before publication.
- Review rendered text, not source files alone.
- Verify every canonical route at preview and production widths.
- Compare production responses with the canonical deployment so proxy drift
  cannot hide stale copy.
- Treat sentences copied from agent instructions, design specifications, build
  logs, or editorial workflow documents as suspect until rewritten for readers.
