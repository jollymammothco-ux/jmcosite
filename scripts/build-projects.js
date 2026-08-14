#!/usr/bin/env node
/**
 * Builds the work pages from content/projects.json.
 *
 *   node scripts/build-projects.js
 *
 * Emits:
 *   work/<slug>.html   one editorial case study page each
 *   projects.html      the index grid linking to them
 *
 * This runs as the Netlify build command, so anything Decap CMS writes to
 * content/projects.json is published as real static HTML. That matters:
 * case studies are the pages a consultancy actually gets found and hired on,
 * so they have to be server-rendered and indexable, not built client-side.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "content", "projects.json");
const WORK_DIR = path.join(ROOT, "work");

const CSS_V = "45";
const JS_V = "11";

/* ------------------------------------------------------------------ utils */

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Asset and page links differ by directory depth: work/*.html needs "../". */
const up = (depth) => "../".repeat(depth);

/* --------------------------------------------------------------- partials */

function head(opts, depth) {
  const u = up(depth);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${esc(opts.description)}" />
    <title>${esc(opts.title)}</title>
    <link rel="canonical" href="${esc(opts.canonical)}" />
    <meta property="og:type" content="${opts.ogType || "website"}" />
    <meta property="og:site_name" content="Jolly Mammoth Co" />
    <meta property="og:title" content="${esc(opts.title)}" />
    <meta property="og:description" content="${esc(opts.description)}" />
    <meta property="og:image" content="${esc(opts.ogImage)}" />
    <meta property="og:url" content="${esc(opts.canonical)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(opts.title)}" />
    <meta name="twitter:description" content="${esc(opts.description)}" />
    <meta name="twitter:image" content="${esc(opts.ogImage)}" />
${opts.jsonLd ? `    <script type="application/ld+json">\n${opts.jsonLd}\n    </script>\n` : ""}    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
      rel="stylesheet"
    />
    <script src="${u}boot.js?v=2"></script>
    <link rel="stylesheet" href="${u}styles.css?v=${CSS_V}" />
    <link rel="icon" href="${u}assets/brand/logo.png" type="image/png" />
    <link rel="apple-touch-icon" href="${u}assets/brand/logo.png" />
  </head>`;
}

function header(depth, current) {
  const u = up(depth);
  const mark = (name) => (current === name ? ' aria-current="page"' : "");
  const links = [
    [`${u}index.html#go-mammoth`, "Go Mammoth", "go-mammoth"],
    [`${u}index.html#mammothiq`, "MammothIQ", "mammothiq"],
    [`${u}projects.html`, "Work", "work"],
    [`${u}creative.html`, "Creative", "creative"],
    [`${u}about.html`, "About", "about"],
  ];
  const nav = links
    .map(([href, label, key]) => `        <a href="${href}"${mark(key)}>${label}</a>`)
    .join("\n");
  const mobile = links
    .map(([href, label]) => `      <a href="${href}">${label}</a>`)
    .join("\n");

  return `  <body>
    <div class="rail" data-rail aria-hidden="true">
      <canvas class="rail__canvas"></canvas>
    </div>

    <header class="site-header" id="top">
      <a href="${u}index.html" class="logo" aria-label="Jolly Mammoth home">
        <img
          src="${u}assets/brand/logo.png"
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
      <a class="btn btn-primary btn-header" href="${u}questionnaire.html">Book a Strategy Call</a>
      <button class="nav-toggle" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span>
      </button>
    </header>

    <div class="mobile-nav" hidden>
${mobile}
      <a href="${u}questionnaire.html">Book a Strategy Call</a>
    </div>
`;
}

