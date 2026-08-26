// =============================================================================
// AI Learning Hub — the site search (search.html only).
//
// The index is a list of {u, p, h, t} — url, page title, heading, text — built
// by scripts/build-search-index.mjs from the rendered pages and loaded by the
// script tag above this one. Everything here is matching and drawing.
//
// It is loaded on this page alone. The index is a couple of hundred kilobytes,
// which is fine for the page you asked to search on and would be rude on every
// other page of the site.
// =============================================================================

(function () {
  "use strict";

  var index = window.HUB_SEARCH_INDEX || [];
  var form = document.getElementById("searchForm");
  var input = document.getElementById("q");
  var status = document.getElementById("searchStatus");
  var results = document.getElementById("searchResults");
  var empty = document.getElementById("searchEmpty");
  if (!form || !input || !results) return;

  var MAX_RESULTS = 60;
  var SNIPPET = 220;

  function escapeRe(term) {
    return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function terms(query) {
    return query
      .toLowerCase()
      .split(/[\s,]+/)
      .map(function (t) { return t.replace(/^[^\wÀ-ÿ]+|[^\wÀ-ÿ]+$/g, ""); })
      .filter(function (t) { return t.length > 1; });
  }

  // A term matches from the start of a word, so "cita" finds "citation" while
  // "ation" does not — prefix matching is what a reader expects from a search
  // box, and substring matching turns every short query into noise.
  function counter(term) {
    return new RegExp("\\b" + escapeRe(term), "gi");
  }

  function count(haystack, re) {
    re.lastIndex = 0;
    var n = 0;
    while (re.exec(haystack) !== null) {
      n++;
      if (re.lastIndex === 0) break;
    }
    return n;
  }

  function search(query) {
    var words = terms(query);
    if (!words.length) return [];

    var res = [];
    for (var i = 0; i < index.length; i++) {
      var entry = index[i];
      var score = 0;
      var missing = false;

      for (var w = 0; w < words.length; w++) {
        var re = counter(words[w]);
        var inHeading = count(entry.h, re);
        var inPage = count(entry.p, re);
        var inText = count(entry.t, re);
        if (!inHeading && !inPage && !inText) { missing = true; break; }
        // A heading match is worth far more than a passing mention: the reader
        // is looking for the page about the thing, not every page naming it.
        score += inHeading * 12 + inPage * 4 + Math.min(inText, 8);
      }
      if (missing) continue;

      res.push({ entry: entry, score: score });
    }

    res.sort(function (a, b) {
      return b.score - a.score || a.entry.u.localeCompare(b.entry.u);
    });
    return res.slice(0, MAX_RESULTS);
  }

  // Builds the snippet as text nodes and <mark> elements rather than markup, so
  // whatever someone types in the box can never become HTML.
  function snippet(text, words) {
    var lower = text.toLowerCase();
    var at = -1;
    for (var i = 0; i < words.length && at < 0; i++) {
      var m = counter(words[i]).exec(text);
      if (m) at = m.index;
    }
    if (at < 0) at = 0;

    var start = Math.max(0, at - 60);
    if (start > 0) {
      var space = text.indexOf(" ", start);
      if (space > -1 && space < start + 20) start = space + 1;
    }
    var slice = text.slice(start, start + SNIPPET);
    var end = slice.lastIndexOf(" ");
    if (slice.length === SNIPPET && end > SNIPPET - 40) slice = slice.slice(0, end);

    var fragment = document.createDocumentFragment();
    if (start > 0) fragment.appendChild(document.createTextNode("… "));

    // One pass over the slice, marking every term hit in order.
    var hits = [];
    words.forEach(function (word) {
      var re = counter(word);
      var m;
      while ((m = re.exec(slice)) !== null) {
        hits.push([m.index, m.index + word.length]);
        if (re.lastIndex === m.index) re.lastIndex++;
      }
    });
    hits.sort(function (a, b) { return a[0] - b[0]; });

    var cursor = 0;
    hits.forEach(function (hit) {
      if (hit[0] < cursor) return;
      fragment.appendChild(document.createTextNode(slice.slice(cursor, hit[0])));
      var mark = document.createElement("mark");
      mark.textContent = slice.slice(hit[0], hit[1]);
      fragment.appendChild(mark);
      cursor = hit[1];
    });
    fragment.appendChild(document.createTextNode(slice.slice(cursor) + (start + SNIPPET < text.length ? " …" : "")));
    return fragment;
  }

  function render(query) {
    var words = terms(query);
    var found = search(query);

    results.innerHTML = "";
    empty.hidden = true;

    if (!words.length) {
      status.textContent = "";
      empty.hidden = false;
      return;
    }

    status.textContent =
      found.length === 0
        ? "No matches for “" + query + "”."
        : found.length + (found.length === 1 ? " result" : " results") +
          (found.length === MAX_RESULTS ? "+" : "") + " for “" + query + "”.";

    found.forEach(function (hit) {
      var entry = hit.entry;
      var item = document.createElement("li");
      item.className = "searchResult";

      var link = document.createElement("a");
      link.href = entry.u;
      link.textContent = entry.h || entry.p;
      var title = document.createElement("h2");
      title.appendChild(link);
      item.appendChild(title);

      if (entry.p && entry.p !== entry.h) {
        var where = document.createElement("p");
        where.className = "searchWhere";
        where.textContent = entry.p;
        item.appendChild(where);
      }

      var text = document.createElement("p");
      text.className = "searchSnippet";
      text.appendChild(snippet(entry.t, words));
      item.appendChild(text);

      results.appendChild(item);
    });
  }

  function currentQuery() {
    var match = /[?&]q=([^&]*)/.exec(window.location.search);
    return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "";
  }

  var initial = currentQuery();
  input.value = initial;
  render(initial);
  input.focus();
  if (initial) input.setSelectionRange(initial.length, initial.length);

  // Typing searches; the form still submits for anyone who presses enter before
  // this file loads, and lands on the same page with ?q= set.
  var timer;
  input.addEventListener("input", function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      var value = input.value;
      render(value);
      var url = window.location.pathname + (value ? "?q=" + encodeURIComponent(value) : "");
      window.history.replaceState(null, "", url);
    }, 120);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    window.clearTimeout(timer);
    render(input.value);
    window.history.replaceState(
      null, "", window.location.pathname + (input.value ? "?q=" + encodeURIComponent(input.value) : "")
    );
  });
})();
