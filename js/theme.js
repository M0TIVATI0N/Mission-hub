/*
 * Light / dark mode.
 * Loaded in <head> (without defer) so the saved mode is applied before the
 * page is painted — no flash of the wrong colours. All colours themselves are
 * CSS variables in css/style.css, switched by the data-theme attribute.
 */
(() => {
  "use strict";

  const KEY = "missionHub.theme";
  const root = document.documentElement;
  const metaColors = { light: "#f3eee6", dark: "#080d13" };

  function savedTheme() {
    try {
      const value = localStorage.getItem(KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (_) {
      return null;
    }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", metaColors[theme]);
    }
  }

  function switchTheme() {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    // A short class lets colours fade instead of jumping (see style.css).
    root.classList.add("theme-switching");
    applyTheme(next);
    window.setTimeout(() => root.classList.remove("theme-switching"), 450);
    try {
      localStorage.setItem(KEY, next);
    } catch (_) {}
  }

  applyTheme(savedTheme() || systemTheme());

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(root.dataset.theme);
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      button.addEventListener("click", switchTheme);
    });
  });

  // Keeps other open tabs of the site in the same mode.
  window.addEventListener("storage", (event) => {
    if (event.key === KEY && (event.newValue === "light" || event.newValue === "dark")) {
      applyTheme(event.newValue);
    }
  });
})();