function footer(depth) {
  const u = up(depth);
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
        <a href="${u}index.html#go-mammoth">go mammoth</a>
        <a href="${u}index.html#mammothiq">mammothiq</a>
        <a href="${u}projects.html">work</a>
        <a href="${u}creative.html">creative</a>
        <a href="${u}about.html">about</a>
        <a href="${u}questionnaire.html">book a strategy call</a>
      </nav>
    </footer>

    <a class="sticky-cta" href="${u}questionnaire.html">Book a Call</a>

    <script src="${u}main.js?v=${JS_V}"></script>
    <script src="${u}measure.js?v=2" defer></script>
  </body>
</html>
`;
}

/* ------------------------------------------------------------------ media */

function mediaFigure(m, depth, opts) {
  const u = up(depth);
  const cls = ["case-media"];
  if (m.variant) cls.push(`case-media--${m.variant}`);
  if (opts && opts.lead) cls.push("case-media--lead");
  const cap = m.caption
    ? `\n        <figcaption>${esc(m.caption)}</figcaption>`
    : "";

  if (m.type === "video") {
    return `      <figure class="${cls.join(" ")}">
        <video controls playsinline preload="metadata"${
          m.poster ? ` poster="${u}${esc(m.poster)}"` : ""
        }>
          <source src="${u}${esc(m.src)}" type="video/mp4" />
        </video>${cap}
      </figure>`;
  }
  return `      <figure class="${cls.join(" ")}">
        <img src="${u}${esc(m.src)}" alt="${esc(m.alt || "")}" loading="lazy" />${cap}
      </figure>`;
}

/** Poster/thumbnail used on the index card. */
function thumbFor(c) {
  const img = c.media.find((m) => m.type === "image");
  if (img) return { src: img.src, alt: img.alt || c.title, contain: img.variant === "logo" };
  const vid = c.media.find((m) => m.type === "video" && m.poster);
  if (vid) return { src: vid.poster, alt: c.title, contain: false };
  return { src: "assets/brand/logo.png", alt: c.title, contain: true };
}

/** A short clip to play on hover, if the case has one. */
function hoverClipFor(c) {
  const vid = c.media.find((m) => m.type === "video" && m.src);
  return vid ? vid.src : null;
}

/* --------------------------------------------------------- case study page */

function casePage(c, prev, next) {
  const depth = 1;
  const u = up(depth);
  const canonical = `https://jollymammoth.co/work/${c.slug}.html`;
  const thumb = thumbFor(c);

  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: c.title,
      about: c.category,
      dateCreated: c.year,
      abstract: c.subtitle,
      url: canonical,
      creator: {
        "@type": "Organization",
        name: "Jolly Mammoth LLC",
        url: "https://jollymammoth.co/",
      },
    },
    null,
    2
  )
    .split("\n")
    .map((l) => "      " + l)
    .join("\n");

  const leadMedia = c.media.length ? mediaFigure(c.media[0], depth, { lead: true }) : "";
  const restMedia = c.media
    .slice(1)
    .map((m) => mediaFigure(m, depth))
    .join("\n");

  const metaRows = Object.entries(c.meta)
    .map(
      ([k, v]) => `        <div>
          <dt>${esc(k)}</dt>
          <dd>${esc(v)}</dd>
        </div>`
    )
    .join("\n");

  const paras = (arr) =>
    arr.map((p) => `          <p>${esc(p)}</p>`).join("\n");

  const nav = [];
  if (prev)
    nav.push(
      `        <a class="case-nav-link case-nav-link--prev" href="${esc(prev.slug)}.html">
          <span class="case-nav-dir">Previous</span>
          <span class="case-nav-title">${esc(prev.title)}</span>
        </a>`
    );
  if (next)
    nav.push(
      `        <a class="case-nav-link case-nav-link--next" href="${esc(next.slug)}.html">
          <span class="case-nav-dir">Next</span>
          <span class="case-nav-title">${esc(next.title)}</span>
        </a>`
    );

  return `${head(
    {
      title: `${c.title} — ${c.category} — Jolly Mammoth Co`,
      description: c.subtitle,
      canonical,
      ogImage: `https://jollymammoth.co/${thumb.src}`,
      ogType: "article",
      jsonLd,
    },
    depth
  )}
${header(depth, "work")}
    <main class="page-case">
      <article>
        <header class="case-hero">
          <div class="case-hero-inner">
            <p class="eyebrow">
              <a href="${u}projects.html">Work</a> · ${esc(c.category)}
            </p>
            <h1 class="headline">${esc(c.title)}</h1>
            <p class="case-lede">${esc(c.subtitle)}</p>
            <dl class="case-meta">
${metaRows}
            </dl>
          </div>
        </header>

${leadMedia ? `        <div class="case-lead-media reveal">\n${leadMedia}\n        </div>\n` : ""}
        <section class="case-section reveal">
          <h2 class="case-h">The problem</h2>
          <div class="case-prose">
${paras(c.problem)}
          </div>
        </section>

