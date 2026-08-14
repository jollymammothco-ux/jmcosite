/* Jolly Mammoth — the tape-measure scroll rail.
 *
 * A steel blade pinned down the edge of the window that pays out as you read.
 * The tip marks how far through the page you are, section boundaries are
 * stamped on the blade as heavier graduations, and the whole thing reads as
 * a measurement rather than a progress bar.
 *
 * This started as a one-shot horizontal divider, which was the wrong shape for
 * the job twice over. On mobile the divider sat below the fold at load and its
 * pay-out animation did not fire until the reader had already scrolled past
 * it, so the one moment it had was the one moment nobody saw. And a decorative
 * flourish that plays once is missable by design. Making it the progress
 * indicator fixes both: it is always on screen, it always responds, and it
 * earns its space by doing a job.
 *
 * Precision is what keeps trades imagery from reading as cartoon, so the blade
 * is drawn as an instrument: correct tick hierarchy down to sixteenths, the
 * concave cross-section that lets a real blade stand unsupported, a rolled
 * edge, and a steel hook at the tip.
 *
 * Markup: <div class="rail" data-rail><canvas class="rail__canvas"></canvas></div>
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function Rail(root) {
    this.root = root;
    this.canvas = root.querySelector(".rail__canvas");
    this.ctx = this.canvas.getContext("2d");
    this.w = 0;
    this.h = 0;
    this.progress = 0;   // eased, what gets drawn
    this.target = 0;     // raw scroll fraction
    this.marks = [];     // section boundaries, as fractions of scrollable height
    this.cfg = null;
  }

  Rail.prototype.readTokens = function () {
    var cs = getComputedStyle(this.root);
    function v(name, fallback) {
      var out = cs.getPropertyValue(name).trim();
      return out || fallback;
    }
    this.cfg = {
      face: v("--rule-face", "#e8a91d"),
      faceHi: v("--rule-face-hi", "#ffd670"),
      faceLo: v("--rule-face-lo", "#b5810f"),
      edge: v("--rule-edge", "#7a5407"),
      ink: v("--rule-ink", "#14161a"),
      inkSoft: v("--rule-ink-soft", "rgba(20,22,26,0.7)"),
      hook: v("--rule-hook", "#9aa3ad"),
      blade: parseFloat(v("--rail-blade", "30")),
      pxPerInch: parseFloat(v("--rail-scale", "44")),
      showNumbers: v("--rail-numbers", "1") !== "0",
    };
  };

  Rail.prototype.measure = function () {
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
    this.readTokens();
    return true;
  };

  /** Section boundaries, so the blade can stamp them as heavier marks. */
  Rail.prototype.collectMarks = function () {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) { this.marks = []; return; }
    var out = [];
    var secs = document.querySelectorAll("main > section[id]");
    for (var i = 0; i < secs.length; i++) {
      var top = secs[i].getBoundingClientRect().top + window.scrollY;
      var f = top / scrollable;
      if (f > 0.01 && f < 0.995) out.push(f);
    }
    this.marks = out;
  };

  Rail.prototype.render = function () {
    var ctx = this.ctx, cfg = this.cfg;
    var W = this.w, H = this.h;
    ctx.clearRect(0, 0, W, H);

    var bw = Math.min(cfg.blade, W - 4);
    var cx = W * 0.5;
    var left = cx - bw * 0.5;
    var tipY = Math.max(6, this.progress * H);

    /* Shadow, so the blade stands off the page. */
    ctx.save();
    ctx.filter = "blur(5px)";
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(left + 2, 0, bw, tipY + 3);
    ctx.restore();

    /* Blade body. The horizontal gradient is the concave cross-section: the
       rolled edges fall into shadow, the middle catches the light. */
    var grad = ctx.createLinearGradient(left, 0, left + bw, 0);
    grad.addColorStop(0, cfg.edge);
    grad.addColorStop(0.18, cfg.faceHi);
    grad.addColorStop(0.5, cfg.face);
    grad.addColorStop(0.82, cfg.faceLo);
    grad.addColorStop(1, cfg.edge);

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, 0, bw, tipY);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(left, 0, bw, tipY);

    /* Graduations. Offset by scroll so the blade reads as being pulled from a
       case rather than as a bar that grows. */
    var px = cfg.pxPerInch;
    var offset = (window.scrollY * 0.35) % px;
    var startIn = Math.floor(-offset / px);
    var endIn = Math.ceil((tipY + px) / px);

    ctx.lineCap = "butt";
    for (var n = startIn; n <= endIn; n++) {
      for (var s = 0; s < 16; s++) {
        var y = n * px + (s / 16) * px - offset;
        if (y < -2 || y > tipY) continue;
        var len;
        if (s === 0) len = 0.5;
        else if (s === 8) len = 0.31;
        else if (s % 4 === 0) len = 0.23;
        else if (s % 2 === 0) len = 0.17;
        else len = 0.12;

        ctx.strokeStyle = s === 0 ? cfg.ink : cfg.inkSoft;
        ctx.lineWidth = s === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + bw * len, y);
        ctx.stroke();

        if (s !== 0) {
          ctx.beginPath();
          ctx.moveTo(left + bw, y);
          ctx.lineTo(left + bw - bw * len * 0.62, y);
          ctx.stroke();
        }
      }

      /* Inch numbers, rotated to read along the blade the way they do on a
         real vertical pull. */
      if (cfg.showNumbers) {
        var ny = n * px - offset;
        if (ny > 10 && ny < tipY - 10 && n > 0) {
          ctx.save();
          ctx.translate(left + bw * 0.62, ny + 1);
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = cfg.ink;
          ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(n), 0, 0);
          ctx.restore();
        }
      }
    }

    /* Section boundaries stamped as heavier marks, so the rail doubles as an
       index of where you are in the page. */
    for (var m = 0; m < this.marks.length; m++) {
      var my = this.marks[m] * H;
      if (my > tipY) continue;
      ctx.strokeStyle = "rgba(20,22,26,0.9)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(left, my);
      ctx.lineTo(left + bw, my);
      ctx.stroke();
    }
    ctx.restore();

    /* Rolled edges and the specular band down the middle. */
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left + 0.5, 0); ctx.lineTo(left + 0.5, tipY);
    ctx.moveTo(left + bw - 0.5, 0); ctx.lineTo(left + bw - 0.5, tipY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,252,244,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + bw * 0.28, 0);
    ctx.lineTo(left + bw * 0.28, tipY);
    ctx.stroke();

    /* The hook: bent steel tab riveted to the free end. */
    ctx.fillStyle = cfg.hook;
    ctx.fillRect(left - 3, tipY - 2, bw + 6, 4);
    ctx.fillRect(left - 3, tipY - 2, 3.5, 11);
    ctx.fillRect(left + bw - 0.5, tipY - 2, 3.5, 11);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(left - 3, tipY - 2, bw + 6, 1.2);
  };

  /* ---------------------------------------------------------------- driver */

  function init() {
    var root = document.querySelector("[data-rail]");
    if (!root || !root.querySelector(".rail__canvas")) return;

    var rail = new Rail(root);
    if (!rail.measure()) return;
    rail.collectMarks();
    root.classList.add("is-live");

    function scrollFraction() {
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return 1;
      return Math.max(0, Math.min(1, window.scrollY / scrollable));
    }

    if (reduced.matches) {
      // No easing loop; snap on scroll and keep it cheap.
      rail.progress = scrollFraction();
      rail.render();
      window.addEventListener("scroll", function () {
        rail.progress = scrollFraction();
        rail.render();
      }, { passive: true });
      return;
    }

    var running = false;

    function frame() {
      rail.target = scrollFraction();
      // Ease toward the scroll position so the tip trails slightly, the way a
      // blade lags the hand pulling it. Pinned exactly to scroll reads
      // mechanical.
      var d = rail.target - rail.progress;
      rail.progress += d * 0.16;
      rail.render();

      if (Math.abs(d) > 0.0004) {
        requestAnimationFrame(frame);
      } else {
        rail.progress = rail.target;
        rail.render();
        running = false;
      }
    }

    function wake() {
      if (running || document.hidden) return;
      running = true;
      requestAnimationFrame(frame);
    }

    window.addEventListener("scroll", wake, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) wake();
    });

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (rail.measure()) {
          rail.collectMarks();
          rail.progress = scrollFraction();
          rail.render();
        }
      }, 150);
    }, { passive: true });

    // Images and fonts landing later change the page height, which moves every
    // section mark. Recompute once things have settled.
    window.addEventListener("load", function () {
      rail.collectMarks();
      rail.progress = scrollFraction();
      rail.render();
    });

    rail.progress = scrollFraction();
    rail.render();
    wake();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
