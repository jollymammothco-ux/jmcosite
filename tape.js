/* Jolly Mammoth — reactive caution tape.
 *
 * A strung ribbon of hazard tape that sags, twists, and settles. Scrolling
 * blows it; pointing at it pushes it; it goes to sleep when it stops moving.
 *
 * The solver is the same coupled-oscillator chain we used for the papel
 * picado banner on the Speedy build, reimplemented here rather than lifted,
 * because the geometry is different. Papel picado is a row of discrete flags
 * that skew independently. Tape is one continuous ribbon, so the interesting
 * part is the TWIST: as a stretch of tape rotates edge-on it foreshortens to
 * nothing and then shows its back face. That flip is what makes it read as
 * tape rather than as a wavy stripe.
 *
 * Physics, per node:
 *   accel = coupling*(left - 2*self + right)   wave travelling along the tape
 *         - stiffness*self                     pull back toward flat
 *         - damping*velocity                   bleed energy
 *         + wind                               scroll-driven forcing
 *
 * Damping ramps up near both ends ("sponge") so waves are absorbed at the
 * anchors instead of reflecting back and ringing forever.
 *
 * Markup it expects:
 *   <div class="tape" data-tape>
 *     <svg class="tape__svg" ...>…</svg>
 *   </div>
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

    // Sponge: extra damping toward both anchors.
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
      var l = i > 0 ? th[i - 1] : 0;          // anchored at both ends
      var r = i < n - 1 ? th[i + 1] : 0;
      var a = k * (l - 2 * th[i] + r) - s * th[i] - dp[i] * om[i] + wind;
      om[i] += a * dt;
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
    this.svg = root.querySelector(".tape__svg");
    this.front = root.querySelector(".tape__front");
    this.back = root.querySelector(".tape__back");
    this.cfg = cfg;
    this.w = 0;
    this.h = 0;
  }

  Ribbon.prototype.measure = function () {
    var r = this.root.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.svg.setAttribute("viewBox", "0 0 " + Math.round(this.w) + " " + Math.round(this.h));
  };

  /** Where the centre line of the tape sits at node i, before any twist. */
  Ribbon.prototype.centreY = function (i, n) {
    var t = i / (n - 1);
    // Shallow catenary: anchored high at both ends, sagging in the middle.
    var sag = this.cfg.sag * Math.sin(Math.PI * t);
    return this.h * 0.5 + sag;
  };

  Ribbon.prototype.render = function (theta) {
    var n = theta.length;
    var half = this.cfg.width * 0.5;
    var top = [], bot = [], xs = [], facing = [];

    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * this.w;
      var th = theta[i];
      // Twist foreshortens the ribbon: edge-on is zero height, and past 90deg
      // you are looking at the back of the tape.
      var c = Math.cos(th * this.cfg.twist);
      var hh = Math.abs(c) * half + this.cfg.minEdge;
      var cy = this.centreY(i, n) + this.cfg.lift * th;
      xs.push(x);
      top.push(cy - hh);
      bot.push(cy + hh);
      facing.push(c >= 0);
    }

    this.front.setAttribute("d", ribbonPath(xs, top, bot, 0, n - 1));
    // Back-facing runs get their own darker path drawn over the front fill.
    this.back.setAttribute("d", backPath(xs, top, bot, facing));
  };

  Ribbon.prototype.reset = function () {
    var n = this.cfg.count;
    var flat = new Float32Array(n);
    this.render(flat);
  };

  /** Closed polygon: along the top edge, back along the bottom. */
  function ribbonPath(xs, top, bot, a, b) {
    if (b <= a) return "";
    var d = "M" + r1(xs[a]) + " " + r1(top[a]);
    for (var i = a + 1; i <= b; i++) d += "L" + r1(xs[i]) + " " + r1(top[i]);
    for (var j = b; j >= a; j--) d += "L" + r1(xs[j]) + " " + r1(bot[j]);
    return d + "Z";
  }

  /** One sub-path per contiguous run of back-facing nodes. */
  function backPath(xs, top, bot, facing) {
    var d = "", start = -1;
    for (var i = 0; i < facing.length; i++) {
      if (!facing[i] && start < 0) start = i;
      if ((facing[i] || i === facing.length - 1) && start >= 0) {
        var end = facing[i] ? i - 1 : i;
        if (end > start) d += ribbonPath(xs, top, bot, start, end);
        start = -1;
      }
    }
    return d;
  }

  function r1(v) {
    return Math.round(v * 10) / 10;
  }

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
    window.addEventListener("resize", function () {
      for (var i = 0; i < self.items.length; i++) self.items[i].ribbon.measure();
      self.wake();
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

    // Brushing the tape with the pointer pushes it locally.
    root.addEventListener("pointermove", function (e) {
      if (reduced.matches) return;
      var r = root.getBoundingClientRect();
      var i = Math.round(((e.clientX - r.left) / r.width) * (chain.count - 1));
      chain.impulse(i, self.cfg.brushImpulse);
      chain.impulse(i - 1, self.cfg.brushImpulse * 0.5);
      chain.impulse(i + 1, self.cfg.brushImpulse * 0.5);
      self.wake();
    }, { passive: true });

    root.addEventListener("pointerdown", function (e) {
      if (reduced.matches) return;
      var r = root.getBoundingClientRect();
      var i = Math.round(((e.clientX - r.left) / r.width) * (chain.count - 1));
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
    // Tuned against the solver: at twist 3.4 a click peaks around 0.9 rad,
    // which carries roughly seven segments past 90deg so a run of tape
    // visibly flips onto its back face. Scroll wind peaks near 0.37 rad and
    // never flips, so ambient scrolling undulates without strobing.
    brushImpulse: 4,
    clickImpulse: 20,
    velClamp: 3000,
    windPerVel: 0.008,
    windMax: 14,
    velSmoothing: 0.25,
    sleepEnergy: 1e-4,
    sleepFrames: 30,
  };

  function init() {
    var roots = document.querySelectorAll("[data-tape]");
    if (!roots.length) return;

    var driver = reduced.matches ? null : new Driver(DRIVER);

    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      var count = Number(root.getAttribute("data-nodes")) || 46;
      var geom = {
        count: count,
        width: Number(root.getAttribute("data-width")) || 34,
        sag: Number(root.getAttribute("data-sag")) || 10,
        twist: 3.4,
        lift: 10,
        minEdge: 0.6,
      };
      var ribbon = new Ribbon(root, geom);
      ribbon.measure();
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
