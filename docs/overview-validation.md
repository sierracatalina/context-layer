# Overview validation

## Reproduce

Run from the repository root:

```sh
npm run format:context-layer
npm run verify:context-layer
npm run lint
npm test
npm run release:hygiene
git diff --check
```

The overview check is `scripts/verify-context-layer-overview.mjs`; its regression tests are `tests/overview.test.mjs`. No new dependencies are used. Text inputs are normalized from Windows CRLF to LF before parsing & comparing; a regression test checks platform parity. The generated sentence-case page is a narrow exception to the site's lowercase prose contract. `OVERVIEW.md` is its content source; the home page supplies the existing site shell.

## Automated checks

The checker requires the five requested sections, one opening paragraph, no more than five numbered steps & exactly one diagram. It enforces a 700-word limit for both the Markdown overview & the full rendered page [including navigation, diagram labels & footer], plus 150 words for the README TL;DR.

Flesch reading ease uses `206.835 - 1.015 × words / sentences - 84.6 × syllables / words`, with a minimum of 50. Word counts use visible link labels, include headings & diagram labels & count `&` as `and`. Reading ease excludes headings, diagram labels & interface text. The rendered score includes the diagram caption. Syllables use a fixed English vowel-group heuristic, suffix handling, hyphen splitting & a small explicit exception list. This is a reproducible estimate, not a dictionary-based score or a test of human understanding.

The one-line glossary is checked against terms extracted from both specifications, including terminology, components, trust zones, object names, conformance roles, purpose codes, policy outcomes & companion named values, plus the implementation guide's deployment profiles & explicit supporting concepts. Each entry occupies one source line. JSON fields are not treated as a second glossary; their full contracts remain in the spec & schemas. Tests fail if a source definition is added without a glossary entry.

Checks also compare the generated page & published glossary with their source, require the overview route & home link, resolve local links & page anchors, reject repository traversal & ensure every HTML page belongs to an editorial check. External URLs are not fetched by this offline check; it does not establish availability of a deployed route.

## Results for this draft

- Overview: 470 words; estimated Flesch reading ease 69.47.
- Rendered page: 522 visible words; estimated article reading ease 69.75.
- README TL;DR: 107 words; estimated Flesch reading ease 79.94.
- Glossary: 119 one-line entries; 81 distinct source terms across 96 source references checked.
- Integrated documentation suites: 130 tests passed [28 contract, 14 site, 62 local-core, 11 proof, 15 specification documentation]. Additional implementation work must be checked again on the final integrated candidate.
- Lint, editorial verification, release hygiene & whitespace checks passed.

## Human comprehension gate

Human validation remains pending. No nontechnical person has yet been observed reading this revision & explaining it back in three sentences. Automated scores & agent review do not satisfy that gate.

Ask a nontechnical reader to read only the overview, then explain in three sentences what it does, how permission works & what exists today. Record the revision, date, their own words & any misunderstanding. A successful explanation should distinguish limited context sharing from unrestricted access or separate authority to act, & should retain the experimental status.

## Visual validation

Browser validation of the new overview route remains pending. Source checks & reuse of tested responsive styles are not a device test. Review the page, diagram, glossary link, navigation & theme controls at phone & desktop widths before release.
