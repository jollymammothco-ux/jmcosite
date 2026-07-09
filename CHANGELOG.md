# Changelog

## 2026-07-09 — Homepage re-angle + P1 SEO

Two commits landed this session. Homepage repositioned from a product catalog to an
advisory-first story, a site-wide CTA relabel, supporting styling work, and the first
batch of SEO infrastructure.

---

### `29a82bd` — Re-angle homepage to advisory-first positioning and refresh site copy

_8 files changed, 370 insertions(+), 57 deletions(-)_

**Homepage copy (`index.html`)**
- **Hero** rewritten: "You started your business to build things you're proud of. Not
  patch revenue leaks." Subhead reframed around AI expanding capacity without headcount.
  First CTA changed from "See the suite" to "See where it fits."
- **New "How we work" section** inserted between the pain section and the product lanes.
  Establishes the whole-business, advisory-first frame ("We are not here to sell you one
  piece of software.").
- **Pain section** reheadered: product assignments removed from the columns so buyers
  self-identify ("Where growth leaks" / "Where operations leak").
- **"Two products" reframed as "Two lanes"** — eyebrow "Most builds run in one of two
  lanes," header "Which lane is yours depends on where it hurts," a pain-question above
  each card for self-selection, and a closing relationship line under the cards.
- **"3 steps" section** header changed to "3 steps to a system that runs itself"; step 3
  now ends on "get back to building."
- **Founder title** updated from "Owner" to "Founder" (credential line + image alt text).

**Site-wide relabel**
- "Start Project" → "Book a Strategy Call" across the header, mobile nav, and footer on
  every page (`about.html`, `contact.html`, `go-mammoth.html`, `projects.html`,
  `intake.html`), keeping the same `intake.html` target.

**Styling (`styles.css`)**
- New `.hero-subhead` class so the hero subhead is visually subordinate to the H1
  instead of matching its size.
- Feature card headlines forced to white on blue section backgrounds (was inheriting the
  theme's dark text and clashing in light mode).
- 5-color tint cycle added to feature and project cards, reusing the brand "Jolly"
  letter colors at 18% opacity via `color-mix()`. Theme-aware in both light and dark.
- New `.suite-question` and `.suite-footer` classes for the lanes section.
- Stylesheet cache-buster bumped to `?v=10` across all pages.

**SEO tags (`index.html`)**
- Canonical, Open Graph, Twitter Card, and JSON-LD `LocalBusiness` tags added to the head.

**Repo**
- `.gitignore` updated to exclude `.claude/` editor/agent config.

---

### `2bfc742` — Add P1 SEO infrastructure files

_3 files changed, 24 insertions(+)_

- `sitemap.xml` — XML sitemap for search engine discovery.
- `robots.txt` — crawler directives and sitemap reference.
- `_redirects` — Netlify redirect rules.

---

### Notes / not done yet

- **Not deployed** — commits are local only.
- Product deep-dive copy (Go Mammoth / MammothIQ / RapidDashboard), the About section,
  and case-study cards were intentionally left untouched per the re-angle spec guardrails.
- The old "Products" dropdown handler in `main.js` and its `.nav-group` / `.mobile-nav-label`
  CSS are now unused (harmless, JS is guarded) — optional cleanup for a later pass.
