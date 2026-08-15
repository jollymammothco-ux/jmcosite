#!/usr/bin/env node
/**
 * Builds index.html from content/landing.json.
 *
 *   node scripts/build-landing.js
 *
 * Every word on the landing page lives in the JSON; every piece of structure
 * lives here. That split is the whole point: the CMS should let the copy
 * change without anyone touching markup, and it should not let a typo in the
 * CMS take the layout apart.
 *
 * DO NOT HAND-EDIT index.html. It is overwritten on every build and on every
 * deploy. Copy changes go in content/landing.json (or through /admin);
 * structural changes go here.
 *
 * The work grid is not authored here at all. It reads content/projects.json,
 * the same source the work index and the case study pages use, so a case study
 * added in the CMS shows up on the landing page without anyone remembering to
 * duplicate it.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const P = require("./partials");

const ROOT = path.join(__dirname, "..");
const LANDING = path.join(ROOT, "content", "landing.json");
const PROJECTS = path.join(ROOT, "content", "projects.json");

const { esc, rich } = P;

/* ------------------------------------------------------------------ partials */

function head(seo) {
  return `<!DOCTYPE html>
<!--
  GENERATED FILE. Do not edit index.html by hand: it is overwritten by
  scripts/build-landing.js on every build and on every deploy, so edits here
  are lost silently. Copy lives in content/landing.json (or /admin). Structure
  lives in scripts/build-landing.js.
-->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="${esc(seo.description)}"
    />
    <title>${esc(seo.title)}</title>
    <link rel="canonical" href="https://jollymammoth.co/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Jolly Mammoth Co" />
    <meta property="og:title" content="${esc(seo.title)}" />
    <meta
      property="og:description"
      content="${esc(seo.shareDescription)}"
    />
    <meta property="og:image" content="https://jollymammoth.co/assets/brand/og-share.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(seo.shareImageAlt)}" />
    <meta property="og:url" content="https://jollymammoth.co/" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(seo.title)}" />
    <meta
      name="twitter:description"
      content="${esc(seo.shareDescription)}"
    />
    <meta name="twitter:image" content="https://jollymammoth.co/assets/brand/og-share.jpg" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": "https://jollymammoth.co/#organization",
        "name": "Jolly Mammoth LLC",
        "url": "https://jollymammoth.co/",
        "logo": "https://jollymammoth.co/assets/brand/logo.png",
        "foundingDate": "2024",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Eau Claire",
          "addressRegion": "WI",
          "addressCountry": "US"
        }
      }
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
      rel="stylesheet"
    />
    <script src="boot.js?v=${P.BOOT_V}"></script>
    <link rel="stylesheet" href="styles.css?v=${P.CSS_V}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" href="assets/brand/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="icon" href="assets/brand/favicon-192.png" type="image/png" sizes="192x192" />
    <link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png" />
  </head>`;
}

function header() {
  const nav = P.NAV_LINKS.map(
    (l) => `        <a href="${l.hash}">${esc(l.label)}</a>`
  ).join("\n");
  const mobile = P.NAV_LINKS.map(
    (l) => `      <a href="${l.hash}">${esc(l.label)}</a>`
  ).join("\n");

  return `  <body>
    <!-- Tape-measure scroll rail. Pays out as you read; section boundaries are
         stamped as heavier graduations. Decorative, hidden from assistive tech. -->
    <div class="rail" data-rail aria-hidden="true">
      <canvas class="rail__canvas"></canvas>
    </div>

    <header class="site-header" id="top">
      <a href="#top" class="logo" aria-label="Jolly Mammoth home">
        <img
          src="assets/brand/logo.png"
          alt=""
          width="48"
          height="40"
          class="logo-mark"
          aria-hidden="true"
        />
        <span class="logo-wordmark"
          ><span class="jolly-word jolly-word--logo" aria-label="Jolly"
            ><span>J</span><span>o</span><span>l</span><span>l</span><span>y</span></span
          >
          Mammoth</span
        >
      </a>
      <nav class="nav-desktop" aria-label="Main">
${nav}
      </nav>
      <a class="btn btn-primary btn-header" href="${P.CTA_HREF}">${esc(P.CTA_LABEL)}</a>
      <button class="nav-toggle" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span>
      </button>
    </header>

    <div class="mobile-nav" hidden>
${mobile}
      <a href="${P.CTA_HREF}">${esc(P.CTA_LABEL)}</a>
    </div>
`;
}

