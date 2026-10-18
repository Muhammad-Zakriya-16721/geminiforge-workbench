// Runtime-content tests: live refresh, saved copy, blocked network, bad bundles. Needs a build with VITE_SUPABASE_* set.
import { chromium } from "playwright-core";
const exe = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const base = process.env.BASE || "http://127.0.0.1:5198/";
let bad = 0, n = 0;
const ok = (name, c, x = "") => { n++; if (!c) bad++; console.log(`${c ? "PASS" : "FAIL"} | ${name}${x ? " | " + x : ""}`); };
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const RPC = "**/rest/v1/rpc/get_content_bundle";
const fresh = async () => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); page.errs = []; page.on("pageerror", (e) => page.errs.push(e.message)); return page; };
const open = async (p, q = "") => { await p.goto(`${base}?gftest${q}#/chapter/overview`, { waitUntil: "networkidle" }); await p.waitForTimeout(400); };
const side = (p) => p.evaluate(() => document.querySelector(".side").textContent);
const cached = (p) => p.evaluate(() => { const r = localStorage.getItem("geminiforge_content_v1"); return r ? JSON.parse(r).version : null; });

// the built-in bundle, taken from the app itself
const p0 = await fresh(); await open(p0, "&nolive");
const snap = await p0.evaluate(() => window.__gf.contentSnapshot(99));
const rejects = await p0.evaluate((s) => { const v = window.__gf.validateBundle, c = (x) => JSON.parse(JSON.stringify(x)); const r = [];
  r.push(v(s) !== null);
  r.push(v(null) === null, v({}) === null, v("x") === null);
  let x = c(s); x.chapters = []; r.push(v(x) === null);
  x = c(s); delete x.chapterBlocks[x.chapters[0].id]; r.push(v(x) === null);
  x = c(s); x.packs[0].name = 5; r.push(v(x) === null);
  x = c(s); x.roster[0].budgetMicros = "1"; r.push(v(x) === null);
  x = c(s); x.chapterBlocks[x.chapters[0].id].push({ t: "nope" }); r.push(v(x) === null);
  x = c(s); x.chapterBlocks[x.chapters[0].id].push({ t: "chart", id: "zzz" }); r.push(v(x) === null);
  x = c(s); x.claimsConfirmed = [1]; r.push(v(x) === null);
  return r; }, snap);
ok("validateBundle: accepts the built-in bundle, rejects 10 malformed ones", rejects.every(Boolean), rejects.map(Number).join(""));
const title0 = snap.chapters[0].title;
await p0.context().close();

// 1. network blocked: built-in content, no errors
let p = await fresh(); await p.route(RPC, (r) => r.abort());
await open(p);
ok("blocked network: built-in documentation shown", (await side(p)).includes(title0) && (await cached(p)) === null);
ok("blocked network: no page errors", p.errs.length === 0, p.errs.join("|"));
await p.context().close();

// 2. server returns 500
p = await fresh(); await p.route(RPC, (r) => r.fulfill({ status: 500, body: "{}" }));
await open(p);
ok("server error: built-in documentation kept", (await side(p)).includes(title0) && (await cached(p)) === null);
await p.context().close();

// 3. changed bundle -> applied, cached; next start offline -> saved copy
const changed = JSON.parse(JSON.stringify(snap)); changed.chapters[0].title = "LIVE-CHANGED TITLE"; changed.packs[0].name = "LIVE-CHANGED PACK"; changed.version = 123;
p = await fresh(); await p.route(RPC, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(changed) }));
await open(p);
ok("live bundle: new chapter title shown after refresh", (await side(p)).includes("LIVE-CHANGED TITLE"));
ok("live bundle: saved copy stored (version 123)", (await cached(p)) === 123);
await p.goto(`${base}?gftest#/chapter/packs`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
ok("live bundle: changed pack shown in the chapter", (await p.evaluate(() => document.body.textContent)).includes("LIVE-CHANGED PACK"));
ok("live bundle: no page errors", p.errs.length === 0, p.errs.join("|"));
await p.unroute(RPC); await p.route(RPC, (r) => r.abort());
await open(p);
ok("saved copy used when offline at next start", (await side(p)).includes("LIVE-CHANGED TITLE"));
// 3b. a live update must not throw the reader back to the top
const j = JSON.parse(JSON.stringify(snap)); j.version = 200; j.chapters[0].title = "SCROLL-KEEP TITLE";
p = await fresh(); await p.route(RPC, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(snap) }));
await p.goto(`${base}?gftest#/chapter/overview`, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
await p.evaluate(() => { const t = document.querySelector(".thread"); t.scrollTop = 700; t.dispatchEvent(new Event("scroll")); });
await p.waitForTimeout(200);
const before = await p.evaluate(() => document.querySelector(".thread").scrollTop);
await p.unroute(RPC); await p.route(RPC, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(j) }));
await p.evaluate(() => window.__gf.refreshContent(true)); await p.waitForTimeout(700);
const after = await p.evaluate(() => document.querySelector(".thread").scrollTop);
ok("live update keeps the scroll position", before > 400 && Math.abs(after - before) < 5 && (await side(p)).includes("SCROLL-KEEP TITLE"), `before=${before} after=${after}`);
await p.context().close();
// 4. a bad bundle later must not replace the saved copy
await p.unroute(RPC); const broken = JSON.parse(JSON.stringify(snap)); broken.version = 124; broken.chapters[0].title = "BROKEN"; delete broken.chapterBlocks[broken.chapters[0].id];
await p.route(RPC, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(broken) }));
await open(p);
const s4 = await side(p);
ok("bad bundle: ignored, saved copy and screen unchanged", !s4.includes("BROKEN") && s4.includes("LIVE-CHANGED TITLE") && (await cached(p)) === 123);
await p.context().close();

// 5. ?nolive never calls the server
p = await fresh(); let hit = 0; await p.route(RPC, (r) => { hit++; r.abort(); });
await open(p, "&nolive");
ok("?nolive: server not called", hit === 0, `calls=${hit}`);
await p.context().close();
await browser.close();
console.log(`\n${n - bad}/${n} content checks passed`);
process.exit(bad ? 1 : 0);
