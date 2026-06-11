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

// Products dropdown (desktop)
const navGroupToggle = document.querySelector(".nav-group-toggle");
const navDropdown = document.querySelector(".nav-dropdown");

if (navGroupToggle && navDropdown) {
  navGroupToggle.addEventListener("click", () => {
    const open = navGroupToggle.getAttribute("aria-expanded") === "true";
    navGroupToggle.setAttribute("aria-expanded", String(!open));
    navDropdown.hidden = open;
  });

  document.addEventListener("click", (e) => {
    if (
      !navGroupToggle.contains(e.target) &&
      !navDropdown.contains(e.target)
    ) {
      navGroupToggle.setAttribute("aria-expanded", "false");
      navDropdown.hidden = true;
    }
  });

  navDropdown.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navGroupToggle.setAttribute("aria-expanded", "false");
      navDropdown.hidden = true;
    });
  });
}

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

// Contact form → CRM (Go High Level via Netlify function)
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const statusEl = document.getElementById("form-status");
  const defaultButtonLabel = submitButton?.textContent?.trim() || "Submit";

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const interest = contactForm.interest?.value;
    if (interest === "rapiddashboard") {
      window.location.href = "https://rapiddashboard.ai/demo";
      return;
    }

    const formData = new FormData(contactForm);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      company: formData.get("company"),
      interest: formData.get("interest"),
      message: formData.get("message"),
      website: formData.get("website"),
      page_url: window.location.href,
    };

    setFormStatus(statusEl, "");
    setSubmitting(submitButton, defaultButtonLabel, true);

    try {
      const response = await fetch("/.netlify/functions/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Something went wrong. Please try again.");
      }

      contactForm.reset();
      setFormStatus(
        statusEl,
        "Thanks — we got your message. We'll follow up shortly to book your strategy call.",
        "success"
      );
    } catch (error) {
      setFormStatus(
        statusEl,
        error.message || "Could not send your message. Please try again.",
        "error"
      );
    } finally {
      setSubmitting(submitButton, defaultButtonLabel, false);
    }
  });
}

function setFormStatus(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.hidden = !message;
  element.classList.remove("form-status--success", "form-status--error");
  if (type) element.classList.add(`form-status--${type}`);
}

function setSubmitting(button, label, isSubmitting) {
  if (!button) return;
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? "Sending…" : label;
}