function footer() {
  const nav = P.FOOTER_LINKS.map(
    (l) => `        <a href="${l.hash}">${esc(l.label)}</a>`
  ).join("\n");

  return `    <footer class="site-footer">
      <p class="footer-mission">
        Live
        <span class="jolly-word" aria-label="Jolly"
          ><span>J</span><span>o</span><span>l</span><span>l</span><span>y</span></span
        >. Build Boldly. Grow Mammoth.
      </p>
      <p class="footer-tagline">
        Crafted with care. Made by mammals in Eau Claire, WI.
      </p>
      <nav class="footer-nav" aria-label="Footer">
${nav}
      </nav>
    </footer>

    <a class="sticky-cta" href="${P.CTA_HREF}">Book a Call</a>

    <script src="main.js?v=${P.JS_V}"></script>
    <script src="mammoth.js?v=${P.MAMMOTH_V}" defer></script>
    <script src="measure.js?v=${P.MEASURE_V}" defer></script>
  </body>
</html>
`;
}

/* ------------------------------------------------------------------ sections */

function hero(d) {
  const lines = d.headlineLines
    .map((l) => `              <span class="hero-line">${rich(l)}</span>`)
    .join("\n");
  const proof = d.proof
    .map((p) => `          <div><b>${esc(p.value)}</b><span>${esc(p.label)}</span></div>`)
    .join("\n");

  return `      <!-- HERO — the mammoth assembles itself out of a rainbow particle herd.
           Canvas sits behind the copy; falls back to the static mark. -->
      <section class="hero">
        <div
          class="hero-stage"
          data-mammoth="assets/brand/logo.png"
          aria-hidden="true"
        >
          <canvas></canvas>
          <img
            class="mammoth-fallback"
            src="assets/brand/logo.png"
            alt=""
            width="1008"
            height="850"
          />
        </div>
        <div class="hero-inner">
          <div class="hero-copy">
            <h1 class="headline headline-lavender">
${lines}
            </h1>
            <p class="hero-subhead">
              ${esc(d.subhead)}
            </p>
            <div class="cta-row">
              <a class="btn btn-primary btn-lg" href="${P.CTA_HREF}">${esc(P.CTA_LABEL)}</a>
              <a class="btn btn-ghost btn-lg" href="${esc(d.ctaSecondary.href)}">${esc(
    d.ctaSecondary.label
  )}</a>
            </div>
          </div>
        </div>
        <div class="hero-proof">
${proof}
        </div>
      </section>`;
}

function problem(d) {
  const buckets = d.buckets
    .map(
      (b) => `            <div class="pain-bucket">
              <p class="pain-bucket-label">${esc(b.label)}</p>
              <ul class="pain-grid">
${b.items.map((i) => `                <li>${esc(i)}</li>`).join("\n")}
              </ul>
            </div>`
    )
    .join("\n");
  const lines = d.lines.map((l) => `            <li>${esc(l)}</li>`).join("\n");

  return `      <!-- PAIN — left-anchored over real job-site footage. The background-image
           is the poster frame, so no-JS and no-autoplay readers still get a
           picture; the video layers over it and is skipped outright on phones
           and metered connections (see initBackgroundVideo). -->
      <section class="section band-photo reveal" id="problems">
        <div
          class="band-photo-bg"
          style="background-image: url('assets/trades/jobsite-loop-poster.jpg')"
          aria-hidden="true"
        >
          <video
            class="band-photo-video"
            muted
            loop
            playsinline
            preload="none"
            poster="assets/trades/jobsite-loop-poster.jpg"
          >
            <source src="assets/trades/jobsite-loop.webm" type="video/webm" />
            <source src="assets/trades/jobsite-loop.mp4" type="video/mp4" />
          </video>
        </div>
        <div class="band-anchor">
          <p class="eyebrow">${esc(d.eyebrow)}</p>
          <h2 class="headline">
            ${rich(d.headline)}
          </h2>
          <!-- Bucket order is content, not layout: whichever pain the reader is
               meant to recognise first is listed first in landing.json. -->
          <div class="pain-buckets">
${buckets}
          </div>

          <ul class="pain-lines" data-stagger>
${lines}
          </ul>

          <p class="pain-footer pain-payoff reveal">
            ${rich(d.payoff)}
          </p>
        </div>
      </section>`;
}

