// =============================================================================
// AI Learning Hub — skill sets (skills.html only).
//
// A set is a single ZIP of skill ZIPs, and that link is plain HTML: one click,
// no script, nothing here needed. This file adds the second option beside it —
// downloading the set's skills as separate, upload-ready ZIPs — which a static
// page cannot express as one link.
//
// It is written as an enhancement rather than the default on purpose. A browser
// asks before saving several files at once, and some block the run outright, so
// the reliable button has to be the one that fetches a single file.
//
// A control declares the section it belongs to:
//
//   <button hidden data-bundle-source="#writing-set">…</button>
//
// and the files come from the download links already in that section, so a
// skill added to the page is in the set download the moment its card is.
// =============================================================================

(function () {
  "use strict";

  // Enough space between clicks that the browser treats them as a series of
  // downloads rather than a runaway script, and slow enough to read the count.
  var GAP_MS = 500;

  function linksIn(selector) {
    var section = document.querySelector(selector);
    if (!section) return [];
    // Scoped to the card grid, not the whole section: a section can also carry
    // downloads that are not skills — the practice drafts are Word documents —
    // and those must never be swept into a set.
    return Array.prototype.slice.call(
      section.querySelectorAll(".skillGrid a.downloadButton[download]")
    );
  }

  // Downloads one file without navigating: a detached anchor carrying the same
  // href and download name as the card's own button.
  function save(link) {
    var anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.download = link.getAttribute("download") || "";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  function wire(button) {
    var links = linksIn(button.getAttribute("data-bundle-source"));
    if (!links.length) return;

    // The status line is a sibling of the button so the count is announced
    // without rewriting the label the reader just pressed.
    var status = document.createElement("span");
    status.className = "bundleStatus";
    status.setAttribute("role", "status");
    button.insertAdjacentElement("afterend", status);

    var idle = button.textContent;
    button.textContent = idle.replace("{n}", String(links.length));
    button.hidden = false;

    button.addEventListener("click", function () {
      // Re-read on click: nothing on this page adds cards after load, but the
      // list is cheap and a stale one would silently skip a skill.
      var files = linksIn(button.getAttribute("data-bundle-source"));
      button.disabled = true;

      files.forEach(function (link, index) {
        window.setTimeout(function () {
          save(link);
          status.textContent = "Downloading " + (index + 1) + " of " + files.length + "…";

          if (index === files.length - 1) {
            window.setTimeout(function () {
              status.textContent =
                files.length + " files sent to your downloads folder.";
              button.disabled = false;
            }, GAP_MS);
          }
        }, index * GAP_MS);
      });
    });
  }

  var buttons = document.querySelectorAll("[data-bundle-source]");
  Array.prototype.forEach.call(buttons, wire);
})();
