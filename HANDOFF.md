# Session Handoff — 2026-08-13

Written to close out a long design-overhaul conversation before its context
window ran out. Read this first in the new session — it covers what memory
and the other docs don't: the narrative of *why* things look the way they do,
what was already tried and rejected, and exactly what's still waiting on
Jack's review.

Standing project context (brand voice, design-system tokens, build/CMS
architecture) is already in this project's persistent memory and will load
automatically — this file doesn't repeat it. For reference detail: `README.md`
(architecture, CMS, env setup), `BACKLOG.md` (open items), `CHANGELOG.md`
(stale — last entry 2026-07-09, predates everything below; the whole overhaul
was never logged there).

## Where things stand right now

Working tree is clean. `master` is up to date with `origin/master` at
`80b1846`. That commit was pushed in direct response to Jack's harshest
feedback of the engagement — verbatim: *"that looks like shit... the hammer
isn't even shaped like a hammer... the nail doesn't even look like it's a
nail... it just looks like a silver dot."* Everything in that commit was
built to answer that critique point by point (see below).

**No message from Jack has landed since that push.** The immediate next step
in a new session is to find out whether the redraw clears his bar — not to
start new work. If his first message doesn't address that, treat it as him
moving on and follow his lead.

## The whole overhaul, in order (all 2026-08-13, one long session)

1. `1e79b6c` — Full rebuild: new hi-vis-orange/deep-slate design system,
   particle-herd hero (samples the logo's alpha channel into ~3200 canvas
   points), CMS-driven case studies (Decap, git-gateway backend).
2. `4d8b97c` — Round 2: trades imagery and depth, real testimonial
   screenshots, Jolly Creative Department split into its own branded space
   (rainbow Jolly palette) so it stops cluttering the landing page.
3. `176cfee` — First caution-tape divider attempt, neon Icons8 trade icons,
   tightened proof section.
4. `c360020` → `96238a3` → `e40bec4` — Caution tape rebuilt on canvas, then
   replaced outright by a tape-measure metaphor, then turned into a
   **vertical scroll-progress rail** (see below) after Jack caught a real
   mobile bug in the one-shot version.
5. `5513cac` → `80b1846` — The hammer-cursor CTA system: cursor swap, nail
   drive, haptics. First pass shipped and was rejected hard; second pass
   redrew the hammer and nail from scratch and is the current state.

## The two systems still "wet paint" — read before touching either

### The strike system (hammer cursor + nail-drive CTAs)

Files: `assets/cursor/hammer-up.png`, `hammer-down.png` (48×48), `nail.svg`;
CSS around `styles.css:552` (`.btn-primary .nail` block through the
`nail-drive`/`nail-flash`/`strike-ring`/`strike-hit` keyframes, ending
`styles.css:673` with the `hover: none` override); JS in `main.js`'s
`initStrike()` (around line 42).

- `.btn-primary` gets `cursor: url(hammer-up.png) 8 26, pointer`, swaps to
  `hammer-down.png` on `:active`.
- The nail is a JS-injected `<span class="nail">` (not in markup, so no-JS
  users get a plain button, not a stray dot) — an `overflow:hidden` window
  where `::before` is the nail SVG translated by `--drive`, `::after` is a
  contact flash.
