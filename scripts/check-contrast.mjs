// =============================================================================
// Check text contrast in both zones and both themes.
//
//     PLAYWRIGHT_PATH=/path/to/playwright/index.js node scripts/check-contrast.mjs
//
// The site has two palettes now -- Stanford cardinal on the excerpt, WolfCon blue
// on the demo -- each in light and dark, so a colour change has four places to go
// wrong and eyeballing them does not scale. This renders each combination, reads
// the *computed* colours off the page rather than the stylesheet, and applies the
// WCAG AA floor for each element's own size and weight: 3.0 for large text, 4.5
// for everything else. Non-zero exit on any failure.
//
// Needs Playwright, like the search index builder used to, so it is a maintainer
// step rather than a build step.
// =============================================================================

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
const ROOT=process.cwd();
const T={".html":"text/html",".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",".zip":"application/zip",".md":"text/markdown"};
const s=createServer(async(req,res)=>{const p=decodeURIComponent(req.url.split("?")[0]);
 try{const b=await readFile(join(ROOT,p==="/"?"index.html":p));res.writeHead(200,{"content-type":T[extname(p)]||"application/octet-stream"});res.end(b);}catch{res.writeHead(404).end("nf");}});
await new Promise(r=>s.listen(8807,r));
const pw=await import("/opt/node22/lib/node_modules/playwright/index.js");
const br=await (pw.chromium||pw.default.chromium).launch();
const errs = [];

// Measure real rendered colours and compute WCAG contrast in the page.
const probe = () => {
  const lum = c => { const [r,g,b] = c.match(/\d+(\.\d+)?/g).slice(0,3).map(Number)
    .map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); });
    return 0.2126*r + 0.7152*g + 0.0722*b; };
  const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const out = [];
  const add = (name, el, bg) => { if (!el) return;
    const cs = getComputedStyle(el);
    out.push({name, r: +ratio(cs.color, bg || bodyBg).toFixed(2),
              size: parseFloat(cs.fontSize), weight: cs.fontWeight}); };
  add("body text", document.querySelector("main p.muted, main p"));
  add("heading", document.querySelector("main h1, main h2"));
  add("eyebrow", document.querySelector("main .eyebrow"));
  add("link", document.querySelector("main a:not(.card):not(.primary):not(.downloadButton):not(.secondary)"));
  const btn = document.querySelector(".primary, .downloadButton");
  if (btn) { const cs = getComputedStyle(btn);
    // gradient: sample the mid stop declared on the element
    const mid = cs.getPropertyValue("--cardinal").trim() || "#000";
    const probeEl = document.createElement("span"); probeEl.style.color = mid;
    document.body.appendChild(probeEl); const solved = getComputedStyle(probeEl).color; probeEl.remove();
    out.push({name:"primary button label", r:+ratio(cs.color, solved).toFixed(2),
              size: parseFloat(cs.fontSize), weight: cs.fontWeight});
  }
  const tog = document.querySelector(".zoneToggle a[aria-current]");
  if (tog) { const cs = getComputedStyle(tog);
    out.push({name:"toggle active", r:+ratio(cs.color, cs.backgroundColor).toFixed(2),
              size: parseFloat(cs.fontSize), weight: cs.fontWeight}); }
  return {bodyBg, out};
};

for (const page of ["index.html","agent-instructions.html","excerpt.html","skills.html"]) {
  for (const theme of ["light","dark"]) {
    const pg=await (await br.newContext({viewport:{width:1280,height:900}})).newPage();
    await pg.goto(`http://localhost:8807/${page}`);
    await pg.evaluate(t=>{try{localStorage.setItem("theme",t)}catch(e){}}, theme);
    await pg.reload({waitUntil:"networkidle"});
    const {bodyBg, out} = await pg.evaluate(probe);
    const zone = await pg.evaluate(()=>document.documentElement.getAttribute("data-zone")||"excerpt");
    console.log(`\n${page} [${theme}] zone=${zone} bg=${bodyBg}`);
    for (const o of out) {
      // AA: 4.5 normal, 3.0 for >=24px, or >=18.66px bold
      const large = o.size >= 24 || (o.size >= 18.66 && +o.weight >= 700);
      const need = large ? 3.0 : 4.5;
      const ok = o.r >= need;
      if (!ok) errs.push(`${page} [${theme}] ${o.name}: ${o.r}:1 (needs ${need})`);
      console.log(`   ${ok?"PASS":"FAIL"} ${o.name.padEnd(22)} ${String(o.r).padStart(6)}:1  (needs ${need})`);
    }
    await pg.close();
  }
}
await br.close(); s.close();
if (errs.length) { console.error("\nCONTRAST FAILURES:\n"+errs.join("\n")); process.exit(1); }
console.log("\nevery measured pairing clears WCAG AA in both themes and both zones");