${restMedia ? `        <div class="case-gallery reveal">\n${restMedia}\n        </div>\n` : ""}
        <section class="case-section reveal">
          <h2 class="case-h">What we built</h2>
          <div class="case-prose">
${paras(c.solution)}
          </div>
        </section>

        <section class="section section-cta band-peak case-cta reveal">
          <p class="cta-prompt">want something like this?</p>
          <h2 class="headline">Let's build something that compounds.</h2>
          <div class="cta-row">
            <a class="btn btn-primary btn-lg" href="${u}questionnaire.html">Book a Strategy Call</a>
            <a class="btn btn-ghost btn-lg" href="${u}projects.html">See more work</a>
          </div>
        </section>
${
  nav.length
    ? `
        <nav class="case-nav" aria-label="More work">
${nav.join("\n")}
        </nav>
`
    : ""
}      </article>
    </main>

${footer(depth)}`;
}

/* --------------------------------------------------------------- the index */

function indexPage(cases) {
  const depth = 0;

  const cards = cases
    .map((c) => {
      const t = thumbFor(c);
      const clip = hoverClipFor(c);
      return `          <a class="work-card card-lift${
        clip ? " has-clip" : ""
      }" href="work/${esc(c.slug)}.html"${clip ? ` data-clip="${esc(clip)}"` : ""}>
            <span class="work-card-media">
              <img
                class="work-card-thumb${t.contain ? " work-card-thumb--contain" : ""}"
                src="${esc(t.src)}"
                alt="${esc(t.alt)}"
                width="800"
                height="600"
                loading="lazy"
              />
            </span>
            <span class="work-card-meta">
              <span class="work-card-year">${esc(c.year)}</span>
              <span class="work-card-cat">${esc(c.category)}</span>
            </span>
            <span class="work-card-title">${esc(c.title)}</span>
            <span class="work-card-sub">${esc(c.subtitle)}</span>
          </a>`;
    })
    .join("\n");

  return `${head(
    {
      title: "Work — Jolly Mammoth Co",
      description:
        "Case studies from Jolly Mammoth: AI systems, custom CRMs, lead generation, and brand work for Wisconsin contractors and service businesses.",
      canonical: "https://jollymammoth.co/projects.html",
      ogImage: "https://jollymammoth.co/assets/brand/og-share.jpg",
    },
    depth
  )}
${header(depth, "work")}
    <main class="page-work">
      <section class="section band-peak" id="case-studies">
        <div class="band-anchor">
          <p class="eyebrow">Selected work</p>
          <h1 class="headline">What we've built.</h1>
          <p class="lead">
            Systems, brands, and the occasional website. Every one of these started
            with a conversation about how the business actually runs.
          </p>
          <div class="work-grid">
${cards}
          </div>
        </div>
      </section>

      <section class="section section-cta band-peak reveal" id="contact">
        <p class="cta-prompt">want to work together?</p>
        <h2 class="headline">Let's build something that compounds.</h2>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="questionnaire.html">Book a Strategy Call</a>
        </div>
      </section>
    </main>

${footer(depth)}`;
}

/* ------------------------------------------- Jolly Creative Department page */

/**
 * The creative arm gets its own page and its own look. The main brand is
 * orange over slate because it sells systems to the trades; the Creative
 * Department runs on the Jolly rainbow because it sells brand and video.
 * Same company, different room.
 */
function creativePage(cases) {
  const depth = 0;
  const creative = cases.filter((c) => c.department === "creative");

  const cards = creative
    .map((c) => {
      const t = thumbFor(c);
      const clip = hoverClipFor(c);
      return `            <a class="work-card card-lift${clip ? " has-clip" : ""}" href="work/${esc(
        c.slug
      )}.html"${clip ? ` data-clip="${esc(clip)}"` : ""}>
              <span class="work-card-media">
                <img
                  class="work-card-thumb${t.contain ? " work-card-thumb--contain" : ""}"
                  src="${esc(t.src)}"
                  alt="${esc(t.alt)}"
                  width="800"
                  height="600"
                  loading="lazy"
                />
              </span>
              <span class="work-card-meta">
                <span class="work-card-year">${esc(c.year)}</span>
                <span class="work-card-cat">${esc(c.category)}</span>
              </span>
              <span class="work-card-title">${esc(c.title)}</span>
              <span class="work-card-sub">${esc(c.subtitle)}</span>
            </a>`;
    })
    .join("\n");

  return `${head(
    {
      title: "Jolly Creative Department — brand, video & content",
      description:
        "The creative arm of Jolly Mammoth. Brand identity, video production, and content for businesses that need to look as good as their work.",
      canonical: "https://jollymammoth.co/creative.html",
      ogImage: "https://jollymammoth.co/assets/brand/og-share.jpg",
    },
    depth
  )}
