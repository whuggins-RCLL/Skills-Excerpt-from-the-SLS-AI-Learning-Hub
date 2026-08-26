// =============================================================================
// Your AI Stack — browsing, filtering, comparing and saving.
//
// The catalogue itself is in ai-stack-data.js; this file turns it into the page.
// It is written in the same plain-ES5-flavoured style as hub.js so it runs with
// no build step and no dependencies, which is what lets the tool directory live
// inside the static Hub at all.
//
// Two things drive everything below:
//
//   1. The URL. Every view — a search, a category, the saved list, an open tool,
//      a comparison — is encoded in location.hash, so any state can be linked to
//      and the browser Back button is the reliable way out of an overlay. The
//      standalone app kept all of this in component state, which meant Back left
//      the site entirely and no view could be shared.
//
//   2. One render pass. Reading the hash produces a state object, and render()
//      redraws from it. There is no partial updating to get out of step.
// =============================================================================

(function () {
  "use strict";

  var tools = (window.AI_STACK_TOOLS || []).slice();
  var retired = window.AI_STACK_DISCONTINUED || [];
  var retiredMeta = window.AI_STACK_DISCONTINUED_META || {};

  // The source data has grown by accretion and has repeated a couple of ids;
  // a duplicate would render twice and break the "N tools" counts.
  var seenIds = {};
  tools = tools.filter(function (tool) {
    if (!tool || !tool.id || seenIds[tool.id]) return false;
    seenIds[tool.id] = true;
    return true;
  });

  var SAVED_KEY = "aiStackSaved";
  var MAX_COMPARE = 3;

  // ---- Categories -----------------------------------------------------------
  // Ported from the standalone app's toolCategories module. Tags are the primary
  // signal; the keyword rules only catch tools whose tags map to nothing.
  var TAG_CATEGORY_MAP = {
    "podcasts": "Podcasts",
    "learning": "AI Learning",
    "education": "AI Learning",
    "ai training": "AI Learning",
    "study tools": "AI Learning",
    "study support": "AI Learning",
    "sandbox": "AI Learning",
    "legal research": "Legal Research & Analysis",
    "legal": "Legal Research & Analysis",
    "legal ai": "Legal Research & Analysis",
    "litigation": "Legal Research & Analysis",
    "coding": "Coding & Development",
    "version control": "Coding & Development",
    "developer tools": "Coding & Development",
    "developer": "Coding & Development",
    "data science": "Coding & Development",
    "website builder": "Coding & Development",
    "app builder": "Coding & Development",
    "deployment": "Coding & Development",
    "hosting": "Coding & Development",
    "ai platform": "Coding & Development",
    "open source": "Coding & Development",
    "design": "Design & Creative",
    "image": "Design & Creative",
    "image generation": "Design & Creative",
    "prototyping": "Design & Creative",
    "video": "Video Generation",
    "music and sound": "Music & Audio",
    "music": "Music & Audio",
    "audio": "Music & Audio",
    "audio cleanup": "Music & Audio",
    "music generation": "Music & Audio",
    "speech": "Music & Audio",
    "text-to-speech": "Music & Audio",
    "writing": "Writing & Documents",
    "drafting": "Writing & Documents",
    "presentations": "Presentations & Productivity",
    "workplace": "Presentations & Productivity",
    "meetings": "Presentations & Productivity",
    "project management": "Presentations & Productivity",
    "knowledge management": "Presentations & Productivity",
    "spreadsheets": "Data, Math & Automation",
    "data sets": "Data, Math & Automation",
    "machine learning": "Data, Math & Automation",
    "automation": "Data, Math & Automation",
    "notebooks": "Data, Math & Automation",
    "ml platform": "Data, Math & Automation",
    "mlops": "Data, Math & Automation",
    "marketing": "Marketing & Sales",
    "crm": "Marketing & Sales",
    "social listening": "Marketing & Sales",
    "general ai": "General AI Assistants",
    "llm": "General AI Assistants",
    "open model": "General AI Assistants",
    "edge ai": "General AI Assistants",
    "research": "Research & Search",
    "search": "Research & Search",
    "browser": "Research & Search"
  };

  var KEYWORD_RULES = [
    { name: "Legal Research & Analysis", keywords: ["legal research", "case law", "litigation", "legal drafting", "contract review", "due diligence"] },
    { name: "AI Learning", keywords: ["ai literacy", "academy", "certification"] },
    { name: "Coding & Development", keywords: ["code generation", "code completion", "coding assistant", "app building"] },
    { name: "Design & Creative", keywords: ["image generation", "wireframe", "ui design", "generative art"] },
    { name: "Video Generation", keywords: ["video generation", "text-to-video"] },
    { name: "Music & Audio", keywords: ["music generation", "voice synthesis", "text-to-speech"] },
    { name: "Writing & Documents", keywords: ["writing assistant", "grammar", "proofreading"] },
    { name: "Presentations & Productivity", keywords: ["slide deck", "presentation maker", "project management"] },
    { name: "Data, Math & Automation", keywords: ["data analysis", "spreadsheet", "analytics platform"] },
    { name: "Marketing & Sales", keywords: ["marketing campaign", "ad creative"] },
    { name: "General AI Assistants", keywords: ["general-purpose"] },
    { name: "Research & Search", keywords: ["web research", "academic search", "search engine"] }
  ];

  var PODCAST_PHRASES = [
    "podcast platform", "podcast hosting", "podcast recording", "podcast editor",
    "podcast production", "for podcasters", "podcasters", "audio show"
  ];

  function lower(value) { return String(value == null ? "" : value).toLowerCase(); }

  function isPodcast(tool) {
    var tags = (tool.tags || []).map(lower);
    if (tags.indexOf("podcasts") !== -1) return true;
    var text = lower([tool.name, tool.description, tool.bestFor].join(" "));
    return PODCAST_PHRASES.some(function (phrase) { return text.indexOf(phrase) !== -1; });
  }

  function inferCategories(tool) {
    var found = [];
    function add(name) { if (found.indexOf(name) === -1) found.push(name); }

    (tool.tags || []).forEach(function (tag) {
      var category = TAG_CATEGORY_MAP[lower(tag)];
      if (category) add(category);
    });

    var source = lower([tool.name, tool.description, tool.bestFor, tool.uses, tool.url].join(" "));
    KEYWORD_RULES.forEach(function (rule) {
      if (rule.keywords.some(function (keyword) { return source.indexOf(keyword) !== -1; })) add(rule.name);
    });
    if (isPodcast(tool)) add("Podcasts");

    return found.length ? found : ["General"];
  }

  // Categories are derived from tags on every read in the original app. Here the
  // catalogue never changes at runtime, so each tool is annotated once and the
  // rest of the file reads tool._categories.
  tools.forEach(function (tool) {
    tool._categories = inferCategories(tool);
    tool._primary = tool._categories[0];
    tool._retired = Boolean(tool.isHistoricalModel) || lower(tool.tier) === "historical";
    tool._stanford = Boolean(tool.stanfordUniversitySlsProvidedAccess) &&
      tool.stanfordUniversitySlsProvidedAccess !== "false";
    // One lowercase haystack per tool, built once, so typing in the search box
    // stays instant across 113 entries and their long feature lists.
    tool._haystack = lower([
      tool.name, tool.formerNames, tool.description, tool.bestFor, tool.uses,
      (tool.tags || []).join(" "), tool.tier, tool.parentCompany, tool.summary,
      tool.tagCategories, tool.features, tool._categories.join(" ")
    ].join(" "));
  });

  var categories = (function () {
    var set = {};
    tools.forEach(function (tool) {
      tool._categories.forEach(function (category) { set[category] = (set[category] || 0) + 1; });
    });
    return Object.keys(set).sort().map(function (name) { return { name: name, count: set[name] }; });
  }());

  // ---- Saved tools ----------------------------------------------------------
  // Saves outlive the visit. The standalone app kept them in memory, so a reload
  // — or following a link out to a vendor's site and coming back — emptied the
  // list a reader had just spent ten minutes building.
  function readSaved() {
    try {
      var raw = window.localStorage.getItem(SAVED_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(function (id) { return seenIds[id]; }) : [];
    } catch (error) {
      return [];
    }
  }

  function writeSaved(ids) {
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
    } catch (error) {
      // Private browsing refuses the write; the list still works for this visit.
    }
  }

  var saved = readSaved();

  function isSaved(id) { return saved.indexOf(id) !== -1; }

  function toggleSaved(id) {
    var index = saved.indexOf(id);
    if (index === -1) saved.push(id);
    else saved.splice(index, 1);
    writeSaved(saved);
  }

  // ---- URL state ------------------------------------------------------------
  var DEFAULTS = { q: "", cat: "All", sort: "name", saved: "", cmp: "", tool: "", tab: "overview", view: "", open: "" };

  function readState() {
    var state = {};
    var hash = window.location.hash.replace(/^#/, "");
    var params = new URLSearchParams(hash);
    Object.keys(DEFAULTS).forEach(function (key) {
      var value = params.get(key);
      state[key] = value === null ? DEFAULTS[key] : value;
    });
    state.compareIds = state.cmp ? state.cmp.split(",").filter(function (id) { return seenIds[id]; }).slice(0, MAX_COMPARE) : [];
    return state;
  }

  var state = readState();

  function writeState(changes, replace) {
    Object.keys(changes).forEach(function (key) { state[key] = changes[key]; });
    if (changes.compareIds) state.cmp = changes.compareIds.join(",");

    var params = new URLSearchParams();
    Object.keys(DEFAULTS).forEach(function (key) {
      if (state[key] && state[key] !== DEFAULTS[key]) params.set(key, state[key]);
    });
    var hash = params.toString();
    var url = window.location.pathname + window.location.search + (hash ? "#" + hash : "#");

    // Filter changes replace the entry so Back does not have to walk back
    // through every keystroke; opening an overlay pushes, so Back closes it.
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    render();
  }

  // ---- Filtering ------------------------------------------------------------
  var QUICK_FILTERS = {
    stanford: { label: "Stanford access", test: function (tool) { return tool._stanford; } },
    favorite: { label: "Library favourites", test: function (tool) { return Boolean(tool.robertCrownLawLibraryFavorite); } },
    legal: { label: "Legal research", test: function (tool) { return tool._categories.indexOf("Legal Research & Analysis") !== -1; } },
    learning: { label: "AI learning", test: function (tool) { return tool._categories.indexOf("AI Learning") !== -1; } },
    podcasts: { label: "Podcasts", test: function (tool) { return tool._categories.indexOf("Podcasts") !== -1; } },
    free: { label: "Free or freemium", test: function (tool) { return /free/i.test(tool.tier || ""); } }
  };

  function matches(tool) {
    if (state.cat !== "All" && tool._categories.indexOf(state.cat) === -1) return false;
    if (state.saved && !isSaved(tool.id)) return false;
    if (state.view && QUICK_FILTERS[state.view] && !QUICK_FILTERS[state.view].test(tool)) return false;

    var query = state.q.trim().toLowerCase();
    if (!query) return true;
    // Every whitespace-separated word has to appear somewhere, so "google video"
    // narrows rather than widening the way a single-substring match would.
    return query.split(/\s+/).every(function (word) { return tool._haystack.indexOf(word) !== -1; });
  }

  // A search word can legitimately turn up deep in a tool's feature list, so the
  // filter is generous — but generous matching with an A–Z sort buries the tool
  // the reader actually typed. Scoring puts name matches first while keeping the
  // long-tail matches available further down.
  function relevance(tool, words) {
    var name = lower(tool.name);
    var former = lower(tool.formerNames);
    var blurb = lower(tool.description + " " + tool.bestFor);
    var score = 0;
    words.forEach(function (word) {
      if (name === word) score += 100;
      else if (name.indexOf(word) === 0) score += 60;
      else if (name.indexOf(word) !== -1) score += 40;
      else if (former.indexOf(word) !== -1) score += 30;
      else if (blurb.indexOf(word) !== -1) score += 10;
      else score += 1;
    });
    if (lower(tool.name).indexOf(words.join(" ")) !== -1) score += 50;
    return score;
  }

  function sortTools(list) {
    var sorted = list.slice();
    var query = state.q.trim().toLowerCase();

    if (query && state.sort === "name") {
      var words = query.split(/\s+/);
      sorted.forEach(function (tool) { tool._score = relevance(tool, words); });
      sorted.sort(function (a, b) { return b._score - a._score || a.name.localeCompare(b.name); });
      return sorted;
    }

    if (state.sort === "category") {
      sorted.sort(function (a, b) {
        return a._primary.localeCompare(b._primary) || a.name.localeCompare(b.name);
      });
    } else if (state.sort === "new") {
      sorted.sort(function (a, b) {
        return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || a.name.localeCompare(b.name);
      });
    } else {
      sorted.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    return sorted;
  }

  // A flat grid of 113 cards is hard to navigate, so results are grouped: by
  // first letter when sorted A–Z, by category otherwise. The group heading
  // sticks while its cards scroll, which is what tells a reader where they are.
  function groupTools(list) {
    // A relevance-ordered result set must stay in one block: splitting it into
    // A, B, C headings would scatter the best matches back into the alphabet.
    if (state.q.trim() && state.sort === "name") {
      return list.length ? [{ label: "Best matches", tools: list }] : [];
    }

    var groups = [];
    var index = {};
    list.forEach(function (tool) {
      var key;
      if (state.sort === "category") key = tool._primary;
      else if (state.sort === "new") key = tool.isNew ? "Recently added" : "Everything else";
      else key = /^[a-z]/i.test(tool.name) ? tool.name.charAt(0).toUpperCase() : "#";
      if (!index[key]) {
        index[key] = { label: key, tools: [] };
        groups.push(index[key]);
      }
      index[key].tools.push(tool);
    });
    return groups;
  }

  // ---- Rendering helpers ----------------------------------------------------
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function externalLink(href, label) {
    var link = el("a", null, label);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    var icon = el("span", "externalLinkIcon", "↗");
    icon.setAttribute("aria-hidden", "true");
    link.appendChild(icon);
    link.appendChild(el("span", "srOnly", " (opens in a new tab)"));
    return link;
  }

  function splitList(value) {
    return String(value || "").split(",").map(function (part) { return part.trim(); }).filter(Boolean);
  }

  function sentence(text) {
    return String(text || "").charAt(0).toUpperCase() + String(text || "").slice(1);
  }

  // ---- Elements -------------------------------------------------------------
  var refs = {
    search: document.getElementById("stack-search"),
    sort: document.getElementById("stack-sort"),
    rail: document.getElementById("stack-rail"),
    quick: document.getElementById("stack-quick"),
    chips: document.getElementById("stack-active-filters"),
    status: document.getElementById("stack-status"),
    results: document.getElementById("stack-results"),
    empty: document.getElementById("stack-empty"),
    savedToggle: document.getElementById("stack-saved-toggle"),
    savedCount: document.getElementById("stack-saved-count"),
    compareBtn: document.getElementById("stack-compare-btn"),
    compareCount: document.getElementById("stack-compare-count"),
    exportBtn: document.getElementById("stack-export"),
    downloadBtn: document.getElementById("stack-download"),
    clearBtn: document.getElementById("stack-clear"),
    overlay: document.getElementById("stack-overlay"),
    dialog: document.getElementById("stack-dialog"),
    retired: document.getElementById("stack-retired"),
    retiredMeta: document.getElementById("stack-retired-meta"),
    toTop: document.getElementById("stack-to-top"),
    jump: document.getElementById("stack-jump")
  };

  if (!refs.results) return;

  // ---- The category rail ----------------------------------------------------
  function renderRail() {
    refs.rail.textContent = "";
    var options = [{ name: "All", count: tools.length }].concat(categories);
    options.forEach(function (option) {
      var button = el("button", null);
      button.type = "button";
      button.setAttribute("aria-pressed", String(state.cat === option.name));
      button.appendChild(document.createTextNode(option.name));
      button.appendChild(el("span", null, String(option.count)));
      button.addEventListener("click", function () {
        writeState({ cat: option.name }, true);
      });
      refs.rail.appendChild(button);
    });
  }

  // ---- Quick filters --------------------------------------------------------
  function renderQuick() {
    refs.quick.textContent = "";
    Object.keys(QUICK_FILTERS).forEach(function (key) {
      var filter = QUICK_FILTERS[key];
      var count = tools.filter(filter.test).length;
      var button = el("button", "stackChip");
      button.type = "button";
      button.setAttribute("aria-pressed", String(state.view === key));
      button.appendChild(document.createTextNode(filter.label));
      button.appendChild(el("span", "stackChipCount", String(count)));
      button.addEventListener("click", function () {
        writeState({ view: state.view === key ? "" : key }, true);
      });
      refs.quick.appendChild(button);
    });
  }

  // ---- Active filter chips --------------------------------------------------
  function renderChips() {
    refs.chips.textContent = "";
    var active = [];
    if (state.q.trim()) active.push({ label: "“" + state.q.trim() + "”", clear: { q: "" } });
    if (state.cat !== "All") active.push({ label: state.cat, clear: { cat: "All" } });
    if (state.view && QUICK_FILTERS[state.view]) active.push({ label: QUICK_FILTERS[state.view].label, clear: { view: "" } });
    if (state.saved) active.push({ label: "Saved only", clear: { saved: "" } });

    active.forEach(function (chip) {
      var button = el("button", "stackChip");
      button.type = "button";
      button.appendChild(document.createTextNode(chip.label + " ×"));
      button.setAttribute("aria-label", "Remove filter: " + chip.label);
      button.addEventListener("click", function () {
        if (chip.clear.q === "") refs.search.value = "";
        writeState(chip.clear, true);
      });
      refs.chips.appendChild(button);
    });

    refs.clearBtn.hidden = active.length === 0;
  }

  // ---- Tool cards -----------------------------------------------------------
  function buildCard(tool) {
    var card = el("article", "card stackCard");

    var top = el("div", "stackCardTop");
    var heading = el("div");
    heading.appendChild(el("h3", null, tool.name));
    if (tool.formerNames) heading.appendChild(el("p", "stackCardFormer", tool.formerNames));
    heading.appendChild(el("p", "stackCardCat", tool._primary));
    top.appendChild(heading);
    card.appendChild(top);

    card.appendChild(el("p", "stackCardBlurb", tool.description));

    var badges = el("div", "stackBadges");
    if (tool.tier) badges.appendChild(el("span", "stackBadge", tool.tier));
    if (tool._stanford) badges.appendChild(el("span", "stackBadge isStanford", "Stanford access"));
    if (tool.robertCrownLawLibraryFavorite) badges.appendChild(el("span", "stackBadge isFavorite", "Library pick"));
    if (tool.isNew) badges.appendChild(el("span", "stackBadge", "New"));
    if (tool._retired) badges.appendChild(el("span", "stackBadge isRetired", "Retired"));
    card.appendChild(badges);

    var actions = el("div", "stackCardActions");

    var open = el("button", "stackOpen", "Details");
    open.type = "button";
    open.setAttribute("aria-label", "Open details for " + tool.name);
    open.addEventListener("click", function () { openTool(tool.id); });
    actions.appendChild(open);

    var save = el("button", "stackIconBtn");
    save.type = "button";
    save.innerHTML = "&#9733;";
    save.setAttribute("aria-pressed", String(isSaved(tool.id)));
    save.setAttribute("aria-label", (isSaved(tool.id) ? "Remove " : "Save ") + tool.name);
    save.title = isSaved(tool.id) ? "Remove from your stack" : "Save to your stack";
    save.addEventListener("click", function () {
      toggleSaved(tool.id);
      render();
    });
    actions.appendChild(save);

    var inCompare = state.compareIds.indexOf(tool.id) !== -1;
    var compare = el("button", "stackIconBtn");
    compare.type = "button";
    compare.innerHTML = "&#8646;";
    compare.setAttribute("aria-pressed", String(inCompare));
    compare.setAttribute("aria-label", (inCompare ? "Remove " : "Add ") + tool.name + " to the comparison");
    compare.title = inCompare ? "Remove from comparison" : "Add to comparison (up to three)";
    compare.disabled = !inCompare && state.compareIds.length >= MAX_COMPARE;
    compare.addEventListener("click", function () {
      var next = state.compareIds.slice();
      var index = next.indexOf(tool.id);
      if (index === -1) next.push(tool.id);
      else next.splice(index, 1);
      writeState({ compareIds: next }, true);
    });
    actions.appendChild(compare);

    card.appendChild(actions);
    return card;
  }

  function renderResults() {
    var filtered = sortTools(tools.filter(matches));

    refs.results.textContent = "";
    groupTools(filtered).forEach(function (group) {
      var section = el("section", "stackGroup");
      var head = el("div", "stackGroupHead");
      head.appendChild(el("h3", null, group.label));
      head.appendChild(el("span", null, group.tools.length + (group.tools.length === 1 ? " tool" : " tools")));
      section.appendChild(head);

      var grid = el("div", "stackGrid");
      group.tools.forEach(function (tool) { grid.appendChild(buildCard(tool)); });
      section.appendChild(grid);
      refs.results.appendChild(section);
    });

    refs.empty.hidden = filtered.length !== 0;

    refs.status.textContent = "";
    var strong = el("strong", null, String(filtered.length));
    refs.status.appendChild(strong);
    refs.status.appendChild(document.createTextNode(
      (filtered.length === 1 ? " tool" : " tools") + " of " + tools.length +
      (state.saved ? " · showing your saved stack" : "")
    ));
  }

  // ---- Detail view ----------------------------------------------------------
  var TABS = [
    { id: "overview", label: "Overview" },
    { id: "start", label: "Getting started" },
    { id: "fit", label: "Where it fits" }
  ];

  function factRow(term, value) {
    var row = document.createElement("div");
    row.appendChild(el("dt", null, term));
    var dd = el("dd");
    if (typeof value === "string") dd.textContent = value;
    else dd.appendChild(value);
    row.appendChild(dd);
    return row;
  }

  // The access field is either a boolean or a sentence that sometimes carries the
  // service-page URL inline. All three shapes have to read as plain English, and
  // getting this wrong in either direction matters: it is the field that tells a
  // reader whether they may put Law School work into the tool.
  function accessNote(tool) {
    var access = tool.stanfordUniversitySlsProvidedAccess;

    if (access === true) {
      return document.createTextNode(
        "Provided through Stanford Law School or the Robert Crown Law Library. " +
        "Access uses Stanford sign-in and is limited to current SLS community members — " +
        "email library@law.stanford.edu to be set up."
      );
    }

    if (typeof access === "string" && access && access !== "false") {
      var match = access.match(/https?:\/\/\S+/);
      if (match) {
        var wrap = document.createDocumentFragment();
        var prose = access.replace(/\(?https?:\/\/\S+\)?/g, "").replace(/\s*(AND|and)\s*$/, "").trim();
        wrap.appendChild(document.createTextNode((prose || "Available through Stanford") + " — "));
        wrap.appendChild(externalLink(match[0].replace(/[)*.]+$/, ""), "see the service page"));
        return wrap;
      }
      return document.createTextNode(access);
    }

    return document.createTextNode(
      "Not provided by SLS or Stanford. Listing a tool here is not an endorsement, " +
      "and a personal account is covered by your own agreement with the vendor."
    );
  }

  function buildOverview(tool) {
    var body = document.createDocumentFragment();

    body.appendChild(el("p", null, tool.summary || tool.description));

    var facts = el("dl", "stackFactList");
    facts.appendChild(factRow("Best for", tool.bestFor || "—"));
    facts.appendChild(factRow("Category", tool._categories.join(", ")));
    facts.appendChild(factRow("Pricing tier", tool.tier || "—"));
    if (tool.parentCompany) facts.appendChild(factRow("Made by", tool.parentCompany));
    facts.appendChild(factRow("Stanford access", accessNote(tool)));
    if (tool.lastReviewed) facts.appendChild(factRow("Entry reviewed", tool.lastReviewed));
    body.appendChild(facts);

    if (tool.uses) {
      body.appendChild(el("h3", null, "Typical uses"));
      var tagWrap = el("div", "stackTagWrap");
      splitList(tool.uses).slice(0, 14).forEach(function (use) {
        tagWrap.appendChild(el("span", "stackBadge", use));
      });
      body.appendChild(tagWrap);
    }

    if (tool.features) {
      body.appendChild(el("h3", null, "What it does"));
      var featureList = el("ul", "stackLinkList");
      splitList(tool.features).slice(0, 18).forEach(function (feature) {
        featureList.appendChild(el("li", null, sentence(feature)));
      });
      body.appendChild(featureList);
    }

    return body;
  }

  function buildStart(tool) {
    var body = document.createDocumentFragment();

    body.appendChild(el("p", null,
      "Start on a low-stakes task you already know the answer to. That is the fastest way to " +
      "learn where a tool is strong and where it quietly invents things."));

    var steps = el("ol", "stackLinkList");
    [
      "Open the tool and confirm which access tier you are on — free, personal paid, or Stanford-provided.",
      "Run one small task you have already done yourself, and compare the two results.",
      "Check every citation, quotation, and figure against the primary source.",
      "Keep the prompt that worked. A reusable prompt is worth more than a new subscription."
    ].forEach(function (step) { steps.appendChild(el("li", null, step)); });
    body.appendChild(steps);

    var docs = (tool.officialTrainingDocs || []).concat(tool.helpUrls || []);
    var uniqueDocs = docs.filter(function (url, index) { return docs.indexOf(url) === index; });
    if (uniqueDocs.length) {
      body.appendChild(el("h3", null, "Documentation from the vendor"));
      var list = el("ul", "stackLinkList");
      uniqueDocs.slice(0, 8).forEach(function (url) {
        var item = el("li");
        item.appendChild(externalLink(url, url.replace(/^https?:\/\//, "")));
        list.appendChild(item);
      });
      body.appendChild(list);
    }

    var caution = el("p", "note");
    caution.appendChild(el("strong", null, "Before you upload anything. "));
    caution.appendChild(document.createTextNode(
      "Course policy governs whether AI is permitted for an assignment, and confidential, " +
      "client, or non-public material should not go into a tool Stanford has not approved. " +
      "Walk through the PAUSE Rule if you are unsure."
    ));
    body.appendChild(caution);

    return body;
  }

  function buildFit(tool) {
    var body = document.createDocumentFragment();

    body.appendChild(el("h3", null, "Where it fits in a stack"));
    body.appendChild(el("p", null,
      "This is a " + lower(tool._primary) + " tool. If you already have one you are fluent in, " +
      "the honest question is whether this one does something yours cannot — not whether it is newer."));

    if (tool.notGoodFor) {
      body.appendChild(el("h3", null, "What it is not good for"));
      body.appendChild(el("p", null, tool.notGoodFor));
    }

    var siblings = tools.filter(function (other) {
      return other.id !== tool.id && other._primary === tool._primary;
    }).slice(0, 6);

    if (siblings.length) {
      body.appendChild(el("h3", null, "Others in the same category"));
      var list = el("ul", "stackLinkList");
      siblings.forEach(function (other) {
        var item = el("li");
        var link = el("a", null, other.name);
        link.href = "#tool=" + encodeURIComponent(other.id);
        link.addEventListener("click", function (event) {
          event.preventDefault();
          openTool(other.id);
        });
        item.appendChild(link);
        item.appendChild(document.createTextNode(" — " + other.description));
        list.appendChild(item);
      });
      body.appendChild(list);
    }

    return body;
  }

  function renderDetail(tool) {
    refs.dialog.textContent = "";
    refs.dialog.setAttribute("aria-labelledby", "stack-dialog-title");

    var head = el("div", "stackDialogHead");
    var headText = el("div");
    headText.appendChild(el("h2", null, tool.name)).id = "stack-dialog-title";
    if (tool.formerNames) headText.appendChild(el("p", "stackCardFormer", tool.formerNames));
    headText.appendChild(el("p", "stackDialogSub", tool.bestFor || tool.description));
    head.appendChild(headText);
    head.appendChild(closeButton());
    refs.dialog.appendChild(head);

    var tabs = el("div", "stackTabs");
    tabs.setAttribute("role", "tablist");
    TABS.forEach(function (tab) {
      var button = el("button", "stackTab", tab.label);
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(state.tab === tab.id));
      button.addEventListener("click", function () { writeState({ tab: tab.id }, true); });
      tabs.appendChild(button);
    });
    refs.dialog.appendChild(tabs);

    var body = el("div", "stackDialogBody");
    if (state.tab === "start") body.appendChild(buildStart(tool));
    else if (state.tab === "fit") body.appendChild(buildFit(tool));
    else body.appendChild(buildOverview(tool));
    refs.dialog.appendChild(body);

    var foot = el("div", "stackDialogFoot");
    if (tool.url) {
      var visit = externalLink(tool.url, "Open " + tool.name);
      visit.className = "primary";
      foot.appendChild(visit);
    }

    var footActions = el("div", "actions");
    footActions.style.margin = "0";

    var save = el("button", "stackChip", isSaved(tool.id) ? "Saved to your stack" : "Save to your stack");
    save.type = "button";
    save.setAttribute("aria-pressed", String(isSaved(tool.id)));
    save.addEventListener("click", function () {
      toggleSaved(tool.id);
      render();
    });
    footActions.appendChild(save);

    var inCompare = state.compareIds.indexOf(tool.id) !== -1;
    var compare = el("button", "stackChip", inCompare ? "In comparison" : "Add to comparison");
    compare.type = "button";
    compare.setAttribute("aria-pressed", String(inCompare));
    compare.disabled = !inCompare && state.compareIds.length >= MAX_COMPARE;
    compare.addEventListener("click", function () {
      var next = state.compareIds.slice();
      var index = next.indexOf(tool.id);
      if (index === -1) next.push(tool.id);
      else next.splice(index, 1);
      writeState({ compareIds: next }, true);
    });
    footActions.appendChild(compare);
    foot.appendChild(footActions);

    refs.dialog.appendChild(foot);
  }

  // ---- Comparison -----------------------------------------------------------
  var COMPARE_ROWS = [
    {
      label: "What it is for",
      rows: [
        { label: "Best for", value: function (tool) { return tool.bestFor || "—"; } },
        { label: "Primary category", value: function (tool) { return tool._primary; } },
        { label: "Made by", value: function (tool) { return tool.parentCompany || "—"; } }
      ]
    },
    {
      label: "Access and cost",
      rows: [
        { label: "Pricing tier", value: function (tool) { return tool.tier || "—"; } },
        { label: "Stanford access", value: function (tool) { return tool._stanford ? "Yes" : "No"; } },
        { label: "Library pick", value: function (tool) { return tool.robertCrownLawLibraryFavorite ? "Yes" : "—"; } }
      ]
    },
    {
      label: "Status",
      rows: [
        { label: "Still current", value: function (tool) { return tool._retired ? "Retired or historical" : "Current"; } },
        { label: "Vendor documentation", value: function (tool) { return (tool.officialTrainingDocs || []).length ? "Yes" : "—"; } },
        { label: "Entry reviewed", value: function (tool) { return tool.lastReviewed || "—"; } }
      ]
    }
  ];

  function renderCompare() {
    var chosen = state.compareIds.map(function (id) {
      return tools.filter(function (tool) { return tool.id === id; })[0];
    }).filter(Boolean);

    refs.dialog.textContent = "";
    refs.dialog.setAttribute("aria-labelledby", "stack-dialog-title");

    var head = el("div", "stackDialogHead");
    var headText = el("div");
    headText.appendChild(el("h2", null, "Compare tools")).id = "stack-dialog-title";
    headText.appendChild(el("p", "stackDialogSub",
      chosen.length ? "Rows where the tools differ are marked." : "Add up to three tools from the catalogue."));
    head.appendChild(headText);
    head.appendChild(closeButton());
    refs.dialog.appendChild(head);

    var body = el("div", "stackDialogBody");

    if (!chosen.length) {
      body.appendChild(el("p", null,
        "Nothing selected yet. Use the ⇆ button on a tool card to add it here."));
    } else {
      var scroll = el("div", "stackTableScroll");
      var table = el("table", "stackCompareTable");

      var thead = el("thead");
      var headRow = el("tr");
      headRow.appendChild(el("th", null, ""));
      chosen.forEach(function (tool) { headRow.appendChild(el("th", null, tool.name)); });
      thead.appendChild(headRow);
      table.appendChild(thead);

      COMPARE_ROWS.forEach(function (group) {
        var tbody = el("tbody");
        var groupRow = el("tr", "stackCompareGroup");
        var groupCell = el("th", null, group.label);
        groupCell.colSpan = chosen.length + 1;
        groupRow.appendChild(groupCell);
        tbody.appendChild(groupRow);

        group.rows.forEach(function (row) {
          var values = chosen.map(row.value);
          var differs = values.some(function (value) { return value !== values[0]; });
          var tr = el("tr", differs ? "isDifferent" : null);
          var th = el("th", null, row.label);
          th.scope = "row";
          tr.appendChild(th);
          values.forEach(function (value) { tr.appendChild(el("td", null, value)); });
          tbody.appendChild(tr);
        });

        table.appendChild(tbody);
      });

      scroll.appendChild(table);
      body.appendChild(scroll);
    }

    refs.dialog.appendChild(body);

    var foot = el("div", "stackDialogFoot");
    var clear = el("button", "stackChip", "Clear comparison");
    clear.type = "button";
    clear.addEventListener("click", function () { writeState({ compareIds: [] }, true); });
    foot.appendChild(clear);
    refs.dialog.appendChild(foot);
  }

  function closeButton() {
    var close = el("button", "stackClose");
    close.type = "button";
    close.innerHTML = "&#10005;";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", closeOverlay);
    return close;
  }

  // ---- Overlay plumbing -----------------------------------------------------
  // Focus is moved into the dialog on open and restored on close, and Tab is
  // trapped inside it, so the overlay is usable without a mouse.
  var lastFocused = null;

  function focusable() {
    var nodes = refs.dialog.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex=\"-1\"])");
    return Array.prototype.slice.call(nodes);
  }

  function onDialogKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeOverlay();
      return;
    }
    if (event.key !== "Tab") return;
    var targets = focusable();
    if (!targets.length) return;
    var first = targets[0];
    var last = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Opening pushes a history entry, so Back closes the overlay instead of
  // leaving the page. Closing replaces that entry rather than pushing another,
  // so a reader who opened three tools in a row does not have to press Back
  // six times to get out.
  function openTool(id) {
    writeState({ tool: id, tab: "overview", open: "" }, false);
  }

  function showCompare() {
    writeState({ open: "compare", tool: "" }, false);
  }

  function closeOverlay() {
    writeState({ tool: "", tab: "overview", open: "" }, true);
  }

  function renderOverlay() {
    var tool = state.tool ? tools.filter(function (item) { return item.id === state.tool; })[0] : null;
    var shouldShow = Boolean(tool) || state.open === "compare";

    if (!shouldShow) {
      if (!refs.overlay.hidden) {
        refs.overlay.hidden = true;
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onDialogKeydown, true);
        if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
        lastFocused = null;
      }
      return;
    }

    var wasHidden = refs.overlay.hidden;
    if (wasHidden) lastFocused = document.activeElement;

    if (tool) renderDetail(tool);
    else renderCompare();

    refs.overlay.hidden = false;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onDialogKeydown, true);
    if (wasHidden) {
      var targets = focusable();
      if (targets.length) targets[0].focus();
      else refs.dialog.focus();
    }
  }

  // ---- Retired tools --------------------------------------------------------
  var STATUS_LABELS = {
    scheduled_shutdown: "Shutdown scheduled",
    service_retired: "Service retired",
    offline: "Offline",
    product_wound_down: "Product wound down",
    acquired_and_wound_down: "Acquired, then wound down",
    defunct_company: "Company defunct"
  };

  function renderRetired() {
    if (!refs.retired) return;
    refs.retired.textContent = "";

    retired.forEach(function (item) {
      var card = el("article", "card stackRetiredCard");
      card.appendChild(el("h3", null, item.platformName));
      card.appendChild(el("p", "stackRetiredCompany", item.parentCompany));

      var badges = el("div", "stackBadges");
      badges.appendChild(el("span", "stackBadge isRetired", STATUS_LABELS[item.status] || item.status));
      card.appendChild(badges);

      card.appendChild(el("p", null, item.summary));
      card.appendChild(el("p", "muted", item.reasonDiscontinued));

      var dates = el("div", "stackRetiredDates");
      Object.keys(item.datesActive || {}).forEach(function (key) {
        var label = key.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
        dates.appendChild(el("p", null, label + ": " + item.datesActive[key]));
      });
      card.appendChild(dates);

      if ((item.relevantUrls || []).length) {
        var list = el("ul", "stackLinkList");
        item.relevantUrls.slice(0, 3).forEach(function (url) {
          var li = el("li");
          li.appendChild(externalLink(url, "Announcement"));
          list.appendChild(li);
        });
        card.appendChild(list);
      }

      refs.retired.appendChild(card);
    });

    if (refs.retiredMeta && retiredMeta.generatedAt) {
      refs.retiredMeta.textContent = retired.length + " products, checked through " + retiredMeta.generatedAt + ".";
    }
  }

  // ---- Export ---------------------------------------------------------------
  function savedTools() {
    return tools.filter(function (tool) { return isSaved(tool.id); });
  }

  function downloadSaved() {
    var chosen = savedTools();
    if (!chosen.length) return;

    var lines = ["# My AI stack", "", "Saved from the AI Learning Hub, Robert Crown Law Library.", ""];
    chosen.forEach(function (tool) {
      lines.push("## " + tool.name);
      if (tool.formerNames) lines.push("_" + tool.formerNames + "_");
      lines.push("");
      lines.push(tool.description);
      lines.push("");
      lines.push("- Category: " + tool._categories.join(", "));
      lines.push("- Best for: " + (tool.bestFor || "—"));
      lines.push("- Pricing tier: " + (tool.tier || "—"));
      lines.push("- Stanford access: " + (tool._stanford ? "yes" : "no — personal account, not an SLS-provided tool"));
      if (tool.url) lines.push("- Site: " + tool.url);
      lines.push("");
    });
    lines.push("---");
    lines.push("Listing a tool is not an endorsement and does not mean SLS provides access.");
    lines.push("Course policy decides whether AI is permitted for an assignment.");

    var blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "my-ai-stack.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ---- Render ---------------------------------------------------------------
  function render() {
    renderRail();
    renderQuick();
    renderChips();
    renderResults();
    renderOverlay();

    if (refs.search.value !== state.q) refs.search.value = state.q;
    refs.sort.value = state.sort;

    refs.savedToggle.setAttribute("aria-pressed", String(Boolean(state.saved)));
    refs.savedCount.textContent = String(saved.length);
    refs.compareCount.textContent = String(state.compareIds.length);
    refs.compareBtn.disabled = state.compareIds.length === 0;
    refs.exportBtn.disabled = saved.length === 0;
    refs.downloadBtn.disabled = saved.length === 0;
  }

  // ---- Wiring ---------------------------------------------------------------
  var searchTimer = null;
  refs.search.addEventListener("input", function () {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () {
      writeState({ q: refs.search.value }, true);
    }, 180);
  });

  refs.sort.addEventListener("change", function () {
    writeState({ sort: refs.sort.value }, true);
  });

  refs.savedToggle.addEventListener("click", function () {
    writeState({ saved: state.saved ? "" : "1" }, true);
  });

  refs.compareBtn.addEventListener("click", showCompare);

  refs.clearBtn.addEventListener("click", function () {
    refs.search.value = "";
    writeState({ q: "", cat: "All", view: "", saved: "" }, true);
  });

  refs.exportBtn.addEventListener("click", function () {
    // Printing the saved-only view is the dependency-free "export to PDF": every
    // browser's print dialog can save to PDF, and the print stylesheet drops the
    // filters and buttons so the sheet is just the tools.
    if (!state.saved) writeState({ saved: "1" }, true);
    window.setTimeout(function () { window.print(); }, 120);
  });

  refs.downloadBtn.addEventListener("click", downloadSaved);

  refs.overlay.addEventListener("click", function (event) {
    if (event.target === refs.overlay) closeOverlay();
  });

  // pushState and replaceState do not fire either event, so these only run when
  // the reader navigates: Back, Forward, or a pasted link.
  window.addEventListener("hashchange", function () {
    state = readState();
    render();
  });

  window.addEventListener("popstate", function () {
    state = readState();
    render();
  });

  // "/" jumps to the search box, the shortcut readers expect from every other
  // catalogue; Escape in the box clears it.
  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      event.preventDefault();
      // Scroll first: the search box may be far above the reader's position in
      // a 113-card grid, and focusing an off-screen input is disorienting.
      refs.search.scrollIntoView({ block: "center" });
      refs.search.focus();
      refs.search.select();
    } else if (event.key === "Escape" && document.activeElement === refs.search && refs.search.value) {
      refs.search.value = "";
      writeState({ q: "" }, true);
    }
  });

  // Back-to-top, and the jump bar marking whichever section is on screen.
  if (refs.toTop) {
    refs.toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
      refs.toTop.blur();
    });
  }

  // The site header is fixed and its height changes as the nav wraps — 109px at
  // laptop width, 151px when the row breaks, 117px on a phone. Anything sticky
  // has to sit below whatever it happens to be, so the two offsets are measured
  // rather than guessed and published as custom properties for the stylesheet.
  function measureSticky() {
    var header = document.querySelector(".siteHeader");
    var headerHeight = header ? header.getBoundingClientRect().height : 104;
    var jumpHeight = refs.jump ? refs.jump.getBoundingClientRect().height : 52;
    var root = document.documentElement;
    root.style.setProperty("--stack-sticky-top", Math.round(headerHeight + 8) + "px");
    // The group heading butts straight up against the jump bar. Leaving a gap
    // there lets the top edge of a card show through it, which reads as a
    // rendering fault rather than as breathing room.
    root.style.setProperty("--stack-sticky-head", Math.round(headerHeight + jumpHeight + 8) + "px");
    root.style.setProperty("--stack-sticky-next", Math.round(headerHeight + jumpHeight + 24) + "px");
  }

  measureSticky();
  window.addEventListener("resize", measureSticky);

  var jumpLinks = refs.jump ? Array.prototype.slice.call(refs.jump.querySelectorAll("a[href^='#']")) : [];
  var jumpTargets = jumpLinks.map(function (link) {
    return document.getElementById(link.getAttribute("href").slice(1));
  });

  function onScroll() {
    if (refs.toTop) refs.toTop.hidden = window.scrollY < 600;

    var active = -1;
    jumpTargets.forEach(function (target, index) {
      if (target && target.getBoundingClientRect().top <= 200) active = index;
    });
    jumpLinks.forEach(function (link, index) {
      if (index === active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  // The jump links are plain anchors, so they must not be swallowed by the hash
  // router: they scroll, and the router state is left alone.
  jumpLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      var target = document.getElementById(link.getAttribute("href").slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  renderRetired();
  render();
  onScroll();
}());
