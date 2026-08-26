// =============================================================================
// AI Learning Hub — behave correctly when the page is a Google Sites embed.
//
// Every hub page is framed, full-page, on a matching Google Sites page under
// https://ailearninghub.law.stanford.edu. Left alone, a click on "Tutorials"
// would swap the document inside that frame and leave the browser's address bar
// still showing whichever Google Sites page the reader started on. The address
// would be wrong, the back button would step out of the site rather than back a
// page, and any URL a reader copied would send someone else to the wrong place.
//
// So when — and only when — the page is being read inside a frame, every link to
// another hub page is rewritten to the Google Sites page that holds it, and
// pointed at the top window. The whole tab moves, Google Sites loads its own
// page, and that page's frame loads the hub page the reader asked for.
//
// Read directly on Vercel the file does nothing at all: the links stay ordinary
// relative links, so the site is still testable on its own and still works if
// the Google Sites side is ever taken down.
//
// The map comes from assets/embed-map.js, which scripts/build-embed-map.py
// generates from the pages that exist. Nothing here is hand-maintained.
// =============================================================================

(function () {
  "use strict";

  var map = window.HUB_EMBED_MAP;
  if (!map || !map.pages) return;

  // A cross-origin parent makes the comparison itself throw, which is only ever
  // true when there is a parent — so a throw means framed.
  var framed;
  try {
    framed = window.self !== window.top;
  } catch (e) {
    framed = true;
  }

  // ?embed=1 is what the generated iframes carry. It is not what the code
  // depends on — the frame check above already answers the question — but it
  // makes the intent legible in the Google Sites editor, and it gives a way to
  // see embed behaviour in a normal tab while checking a change.
  var forced = /(^|[?&])embed=1(&|$)/.test(window.location.search);

  if (!framed && !forced) return;

  document.documentElement.setAttribute("data-embedded", "true");

  // file name -> entry, so a resolved href can be looked up by its last segment.
  var byFile = {};
  for (var i = 0; i < map.pages.length; i++) {
    byFile[map.pages[i].file] = map.pages[i];
  }

  function fileOf(pathname) {
    var last = pathname.substring(pathname.lastIndexOf("/") + 1);
    // Vercel serves the directory root as index.html, and a bare "/" has no
    // last segment at all.
    return last === "" ? "index.html" : last;
  }

  var here = fileOf(window.location.pathname);

  function remap(a) {
    if (a.hasAttribute("data-embed-mapped")) return;

    // An explicit opt-out, for a link that should stay inside the frame.
    if (a.hasAttribute("data-embed-inframe")) return;

    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#") return;

    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (e) {
      return;
    }

    // Anything off this deployment — Stanford pages, the training, mailto — is
    // already marked to open in a new tab and is not ours to touch.
    if (url.origin !== window.location.origin) return;

    var entry = byFile[fileOf(url.pathname)];
    if (!entry || entry.mode !== "page") return;

    // A link into the page you are already on is a jump to a section of it.
    // Sending the browser out to Google Sites and back would lose the section
    // and reload the document to reach a place it is already showing.
    if (entry.file === here) return;

    // A query string cannot survive the trip: Google Sites does not pass one on
    // its own URL through to the frame it hosts. Such a link stays in the frame,
    // where the query still works.
    if (url.search) return;

    var target = map.siteOrigin + entry.path;
    if (map.keepHash && url.hash) target += url.hash;

    a.setAttribute("href", target);
    a.setAttribute("target", map.linkTarget);
    a.setAttribute("data-embed-mapped", "");
  }

  function sweep(root) {
    var links = (root || document).querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) remap(links[i]);
  }

  sweep(document);

  // Three pages build their cards from data after load, and the search results
  // appear as you type. Those links have to be caught as they arrive rather than
  // only in the sweep above.
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue;
          if (node.tagName === "A") remap(node);
          if (node.querySelectorAll) sweep(node);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
