// =============================================================================
// AI Learning Hub — the two pieces of behaviour the pages share.
//
// The faculty site gets these from React components (ThemeToggle, Header). The
// hub is plain HTML, so they are written once here and every page loads it.
// Both are progressive: the theme is already applied by an inline script before
// paint, and the navigation is a plain list of links that works with this file
// blocked — the only thing lost is the collapse on a phone.
// =============================================================================

(function () {
  "use strict";

  // ---- Light / dark ---------------------------------------------------------
  // The theme lives as data-theme on <html> and is persisted to localStorage.
  // The button is built here rather than sitting in the markup of six pages:
  // with no script there is nothing to click anyway, so an inert button in the
  // HTML would be worse than none.
  var SUN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"/>' +
    '<path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
  var MOON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  var root = document.documentElement;

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function paintToggle(button) {
    var dark = currentTheme() === "dark";
    // The icon shows where the click goes, not where you are: a sun on the dark
    // theme, because pressing it brings the light one.
    button.innerHTML = dark ? SUN : MOON;
    var label = "Switch to " + (dark ? "light" : "dark") + " mode";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", String(dark));
  }

  function buildThemeToggle() {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "themeToggle";
    paintToggle(button);
    button.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        // Private browsing refuses the write. The theme still changes for this
        // page; it just will not be remembered, which is not worth reporting.
      }
      paintToggle(button);
    });
    document.body.appendChild(button);
  }

  // ---- The collapsing navigation -------------------------------------------
  // Below 860px the bar is replaced by the hamburger (see globals.css), and the
  // nav needs the isOpen class to appear at all.
  function wireNav() {
    var toggle = document.querySelector(".navToggleBtn");
    var nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute(
        "aria-label",
        open ? "Close navigation menu" : "Open navigation menu"
      );
      nav.classList.toggle("isOpen", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Following a link inside the open menu navigates away; closing it first
    // means the menu is not still open if the browser restores this page.
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    // Widening past the breakpoint shows the bar again, and a menu left open
    // would otherwise stay stacked beneath it.
    window.matchMedia("(min-width: 861px)").addEventListener("change", function (event) {
      if (event.matches) setOpen(false);
    });
  }

  // The two embed pages are a frame and nothing else — no header to collapse and
  // nothing of ours left to theme — so they do not load this file at all. The
  // guard is here so that adding it back by accident cannot drop a floating
  // toggle on top of the framed site, where it would change nothing visible.
  if (!document.body.classList.contains("hasEmbed")) {
    buildThemeToggle();
    wireNav();
  }
})();