${header(depth, "creative")}
    <main class="page-creative">
      <section class="creative-hero">
        <div class="creative-hero-inner">
          <p class="creative-kicker">A department of Jolly Mammoth</p>
          <h1 class="creative-wordmark">
            <span class="jolly-word" aria-label="Jolly"
              ><span>J</span><span>o</span><span>l</span><span>l</span><span>y</span></span
            >
            <span class="creative-wordmark-rest">Creative<br />Department</span>
          </h1>
          <p class="creative-lede">
            Brand, video, and content for businesses that need to look as good as the
            work they do. Same shop as the systems side. Different room, different tools.
          </p>
          <div class="creative-services">
            <span>Brand identity</span>
            <span>Video production</span>
            <span>Photography</span>
            <span>Social content</span>
            <span>Websites</span>
            <span>Campaigns</span>
          </div>
        </div>
      </section>

      <section class="section band-peak reveal">
        <div class="band-anchor">
          <p class="eyebrow">Selected creative work</p>
          <h2 class="headline">Things we made.</h2>
          <div class="work-grid">
${cards}
          </div>
        </div>
      </section>

      <section class="section section-cta band-peak reveal">
        <p class="cta-prompt">need something made?</p>
        <h2 class="headline">Let's build the brand around the work.</h2>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="questionnaire.html">Book a Strategy Call</a>
          <a class="btn btn-ghost btn-lg" href="projects.html">See the systems side</a>
        </div>
      </section>
    </main>

${footer(depth)}`;
}

/* ------------------------------------------------------------------- build */

function build() {
  if (!fs.existsSync(DATA)) {
    console.error(`Missing ${path.relative(ROOT, DATA)}`);
    process.exit(1);
  }

  const cases = JSON.parse(fs.readFileSync(DATA, "utf8"));
  if (!Array.isArray(cases) || !cases.length) {
    console.error("content/projects.json has no case studies");
    process.exit(1);
  }

  // Newest first, so the index leads with recent work.
  cases.sort((a, b) => String(b.year).localeCompare(String(a.year)));

  fs.mkdirSync(WORK_DIR, { recursive: true });

  // Remove stale pages for case studies that were deleted from the data.
  const wanted = new Set(cases.map((c) => `${c.slug}.html`));
  for (const f of fs.readdirSync(WORK_DIR)) {
    if (f.endsWith(".html") && !wanted.has(f)) {
      fs.unlinkSync(path.join(WORK_DIR, f));
      console.log(`  removed stale work/${f}`);
    }
  }

  cases.forEach((c, i) => {
    const prev = i > 0 ? cases[i - 1] : null;
    const next = i < cases.length - 1 ? cases[i + 1] : null;
    const out = path.join(WORK_DIR, `${c.slug}.html`);
    fs.writeFileSync(out, casePage(c, prev, next), "utf8");
    console.log(`  work/${c.slug}.html`);
  });

  fs.writeFileSync(path.join(ROOT, "projects.html"), indexPage(cases), "utf8");
  console.log("  projects.html");

  fs.writeFileSync(path.join(ROOT, "creative.html"), creativePage(cases), "utf8");
  console.log("  creative.html");

  writeSitemap(cases);
  console.log("  sitemap.xml");

  console.log(`\nBuilt ${cases.length} case studies.`);
}

/**
 * The sitemap is generated here because this is the only place that knows
 * which case studies exist. Hand-maintaining it guarantees it goes stale the
 * first time a client is added through the CMS.
 */
function writeSitemap(cases) {
  const urls = [
    "https://jollymammoth.co/",
    "https://jollymammoth.co/about.html",
    "https://jollymammoth.co/projects.html",
    "https://jollymammoth.co/creative.html",
    ...cases.map((c) => `https://jollymammoth.co/work/${c.slug}.html`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${esc(u)}</loc>\n  </url>`).join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
}

build();