function jolly(d) {
  return `      <!-- JOLLY — the vision beat. Sits right after the problem so the page
           answers "what does better feel like?" before it sells anything. -->
      <section class="section section-jolly band-rest reveal" id="jolly">
        <div class="band-breather">
          <h2 class="headline">
            ${esc(d.headline)}
            <span class="jolly-word-group">
              <span class="jolly-word" aria-label="Jolly"
                ><span>J</span><span>O</span><span>L</span><span>L</span><span>Y</span></span
              >?
            </span>
          </h2>
          <p class="lead centered">
            ${esc(d.lead)}
          </p>
        </div>
      </section>`;
}

function products(d) {
  const cards = d.cards
    .map(
      (c) => `          <article class="suite-card card-lift">
            <p class="suite-question">${esc(c.question)}</p>
            <p class="suite-tag">${esc(c.tag)}</p>
            <h3 class="suite-name">${esc(c.name)}</h3>
            <p class="suite-promise">${esc(c.promise)}</p>
            <ul class="suite-benefits">
${c.benefits.map((b) => `              <li>${esc(b)}</li>`).join("\n")}
            </ul>
            <a class="btn btn-primary btn-jump" href="${esc(c.ctaHref)}">${esc(c.ctaLabel)}</a>
          </article>`
    )
    .join("\n");

  return `      <!-- TWO LANES — the peak of the page -->
      <section class="section section-dark band-peak reveal" id="products">
        <div class="brand-accent" aria-hidden="true">
          <img src="assets/brand/logo.png" alt="" width="1008" height="850" />
        </div>
        <p class="eyebrow">${esc(d.eyebrow)}</p>
        <h2 class="headline headline-lavender">
          ${rich(d.headline)}
        </h2>
        <p class="lead centered">
          ${esc(d.lead)}
        </p>
        <div class="suite-grid">
${cards}
        </div>
        <p class="suite-footer">
          ${esc(d.footer)}
        </p>
      </section>`;
}

function goMammoth(d) {
  const features = d.features
    .map(
      (f) => `            <article class="feature card-lift">
              <h3>
                <img class="feature-icon" src="${esc(
                  f.icon
                )}" alt="" width="96" height="96" loading="lazy" aria-hidden="true" />
                <span>${esc(f.title)}</span>
              </h3>
              <p>
                ${esc(f.body)}
              </p>
            </article>`
    )
    .join("\n");

  return `      <!-- GO MAMMOTH -->
      <section class="section section-blue-dark reveal" id="go-mammoth">
        <div class="band-anchor">
          <p class="eyebrow">${esc(d.eyebrow)}</p>
          <h2 class="headline">
            ${rich(d.headline)}
          </h2>
          <p class="lead">
            ${esc(d.lead)}
          </p>
          <div class="feature-grid">
${features}
          </div>
          <a class="btn btn-primary centered-btn" href="${P.CTA_HREF}"
            >${esc(d.ctaLabel)}</a
          >
        </div>
      </section>`;
}

