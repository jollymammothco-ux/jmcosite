# Backlog

Remaining items. Anything struck off below was closed during the Aug 2026
design overhaul (see CHANGELOG).

## P0 — before the next deploy

- **Enable Netlify Identity + Git Gateway** so `/admin` works. Site settings →
  Identity → enable, set registration to *Invite only*, enable Git Gateway,
  then invite your own email. Until this is done `/admin` will show the
  "not connected yet" message.
- **Get permission for the testimonials.** The four quotes in the Proof section
  are real client messages with placeholder attributions
  (`Exteriors contractor / Chippewa Valley`). Confirm each client is happy to be
  quoted and replace the placeholders with the real name and company, or keep
  them anonymous on purpose. Do not deploy attributed quotes without asking.
  The original screenshots are held in `_source-media/testimonials/` and are
  deliberately **not** deployed: an unlinked file on Netlify is still publicly
  fetchable, and those are private client messages. Move them back into
  `assets/testimonials/` once you have the OK.
- **Back up `_source-media/`.** It holds the 97MB of originals and is gitignored,
  so it exists only on this machine.

## P1 — needs your input

- **Get one client testimonial with a name and company attached.** There is
  still zero social proof anywhere on the site. One honest sentence from
  M.A.S Exteriors or The Oxbow would outperform the entire add-ons section.
  This is the highest-return item on the list.
- **Confirm the hero proof-strip numbers.** Currently "2024 founded / 7 systems
  shipped / Eau Claire / In person". The 7 is the count of case studies on
  `projects.html`. Replace with real figures or cut the strip.
- **Photos of Jack on site with real clients.** The whole pitch is "we show up
  in person" and there is one studio portrait carrying it. Three or four
  candid job-site shots would do more than any copy change.
- **A real MammothIQ / RapidDashboard screenshot.** The product card still
  shows a CSS mock with invented bars.
- **An SVG version of the mammoth mark.** `logo.png` is a 61 KB raster doing
  favicon, 40px header mark, and section watermark duty.

## P2 — medium priority

- On `projects.html`, promote each case study title (Dalila Jane, High Cliff
  Consulting, etc.) from `<span class="case-title">` to a real heading (`h3`)
  inside its `<details>`, preserving current styling.
- Add `noindex` meta to `questionnaire.html` and exclude it from `sitemap.xml`.
- Add `rel="canonical"` to any pages that don't already have it (verify all 5
  public pages are covered).
- Add "advertising campaigns" and "website development" to the creative and
  brand services list.
- Add explicit width/height to remaining content images missing them
  (homepage project thumbs now have them; inner pages not yet audited).

## Cleanup

- `netlify/functions/submit-lead.js` is orphaned. The `#contact-form` handler
  that called it was removed from `main.js` during the overhaul, and no page
  posts to it. Safe to delete once you have confirmed nothing external hits
  that endpoint.
- `README.md` still documents the light/dark theme toggle and `intake.html`.
  Both are gone: the theme toggle was removed (site is dark-only by design)
  and `intake.html` is now `questionnaire.html`.

## Done in the Aug 2026 overhaul

- ~~Hero video: poster image and `preload="metadata"`~~ done, plus re-encoded
  to a 720x720 crop: 9.24 MB to 1.13 MB.
- ~~Optimize `romeo-bunny.png` and compress `go-mammoth-hero.jpg`~~ done:
  2.19 MB to 0.13 MB, and 0.35 MB to 0.17 MB.
- ~~Dedicated OG share image (1200x630)~~ done: `assets/brand/og-share.jpg`,
  wired into all four public pages with width/height/alt.
- ~~Add `go-mammoth.html` to the homepage primary nav~~ done, and the nav is
  now identical across all five pages.
