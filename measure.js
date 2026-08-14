/* Jolly Mammoth — the tape measure divider.
 *
 * A steel tape-measure blade stretched across the page. It pays out once when
 * it first scrolls into view, then flexes very slightly as you scroll past.
 *
 * Replaces the caution tape, which twisted hard enough to read as a cartoon.
 * The lesson there: the back-face flip was a satisfying thing to compute, not
 * a thing the page needed. What separates premium trades imagery from cute
 * trades imagery is precision, so this is built as an instrument. The
 * graduations are real (sixteenths, eighths, quarters, halves, inches), the
 * numbers are sequential, and the motion is small enough that you might not
 * notice it until you look.
 *
 * The blade's concave cross-section is what makes a real tape stand out
 * unsupported, and it is why the metal catches light in a band down the
 * middle. That highlight, plus the way the blade droops toward the free end,
 * is most of what sells it.
 *
 * Physics reuses the coupled-oscillator chain from the caution tape: a wave
 * runs along the blade, damping ramps up at the anchored end, scroll velocity
 * drives it. Amplitude is roughly a tenth of what the tape used.
 *
 * Markup: <div class="rule" data-rule><canvas class="rule__canvas"></canvas></div>
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
      // Anchored hard at the left (the case), free at the right (the hook),
      // so damping is asymmetric rather than a symmetric sponge.
      var t = Math.max(0, 1 - i / opts.spongeWidth);
      this.damp[i] = opts.damping + opts.spongeDamping * t;
    }
  }

  Chain.prototype.step = function (wind) {
    var th = this.theta, om = this.omega, dp = this.damp;
    var n = this.count, k = this.coupling, s = this.stiffness, dt = this.dt;
    for (var i = 0; i < n; i++) {
      var l = i > 0 ? th[i - 1] : 0;
      var r = i < n - 1 ? th[i + 1] : th[i]; // free end
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

  function Blade(root, cfg) {
    this.root = root;
    this.canvas = root.querySelector(".rule__canvas");
    this.ctx = this.canvas.getContext("2d");
    this.cfg = cfg;
    this.M = cfg.samples;
    this.x = new Float32Array(this.M);
    this.cy = new Float32Array(this.M);
    this.payout = reduced.matches ? 1 : 0; // 0..1, how far the blade is out
    this.w = 0;
    this.h = 0;
  }

  Blade.prototype.measure = function () {
    var r = this.root.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  };

  function sampleTheta(theta, t) {
    var n = theta.length;
    var f = t * (n - 1);
    var i = Math.floor(f);
    var frac = f - i;
    var p0 = theta[Math.max(0, i - 1)];
    var p1 = theta[i];
    var p2 = theta[Math.min(n - 1, i + 1)];
    var p3 = theta[Math.min(n - 1, i + 2)];
    return 0.5 * (2 * p1 + (p2 - p0) * frac +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * frac * frac +
      (-p0 + 3 * p1 - 3 * p2 + p3) * frac * frac * frac);
  }

  Blade.prototype.render = function (theta) {
    var ctx = this.ctx, cfg = this.cfg, M = this.M;
    var W = this.w, H = this.h;
    ctx.clearRect(0, 0, W, H);

    var out = Math.max(0, Math.min(1, this.payout));
    if (out <= 0.001) return;

    var tipX = cfg.caseWidth + (W - cfg.caseWidth) * out;
    var half = cfg.blade * 0.5;
    var baseY = H * 0.5;

    // Centreline. A real blade droops toward the free end, and the droop grows
    // with how far it is paid out.
    for (var i = 0; i < M; i++) {
      var t = i / (M - 1);
      var x = cfg.caseWidth + (tipX - cfg.caseWidth) * t;
      var droop = cfg.droop * out * t * t;
      var flex = sampleTheta(theta, t) * cfg.flex * t;
      this.x[i] = x;
      this.cy[i] = baseY + droop + flex;
    }

    /* Shadow first, so the blade reads as standing off the page. */
    ctx.save();
    ctx.translate(0, cfg.shadowDrop);
    ctx.filter = "blur(6px)";
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath();
    ctx.moveTo(this.x[0], this.cy[0] - half);
    for (i = 1; i < M; i++) ctx.lineTo(this.x[i], this.cy[i] - half);
    for (i = M - 1; i >= 0; i--) ctx.lineTo(this.x[i], this.cy[i] + half);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* Blade body. The vertical gradient is the concave cross-section catching
       light: darker at the rolled edges, bright through the middle. */
    var grad = ctx.createLinearGradient(0, baseY - half, 0, baseY + half);
    grad.addColorStop(0, cfg.edgeTop);
    grad.addColorStop(0.18, cfg.faceHi);
    grad.addColorStop(0.5, cfg.face);
    grad.addColorStop(0.82, cfg.faceLo);
    grad.addColorStop(1, cfg.edgeBot);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.x[0], this.cy[0] - half);
    for (i = 1; i < M; i++) ctx.lineTo(this.x[i], this.cy[i] - half);
    for (i = M - 1; i >= 0; i--) ctx.lineTo(this.x[i], this.cy[i] + half);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = grad;
    ctx.fillRect(0, baseY - half - cfg.droop, W, half * 2 + cfg.droop * 3);

    /* Graduations, drawn inside the clip so they follow the blade. */
    var px = cfg.pxPerInch;
    var first = Math.ceil((cfg.caseWidth - cfg.caseWidth) / px);
    var lastIn = Math.floor((tipX - cfg.caseWidth) / px);

    ctx.lineCap = "butt";
    for (var n = first; n <= lastIn; n++) {
      for (var s = 0; s < 16; s++) {
        var inches = n + s / 16;
        var gx = cfg.caseWidth + inches * px;
        if (gx > tipX - 1) break;

        // Tick length by denominator, the way a real blade is graduated.
        var len;
        if (s === 0) len = 1.0;
        else if (s === 8) len = 0.62;
        else if (s % 4 === 0) len = 0.46;
        else if (s % 2 === 0) len = 0.34;
        else len = 0.24;

        var gy = this.centreAt(gx, tipX);
        ctx.strokeStyle = s === 0 ? cfg.tickMajor : cfg.tickMinor;
        ctx.lineWidth = s === 0 ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(gx, gy - half);
        ctx.lineTo(gx, gy - half + half * 2 * len * 0.5);
        ctx.stroke();

        // Mirror the sixteenths off the bottom edge, as blades do.
        if (s !== 0) {
          ctx.beginPath();
          ctx.moveTo(gx, gy + half);
          ctx.lineTo(gx, gy + half - half * 2 * len * 0.32);
          ctx.stroke();
        }
      }

      // Inch numbers.
      var nx = cfg.caseWidth + n * px;
      if (nx < tipX - 14 && n > 0) {
        var ny = this.centreAt(nx, tipX);
        ctx.fillStyle = cfg.tickMajor;
        ctx.font = cfg.numberFont;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(String(n), nx + 3, ny + 1);
      }
    }
    ctx.restore();

    /* Rolled edges. */
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.moveTo(this.x[0], this.cy[0] - half);
    for (i = 1; i < M; i++) ctx.lineTo(this.x[i], this.cy[i] - half);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x[0], this.cy[0] + half);
    for (i = 1; i < M; i++) ctx.lineTo(this.x[i], this.cy[i] + half);
    ctx.stroke();

    /* Specular band down the middle of the concave blade. */
    ctx.strokeStyle = "rgba(255,252,244,0.30)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x[0], this.cy[0] - half * 0.22);
    for (i = 1; i < M; i++) ctx.lineTo(this.x[i], this.cy[i] - half * 0.22);
    ctx.stroke();

    /* The hook: the bent steel tab riveted to the free end. */
    var hy = this.cy[M - 1];
    ctx.fillStyle = cfg.hook;
    ctx.fillRect(tipX - 2, hy - half - 3, 4, half * 2 + 6);
    ctx.fillRect(tipX - 2, hy - half - 3, 11, 3.5);
    ctx.fillRect(tipX - 2, hy + half - 0.5, 11, 3.5);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(tipX - 2, hy - half - 3, 1.2, half * 2 + 6);
  };

  /** Centre-line y at an arbitrary x, by interpolating the sampled spine. */
  Blade.prototype.centreAt = function (gx, tipX) {
    var span = tipX - this.cfg.caseWidth;
    if (span <= 0) return this.cy[0];
    var t = (gx - this.cfg.caseWidth) / span;
    t = Math.max(0, Math.min(1, t));
    var f = t * (this.M - 1);
    var i = Math.floor(f);
    var j = Math.min(this.M - 1, i + 1);
    return this.cy[i] + (this.cy[j] - this.cy[i]) * (f - i);
  };

  Blade.prototype.reset = function () {
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
          if (self.items[i].blade.measure()) self.items[i].blade.reset();
        }
        self.wake();
      }, 150);
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) self.running = false; else self.wake();
    });
  }

  Driver.prototype.register = function (chain, blade, root) {
    var item = { chain: chain, blade: blade, root: root, visible: true, seen: false };
    this.items.push(item);
    var self = this;

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          item.visible = entries[i].isIntersecting;
          if (item.visible) {
            item.seen = true; // start paying the blade out
            self.wake();
          }
        }
      }, { rootMargin: "0px 0px -12% 0px" }).observe(root);
    } else {
      item.seen = true;
      blade.payout = 1;
    }

    root.addEventListener("pointermove", function (e) {
      if (reduced.matches || blade.payout < 0.98) return;
      var r = root.getBoundingClientRect();
      var i = Math.round(((e.clientX - r.left) / r.width) * (chain.count - 1));
      chain.impulse(i, self.cfg.brushImpulse);
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
    var animating = false;
    for (var j = 0; j < this.items.length; j++) {
      var it = this.items[j];
      if (!it.visible) continue;
      if (it.seen && it.blade.payout < 1) {
        // Ease out as it reaches full extension, like a blade slowing on the
        // spring rather than stopping dead.
        it.blade.payout = Math.min(1, it.blade.payout + (1 - it.blade.payout) * 0.085 + 0.006);
        if (it.blade.payout < 0.999) animating = true;
        else it.blade.payout = 1;
      }
      it.blade.render(it.chain.theta);
      energy += it.chain.energy();
    }

    var quiet = !animating && energy < c.sleepEnergy &&
      Math.abs(this.wind) < 0.05 && Math.abs(this.vel) < 2;
    if (quiet && ++this.idle > c.sleepFrames) {
      for (var k = 0; k < this.items.length; k++) {
        this.items[k].chain.settle();
        this.items[k].blade.render(this.items[k].chain.theta);
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
    stiffness: 42,
    coupling: 460,
    damping: 6,
    spongeDamping: 16,
    spongeWidth: 8,
  };

  var DRIVER = {
    dt: DT,
    maxSubsteps: 4,
    brushImpulse: 0.7,
    velClamp: 3000,
    // A tenth of what the caution tape used. The blade should look like steel
    // that barely gives, not like ribbon.
    windPerVel: 0.0009,
    windMax: 1.6,
    velSmoothing: 0.25,
    sleepEnergy: 1e-4,
    sleepFrames: 30,
  };

  function cssVar(root, name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  }

  function init() {
    var roots = document.querySelectorAll("[data-rule]");
    if (!roots.length) return;
    var driver = reduced.matches ? null : new Driver(DRIVER);

    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      if (!root.querySelector(".rule__canvas")) continue;
      var count = 40;

      var cfg = {
        count: count,
        samples: 160,
        blade: Number(root.getAttribute("data-blade")) || 34,
        pxPerInch: Number(root.getAttribute("data-scale")) || 46,
        caseWidth: 0,
        droop: 9,
        flex: 5,
        shadowDrop: 5,
        face: cssVar(root, "--rule-face", "#f0b323"),
        faceHi: cssVar(root, "--rule-face-hi", "#ffd97a"),
        faceLo: cssVar(root, "--rule-face-lo", "#c98d12"),
        edgeTop: cssVar(root, "--rule-edge", "#8a5f08"),
        edgeBot: cssVar(root, "--rule-edge", "#8a5f08"),
        tickMajor: cssVar(root, "--rule-ink", "#14161a"),
        tickMinor: cssVar(root, "--rule-ink-soft", "rgba(20,22,26,0.72)"),
        hook: cssVar(root, "--rule-hook", "#9aa3ad"),
        numberFont: "600 11px ui-sans-serif, system-ui, sans-serif",
      };

      var blade = new Blade(root, cfg);
      if (!blade.measure()) continue;
      root.classList.add("is-live");
      blade.reset();

      if (driver) {
        var chain = new Chain({ count: count, ...PHYSICS });
        driver.register(chain, blade, root);
      } else {
        blade.payout = 1;
        blade.reset();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
