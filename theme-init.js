(function () {
  try {
    var theme = localStorage.getItem("jm-theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.dataset.theme = theme;
    }
  } catch (e) {}
})();