function rapidDashboard(d) {
  const checks = d.checks.map((c) => `                  <li>${esc(c)}</li>`).join("\n");
  const kpis = d.demo.kpis
    .map((k) => {
      const attrs = [
        `data-rd-count="${esc(k.value)}"`,
        k.prefix ? `data-rd-prefix="${esc(k.prefix)}"` : "",
        k.suffix ? `data-rd-suffix="${esc(k.suffix)}"` : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `                      <div class="rd-kpi">
                        <b ${attrs}>${esc(k.prefix)}${esc(k.value)}${esc(k.suffix)}</b>
                        <span>${esc(k.label)}</span>
                      </div>`;
    })
    .join("\n");
  const bars = d.demo.bars
    .map(
      (b, i) => `                      <li style="--w: ${Number(b.width)}%; --step: ${i + 1}">
                        <span class="rd-bar-name">${esc(b.name)}</span>
                        <span class="rd-bar-track"><i></i></span>
                        <span class="rd-bar-val">${esc(b.value)}</span>
                      </li>`
    )
    .join("\n");

  return `          <!-- RapidDashboard — featured solution -->
          <div class="signature-feature" id="rapiddashboard">
            <p class="eyebrow">${esc(d.eyebrow)}</p>
            <h3 class="signature-headline">${esc(d.headline)}</h3>
            <p class="lead">
              ${esc(d.lead)}
            </p>
            <div class="product-card card-lift">
              <div class="product-card-copy">
                <h3>${esc(d.cardTitle)}</h3>
                <p>
                  ${esc(d.cardBody)}
                </p>
                <ul class="check-list">
${checks}
                </ul>
                <div class="cta-row">
                  <a class="btn btn-primary" href="${P.CTA_HREF}">${esc(d.ctaLabel)}</a>
                  <a
                    class="btn btn-ghost"
                    href="${esc(d.secondaryHref)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    >${esc(d.secondaryLabel)}</a
                  >
                </div>
              </div>
              <!-- An illustration of the mechanic, not a screenshot: the
                   question types itself, then the answer builds. Figures are
                   representative, and every bar is labelled so the ranking
                   never rides on colour alone. One measure across jobs, so the
                   ramp is a single hue stepped by magnitude, not a set of
                   different colours. -->
              <div class="product-card-visual" aria-hidden="true">
                <div class="rd-demo" data-rd-demo>
                  <div class="rd-chrome">
                    <span class="rd-dot"></span><span class="rd-dot"></span><span class="rd-dot"></span>
                    <span class="rd-chrome-label">RapidDashboard</span>
                  </div>

                  <div class="rd-ask">
                    <span class="mock-label">You</span>
                    <p class="rd-question">
                      <span data-rd-type>${esc(d.demo.question)}</span
                      ><i class="rd-caret"></i>
                    </p>
                  </div>

                  <div class="rd-answer">
                    <div class="rd-kpis">
${kpis}
                    </div>

                    <ul class="rd-bars">
${bars}
                    </ul>

                    <p class="rd-foot">${esc(d.demo.footnote)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
}

function mammothIQ(d, rd) {
  const features = d.features
    .map(
      (f) => `            <article class="feature card-lift">
              <h3>${esc(f.title)}</h3>
              <p>
                ${esc(f.body)}
              </p>
            </article>`
    )
    .join("\n");

  return `      <!-- MAMMOTHIQ -->
      <section class="section section-dark reveal" id="mammothiq">
        <div class="band-anchor">
          <p class="eyebrow">${esc(d.eyebrow)}</p>
          <h2 class="headline headline-lavender">
            ${rich(d.headline)}
          </h2>
          <p class="lead">
            ${esc(d.lead)}
          </p>
          <div class="feature-grid feature-grid--iq">
${features}
          </div>

${rapidDashboard(rd)}
        </div>
      </section>`;
}

/**
 * The landing card gets the first sentence of a case study's subtitle, not the
 * whole thing. The subtitles in projects.json run 90 to 310 characters because
 * they are written for the work index, where there is room; dropped onto the
 * landing grid unabridged they turn four cards into four different heights and
 * bury the point. The first sentence is the teaser in every one of them, which
 * is how these cards were hand-written before the grid became data-driven.
 */
function teaser(s) {
  const m = String(s || "").match(/^.*?[.!?](?=\s+[A-Z])/);
  return m ? m[0] : String(s || "");
}

function work(d, cases) {
  // Systems work only; the creative cases have their own page, and the teaser
  // below points at it.
  const shown = cases
    .filter((c) => c.department !== "creative")
    .slice(0, d.count || 4);

  const cards = shown
    .map((c) => {
      const t = P.thumbFor(c);
      const clip = P.hoverClipFor(c);
      return `            <a class="work-card card-lift${clip ? " has-clip" : ""}" href="work/${esc(
        c.slug
      )}.html"${clip ? ` data-clip="${esc(clip)}"` : ""}>
              <span class="work-card-media">
                <img class="work-card-thumb${
                  t.contain ? " work-card-thumb--contain" : ""
                }" src="${esc(t.src)}" alt="${esc(
        t.alt
      )}" width="800" height="600" loading="lazy" />
              </span>
              <span class="work-card-meta">
                <span class="work-card-year">${esc(c.year)}</span>
                <span class="work-card-cat">${esc(c.category)}</span>
              </span>
              <span class="work-card-title">${esc(c.title)}</span>
              <span class="work-card-sub">${esc(teaser(c.subtitle))}</span>
            </a>`;
    })
    .join("\n");

  const tags = d.creativeTeaser.tags.map((t) => `<span>${esc(t)}</span>`).join("");

  return `      <!-- WORK — systems and brand work in one band. Cards come from
           content/projects.json, the same source as the work index. -->
      <section class="section section-charcoal reveal" id="work">
        <div class="band-anchor">
          <p class="eyebrow">${esc(d.eyebrow)}</p>
          <h2 class="headline">${esc(d.headline)}</h2>
          <div class="work-grid">
