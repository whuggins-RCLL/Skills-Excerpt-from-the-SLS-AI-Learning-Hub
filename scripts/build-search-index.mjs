// =============================================================================
// Build the search index the hub searches.
//
//     node scripts/build-search-index.mjs           # write assets/search-index.js
//     node scripts/build-search-index.mjs --check   # non-zero if it is out of date
//
// The header search used to hand the query to Google with a site: filter, which
// only ever worked if Google had crawled the deployment. It had not, so the
// search box returned nothing on a site whose pages plainly contain the words.
// The hub is small enough — about 136 kB of text across sixteen pages — to carry
// its own index and answer from it, with no third party and nothing to crawl.
//
// The pages are read from a rendered browser rather than from the HTML, because
// three of them build their content from arrays at the bottom of the file
// (tutorials, the library display, Your AI Stack). Reading the DOM after render
// indexes what a reader actually sees, and keeps working when a page changes
// how it is built.
//
// Needs Playwright, like nothing else in this repository, so it is a maintainer
// step rather than a build step: re-run it after editing page content and commit
// the result.
// =============================================================================

import { createServer } from "node:http";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "search-index.js");

// The two full-page frames carry someone else's site and nothing of ours, the
// search page itself would only ever match its own furniture, and the embed-code
// list is a maintenance page no reader is looking for.
const SKIP = new Set(["faculty.html", "ai-upload.html", "search.html", "embed-codes.html"]);

const TYPES = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".mp4": "video/mp4", ".pdf": "application/pdf", ".zip": "application/zip",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".md": "text/markdown",
};

function serve(port) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split("?")[0]);
    try {
      const body = await readFile(join(ROOT, path === "/" ? "index.html" : path));
      res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

// Runs inside the page. Splits the rendered <main> into the smallest useful
// pieces: one per card where a page is built from cards, otherwise one per
// section that carries an id, so a result can link to the place it was found.
function extract() {
  const main = document.querySelector("main");
  if (!main) return null;

  const CARD = "article.card, a.card, article.skillCard, .tutorialCard, .eventCard, .guideCard";
  const CONTAINER = "section[id], article[id], div[id]";
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "SVG", "BUTTON"]);

  const pageTitle = (main.querySelector("h1")?.textContent || document.title).replace(/\s+/g, " ").trim();
  const buckets = new Map();
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement;
    if (!el) continue;

    let skip = false;
    for (let p = el; p && p !== main.parentElement; p = p.parentElement) {
      if (SKIP_TAGS.has(p.tagName) || p.classList?.contains("srOnly") || p.hidden) { skip = true; break; }
    }
    if (skip) continue;

    const text = clean(node.textContent);
    if (!text) continue;

    const card = el.closest(CARD);
    const container = (card || el).closest(CONTAINER);
    const anchor = container && container.id && container.id !== "main" ? container.id : "";

    let key, heading;
    if (card) {
      if (!card.dataset.searchKey) card.dataset.searchKey = "card-" + buckets.size;
      key = card.dataset.searchKey;
      heading = clean(card.querySelector("h2, h3, h4")?.textContent) || clean(container?.querySelector("h2")?.textContent);
    } else {
      key = "sec-" + anchor;
      heading = clean(container?.querySelector("h1, h2, h3")?.textContent) || pageTitle;
    }

    if (!buckets.has(key)) buckets.set(key, { anchor, heading, parts: [] });
    buckets.get(key).parts.push(text);
  }

  return {
    pageTitle,
    description: clean(document.querySelector('meta[name="description"]')?.content),
    entries: [...buckets.values()]
      .map((b) => {
        // The heading is stored separately and shown above the snippet, so
        // leaving it in the text makes every snippet open by repeating the
        // title it sits under.
        let text = b.parts.join(" ");
        if (b.heading) {
          const at = text.indexOf(b.heading);
          if (at > -1 && at < 120) text = clean(text.slice(0, at) + " " + text.slice(at + b.heading.length));
        }
        return { anchor: b.anchor, heading: b.heading, text };
      })
      .filter((b) => b.text.length > 40),
  };
}

const port = 8791;
const server = await serve(port);
// Playwright is normally a local dependency; PLAYWRIGHT_PATH lets a machine
// with only a global install point at it instead of vendoring node_modules here.
const pw = await import(process.env.PLAYWRIGHT_PATH || "playwright").catch((error) => {
  console.error("this script needs Playwright:  npm i -D playwright");
  console.error("or run it as:  PLAYWRIGHT_PATH=/path/to/playwright/index.js node scripts/build-search-index.mjs");
  throw error;
});
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

const pages = (await readdir(ROOT)).filter((f) => f.endsWith(".html") && !SKIP.has(f)).sort();
const index = [];

for (const file of pages) {
  await page.goto(`http://localhost:${port}/${file}`, { waitUntil: "networkidle" });
  const result = await page.evaluate(extract);
  if (!result) { console.warn(`skipped ${file} (no <main>)`); continue; }
  for (const entry of result.entries) {
    index.push({
      u: file + (entry.anchor ? "#" + entry.anchor : ""),
      p: result.pageTitle,
      h: entry.heading,
      t: entry.text,
    });
  }
  console.log(`${file.padEnd(42)} ${String(result.entries.length).padStart(3)} entries`);
}

await browser.close();
server.close();

const payload =
  "// Generated by scripts/build-search-index.mjs — do not hand-edit.\n" +
  "// Re-run that script after changing page content, and commit the result.\n" +
  "window.HUB_SEARCH_INDEX = " +
  JSON.stringify(index) +
  ";\n";

if (process.argv.includes("--check")) {
  const current = await readFile(OUT, "utf8").catch(() => "");
  if (current !== payload) {
    console.error("out of date: assets/search-index.js does not match the pages");
    console.error("run: node scripts/build-search-index.mjs");
    process.exit(1);
  }
  console.log("search index is up to date");
} else {
  await writeFile(OUT, payload);
  console.log(`\nwrote assets/search-index.js — ${index.length} entries, ${(payload.length / 1024).toFixed(0)} kB`);
}
