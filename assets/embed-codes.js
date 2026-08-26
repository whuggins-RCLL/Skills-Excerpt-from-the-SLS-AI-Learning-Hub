// =============================================================================
// AI Learning Hub — print the iframe to paste into each Google Sites page.
//
// Reads assets/embed-map.js, which scripts/build-embed-map.py generates from the
// pages that exist, and writes one block per published page. Because it renders
// from the map rather than from a list typed here, a page added to the hub shows
// up on this page as soon as the map is rebuilt, and nothing has to be kept in
// step by hand.
//
// The Vercel origin is read from wherever this page is being served, so the
// snippets are correct on a preview deployment as well as on production without
// anything to configure.
// =============================================================================

(function () {
  "use strict";

  var map = window.HUB_EMBED_MAP;
  var host = document.getElementById("embedCodes");
  if (!map || !host) return;

  // Everything up to and including the last slash: the directory this page sits
  // in, so a hub served from a sub-path still produces working snippets.
  var base = window.location.href.replace(/[?#].*$/, "").replace(/[^/]*$/, "");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Two hub pages are themselves nothing but a frame around another site. The
  // map records what they carry, and Google Sites frames that directly rather
  // than nesting three deep to show the same thing.
  function sourceFor(entry) {
    return entry.frame || base + entry.file + "?embed=1";
  }

  function snippet(entry) {
    return (
      "<style>html,body{margin:0;padding:0;overflow:hidden}</style>\n" +
      "<iframe\n" +
      '  src="' + sourceFor(entry) + '"\n' +
      '  title="' + entry.title + '"\n' +
      '  style="width:100%;height:100vh;border:0;display:block"\n' +
      '  allow="clipboard-write"\n' +
      '  referrerpolicy="no-referrer-when-downgrade"\n' +
      "></iframe>"
    );
  }

  // A code block with its own copy button, the same shape the case study uses.
  function codeBlock(id, name, buttonLabel, body) {
    var block = el("div", "codeBlock");

    var head = el("div", "codeHead");
    head.appendChild(el("span", "codeName", name));

    var button = el("button", "copyBtn");
    button.type = "button";
    button.setAttribute("data-copy-target", id);
    button.hidden = true;
    button.appendChild(el("span", "copyBtnLabel", buttonLabel));
    head.appendChild(button);

    var pre = el("pre");
    pre.id = id;
    pre.appendChild(el("code", null, body));

    block.appendChild(head);
    block.appendChild(pre);
    return block;
  }

  var pages = map.pages.filter(function (entry) {
    return entry.mode === "page";
  });

  var counts = document.querySelectorAll("[id^=embedCount]");
  for (var c = 0; c < counts.length; c++) counts[c].textContent = String(pages.length);
  document.getElementById("embedOrigin").textContent = map.siteOrigin;

  pages.forEach(function (entry, index) {
    var caption = el("p", "muted");
    caption.style.margin = "1.6rem 0 0.4rem";
    caption.textContent =
      entry.title +
      " — shows " +
      (entry.frame ? entry.frame + " directly, skipping " + entry.file : entry.file);
    host.appendChild(caption);

    // The URL is what Google Sites asks for when a page is added as a full page
    // embed from the Pages panel, which is how these pages are built.
    host.appendChild(
      codeBlock(
        "embed-url-" + index,
        map.siteOrigin + entry.path,
        "Copy the URL",
        sourceFor(entry)
      )
    );

    // The frame is the other route — Insert > Embed > Embed code — for a page
    // that has to hold something besides the hub.
    var more = el("details", "guideDetails");
    more.appendChild(el("summary", null, "Or paste it into an ordinary page instead"));
    var why = el("p", "muted");
    why.style.margin = "0 0 0.7rem";
    why.textContent =
      "Insert \u203a Embed \u203a Embed code, then drag the block to full width and " +
      "full height. Only needed if this Google Sites page has to carry something " +
      "besides the hub — a full page embed sizes itself.";
    more.appendChild(why);
    more.appendChild(
      codeBlock("embed-frame-" + index, "Embed code", "Copy the embed code", snippet(entry))
    );
    host.appendChild(more);
  });
})();
