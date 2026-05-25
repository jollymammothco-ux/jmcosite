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
