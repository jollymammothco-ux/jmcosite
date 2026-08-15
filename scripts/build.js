#!/usr/bin/env node
/**
 * The build. This is what Netlify runs, and what to run locally after editing
 * anything in content/ or in scripts/.
 *
 *   node scripts/build.js
 *
 * Emits:
 *   index.html          from content/landing.json  (+ content/projects.json)
 *   work/<slug>.html    from content/projects.json
 *   projects.html       from content/projects.json
 *   creative.html       from content/projects.json
 *   sitemap.xml
 *
 * Ordering matters only in that the landing page reads the case studies too,
 * so both builders share content/projects.json as the single source of truth
 * for work. Neither writes the other's files.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const P = require("./partials");

const ROOT = path.join(__dirname, "..");

/**
 * about.html and questionnaire.html are still authored by hand, so nothing
 * regenerates their ?v= cache-busters. Left alone they would drift the moment
 * anyone bumped a version in partials.js, and a stale stylesheet on two pages
 * is exactly the kind of bug nobody notices until a client does. Rewrite them
 * from the same constants the generated pages use.
 */
const VERSIONED = {
  "styles.css": P.CSS_V,
  "main.js": P.JS_V,
  "boot.js": P.BOOT_V,
  "mammoth.js": P.MAMMOTH_V,
  "measure.js": P.MEASURE_V,
};

function syncAssetVersions() {
  for (const page of ["about.html", "questionnaire.html"]) {
    const file = path.join(ROOT, page);
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, "utf8");
    let after = before;
    for (const [asset, v] of Object.entries(VERSIONED)) {
      const re = new RegExp(`(${asset.replace(".", "\\.")})\\?v=\\d+`, "g");
      after = after.replace(re, `$1?v=${v}`);
    }
    if (after !== before) {
      fs.writeFileSync(file, after, "utf8");
      console.log(`  ${page} (asset versions)`);
    }
  }
}

console.log("Building Jolly Mammoth...");

require("./build-landing").build();
require("./build-projects").build();
syncAssetVersions();

console.log("Done.");
