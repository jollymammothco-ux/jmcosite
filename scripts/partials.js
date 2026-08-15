#!/usr/bin/env node
/**
 * Shared between the two builders.
 *
 * Anything that has to agree across every page in the site lives here and
 * nowhere else. The asset versions are the main event: they were previously
 * duplicated into build-projects.js and hand-edited into three more files on
 * every CSS or JS change, which is exactly the kind of chore that eventually
 * ships a stale stylesheet to somebody's browser.
 *
 * Bump CSS_V when styles.css changes, JS_V when any of the scripts do, then
 * run `node scripts/build.js`. Every page picks it up.
 */

"use strict";

const CSS_V = "55";
const JS_V = "18";
const BOOT_V = "2";
const MAMMOTH_V = "2";
const MEASURE_V = "2";

/** HTML-escape. Everything author-supplied goes through this. */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escape, then expand the two authoring markers. Order matters: escaping
 * first means content can never inject markup, and the markers are added
 * afterwards from a fixed template rather than passed through.
 *
 *   [[text]]   the yellow accent run inside a headline
 *   {{jolly}}  the rainbow-lettered wordmark
 */
function rich(s) {
  return esc(s)
    .replace(/\[\[(.+?)\]\]/g, '<span class="accent-yellow">$1</span>')
    .replace(
      /\{\{jolly\}\}/g,
      '<span class="jolly-word" aria-label="Jolly"><span>J</span><span>o</span><span>l</span><span>l</span><span>y</span></span>'
    );
}

/** Asset and page links differ by directory depth: work/*.html needs "../". */
const up = (depth) => "../".repeat(depth);

/**
 * The navigation, in one place. Each builder renders it in its own dialect:
 * the landing page points at its own anchors so the links scroll, while every
 * other page has to travel to index.html first.
 */
const NAV_LINKS = [
  { hash: "#go-mammoth", page: "index.html#go-mammoth", label: "Go Mammoth", key: "go-mammoth" },
  { hash: "#mammothiq", page: "index.html#mammothiq", label: "MammothIQ", key: "mammothiq" },
  { hash: "projects.html", page: "projects.html", label: "Work", key: "work" },
  { hash: "creative.html", page: "creative.html", label: "Creative", key: "creative" },
  { hash: "about.html", page: "about.html", label: "About", key: "about" },
];

const FOOTER_LINKS = [
  { hash: "#go-mammoth", page: "index.html#go-mammoth", label: "go mammoth" },
  { hash: "#mammothiq", page: "index.html#mammothiq", label: "mammothiq" },
  { hash: "projects.html", page: "projects.html", label: "work" },
  { hash: "about.html", page: "about.html", label: "about" },
  { hash: "creative.html", page: "creative.html", label: "creative" },
  { hash: "questionnaire.html", page: "questionnaire.html", label: "book a strategy call" },
];

const CTA_LABEL = "Book a Strategy Call";
const CTA_HREF = "questionnaire.html";

/* ------------------------------------------------------- case study helpers */
/* Pure data, no markup: the work card appears on both the landing page and the
   work index, and they must agree on which image and which clip a case gets
   even though they indent their markup differently. */

/** Poster/thumbnail used on a work card. */
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

module.exports = {
  CSS_V,
  JS_V,
  BOOT_V,
  MAMMOTH_V,
  MEASURE_V,
  esc,
  rich,
  up,
  NAV_LINKS,
  FOOTER_LINKS,
  CTA_LABEL,
  CTA_HREF,
  thumbFor,
  hoverClipFor,
};