- Press fires `.is-struck`, which runs `nail-drive` (17px of travel, holds
  driven, eases back — tuned specifically so the *drive* is the legible part
  after the first pass was criticized as "very hard to see what's
  happening"), plus a shock ring positioned at the actual pointer coordinates
  via `--strike-x`/`--strike-y`.
- Mobile: `@media (hover: none)` zeroes only the resting hover-lift. The
  drive itself still fires on tap — Jack was explicit that mobile users
  should still see the nail go in, they just can't hover first.
- Haptics: `navigator.vibrate([14, 26, 8])` on press, feature-detected and
  gated behind `prefers-reduced-motion`. **Android Chrome/Firefox only —
  iOS Safari has no Vibration API and no web API for the Taptic Engine at
  all.** This was flagged to Jack explicitly as a platform limitation, not a
  bug to chase further.

Three dead ends from getting here, so they aren't repeated:
- Hammer drawn with PIL polygon primitives — structurally can't do curves,
  and a claw hammer is all curves.
- First SVG rebuild: one complex path that self-intersected into a
  horseshoe blob.
- Second SVG rebuild: head laid out linear/axial like a pickaxe. The fix was
  realizing a hammer head is genuinely T-shaped — striking face, waisted
  cheek, claw hook running left-right as one piece, with the handle dropping
  *perpendicular* from the eye, not continuing the head's long axis. The
  current `hammer-src.svg` (source lives only in the old session's
  scratchpad, not the repo — only the rasterized PNGs are committed) encodes
  that geometry.
- Nail was originally a flat plan-view circle (bird's-eye). Jack asked for
  side profile specifically; current `nail.svg` is head+tapered shaft+point,
  standing vertically.

### The scroll rail (`measure.js` + `.rail` in `styles.css`)

A tape-measure blade pinned down the window edge that pays out with scroll
position, replacing what was originally a one-shot horizontal caution-tape
divider. That divider had a real, Jack-caught bug: on mobile it sat below
the fold at load and its animation had already fired by the time anyone
scrolled to it, so the one moment it had was never seen. Rather than patch
the trigger timing, it became the page's permanent scroll-progress
indicator — always on screen, always responsive, section boundaries from
`main > section[id]` stamped on the blade as heavier tick marks. Full
tick hierarchy down to sixteenths, rolled-edge cross-section, steel hook at
the tip. Progress eases toward scroll fraction (`progress += d * 0.16`)
rather than snapping, deliberately — "the tip lags the hand pulling it."

Also killed this round: architectural dimension-line callouts (`.dim`,
`.dim__ext`, etc.) — built, then Jack called them "too deliberately quiet"
and asked to scratch the idea entirely rather than iterate. Fully removed,
not hidden.

Also killed earlier: a twisting-ribbon caution-tape animation tuned
(`twist=3.4`) to force a visible back-face flip — read as fake/cartoonish
to Jack. The self-correction was recognizing I'd optimized for "technically
satisfying" (getting the flip to occur) instead of what the design actually
needed (subtlety — real tape barely moves).

## Versioning state

`scripts/build-projects.js` — `CSS_V = "48"`, `JS_V = "13"`. Every
`styles.css`/`main.js`/`boot.js`/`mammoth.js`/`measure.js` edit needs both of
these bumped, the matching `?v=` query strings updated by hand in
`index.html`, `about.html`, `questionnaire.html` (the three pages the
generator doesn't own), and then `node scripts/build-projects.js` re-run
before committing. This has been done correctly every round so far — keep
doing it exactly this way.

## Verification approach that actually works here

The Browser preview pane throttles `requestAnimationFrame` when
backgrounded or small, so canvas/CSS animations can't be reliably judged by
watching them live in-pane. What's worked instead:
- Replicate the animation math offline in Python, render static frames with
  PIL/ImageMagick, inspect those.
- `element.getAnimations()` in the browser console, then manually scrub
  `currentTime` to sample specific keyframe percentages.
- ImageMagick (`/opt/ImageMagick/bin/convert -background none -density N
  file.svg -resize WxH out.png`) for turning hand-authored SVGs into the
  cursor PNGs — `cairosvg` doesn't work in this environment (missing system
  libcairo).
- A custom WCAG contrast script (composites the full ancestor
  background-color stack, computes relative luminance) re-run after every
  round at both 1440px and 390px — zero failures maintained throughout.
  Re-run it fresh rather than trusting a mid-transition measurement; an
  early run once flagged false failures because it sampled mid-animation.
- Standard pre-commit sweep every round: contrast, horizontal-overflow
  check, dead-link crawl, 44px tap-target minimum, `node --check` on all
  JS. Keep running all of these, not a subset.

## Open backlog (unchanged by this session, see `BACKLOG.md` for full detail)

- **P0, long-unresolved:** Icons8 licence for the neon construction icons on
  the Go Mammoth feature cards — needs attribution or a paid commercial
  plan before public launch. Flagged repeatedly across rounds, never
  actioned by Jack. Worth surfacing again rather than letting it sit.
- Netlify Identity + Git Gateway still need enabling in Netlify's dashboard
  for `/admin` (Decap CMS) to work — that's a Netlify-console action only
  Jack can take.
- Testimonial attributions are still generic placeholders
  (`Exteriors contractor / Chippewa Valley`) pending real client permission.
- `_source-media/` (97MB of original uploads) is gitignored and exists only
  on this machine — no backup yet.
