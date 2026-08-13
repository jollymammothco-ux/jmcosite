/* Jolly Mammoth — the herd assembles.
 *
 * Samples the brand mark's alpha channel into a point cloud, then springs a
 * few thousand particles into that shape. The mark is a single-stroke line
 * drawing, so the particles trace it rather than filling a blob.
 *
 * Choreography:
 *   1. Particles stream in from the left in a wave, staggered by target x, so
 *      the mammoth draws itself trunk-to-tail the way you read it.
 *   2. Idle: each particle breathes on its own sine phase.
 *   3. Pointer pushes particles aside; they spring back.
 *   4. Scrolling past the hero loosens the herd.
 *
 * Bails out to the static <img> fallback if canvas is unavailable, and
 * renders one settled frame (no motion) under prefers-reduced-motion.
 */
(function () {
  "use strict";

  var host = document.querySelector("[data-mammoth]");
  if (!host) return;

  var canvas = host.querySelector("canvas");
  var fallback = host.querySelector(".mammoth-fallback");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Jolly palette, weighted so the pinks and mints lead and the brand orange
  // shows up as a spark rather than a wash.
  var COLORS = [
    "#9ef5e8", "#9ef5e8",
    "#ddd0f5", "#ddd0f5",
    "#ffd98a",
    "#b8e4ff", "#b8e4ff",
    "#ffc8e0", "#ffc8e0",
    "#ff8f5f"
  ];

  var particles = [];
  var pointer = { x: -9999, y: -9999, active: false };
  var dpr = 1;
  var W = 0;
  var H = 0;
  var raf = null;
  var running = false;
  var startedAt = 0;
  var settled = false;
  var loosen = 0; // 0 = tight formation, 1 = drifting apart

  function targetCount() {
    var area = W * H;
    if (area < 240000) return 1100; // small phones
    if (area < 600000) return 2000;
    return 3200;
  }

  /* Read the mark's alpha channel and return candidate points in 0..1 space. */
  function sampleMark(img) {
    var maxSide = 320; // sampling resolution, not display resolution
    var scale = Math.min(maxSide / img.width, maxSide / img.height);
    var w = Math.max(1, Math.round(img.width * scale));
    var h = Math.max(1, Math.round(img.height * scale));

    var off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    var octx = off.getContext("2d", { willReadFrequently: true });
    octx.drawImage(img, 0, 0, w, h);

    var data;
    try {
      data = octx.getImageData(0, 0, w, h).data;
    } catch (e) {
      return null; // tainted canvas; caller falls back to the static image
    }

    var raw = [];
    var step = 2;
    var minX = w, maxX = 0, minY = h, maxY = 0;

    for (var y = 0; y < h; y += step) {
      for (var x = 0; x < w; x += step) {
        var i = (y * w + x) * 4;
        if (data[i + 3] > 130) {
          raw.push([x, y]);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!raw.length) return null;

    // Normalise against the ink's bounding box, not the file's canvas, so the
    // mammoth fills the stage instead of floating in the PNG's own padding.
    var bw = Math.max(1, maxX - minX);
    var bh = Math.max(1, maxY - minY);

    // Jitter each sample off the sampling lattice. Without this the grid is
    // plainly visible and the whole thing reads mechanical rather than alive.
    var jitter = step / w;
    var pts = [];
    for (var k = 0; k < raw.length; k++) {
      pts.push({
        nx: (raw[k][0] - minX) / bw + (Math.random() - 0.5) * jitter * 1.6,
        ny: (raw[k][1] - minY) / bh + (Math.random() - 0.5) * jitter * 1.6
      });
    }
    pts.aspect = bw / bh;
    return pts;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function build(points) {
    var want = targetCount();
    var pool = points;
    if (pool.length > want) {
      pool = shuffle(pool.slice()).slice(0, want);
    }

    // Fit the ink's own aspect into the stage with a little breathing room.
    var markAspect = points.aspect || 1008 / 850;
    var pad = 0.88;
    var drawW = W * pad;
    var drawH = drawW / markAspect;
    if (drawH > H * pad) {
      drawH = H * pad;
      drawW = drawH * markAspect;
    }
    var ox = (W - drawW) / 2;
    var oy = (H - drawH) / 2;

    particles = pool.map(function (p) {
      var tx = ox + p.nx * drawW;
      var ty = oy + p.ny * drawH;
      return {
        // Stream in from the left, staggered by how far right the target is.
        x: reduced ? tx : -40 - Math.random() * W * 0.5,
        y: reduced ? ty : ty + (Math.random() - 0.5) * H * 0.5,
        tx: tx,
        ty: ty,
        vx: 0,
        vy: 0,
        delay: reduced ? 0 : (tx / W) * 620 + Math.random() * 260,
        // A minority of larger "sparks" keeps the field from reading as an
        // even dither and lets the colour actually register at this scale.
        size: Math.random() < 0.18 ? 2.6 : 1.5,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        alpha: 0.62 + Math.random() * 0.38,
        phase: Math.random() * Math.PI * 2,
        drift: 0.6 + Math.random() * 0.9
      };
    });
  }

  function resize() {
    var rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function frame(now) {
    if (!running) return;
    if (!startedAt) startedAt = now;
    var elapsed = now - startedAt;

    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    var stillMoving = false;
    var t = now * 0.001;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      if (elapsed < p.delay) {
        stillMoving = true;
        continue;
      }

      // Breathing drift, plus extra spread as the hero scrolls away.
      var wobble = settled ? Math.sin(t * p.drift + p.phase) * 1.6 : 0;
      var spread = loosen * 42;
      var gx = p.tx + wobble + (p.tx - W / 2) * loosen * 0.16 + (spread ? Math.sin(p.phase) * spread * 0.4 : 0);
      var gy = p.ty + wobble * 0.7 + (p.ty - H / 2) * loosen * 0.16;

      var dx = gx - p.x;
      var dy = gy - p.y;

      // Pointer repulsion with smooth falloff.
      if (pointer.active) {
        var px = p.x - pointer.x;
        var py = p.y - pointer.y;
        var d2 = px * px + py * py;
        var R = 118;
        if (d2 < R * R && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var force = (1 - d / R);
          force = force * force * 26;
          dx += (px / d) * force;
          dy += (py / d) * force;
        }
      }

      p.vx = (p.vx + dx * 0.055) * 0.82;
      p.vy = (p.vy + dy * 0.055) * 0.82;
      p.x += p.vx;
      p.y += p.vy;

      if (!stillMoving && (Math.abs(p.vx) > 0.05 || Math.abs(p.vy) > 0.05)) {
        stillMoving = true;
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    if (!settled && elapsed > 1500 && !stillMoving) settled = true;

    if (reduced) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || !particles.length) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function init(points) {
    if (!resize()) return;
    build(points);
    host.classList.add("is-live");
    if (fallback) fallback.setAttribute("hidden", "");

    if (reduced) {
      // One settled frame, no animation.
      startedAt = performance.now() - 5000;
      settled = true;
      running = true;
      frame(performance.now());
      return;
    }

    start();

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var wasRunning = running;
        stop();
        if (resize()) {
          build(points);
          startedAt = performance.now() - 4000; // skip the entrance on resize
          settled = true;
          if (wasRunning) start();
        }
      }, 180);
    });

    host.addEventListener("pointermove", function (e) {
      var r = host.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
    });
    host.addEventListener("pointerleave", function () {
      pointer.active = false;
      pointer.x = pointer.y = -9999;
    });

    // Pause when off-screen or the tab is hidden.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0 }).observe(host);
    }
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });

    // Loosen the herd as the hero scrolls out of view.
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var r = host.getBoundingClientRect();
        var progress = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
        loosen = progress;
        ticking = false;
      });
    }, { passive: true });
  }

  var img = new Image();
  img.decoding = "async";
  img.onload = function () {
    var pts = sampleMark(img);
    if (pts && pts.length > 200) init(pts);
  };
  img.onerror = function () {
    /* static fallback image stays visible */
  };
  img.src = host.getAttribute("data-mammoth") || "assets/brand/logo.png";
})();
