# Backlog

Remaining SEO items from the site audit, not yet done.

## P2 — medium priority

- Add `go-mammoth.html` to the homepage primary nav (currently only links to the
  `#go-mammoth` anchor, so the dedicated landing page gets no internal link).
- On `projects.html`, promote each case study title (Dalila Jane, High Cliff
  Consulting, etc.) from `<span class="case-title">` to a real heading (`h3`)
  inside its `<details>`, preserving current styling.
- Add `noindex` meta to `questionnaire.html` and exclude it from `sitemap.xml`.
- Add `rel="canonical"` to any pages that don't already have it (verify all 5
  public pages are covered).
- Add "advertising campaigns" and "website development" to the creative and
  brand services list.

## P3 — polish

- Optimize `romeo-bunny.png` (currently 2.2 MB, target under 200 KB) and
  compress `go-mammoth-hero.jpg`.
- Add explicit width/height to all content images missing them (reduces
  layout shift).
- Hero video: add a poster image and set `preload="metadata"`.
- Add a dedicated OG share image (1200x630) instead of reusing the logo. Note:
  this is a design task, ties into the planned design overhaul.

## Cleanup

- `contact.html` was retired (deleted, unlinked from footers, dropped from
  `sitemap.xml`, redirected to `/`). That leaves the `#contact-form` handler
  in `main.js` (~lines 233-292) and `netlify/functions/submit-lead.js`
  orphaned with no page left to call them. Safe to delete both once
  confirmed no other page references `#contact-form`.
