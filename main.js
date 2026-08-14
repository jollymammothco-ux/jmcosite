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

// Primary CTAs land as a hammer blow.
// The cursor swap is pure CSS; this only marks where the blow landed so the
// shock ring can start from the point of contact, and replays the animation
// on every press rather than only the first.
(function initStrike() {
  const buttons = document.querySelectorAll(".btn-primary");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      const r = btn.getBoundingClientRect();
      // Fall back to the centre for keyboard activation, which has no point.
      const x = e.clientX ? e.clientX - r.left : r.width / 2;
      const y = e.clientY ? e.clientY - r.top : r.height / 2;
      btn.style.setProperty("--strike-x", x + "px");
      btn.style.setProperty("--strike-y", y + "px");

      // Restarting a CSS animation needs the class gone and the style
      // recomputed before it goes back on.
      btn.classList.remove("is-struck");
      void btn.offsetWidth;
      btn.classList.add("is-struck");
    });

    btn.addEventListener("animationend", (e) => {
      if (e.animationName === "strike-hit") btn.classList.remove("is-struck");
    });

    // Keyboard users get the same feedback.
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      btn.style.removeProperty("--strike-x");
      btn.style.removeProperty("--strike-y");
      btn.classList.remove("is-struck");
      void btn.offsetWidth;
      btn.classList.add("is-struck");
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

