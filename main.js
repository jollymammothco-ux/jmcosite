const toggle = document.querySelector(".nav-toggle");
const mobileNav = document.querySelector(".mobile-nav");

if (toggle && mobileNav) {
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    mobileNav.hidden = open;
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Hero video: don't spend a contractor's data plan on decoration.
// On a metered connection or with reduced motion requested, stop the clip
// and leave the poster frame showing. The poster is 10KB and carries the
// same image, so nothing is lost visually.
const heroVideo = document.querySelector(".hero video");
if (heroVideo) {
  const conn = navigator.connection || {};
  const saveData = conn.saveData === true;
  const slowLink = /(^|-)2g$/.test(conn.effectiveType || "");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (saveData || slowLink || reducedMotion) {
    heroVideo.autoplay = false;
    heroVideo.removeAttribute("autoplay");
    heroVideo.preload = "none";
    heroVideo.pause();
  }
}

// RapidDashboard demo: type the question, then build the answer.
// The markup ships in its finished state, so with no JS, or with reduced
// motion, the panel is simply a static dashboard. This only takes it apart in
// order to play it back, and only once the reader has actually reached it.
(function initRapidDemo() {
  const demo = document.querySelector("[data-rd-demo]");
  if (!demo) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  const typeTarget = demo.querySelector("[data-rd-type]");
  const counters = demo.querySelectorAll("[data-rd-count]");
  const question = typeTarget ? typeTarget.textContent : "";
  // Captured before anything is cleared, so the finished state can always be
  // put back verbatim.
  const finalCounts = Array.from(counters, (el) => el.textContent);
  let safety = 0;

  // Snap to the finished panel. Every path that can stall ends here, because
  // a half-played dashboard with no numbers in it is worse than one that never
  // animated: the panel is the argument, and it has to survive the animation
  // failing.
  function finish() {
    clearTimeout(safety);
    demo.classList.remove("is-armed", "is-typing");
    demo.classList.add("is-running");
    if (typeTarget) typeTarget.textContent = question;
    counters.forEach((el, n) => (el.textContent = finalCounts[n]));
  }

  function countUp(el, ms) {
    const target = Number(el.dataset.rdCount) || 0;
    const pre = el.dataset.rdPrefix || "";
    const post = el.dataset.rdSuffix || "";
    // Time from the first frame's own clock rather than from performance.now().
    // The two do not always share an origin, and the easing below inverts for
    // t < 0, so a single early frame is enough to print a negative figure.
    let start = null;
    requestAnimationFrame(function step(now) {
      if (start === null) start = now;
      const t = Math.max(0, Math.min(1, (now - start) / ms));
      // Ease out, so the number decelerates into its final value.
      const v = Math.round(target * (1 - Math.pow(1 - t, 3)));
      el.textContent = pre + v + post;
      if (t < 1) requestAnimationFrame(step);
    });
  }

  function play() {
    // Take the panel apart here rather than at load. Armed is a broken-looking
    // state, so nothing may enter it until the frame it starts playing.
    demo.classList.add("is-armed");
    if (typeTarget) typeTarget.textContent = "";
    counters.forEach((el) => {
      el.textContent = (el.dataset.rdPrefix || "") + "0" + (el.dataset.rdSuffix || "");
    });
    // Backstop: whatever happens to rAF, timers or the tab in between, the
    // panel is whole again well before anyone could read it as broken.
    safety = setTimeout(finish, 6000);

    demo.classList.add("is-typing");
    let i = 0;
    const tick = () => {
      if (!typeTarget) return finishTyping();
      typeTarget.textContent = question.slice(0, ++i);
      if (i < question.length) {
        // Vary the cadence slightly; a perfectly even rate reads as a machine.
        setTimeout(tick, 26 + Math.random() * 34);
      } else {
        setTimeout(finishTyping, 320);
      }
    };
    const finishTyping = () => {
      demo.classList.remove("is-typing");
      demo.classList.add("is-running");
      counters.forEach((el, n) => setTimeout(() => countUp(el, 780), n * 110));
      // Counters are done by ~1.1s; release the backstop a beat after that.
      clearTimeout(safety);
      safety = setTimeout(finish, 1600);
    };
    tick();
  }

  if (!("IntersectionObserver" in window)) return play();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        play();
      });
    },
    { threshold: 0.35 }
  );
  io.observe(demo);
})();

