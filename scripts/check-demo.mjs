// =============================================================================
// Check the demo page's three moving parts.
//
//     PLAYWRIGHT_PATH=/path/to/playwright/index.js node scripts/check-demo.mjs
//
// The recording is a third-party frame, the prompt exists twice (in the page and
// as a .txt beside it, with nothing generating one from the other), and the brief
// is a binary that has to actually serve. Each can break quietly, so each is
// asserted: the iframe points at the right file and lays out 16/9, the page's
// prompt matches the file character for character, and the download delivers.
// Non-zero exit on any failure.
// =============================================================================

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
const ROOT=process.cwd();
const T={".html":"text/html",".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",".zip":"application/zip",".md":"text/markdown",".txt":"text/plain",
  ".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document"};
const s=createServer(async(req,res)=>{const p=decodeURIComponent(req.url.split("?")[0]);
 try{const b=await readFile(join(ROOT,p==="/"?"index.html":p));res.writeHead(200,{"content-type":T[extname(p)]||"application/octet-stream"});res.end(b);}catch{res.writeHead(404).end("nf");}});
await new Promise(r=>s.listen(8811,r));
const pw=await import("/opt/node22/lib/node_modules/playwright/index.js");
const br=await (pw.chromium||pw.default.chromium).launch();
const errs=[];
const pg=await (await br.newContext({viewport:{width:1280,height:1000},acceptDownloads:true})).newPage();
pg.on("console",m=>{if(m.type()==="error")errs.push(m.text())});
pg.on("response",r=>{if(r.status()>=400&&r.url().includes("localhost"))errs.push(r.status()+" "+r.url())});
await pg.goto("http://localhost:8811/index.html",{waitUntil:"domcontentloaded"});
await pg.waitForTimeout(1200);
// video
const src = await pg.getAttribute(".videoFigure iframe","src");
console.log("video iframe src :", src);
if (!src || !src.includes("1AuabCbBc0b-4cgZ3f06X9-aYNFk9DL6l/preview")) errs.push("wrong video src");
const box = await pg.locator(".videoFigure iframe").boundingBox();
console.log("video box        :", Math.round(box.width)+"x"+Math.round(box.height),
            "ratio", (box.width/box.height).toFixed(2));
if (Math.abs(box.width/box.height - 16/9) > 0.05) errs.push("iframe not 16/9");
if (await pg.locator(".videoPlaceholder").count()) errs.push("placeholder still present");
// prompt copy box
const promptText = (await pg.locator("#demo-prompt").innerText()).trim();
console.log("prompt in page   :", promptText.length, "chars; copy button:",
            await pg.locator('[data-copy-target="demo-prompt"]').count(),
            "visible:", await pg.locator('[data-copy-target="demo-prompt"]').isVisible());
const src2 = (await (await import("node:fs/promises")).readFile("assets/demo-research-prompt.txt","utf8")).trim();
if (promptText.replace(/\s+/g," ") !== src2.replace(/\s+/g," ")) errs.push("page prompt differs from the .txt copy");
// the brief downloads
const [dl]=await Promise.all([pg.waitForEvent("download"),
  pg.locator('a[href="assets/generative-ai-writing-feedback-research-brief.docx"]').click()]);
const {size}=await stat(await dl.path());
console.log("brief download   :", dl.suggestedFilename(), size, "bytes");
if (size < 50000) errs.push("brief too small");
await br.close(); s.close();
if (errs.length) { console.error("\nISSUES:\n"+[...new Set(errs)].join("\n")); process.exit(1); }
console.log("\nvideo embedded 16/9, prompt matches its file, brief downloads, no local errors");
