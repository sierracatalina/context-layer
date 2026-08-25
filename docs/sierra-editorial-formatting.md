# Sierra editorial formatting

This is an internal implementation contract for agents and maintainers. It is
not public page copy.

## Reader-facing language

- Lowercase ordinary prose, headings, navigation, labels, controls, metadata,
  status messages, accessible names, and generated UI responses.
- Preserve `I`, proper names, acronyms, normative protocol keywords, versioned
  identifiers, and established technical casing such as `AI`, `API`, `OpenAI`,
  `OAuth`, `DPoP`, `GitHub`, `ActivityPub`, `SwiftUI`, and `macOS`.
- Use `&` instead of the standalone word `and`. Do not put a comma before `&`.
- In editorial narrative and interface copy, prefer single quotation marks,
  use brackets rather than parentheses for asides, and do not use an em dash.
  Normative specifications may retain standards punctuation where changing it
  would reduce precision.
- Keep code, schemas, payloads, command output, URLs, email addresses,
  user-authored input, and protocol source documents byte-for-byte intact.

Do not use CSS as the editorial compliance mechanism. `text-transform` changes
presentation without fixing the DOM, copied text, accessible names, metadata,
or runtime-generated copy, and it cannot safely distinguish `AI` from ordinary
prose. A deliberately transformed short metadata label may remain decorative
only after its source text already satisfies this contract; body copy,
headlines, and technical identifiers must not depend on a transform.

## Type roles

- Display headings: Cormorant Garamond.
- Body copy: Lora.
- Navigation, indexes, labels, controls, and technical metadata: DM Mono.
- DM Sans is structural only and must not replace the display or body roles.

## Enforcement boundaries

`site/context-layer/assets/context-layer-editorial.mjs` is the shared formatter
for reader-facing copy. Its strict mode normalizes authored site copy against an
explicit casing glossary. Its conservative `preserveUnknownCase` mode is for
model-generated prose that has already been instructed to use lowercase
ordinary prose; that mode avoids destroying unfamiliar proper names and
acronyms. User-authored input must cross the UI boundary unchanged.

`scripts/format-context-layer-site.mjs` applies strict normalization to the
seven generated pages in `site/context-layer/_pages/`. It skips technical
elements (`code`, `kbd`, `pre`, `samp`, `script`, `style`, `svg`, `textarea`,
and `var`) and never formats URL-bearing or data-bearing attributes. It does not
rewrite the Markdown protocol sources, schemas, fixtures, downloads, or
implementation artifacts published beside those pages.

Runtime UI must select the boundary explicitly:

- authored interface strings use strict normalization;
- generated guide prose uses conservative normalization;
- user questions and voice transcripts are rendered exactly as received;
- JSON and other technical renderings never pass through the prose formatter.

Run these commands before publication:

```text
npm run format:context-layer
npm run verify:context-layer
npm run test:site
```

The verifier must fail when ordinary capitals or the standalone word `and`
reappear outside protected technical content, or when a code, generated-copy,
or user-input boundary regresses.