// Background footage behind the band sections.
// Decoration, so it has to earn its bandwidth. It is never fetched at all
// unless the viewport is wide enough for the photograph to actually read: on
// phones the scrim takes it down to texture, so a couple of megabytes would
// buy a contractor nothing but a data bill. Same reasoning as the hero clip
// above, one step stricter.
(function initBackgroundVideo() {
  const videos = document.querySelectorAll(".band-photo-bg > video");
  if (!videos.length) return;

  const conn = navigator.connection || {};
  const cheap =
    conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || "");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wide = window.matchMedia("(min-width: 1024px)").matches;
  if (cheap || reduced || !wide) return;

  videos.forEach((video) => {
    // Only spend the bytes once the section is actually near the viewport.
    const start = () => {
      video.preload = "auto";
      video.load();
      const played = video.play();
      if (played && typeof played.catch === "function") {
        // Autoplay can still be refused. The poster stays; nothing breaks.
        played.catch(() => {});
      }
      video.addEventListener("playing", () => video.classList.add("is-playing"), {
        once: true,
      });
    };

    if (!("IntersectionObserver" in window)) return start();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          start();
        });
      },
      { rootMargin: "300px" }
    );
    io.observe(video.closest(".band-photo") || video);
  });
})();

// Primary CTAs land as a hammer blow.
// The cursor swap is pure CSS. This injects the nail, marks where the blow
// landed so the shock ring starts from the point of contact, replays on every
// press, and fires a haptic tick where the device supports one.
(function initStrike() {
  // .btn-jump opts out: those are in-page anchors, and a hammer blow to send
  // someone one section down the page is a promise the click doesn't keep.
  const buttons = document.querySelectorAll(".btn-primary:not(.btn-jump)");
  if (!buttons.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // navigator.vibrate is the Vibration API: Android Chrome and Firefox honour
  // it. iOS Safari does not implement it at all and there is no web API for
  // the Taptic Engine, so iPhone users get the visual drive only.
  const canBuzz = typeof navigator.vibrate === "function";

  // How long a CTA holds its own navigation so the blow can land. The nail
  // hits at ~105ms, so this leaves a little over 200ms of it sitting driven
  // before the page changes. Without this the strike was being drawn for one
  // frame and then thrown away with the document: all that work, and what you
  // actually saw was the next page. Deliberately under a quarter second of
  // felt delay -- long enough to read as follow-through, short enough that it
  // still reads as the click working.
  const HOLD_MS = 340;

  buttons.forEach((btn) => {
    // Injected rather than authored into markup so it stays out of every page
    // template, and so no-JS readers get a plain button instead of a stray dot.
    if (!btn.querySelector(".nail")) {
      const nail = document.createElement("span");
      nail.className = "nail";
      nail.setAttribute("aria-hidden", "true");
      btn.appendChild(nail);
    }

    let struckAt = 0;
    let leaving = false;

    function strike(x, y) {
      struckAt = performance.now();
      if (x == null) {
        btn.style.removeProperty("--strike-x");
        btn.style.removeProperty("--strike-y");
      } else {
        btn.style.setProperty("--strike-x", x + "px");
        btn.style.setProperty("--strike-y", y + "px");
      }

      // Restarting a CSS animation needs the class gone and style recomputed
      // before it goes back on, otherwise a second press does nothing.
      btn.classList.remove("is-struck");
      void btn.offsetWidth;
      btn.classList.add("is-struck");

      // Two quick pulses: the blow, then the nail seating.
      if (canBuzz && !reduced) {
        try {
          navigator.vibrate([14, 26, 8]);
        } catch (e) {}
      }
    }

    btn.addEventListener("pointerdown", (e) => {
      const r = btn.getBoundingClientRect();
      strike(e.clientX - r.left, e.clientY - r.top);
    });

    btn.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      strike(null, null);
    });

    btn.addEventListener("animationend", (e) => {
      // The nail drive is the longest of the three, so clear on that one.
      if (e.animationName === "nail-drive") btn.classList.remove("is-struck");
    });

    // Hold the link open just long enough for the blow to read, then follow
    // it. Measured from the press rather than from the click, so holding the
    // mouse down does not stack a second delay on top of the animation.
    //
    // Everything the browser would otherwise treat specially is left alone:
    // modifier-clicks and middle-clicks still open tabs, downloads still
    // download, new-tab links and cross-origin links go straight out, and a
    // reader on reduced motion never waits at all.
    btn.addEventListener("click", (e) => {
      if (reduced || leaving) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const href = btn.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      if (btn.hasAttribute("download")) return;
      if (btn.target && btn.target !== "" && btn.target !== "_self") return;

      let dest;
      try {
        dest = new URL(btn.href, location.href);
      } catch (err) {
        return;
      }
      if (dest.origin !== location.origin) return;

      const waited = performance.now() - struckAt;
      const left = Math.max(0, Math.min(HOLD_MS, HOLD_MS - waited));
      if (left === 0) return;

      e.preventDefault();
      leaving = true;
      setTimeout(() => {
        location.href = dest.href;
      }, left);
    });
  });
})();