${cards}
          </div>

          <div class="creative-teaser" id="creative">
            <div>
              <p class="creative-kicker">${esc(d.creativeTeaser.kicker)}</p>
              <h3 class="creative-teaser-name">
                <span class="jolly-word" aria-label="Jolly"
                  ><span>J</span><span>o</span><span>l</span><span>l</span><span>y</span></span
                >
                Creative Department
              </h3>
              <div class="creative-teaser-tags">
                ${tags}
              </div>
              <p>
                ${esc(d.creativeTeaser.body)}
              </p>
              <a class="btn btn-ghost" href="creative.html">${esc(d.creativeTeaser.ctaLabel)}</a>
            </div>
          </div>
        </div>
      </section>`;
}

// Not named process(). A module-scope `function process` shadows Node's global
// process object, which turns every process.exit in this file into a
// TypeError -- so the build dies with a confusing stack trace instead of the
// error it was trying to report.
function processBand(d) {
  const steps = d.steps
    .map(
      (s) => `              <li>
                <strong>${esc(s.name)}</strong> ${esc(s.body)}
              </li>`
    )
    .join("\n");

  return `      <!-- PROCESS + LOCAL, merged into one band -->
      <section class="section section-blue reveal" id="process">
        <div class="band-anchor process-local">
          <div class="process-col">
            <p class="eyebrow">${esc(d.eyebrow)}</p>
            <h2 class="headline">${esc(d.headline)}</h2>
            <ol class="steps">
${steps}
            </ol>
          </div>
          <aside class="local-note">
            <div class="local-media">
              <video
                autoplay
                muted
                loop
                playsinline
                preload="metadata"
                poster="${esc(d.local.videoPoster)}"
                width="720"
                height="1280"
                aria-label="${esc(d.local.videoLabel)}"
              >
                <source src="${esc(d.local.videoSrc)}" type="video/mp4" />
              </video>
            </div>
            <div class="local-copy">
              <h3>${esc(d.local.headline)}</h3>
              <p>
                ${esc(d.local.body)}
              </p>
            </div>
          </aside>
        </div>
      </section>`;
}

function founder(d) {
  const prose = d.prose
    .map(
      (p) => `              <p>
                ${esc(p)}
              </p>`
    )
    .join("\n");

  return `      <!-- FOUNDER -->
      <section class="section section-dark reveal" id="about">
        <p class="eyebrow">${esc(d.eyebrow)}</p>
        <div class="founder-block">
          <div class="founder-photo">
            <img
              src="${esc(d.photo)}"
              alt="${esc(d.photoAlt)}"
              width="1800"
              height="1200"
              loading="lazy"
            />
          </div>
          <div class="founder-copy">
            <h2 class="headline headline-lavender founder-headline">
              ${esc(d.headline)}
            </h2>
            <p class="founder-name">
              ${esc(d.name)}
              <span class="founder-credential">${esc(d.credential)}</span>
            </p>
            <div class="founder-prose">
${prose}
            </div>
            <a class="btn btn-primary" href="${P.CTA_HREF}">${esc(d.ctaLabel)}</a>
          </div>
        </div>
      </section>`;
}

function proof(d) {
  const shots = d.shots
    .map(
      (s) => `            <figure class="shot">
              <img src="${esc(s.src)}" alt="${esc(s.alt)}" width="${Number(
        s.width
      )}" height="${Number(s.height)}" loading="lazy" />
              <figcaption>${esc(s.who)} <span>${esc(s.what)}</span></figcaption>
            </figure>`
    )
    .join("\n");

  return `      <!-- SOCIAL PROOF — sits next to the ask, where proof does its work.
           The headline summarises the outcome; the screenshots evidence it.
           Deliberately not restating the quote in type, which just duplicated
           the first screenshot. -->
      <section class="section section-proof reveal" id="proof">
        <div class="band-anchor">
          <p class="eyebrow">${esc(d.eyebrow)}</p>
          <h2 class="headline">
            ${rich(d.headline)}
          </h2>
          <p class="proof-note">
            ${esc(d.note)}
          </p>

          <div class="shot-rail" role="group" aria-label="Client messages">
