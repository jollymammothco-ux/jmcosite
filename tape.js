/* Jolly Mammoth — reactive caution tape.
 *
 * A strung ribbon of hazard tape that sags, twists, and settles. Scrolling
 * blows it; pointing at it pushes it; it goes to sleep when it stops moving.
 *
 * The solver is the coupled-oscillator chain from the Speedy papel picado
 * banner, reimplemented because the geometry differs: papel picado is a row of
 * discrete flags that skew independently, tape is one continuous ribbon.
 *
 * Physics, per node:
 *   accel = coupling*(left - 2*self + right)   wave travelling along the tape
 *         - stiffness*self                     pull back toward flat
 *         - damping*velocity                   bleed energy
 *         + wind                               scroll-driven forcing
 * Damping ramps up near both anchors ("sponge") so waves are absorbed rather
 * than reflected.
 *
 * Rendering is canvas, not SVG, because what sells a twisting ribbon is
 * per-surface shading and stripes that live ON the surface. Three things do
 * the heavy lifting:
 *
 *   1. Shading from the surface normal. A stretch of tape rotating edge-on
 *      goes dark and then shows its back face. A flat fill at every angle is
 *      the single clearest tell that a ribbon is faked.
 *   2. Stripes in surface space, not screen space. Surface arc length
 *      accumulates as ds / |cos(twist)|, so where the tape turns edge-on more
 *      surface compresses into fewer pixels and the stripes bunch up. Pattern
 *      fills slide over the geometry instead, which reads as a mask.
 *   3. A smooth centreline. The solver gives ~46 nodes; those are resampled
 *      to ~220 render points so the silhouette has no visible kinks.
 *
 * Markup: <div class="tape" data-tape><canvas class="tape__canvas"></canvas></div>
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* --------------------------------------------------------------- solver */

  function Chain(opts) {
    this.count = opts.count;
    this.dt = opts.dt;
    this.stiffness = opts.stiffness;
    this.coupling = opts.coupling;
    this.theta = new Float32Array(opts.count);
    this.omega = new Float32Array(opts.count);
    this.damp = new Float32Array(opts.count);

    for (var i = 0; i < opts.count; i++) {
      var edge = Math.min(i, opts.count - 1 - i);
      var t = opts.spongeWidth > 0 ? Math.max(0, 1 - edge / opts.spongeWidth) : 0;
      this.damp[i] = opts.damping + opts.spongeDamping * t;
    }
  }

  Chain.prototype.step = function (wind) {
    var th = this.theta, om = this.omega, dp = this.damp;
    var n = this.count, k = this.coupling, s = this.stiffness, dt = this.dt;
    for (var i = 0; i < n; i++) {
      var l = i > 0 ? th[i - 1] : 0;
      var r = i < n - 1 ? th[i + 1] : 0;
      om[i] += (k * (l - 2 * th[i] + r) - s * th[i] - dp[i] * om[i] + wind) * dt;
    }
    for (var j = 0; j < n; j++) th[j] += om[j] * dt;
  };

  Chain.prototype.impulse = function (i, amt) {
    if (i >= 0 && i < this.count) this.omega[i] += amt;
  };

  Chain.prototype.energy = function () {
    var e = 0;
    for (var i = 0; i < this.count; i++) {
      e += this.omega[i] * this.omega[i] + this.stiffness * this.theta[i] * this.theta[i];
    }
    return e / this.count;
  };

  Chain.prototype.settle = function () {
    this.theta.fill(0);
    this.omega.fill(0);
  };

  /* -------------------------------------------------------------- renderer */

  function Ribbon(root, cfg) {
    this.root = root;
    this.canvas = root.querySelector(".tape__canvas");
    this.ctx = this.canvas.getContext("2d");
    this.cfg = cfg;
    this.M = cfg.samples;

    // Per-render-point buffers, allocated once.
    this.x = new Float32Array(this.M);
    this.cy = new Float32Array(this.M);
    this.hh = new Float32Array(this.M);
    this.cosT = new Float32Array(this.M);
    this.surf = new Float32Array(this.M); // arc length along the tape's SURFACE
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
  }

  Ribbon.prototype.measure = function () {
    var r = this.root.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return true;
  };

  /** Catmull-Rom style read of the solver's coarse nodes at fractional index. */
  function sampleTheta(theta, t) {
    var n = theta.length;
    var f = t * (n - 1);
    var i = Math.floor(f);
    var frac = f - i;
    var p0 = theta[Math.max(0, i - 1)];
    var p1 = theta[i];
    var p2 = theta[Math.min(n - 1, i + 1)];
    var p3 = theta[Math.min(n - 1, i + 2)];
    var a = 2 * p1;
    var b = p2 - p0;
    var c = 2 * p0 - 5 * p1 + 4 * p2 - p3;
    var d = -p0 + 3 * p1 - 3 * p2 + p3;
    return 0.5 * (a + b * frac + c * frac * frac + d * frac * frac * frac);
  }

  Ribbon.prototype.build = function (theta) {
    var M = this.M, cfg = this.cfg;
    var half = cfg.width * 0.5;
    var s = 0;

    for (var i = 0; i < M; i++) {
      var t = i / (M - 1);
      var th = sampleTheta(theta, t);
      var c = Math.cos(th * cfg.twist);
      var ac = Math.abs(c);

      this.x[i] = t * this.w;
      // Shallow catenary plus the lift the twist imparts.
      this.cy[i] = this.h * 0.5 + cfg.sag * Math.sin(Math.PI * t) + cfg.lift * th;
      this.hh[i] = ac * half + cfg.minEdge;
      this.cosT[i] = c;

      // Surface arc length. Foreshortened stretches pack more printed surface
      // into fewer screen pixels, so the stripes bunch exactly where the tape
      // turns edge-on. This is the detail that makes it read as a real
      // printed ribbon rather than a striped shape.
      if (i > 0) {
        var dx = this.x[i] - this.x[i - 1];
        var dy = this.cy[i] - this.cy[i - 1];
        var ds = Math.sqrt(dx * dx + dy * dy);
        s += ds / Math.max(0.18, ac);
      }
      this.surf[i] = s;
    }
    this.totalSurf = s;
  };

  /** Point on the ribbon at surface coordinate `sv`, across position `v`. */
  Ribbon.prototype.at = function (sv, v, out) {
    var M = this.M, surf = this.surf;
    if (sv <= 0) sv = 0;
    if (sv >= this.totalSurf) sv = this.totalSurf;
    // surf is monotonic increasing, so binary search.
    var lo = 0, hi = M - 1;
    while (lo < hi - 1) {
      var mid = (lo + hi) >> 1;
      if (surf[mid] <= sv) lo = mid; else hi = mid;
    }
    var span = surf[hi] - surf[lo];
    var f = span > 1e-6 ? (sv - surf[lo]) / span : 0;
    var x = this.x[lo] + (this.x[hi] - this.x[lo]) * f;
    var cy = this.cy[lo] + (this.cy[hi] - this.cy[lo]) * f;
    var hh = this.hh[lo] + (this.hh[hi] - this.hh[lo]) * f;
    out[0] = x;
    out[1] = cy + v * hh;
    return out;
  };

  /**
   * Lambert-ish shading from the twist. A ribbon turning edge-on catches less
   * light; past 90 degrees you see the unprinted back, which on real tape is
   * duller and slightly translucent.
   */
  function shade(c, cfg) {
    var ac = Math.abs(c);
    var lit = cfg.ambient + (1 - cfg.ambient) * Math.pow(ac, 0.65);
    // Grazing angles catch a rim of specular off the plastic.
    var rim = (1 - ac) * (1 - ac) * cfg.sheen;
    return { lit: lit, rim: rim, back: c < 0 };
  }

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }

  function css(rgb, alpha) {
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (alpha == null ? 1 : alpha) + ")";
  }

  Ribbon.prototype.render = function (theta) {
    var ctx = this.ctx, cfg = this.cfg, M = this.M;
    this.build(theta);
    ctx.clearRect(0, 0, this.w, this.h);

    var p = [0, 0];
    var i;

    /* 1. Cast shadow, so the tape sits in front of the page rather than on it. */
    ctx.save();
    ctx.translate(0, cfg.shadowDrop);
    ctx.filter = "blur(" + cfg.shadowBlur + "px)";
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.moveTo(this.x[0], this.cy[0] - this.hh[0]);
    for (i = 1; i < M; i++) ctx.lineTo(this.x[i], this.cy[i] - this.hh[i]);
    for (i = M - 1; i >= 0; i--) ctx.lineTo(this.x[i], this.cy[i] + this.hh[i]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* 2. Body, one quad per render segment, shaded by its own normal. */
    for (i = 0; i < M - 1; i++) {
      var c = (this.cosT[i] + this.cosT[i + 1]) * 0.5;
      var sh = shade(c, cfg);
      var base = sh.back ? cfg.backRGB : cfg.faceRGB;
      var col = mix(cfg.shadowRGB, base, sh.lit);
      ctx.fillStyle = css(col);
      ctx.beginPath();
      ctx.moveTo(this.x[i], this.cy[i] - this.hh[i]);
      ctx.lineTo(this.x[i + 1], this.cy[i + 1] - this.hh[i + 1]);
      ctx.lineTo(this.x[i + 1], this.cy[i + 1] + this.hh[i + 1]);
      ctx.lineTo(this.x[i], this.cy[i] + this.hh[i]);
      ctx.closePath();
      ctx.fill();
    }

    /* 3. Hazard stripes, positioned in surface space so they compress with
          the twist, and slanted so they read as printed diagonals. */
    var period = cfg.stripePeriod;
    var skew = cfg.stripeSkew;
    var a = [0, 0], b = [0, 0], cpt = [0, 0], d = [0, 0];
    for (var s0 = -skew; s0 < this.totalSurf + skew; s0 += period) {
      var s1 = s0 + period * cfg.stripeDuty;
      this.at(s0, -1, a);
      this.at(s1, -1, b);
      this.at(s1 + skew, 1, cpt);
      this.at(s0 + skew, 1, d);

      // Shade the stripe by the surface it is printed on.
      var mid = (s0 + s1) * 0.5;
      var idx = this.indexAtSurface(mid);
      var sc = shade(this.cosT[idx], cfg);
      var stripeCol = mix(cfg.shadowRGB, sc.back ? cfg.backStripeRGB : cfg.stripeRGB, sc.lit);

      ctx.fillStyle = css(stripeCol);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(cpt[0], cpt[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.closePath();
      ctx.fill();
    }

    /* 4. Specular rim along the upper edge, strongest where the tape turns
          through the light. Drawn as one polyline per alpha bucket so the
          highlight reads as a continuous sheen instead of a stack of
          individually stroked segments with visible joins. */
    ctx.lineWidth = 1.3;
    ctx.lineJoin = "round";
    var BUCKETS = 5;
    for (var bkt = 0; bkt < BUCKETS; bkt++) {
      var lo = bkt / BUCKETS, hi = (bkt + 1) / BUCKETS;
      var alpha = cfg.rimBase + (lo + hi) * 0.5 * cfg.sheen;
      if (alpha < 0.05) continue;
      ctx.strokeStyle = "rgba(255,244,232," + alpha.toFixed(3) + ")";
      ctx.beginPath();
      var drawing = false;
      for (i = 0; i < M; i++) {
        var rimAmt = (1 - Math.abs(this.cosT[i]));
        rimAmt = rimAmt * rimAmt;
        if (rimAmt >= lo && rimAmt < hi) {
          if (!drawing) { ctx.moveTo(this.x[i], this.cy[i] - this.hh[i]); drawing = true; }
          else ctx.lineTo(this.x[i], this.cy[i] - this.hh[i]);
        } else {
          drawing = false;
        }
      }
      ctx.stroke();
    }

    /* 5. Contact shading on the lower edge, which grounds the ribbon. */
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(this.x[0], this.cy[0] + this.hh[0]);
    for (i = 1; i < M; i++) ctx.lineTo(this.x[i], this.cy[i] + this.hh[i]);
    ctx.stroke();
  };

  Ribbon.prototype.indexAtSurface = function (sv) {
    var lo = 0, hi = this.M - 1, surf = this.surf;
    while (lo < hi - 1) {
      var mid = (lo + hi) >> 1;
      if (surf[mid] <= sv) lo = mid; else hi = mid;
    }
    return lo;
  };

  Ribbon.prototype.reset = function () {
    this.render(new Float32Array(this.cfg.count));
  };

  /* ---------------------------------------------------------------- driver */

  function Driver(cfg) {
    this.cfg = cfg;
    this.items = [];
    this.running = false;
    this.last = 0;
    this.acc = 0;
    this.scrollY = window.scrollY;
    this.vel = 0;
    this.wind = 0;
    this.idle = 0;
    this.frame = this.frame.bind(this);

    var self = this;
    window.addEventListener("scroll", function () { self.wake(); }, { passive: true });
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        for (var i = 0; i < self.items.length; i++) {
          if (self.items[i].ribbon.measure()) self.items[i].ribbon.reset();
        }
        self.wake();
      }, 150);
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) self.running = false; else self.wake();
    });
  }

  Driver.prototype.register = function (chain, ribbon, root) {
    var item = { chain: chain, ribbon: ribbon, root: root, visible: true };
    this.items.push(item);
    var self = this;

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          item.visible = entries[i].isIntersecting;
          if (item.visible) self.wake();
          else { chain.settle(); ribbon.reset(); }
        }
      }, { rootMargin: "20% 0px" }).observe(root);
    }

    function nodeAt(e) {
      var r = root.getBoundingClientRect();
      return Math.round(((e.clientX - r.left) / r.width) * (chain.count - 1));
    }

    root.addEventListener("pointermove", function (e) {
      if (reduced.matches) return;
      var i = nodeAt(e);
      chain.impulse(i, self.cfg.brushImpulse);
      chain.impulse(i - 1, self.cfg.brushImpulse * 0.5);
      chain.impulse(i + 1, self.cfg.brushImpulse * 0.5);
      self.wake();
    }, { passive: true });

    root.addEventListener("pointerdown", function (e) {
      if (reduced.matches) return;
      var i = nodeAt(e);
      chain.impulse(i, self.cfg.clickImpulse);
      chain.impulse(i - 1, self.cfg.clickImpulse * 0.6);
      chain.impulse(i + 1, self.cfg.clickImpulse * 0.6);
      self.wake();
    }, { passive: true });
  };

  Driver.prototype.wake = function () {
    if (this.running || reduced.matches || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this.idle = 0;
    requestAnimationFrame(this.frame);
  };

  Driver.prototype.frame = function (now) {
    if (!this.running) return;
    var c = this.cfg;

    var prevY = this.scrollY;
    this.scrollY = window.scrollY;
    var elapsed = (now - this.last) / 1000;
    this.last = now;
    if (elapsed > c.dt * c.maxSubsteps) elapsed = c.dt * c.maxSubsteps;
    this.acc += elapsed;

    var raw = elapsed > 0 ? (this.scrollY - prevY) / elapsed : 0;
    raw = Math.max(-c.velClamp, Math.min(c.velClamp, raw));
    this.vel += (raw - this.vel) * c.velSmoothing;
    this.wind = Math.max(-c.windMax, Math.min(c.windMax, -c.windPerVel * this.vel));

    var steps = 0;
    while (this.acc >= c.dt && steps < c.maxSubsteps) {
      for (var i = 0; i < this.items.length; i++) {
        if (this.items[i].visible) this.items[i].chain.step(this.wind);
      }
      this.acc -= c.dt;
      steps++;
    }

    var energy = 0;
    for (var j = 0; j < this.items.length; j++) {
      var it = this.items[j];
      if (!it.visible) continue;
      it.ribbon.render(it.chain.theta);
      energy += it.chain.energy();
    }

    var quiet = energy < c.sleepEnergy && Math.abs(this.wind) < 0.05 && Math.abs(this.vel) < 2;
    if (quiet && ++this.idle > c.sleepFrames) {
      for (var k = 0; k < this.items.length; k++) {
        this.items[k].chain.settle();
        this.items[k].ribbon.reset();
      }
      this.running = false;
      return;
    }
    if (!quiet) this.idle = 0;
    requestAnimationFrame(this.frame);
  };

  /* ------------------------------------------------------------------ init */

  var DT = 1 / 120;

  var PHYSICS = {
    dt: DT,
    stiffness: 26,
    coupling: 420,
    damping: 4.5,
    spongeDamping: 12,
    spongeWidth: 5,
  };

  var DRIVER = {
    dt: DT,
    maxSubsteps: 4,
    // Tuned against the solver: at twist 3.4 a click peaks near 0.9 rad, which
    // carries a run of tape past 90 degrees so it visibly flips onto its back.
    // Scroll wind peaks near 0.37 rad and never flips, so scrolling undulates
    // the tape without strobing it.
    brushImpulse: 4,
    clickImpulse: 20,
    velClamp: 3000,
    windPerVel: 0.008,
    windMax: 14,
    velSmoothing: 0.25,
    sleepEnergy: 1e-4,
    sleepFrames: 30,
  };

  function readColors(root) {
    var cs = getComputedStyle(root);
    function rgb(name, fallback) {
      var v = cs.getPropertyValue(name).trim();
      var m = v.match(/^#?([0-9a-f]{6})$/i);
      if (m) {
        var n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
      var p = v.match(/[\d.]+/g);
      if (p && p.length >= 3) return [+p[0], +p[1], +p[2]];
      return fallback;
    }
    return {
      faceRGB: rgb("--tape-face", [255, 106, 43]),
      stripeRGB: rgb("--tape-stripe", [20, 22, 26]),
      backRGB: rgb("--tape-back", [184, 69, 26]),
      backStripeRGB: rgb("--tape-back-stripe", [38, 34, 32]),
      shadowRGB: [8, 9, 12],
    };
  }

  function init() {
    var roots = document.querySelectorAll("[data-tape]");
    if (!roots.length) return;

    var driver = reduced.matches ? null : new Driver(DRIVER);

    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      if (!root.querySelector(".tape__canvas")) continue;

      var count = Number(root.getAttribute("data-nodes")) || 46;
      var colors = readColors(root);
      var geom = {
        count: count,
        samples: 220,
        width: Number(root.getAttribute("data-width")) || 34,
        sag: Number(root.getAttribute("data-sag")) || 10,
        twist: 3.4,
        lift: 10,
        minEdge: 0.5,
        stripePeriod: 46,
        stripeDuty: 0.5,
        stripeSkew: 30,
        ambient: 0.34,
        sheen: 0.42,
        rimBase: 0.06,
        shadowDrop: 7,
        shadowBlur: 7,
        faceRGB: colors.faceRGB,
        stripeRGB: colors.stripeRGB,
        backRGB: colors.backRGB,
        backStripeRGB: colors.backStripeRGB,
        shadowRGB: colors.shadowRGB,
      };

      var ribbon = new Ribbon(root, geom);
      if (!ribbon.measure()) continue;
      ribbon.reset();
      root.classList.add("is-live");

      if (driver) {
        var chain = new Chain({ count: count, ...PHYSICS });
        driver.register(chain, ribbon, root);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