// Work cards: play a silent clip on hover.
// The <video> is created on first hover rather than shipped in the markup, so
// a grid of twelve cards costs nothing until someone actually points at one.
// Skipped entirely on touch, metered connections, and reduced motion.
(function initWorkCardClips() {
  const cards = document.querySelectorAll(".work-card.has-clip");
  if (!cards.length) return;

  const conn = navigator.connection || {};
  const cheap =
    conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || "");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hoverable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (cheap || reduced || !hoverable) return;

  cards.forEach((card) => {
    const src = card.getAttribute("data-clip");
    const holder = card.querySelector(".work-card-media");
    if (!src || !holder) return;

    let video = null;

    function enter() {
      if (!video) {
        video = document.createElement("video");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "auto";
        video.setAttribute("aria-hidden", "true");
        video.src = src;
        holder.appendChild(video);
      }
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
      video.classList.add("is-playing");
    }

    function leave() {
      if (!video) return;
      video.classList.remove("is-playing");
      video.pause();
      video.currentTime = 0;
    }

    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);
    card.addEventListener("focus", enter);
    card.addEventListener("blur", leave);
  });
})();

// Staggered reveal: children of [data-stagger] come in one after another
// rather than all at once. Used on the leak list so the problem section reads
// as an accumulating case rather than a block of text appearing.
(function initStagger() {
  const groups = document.querySelectorAll("[data-stagger]");
  if (!groups.length) return;

  groups.forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty("--stagger-i", i);
      child.classList.add("stagger-item");
    });
  });

  if (!("IntersectionObserver" in window)) {
    groups.forEach((g) => g.classList.add("is-staggered"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-staggered");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.25, rootMargin: "0px 0px -10% 0px" }
  );
  groups.forEach((g) => io.observe(g));
})();

// Section reveal on scroll
const revealSections = document.querySelectorAll(".reveal");
if (revealSections.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  revealSections.forEach((section) => revealObserver.observe(section));
}

// Jolly word — auto-wrap brand "Jolly" and float letters in viewport
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initJollyWords);
} else {
  initJollyWords();
}

function initJollyWords() {
  const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
  const roots = [document.querySelector("main"), document.querySelector(".site-header")].filter(
    Boolean
  );

  roots.forEach((root) => autoWrapJollyInRoot(root, skipTags));

  document.querySelectorAll(".jolly-word").forEach((word) => {
    ensureLetterSpans(word);
    if (word.closest(".logo-wordmark")) {
      word.classList.add("jolly-word--logo");
    }
  });
}

function autoWrapJollyInRoot(root, skipTags) {
  const elements = [root, ...root.querySelectorAll("*")];
  const textNodes = [];

  for (const el of elements) {
    if (skipTags.has(el.tagName)) continue;
    if (el.classList?.contains("jolly-word")) continue;
    if (el.closest?.(".jolly-word, [aria-hidden='true']") && el !== root) continue;

    for (const node of el.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE) continue;
      if (!/\bJolly\b/.test(node.textContent)) continue;
      textNodes.push(node);
    }
  }

  textNodes.forEach((textNode) => {
    const text = textNode.textContent;
    const parts = text.split(/(\bJolly\b)/);
    if (parts.length === 1) return;

    const fragment = document.createDocumentFragment();
    parts.forEach((part) => {
      if (part === "Jolly") {
        fragment.appendChild(createJollyWordElement(part));
      } else if (part) {
        fragment.appendChild(document.createTextNode(part));
      }
    });

    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

function createJollyWordElement(word) {
  const wrapper = document.createElement("span");
  wrapper.className = "jolly-word";
  wrapper.setAttribute("aria-label", "Jolly");
  [...word].forEach((letter) => {
    const span = document.createElement("span");
    span.textContent = letter;
    wrapper.appendChild(span);
  });
  return wrapper;
}

function ensureLetterSpans(word) {
  if (word.querySelector("span")) return;

  const text = word.textContent.trim();
  word.textContent = "";
  word.setAttribute("aria-label", "Jolly");
  [...text].forEach((letter) => {
    const span = document.createElement("span");
    span.textContent = letter;
    word.appendChild(span);
  });
}

// Highlight sticky CTA after hero scroll
const stickyCta = document.querySelector(".sticky-cta");
if (stickyCta) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      stickyCta.style.opacity = entry.isIntersecting ? "0" : "1";
      stickyCta.style.pointerEvents = entry.isIntersecting ? "none" : "auto";
    },
    { threshold: 0 }
  );
  const hero = document.querySelector(".hero");
  if (hero) observer.observe(hero);
}