${shots}
          </div>
        </div>
      </section>`;
}

function faq(d) {
  const items = d.items
    .map(
      (i) => `            <details class="faq-item">
              <summary>${esc(i.q)}</summary>
              <div class="faq-body">
                <p>
                  ${esc(i.a)}
                </p>
              </div>
            </details>`
    )
    .join("\n");

  return `      <!-- FAQ — sits immediately before the CTA so it answers the last
           objections at the decision point. -->
      <section class="section section-blue reveal" id="faq">
        <div class="band-anchor">
          <p class="eyebrow">${esc(d.eyebrow)}</p>
          <h2 class="headline">${esc(d.headline)}</h2>
          <div class="faq-grid">
${items}
          </div>
        </div>
      </section>`;
}

function contact(d) {
  return `      <!-- CTA -->
      <section class="section band-photo band-photo--center band-peak reveal" id="contact">
        <div
          class="band-photo-bg"
          style="background-image: url('${esc(d.background)}')"
          aria-hidden="true"
        ></div>
        <!-- The one place the hammer metaphor is said out loud. It is the
             language the CTAs already speak through the cursor and the nail,
             so it lands here and is not repeated at every other button. -->
        <p class="cta-prompt">${esc(d.prompt)}</p>
        <h2 class="headline">${esc(d.headline)}</h2>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="${P.CTA_HREF}">${esc(P.CTA_LABEL)}</a>
          <a
            class="btn btn-ghost btn-lg"
            href="${esc(d.secondaryHref)}"
            target="_blank"
            rel="noopener noreferrer"
            >${esc(d.secondaryLabel)}</a
          >
        </div>
      </section>`;
}

/* --------------------------------------------------------------------- build */

function landingPage(d, cases) {
  return `${head(d.seo)}
${header()}
    <main>
${hero(d.hero)}
${problem(d.problem)}

${jolly(d.jolly)}

${products(d.products)}

${goMammoth(d.goMammoth)}

${mammothIQ(d.mammothIQ, d.rapidDashboard)}

${work(d.work, cases)}

${processBand(d.process)}

${founder(d.founder)}

${proof(d.proof)}

${faq(d.faq)}

${contact(d.contact)}
    </main>

${footer()}`;
}

function readJson(file, label) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${path.relative(ROOT, file)}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`${label} is not valid JSON: ${e.message}`);
    process.exit(1);
  }
}

/**
 * Fail on a missing section with the section's name rather than with whatever
 * TypeError the template happens to hit first. A deploy that dies is fine --
 * Netlify keeps serving the last good build -- but it has to say what to fix.
 */
const REQUIRED = [
  "seo",
  "hero",
  "problem",
  "jolly",
  "products",
  "goMammoth",
  "mammothIQ",
  "rapidDashboard",
  "work",
  "process",
  "founder",
  "proof",
  "faq",
  "contact",
];

function validate(d) {
  const missing = REQUIRED.filter((k) => !d || !d[k]);
  if (missing.length) {
    console.error(
      `content/landing.json is missing: ${missing.join(", ")}\n` +
        "Every section is required. Restore it in /admin or in the file."
    );
    process.exit(1);
  }
}

function build() {
  const d = readJson(LANDING, "content/landing.json");
  validate(d);
  const cases = readJson(PROJECTS, "content/projects.json");
  if (!Array.isArray(cases) || !cases.length) {
    console.error("content/projects.json has no case studies");
    process.exit(1);
  }
  // Newest first, matching the work index.
  cases.sort((a, b) => String(b.year).localeCompare(String(a.year)));

  fs.writeFileSync(path.join(ROOT, "index.html"), landingPage(d, cases), "utf8");
  console.log("  index.html");
}

if (require.main === module) build();

module.exports = { build };
