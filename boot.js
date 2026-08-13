// Runs in <head>, before first paint.
// 1. Flags that JS is available, which is what turns on the scroll-reveal
//    hidden state. Without this class every .reveal section stays visible,
//    so a blocked or failed script can never blank the page.
// 2. Failsafe: if main.js never runs, reveal everything anyway.
(function () {
  var root = document.documentElement;
  root.className += " js";
  setTimeout(function () {
    root.className += " reveal-all";
  }, 2000);

  // Cross-document view transitions reject internally with
  // "AbortError: Transition was skipped" whenever one is interrupted: a fast
  // second click, a back/forward, or the old page being discarded mid-flight.
  // The transition object is owned by the browser, so there is nowhere to
  // attach a .catch(). Swallow exactly that rejection and nothing else, so a
  // purely cosmetic animation cannot litter the console with errors.
  window.addEventListener("unhandledrejection", function (event) {
    var r = event.reason;
    if (r && r.name === "AbortError" && /Transition was skipped/i.test(r.message || "")) {
      event.preventDefault();
    }
  });
})();
