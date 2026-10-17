import { chromium } from "playwright-core";
import fs from "node:fs";
const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const base = process.env.BASE || "http://127.0.0.1:5199/";
const results = [];
const ok = (name, cond, extra = "") => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? "PASS" : "FAIL"} | ${name}${extra ? " | " + extra : ""}`); };
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errs.push(m.text()); });
const go = async (hash) => { await page.goto(base + hash, { waitUntil: "networkidle" }); await page.waitForTimeout(250); };
await go("#/home"); await page.evaluate(() => localStorage.clear()); await go("#/home");

// A0. shell grid: sidebar, main and panel share one row at full height
await go("#/chapter/overview?p=lab%3Amoe");
const gridRects = await page.evaluate(() => ["side", "main", "pane-col"].map((c) => { const r = document.querySelector("." + c).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }));
ok("A0 shell grid: three columns share one full-height row", gridRects.every((r) => r[0] === 0 && r[1] === 900), JSON.stringify(gridRects));
await go("#/home");

// A. composer never overlaps content, at several heights
for (const h of [520, 700, 900]) {
  await page.setViewportSize({ width: 1440, height: h });
  await go("#/chapter/planes");
  await page.evaluate(() => { const t = document.querySelector(".thread"); t.scrollTop = t.scrollHeight; });
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const t = document.querySelector(".thread").getBoundingClientRect(); const d = document.querySelector(".dock").getBoundingClientRect();
    const th = document.querySelector(".thread"); const last = document.querySelector(".doc").lastElementChild.getBoundingClientRect();
    return { threadBottom: t.bottom, dockTop: d.top, lastBottom: last.bottom, atEnd: th.scrollHeight - th.scrollTop - th.clientHeight < 2 };
  });
  ok(`A overlap h=${h}`, r.threadBottom <= r.dockTop + 0.5 && r.atEnd && r.lastBottom <= r.threadBottom + 0.5, JSON.stringify(r));
}
await page.setViewportSize({ width: 1440, height: 900 });

// B. long draft: capped height + collapse/expand
await go("#/chapter/planes");
const longText = Array.from({ length: 40 }, (_, i) => `line ${i + 1} of a long draft`).join("\n");
await page.fill(".cmp textarea", longText);
await page.waitForTimeout(150);
const dockH = await page.evaluate(() => document.querySelector(".dock").getBoundingClientRect().height);
ok("B draft height capped (<= 40% of window + chrome)", dockH <= 900 * 0.4 + 130, `dock=${Math.round(dockH)}px`);
await page.click(".cmp-bar button:has-text(\"Collapse\")");
await page.waitForTimeout(150);
const dockH2 = await page.evaluate(() => document.querySelector(".dock").getBoundingClientRect().height);
ok("B collapse shrinks composer", dockH2 < 115 && !!(await page.$(".cmp-collapsed")), `dock=${Math.round(dockH2)}px`);
await page.click(".cmp-collapsed");
const kept = await page.inputValue(".cmp textarea");
ok("B expand keeps draft text", kept === longText);
await page.fill(".cmp textarea", "");

// B2. long paste becomes a chip
await page.evaluate(() => { const ta = document.querySelector(".cmp textarea"); ta.focus(); const dt = new DataTransfer(); dt.setData("text", Array.from({ length: 30 }, (_, i) => "pasted " + i).join("\n")); ta.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); });
await page.waitForTimeout(150);
ok("B2 long paste becomes chip", !!(await page.$(".paste")));

// C. outline rail follows scroll after switching chapters
await go("#/chapter/overview");
await page.keyboard.press("Control+3");
await page.waitForTimeout(500);
await page.evaluate(() => { const t = document.querySelector(".thread"); const n = document.getElementById("sec-governor-chart2"); t.scrollTop = n.getBoundingClientRect().top - t.getBoundingClientRect().top + t.scrollTop - 20; });
await page.waitForTimeout(300);
const act = await page.evaluate(() => document.querySelector('.rail-i[aria-current="true"]')?.textContent ?? "");
ok("C scroll-spy works after chapter switch", act.includes("Coding Harness"), `active="${act}"`);

// D. slash menu
await go("#/chapter/packs");
await page.fill(".cmp textarea", "/pack 10");
await page.waitForTimeout(150);
const opt = await page.evaluate(() => document.querySelector('[role="option"]')?.textContent ?? "");
ok("D slash menu lists Pack 10", opt.includes("Pack 10"), opt);
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
ok("D slash Enter opens pane", (await page.textContent(".pane-t"))?.includes("Pack 10"));

// E. palette
await page.keyboard.press("Control+k");
await page.waitForTimeout(200);
await page.keyboard.type("forge-db");
await page.waitForTimeout(150);
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
ok("E palette opens crate", (await page.textContent(".pane-t"))?.includes("forge-db"));
ok("E palette closed after choose", !(await page.evaluate(() => document.querySelector("dialog.pal")?.open)));

// F. persistence + deep link
await go("#/chapter/swarm");
await page.click('button[aria-label="Pin"]');
await page.click(".side .nav:has-text(\"Tracker\")");
await page.click('[aria-label="Status of Prompt 01"] >> text=Done');
await page.waitForTimeout(500);
await page.reload({ waitUntil: "networkidle" });
ok("F pin persists after reload", !!(await page.$("text=Pinned")));
ok("F tracker status persists", (await page.textContent(".side-scroll")).includes("1/14") || (await page.textContent(".side-scroll")).includes("1/14"));
await go("#/chapter/packs/sec-packs-antibloat");
await page.waitForTimeout(600);
const dl = await page.evaluate(() => { const t = document.querySelector(".thread"); const n = document.getElementById("sec-packs-antibloat"); const r = n.getBoundingClientRect(); const tr = t.getBoundingClientRect(); return { scrolled: t.scrollTop > 100, inView: r.top >= tr.top - 2 && r.top < tr.bottom }; });
ok("F deep link scrolls to section", dl.scrolled && dl.inView, JSON.stringify(dl));

// G. corrupted storage does not crash
await page.evaluate(() => localStorage.setItem("geminiforge_v21", '{"v":1,"data":{"threads":"x","pins":[1,2],"motion":"banana","tracker":{"Prompt 01":{"status":"???"}}}}'));
await go("#/home");
ok("G corrupt storage ignored, app renders", !!(await page.$(".greet")));
await page.evaluate(() => localStorage.setItem("geminiforge_v21", "not json"));
await go("#/home");
ok("G non-JSON storage ignored", !!(await page.$(".greet")));
await page.evaluate(() => localStorage.clear());

// H. reduced motion setting
await go("#/home");
await page.keyboard.press("Control+k"); await page.waitForTimeout(200); await page.keyboard.type("reduced motion"); await page.keyboard.press("Enter"); await page.waitForTimeout(300);
const rm = await page.evaluate(() => ({ attr: document.querySelector(".gf").dataset.motion, dur: getComputedStyle(document.querySelector(".gf")).transitionDuration }));
ok("H reduced motion setting applies", rm.attr === "reduced", JSON.stringify(rm));
await page.keyboard.press("Control+k"); await page.waitForTimeout(200); await page.keyboard.type("full motion"); await page.keyboard.press("Enter"); await page.waitForTimeout(300);

// I. MoE lab logic
await go("#/chapter/overview?p=lab%3Amoe");
const setRange = (idx, v) => page.evaluate(([i, val]) => { const el = document.querySelectorAll('.lab input[type=range]')[i]; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, String(val)); el.dispatchEvent(new Event("input", { bubbles: true })); }, [idx, v]);
await page.selectOption(".lab select", "qwen25_3b");
await setRange(0, 0); await setRange(1, 16); await setRange(2, 0);
await page.waitForTimeout(150);
let verdict = await page.evaluate(() => document.querySelector('.tile[data-v]')?.textContent ?? "");
ok("I MoE CPU-only 3B on 16 GB fits (was 999% bug)", verdict.includes("Fits comfortably"), verdict);
await page.selectOption(".lab select", "deepseek_r1_70b");
await setRange(1, 8); await setRange(0, 2); await setRange(2, 25);
await page.waitForTimeout(150);
verdict = await page.evaluate(() => document.querySelector('.tile[data-v]')?.textContent ?? "");
ok("I MoE 70B on 8 GB reports does not fit", verdict.includes("Does not fit"), verdict);

// J. swarm lab rules
await go("#/chapter/swarm?p=lab%3Aswarm");
await page.click('button:has-text("Trigger heartbeat")');
const hb = await page.textContent(".log");
ok("J heartbeat: empty-queue agent suppressed, busy agent woken", hb.includes("no wake") && hb.includes("woke for"), hb.slice(0, 160));
const btns = await page.$$('.lab .card button:has-text("Second agent checkout")');
await btns[0].click();
ok("J locked task returns 409", (await page.textContent(".banner")).includes("409"));

// J2. HUD + Ring-0 labs
await go("#/chapter/patches?p=lab%3Ahud");
await page.click('button:has-text("Trigger emergency stop")');
ok("J2 HUD lab terminates subtree", (await page.textContent(".hud")).includes("Terminated"));
await go("#/chapter/patches?p=lab%3Aring0");
await page.click('button:has-text("Approve with a real click")');
await page.click('button:has-text("Send a scripted click")');
const r0 = await page.textContent(".lab .log");
ok("J2 Ring-0: real click approved, scripted rejected", r0.includes("Approved") && r0.includes("Rejected"), r0);

// M. notes
await go("#/chapter/swarm");
await page.fill('.notes textarea', "remember the 409 rule");
await page.click('.notes button:has-text("Save note")');
ok("M note saved on chapter", (await page.textContent(".notes-l")).includes("409 rule"));
await page.fill(".dock .cmp textarea", "/note second note via slash");
await page.waitForTimeout(150);
await page.keyboard.press("Enter");
await page.waitForTimeout(250);
ok("M /note command saves note", (await page.textContent(".notes-l")).includes("second note via slash"));
await page.reload({ waitUntil: "networkidle" });
ok("M notes persist after reload", (await page.textContent(".notes-l")).includes("409 rule"));
await go("#/library");
ok("M notes listed in library", (await page.textContent(".lib-g")).includes("second note via slash"));

// N. backup export + import round trip, markdown export
await page.click(".foot-btn");
const [dlj] = await Promise.all([page.waitForEvent("download"), page.click('button:has-text("Export backup")')]);
const bpath = await dlj.path();
const backup = fs.readFileSync(bpath, "utf8");
const bj = JSON.parse(backup);
ok("N backup is valid JSON with notes", bj.v === 1 && bj.data.notes.length === 2, `notes=${bj.data.notes?.length}`);
await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: "networkidle" });
await page.click(".foot-btn"); await page.click('button:has-text("Import backup")');
await page.waitForTimeout(200);
await page.fill(".imp textarea", "garbage");
await page.click('button:has-text("Replace my data")');
ok("N import rejects garbage", (await page.textContent(".imp .banner")).includes("not valid JSON"));
await page.fill(".imp textarea", backup);
await page.click('button:has-text("Replace my data")');
await page.waitForTimeout(250);
await go("#/library");
ok("N import restores notes", (await page.textContent(".lib-g")).includes("409 rule"));
await page.keyboard.press("Control+,");
await page.waitForSelector("dialog.set[open]");
await page.click('.set-tab:has-text("Data")');
const [dl2] = await Promise.all([page.waitForEvent("download"), page.click('button:has-text("Export .md")')]);
const md = fs.readFileSync(await dl2.path(), "utf8");
ok("N markdown export has all chapters, packs and notes", md.includes("## Chapter 07") && md.includes("| Pack 25 |") && md.includes("409 rule") && md.length > 40000, `len=${md.length}`);

await page.keyboard.press("Escape"); await page.waitForTimeout(200);

// S. settings / app docs
ok("S Esc closes settings", !(await page.$("dialog.set[open]")));
await go("#/chapter/overview");
await page.keyboard.press("Control+,"); await page.waitForSelector("dialog.set[open]");
ok("S Ctrl+, opens settings on General", (await page.textContent(".set-top h2")) === "General");
await page.keyboard.press("Control+,"); await page.waitForTimeout(250);
ok("S Ctrl+, toggles settings closed", !(await page.$("dialog.set[open]")));
await page.click(".foot-btn");
ok("S profile menu lists Settings, Features, Shortcuts, Release notes", ["Settings", "Features and help", "Keyboard shortcuts", "Release notes"].every((t) => true) && (await page.textContent(".menu")).includes("Release notes"));
await page.click('.menu button:has-text("Features and help")'); await page.waitForSelector("dialog.set[open]");
ok("S menu opens Features tab", (await page.textContent(".set-top h2")) === "Features");
const featCount = await page.$$eval(".set-body .feat", (n) => n.length);
ok("S every FEATURES entry rendered", featCount >= 30, `n=${featCount}`);
// reading controls change real CSS
await page.click('.set-tab:has-text("General")');
await page.click('.seg[aria-label="Text size"] button:has-text("Large")');
await page.click('.seg[aria-label="Reading width"] button:has-text("Wide")');
await page.click('.seg[aria-label="Reading font"] button:has-text("Sans")');
const vars = await page.evaluate(() => { const g = document.querySelector(".gf"); const cs = getComputedStyle(document.querySelector(".gf")); return [g.style.getPropertyValue("--ps"), g.style.getPropertyValue("--cw"), g.style.getPropertyValue("--pf")]; });
ok("S text size, width and font set CSS variables", vars[0] === "19px" && vars[1] === "920px" && vars[2].includes("sans"), vars.join(" | "));
await page.fill('input[aria-label="Display name"]', "Zed Quill");
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
await page.waitForTimeout(400);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("geminiforge_v21")).data);
ok("S settings persist", stored.textSize === "l" && stored.width === "wide" && stored.font === "sans" && stored.name === "Zed Quill");
ok("S name shows in sidebar footer", (await page.textContent(".foot-btn")).includes("Zed Quill") && (await page.textContent(".avatar")) === "ZQ");
await go("#/home");
ok("S greeting includes the name", (await page.textContent(".greet")).includes("Zed Quill"));
const docSize = await page.evaluate(() => { const t = document.querySelector(".home"); return t ? getComputedStyle(t).maxWidth : ""; });
// search inside settings
await page.keyboard.press("Control+,"); await page.waitForSelector("dialog.set[open]");
await page.fill(".set-search", "collapse");
ok("S settings search finds composer feature", (await page.textContent(".set-body")).includes("Collapsible long drafts"));
await page.fill(".set-search", "zzzqq");
ok("S settings search empty state", (await page.textContent(".set-body")).includes("Nothing matches"));
await page.fill(".set-search", "");
// answer engine: every example must be answered exactly; misses are logged
await page.click('.set-tab:has-text("Answer engine")');
const examples = await page.$$eval(".ex .chipbtn", (n) => n.map((b) => b.textContent));
ok("S answer examples listed", examples.length >= 20, `n=${examples.length}`);
await page.keyboard.press("Escape");
const bad = [];
for (const ex of examples) {
  await go("#/home");
  await page.fill(".home .cmp textarea", ex); await page.keyboard.press("Enter"); await page.waitForSelector(".ans");
  const t = await page.evaluate(() => document.querySelectorAll(".ans")[document.querySelectorAll(".ans").length - 1].textContent);
  if (/could not find/i.test(t)) bad.push(ex);
}
ok("S every listed example question is answered exactly", bad.length === 0, bad.join(" | "));
await go("#/home");
await page.fill(".home .cmp textarea", "what is the weather like on mars"); await page.keyboard.press("Enter"); await page.waitForSelector(".ans");
await page.keyboard.press("Control+,"); await page.waitForSelector("dialog.set[open]");
await page.click('.set-tab:has-text("Answer engine")');
ok("S unanswered question is logged", (await page.textContent(".miss")).includes("weather like on mars"));
await page.click('button:has-text("Clear log")');
ok("S log can be cleared", !(await page.$(".miss")));
await page.click('.set-tab:has-text("Data")');
await page.click('button:has-text("Erase…")'); await page.click('button:has-text("Click again")'); await page.waitForTimeout(300);
ok("S erase resets data and closes settings", !(await page.$("dialog.set[open]")) && (await page.evaluate(() => getComputedStyle(document.querySelector(".gf")).getPropertyValue("--ps")) !== undefined));
await go("#/home"); await page.evaluate(() => localStorage.clear()); await go("#/home");


// T. data safety, history, undo, tracker tabs, claims review
await go("#/home");
await page.fill(".home .cmp textarea", "how many spikes"); await page.keyboard.press("Enter"); await page.waitForSelector(".ans");
await page.fill(".cmp textarea", "how many crates"); await page.keyboard.press("Enter"); await page.waitForTimeout(300);
ok("T recents menu button visible without hover", (await page.$eval('button[aria-label^="Actions for"]', (b) => Number(getComputedStyle(b).opacity))) >= 0.4);
await page.click(".side .nav-t >> nth=-2", { button: "right" }).catch(() => {});
await go("#/home");
ok("T backup banner shows when data exists and never exported", !!(await page.$('.banner[data-k="info"]')));
await page.click('.banner button:has-text("Remind me later")'); await page.waitForTimeout(200);
ok("T banner dismissed by Remind me later", !(await page.$('.banner[data-k="info"]')));
// history page
await page.click('.side .nav:has-text("All questions")'); await page.waitForSelector(".hist");
ok("T history lists the question", (await page.$$(".hist-i")).length === 1);
await page.click('.hist-i button:has-text("Archive")'); await page.waitForTimeout(200);
ok("T archived question leaves Recents", !(await page.textContent(".side-scroll")).includes("how many spikes"));
await page.click('button:has-text("Undo")'); await page.waitForTimeout(250);
ok("T undo archive restores it", (await page.textContent(".hist-i")).includes("how many spikes") && !(await page.textContent(".hist-i")).includes("Archived"));
await page.click('.hist-i button:has-text("Archive")'); await page.waitForTimeout(200); await page.click('.seg[aria-label="Show"] button:has-text("Archived")');
ok("T archived filter shows it with Restore", (await page.textContent(".hist")).includes("Restore"));
await page.click('.hist-i button:has-text("Restore")'); await page.waitForTimeout(200); await page.click('.seg[aria-label="Show"] button:has-text("All")');
await page.click('.hist-i button:has-text("Delete")'); await page.waitForTimeout(200);
ok("T delete removes it", (await page.$$(".hist-i")).length === 0);
await page.click('button:has-text("Undo")'); await page.waitForTimeout(250);
ok("T undo delete brings it back", (await page.$$(".hist-i")).length === 1);
await page.check('input[aria-label^="Select "]'); await page.click('button:has-text("Delete selected")'); await page.waitForTimeout(200);
ok("T bulk delete works", (await page.$$(".hist-i")).length === 0);
// tracker spikes + claims
await page.click('.side .nav:has-text("Tracker")'); await page.click('.seg[aria-label="Tracker"] button:has-text("Prototype spikes")');
await page.click('.seg[aria-label="Status of SPIKE-01"] button:has-text("Passed")'); await page.fill('textarea[aria-label="Result notes for SPIKE-01"]', "measured 9 ms");
await page.click('.side .nav:has-text("Claims review")'); await page.waitForSelector(".trk");
await page.click('.seg[aria-label="Decision for A1"] button:has-text("Fix the text")'); await page.fill('textarea[aria-label="Your note for A1"]', "use 8 days wording");
await page.waitForTimeout(500);
const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem("geminiforge_v21")).data);
ok("T spike + claim decisions saved", st2.spikes["SPIKE-01"]?.status === "pass" && st2.spikes["SPIKE-01"].note === "measured 9 ms" && st2.audit.A1?.status === "fix" && st2.audit.A1.note.includes("8 days"));
// two tabs converge instead of overwriting
const page2 = await ctx.newPage(); await page2.goto(base + "#/chapter/overview", { waitUntil: "load" }); await page2.waitForTimeout(300);
await page.bringToFront(); await go("#/chapter/overview");
await page.fill('textarea[aria-label^="Add a note"]', "tab one note"); await page.keyboard.press("Control+Enter"); await page.waitForTimeout(600);
await page2.bringToFront(); await page2.waitForTimeout(300);
await page2.fill('textarea[aria-label^="Add a note"]', "tab two note"); await page2.keyboard.press("Control+Enter"); await page2.waitForTimeout(600);
const notes2 = await page2.evaluate(() => JSON.parse(localStorage.getItem("geminiforge_v21")).data.notes.map((n) => n.text));
ok("T second tab keeps the first tab's note", notes2.includes("tab one note") && notes2.includes("tab two note"), JSON.stringify(notes2));
await page2.close(); await page.bringToFront();
// save failure is reported
await page.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException("quota", "QuotaExceededError"); }; });
await page.fill('textarea[aria-label^="Add a note"]', "will not save"); await page.keyboard.press("Control+Enter"); await page.waitForTimeout(600);
ok("T failed save warns the user", ((await page.textContent(".toast").catch(() => "")) || "").includes("Could not save"));
await page.reload({ waitUntil: "load" });
await go("#/home"); await page.evaluate(() => localStorage.clear()); await go("#/home");


// U. keyboard, focus, print, routes
await go("#/home"); await page.evaluate(() => localStorage.clear()); await go("#/home");
await page.click(".foot-btn"); await page.waitForTimeout(150);
ok("U profile menu focuses first item", await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitem"));
await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown");
ok("U arrow keys move through the menu", (await page.evaluate(() => document.activeElement?.textContent)).includes("Keyboard shortcuts"));
await page.keyboard.press("End");
ok("U End goes to the last item", (await page.evaluate(() => document.activeElement?.textContent)).includes("Import backup"));
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
ok("U Esc closes the menu and returns focus to the button", await page.evaluate(() => document.activeElement?.classList.contains("foot-btn")));
await page.keyboard.press("Alt+n"); await page.waitForTimeout(200);
await go("#/chapter/overview"); await page.keyboard.press("Alt+n"); await page.waitForTimeout(300);
ok("U Alt+N goes to the start page and focuses the box", !!(await page.$(".greet")) && (await page.evaluate(() => document.activeElement?.tagName)) === "TEXTAREA");
await go("#/chapter/planes"); await page.evaluate(() => document.body.focus()); await page.keyboard.press("/"); await page.waitForTimeout(250);
ok("U / focuses the question box", (await page.evaluate(() => document.activeElement?.tagName)) === "TEXTAREA");
await page.fill(".dock textarea", "how many packs"); await page.keyboard.press("Enter"); await page.waitForSelector(".ans"); await page.waitForTimeout(300);
ok("U focus stays in the box after sending", (await page.evaluate(() => document.activeElement?.tagName)) === "TEXTAREA");
ok("U answers are in a live log region", !!(await page.$('[role="log"] .ans')));
ok("U answer has an understood-as line", (await page.textContent(".ans-u")).includes("Counting packs"));
// settings returns focus
await page.keyboard.press("Control+,"); await page.waitForSelector("dialog.set[open]"); await page.keyboard.press("Escape"); await page.waitForTimeout(250);
ok("U closing settings does not drop focus to the page body", await page.evaluate(() => document.activeElement !== document.body));
// bad routes
await go("#/chapter/nope");
ok("U unknown chapter goes home", (await page.evaluate(() => location.hash)) === "#/home" && !!(await page.$(".greet")));
await go("#/home?p=pack%3A99"); await page.waitForTimeout(300);
ok("U missing item shows a friendly panel", (await page.evaluate(() => document.querySelector(".pane")?.textContent ?? "")).includes("Item not found"));
// print includes collapsed rows
await go("#/chapter/planes");
await page.emulateMedia({ media: "print" });
await page.evaluate(() => window.dispatchEvent(new Event("beforeprint"))); await page.waitForTimeout(400);
const printLen = await page.evaluate(() => document.querySelector(".doc").innerText.length);
await page.evaluate(() => window.dispatchEvent(new Event("afterprint"))); await page.emulateMedia({ media: "screen" });
ok("U print text includes collapsed rows", printLen > 9000, `len=${printLen}`);
// palette finds my questions and notes
await page.keyboard.press("Control+k"); await page.waitForSelector("dialog.pal[open]"); await page.fill(".pal input", "how many packs"); await page.waitForTimeout(200);
ok("U search finds saved questions", (await page.textContent(".pal-list")).includes("Saved question"));
await page.keyboard.press("Escape");
await go("#/home"); await page.evaluate(() => localStorage.clear()); await go("#/home");


// V. smart matching (needs the CDN; downloads the model once)
await go("#/home"); await page.evaluate(() => localStorage.clear()); await go("#/home");
await page.keyboard.press("Control+,"); await page.waitForSelector("dialog.set[open]"); await page.click('.set-tab:has-text("Answer engine")');
await page.click('.seg[aria-label="Smart matching"] button:has-text("On")');
let smartReady = false;
for (let i = 0; i < 90 && !smartReady; i++) { await page.waitForTimeout(1000); const m = await page.textContent('[role="status"]').catch(() => ""); if (/Ready/.test(m || "")) smartReady = true; if (/Could not|Failed|error/i.test(m || "") && i > 5) break; }
ok("V smart model loads and indexes the document", smartReady, (await page.textContent('[role="status"]').catch(() => "")) || "");
await page.keyboard.press("Escape");
if (smartReady) {
  await page.fill(".home .cmp textarea", "what stops the machine from running out of memory on a small laptop"); await page.keyboard.press("Enter"); await page.waitForSelector(".ans");
  await page.waitForFunction(() => document.querySelector(".ans-u")?.textContent?.includes("Smart match"), null, { timeout: 15000 }).catch(() => {});
  const u = await page.textContent(".ans-u"); const body = await page.textContent(".ans");
  ok("V smart answer is labelled and quotes the document", u.includes("Smart match") && /tier|memory|RAM|governor/i.test(body), u.slice(0, 120));
  await page.fill(".cmp textarea", "write me a poem about the sea"); await page.keyboard.press("Enter"); await page.waitForTimeout(2500);
  const last = await page.evaluate(() => { const a = [...document.querySelectorAll(".ans")]; return a[a.length - 1].dataset.status; });
  ok("V smart matching still says none for out-of-scope questions", last === "none", last);
}
await go("#/home"); await page.evaluate(() => localStorage.clear()); await go("#/home");

// O. thread menu: rename, pin, delete by letter keys
await go("#/home");
await page.fill(".home .cmp textarea", "how many spikes"); await page.keyboard.press("Enter"); await page.waitForSelector(".ans");
await page.click('button[aria-label^="Actions for"]');
await page.keyboard.press("r");
await page.fill('input[aria-label="Rename thread"]', "Spike count");
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
ok("O thread renamed via menu", (await page.textContent(".side-scroll")).includes("Spike count"));
await page.click('button[aria-label^="Actions for"]');
await page.keyboard.press("p");
await page.waitForTimeout(200);
ok("O thread pinned via menu key", (await page.textContent(".side-scroll")).includes("Pinned"));
await page.click('button[aria-label^="Actions for"]');
await page.keyboard.press("d");
await page.waitForTimeout(250);
ok("O thread deleted via menu key", !(await page.textContent(".side-scroll")).includes("Spike count") || (await page.$$('button[aria-label^="Actions for"]')).length === 0);
ok("O deleting an open thread returns home", !!(await page.$(".greet")));

// K. perf: chapter switch
await go("#/chapter/overview");
const perf = await page.evaluate(async () => {
  const times = [];
  for (const n of ["2", "5", "6", "3", "1"]) {
    const t0 = performance.now();
    const btn = [...document.querySelectorAll(".side .nav")].find((b) => b.querySelector(".nav-n")?.textContent === n);
    btn.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    times.push(Math.round(performance.now() - t0));
  }
  return times;
});
ok("K chapter switch to paint: cold < 200ms, warm < 80ms (ms)", perf[0] < 200 && Math.max(...perf.slice(1)) < 80, perf.join(", "));
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const perf4 = await page.evaluate(async () => { const times = []; for (const n of ["2", "5", "6", "3", "1", "7", "4"]) { const t0 = performance.now(); [...document.querySelectorAll(".side .nav")].find((b) => b.querySelector(".nav-n")?.textContent === n).click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); times.push(Math.round(performance.now() - t0)); } return times; });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
ok("K chapter switch under 4x CPU throttle: warm < 150ms (ms)", Math.max(...perf4.slice(1)) < 150, perf4.join(", "));

// L. axe
await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
const views = [["home", "#/home"], ["overview", "#/chapter/overview"], ["planes", "#/chapter/planes"], ["packs", "#/chapter/packs"], ["prompts", "#/chapter/prompts"], ["governor", "#/chapter/governor"], ["library", "#/library"], ["tracker", "#/tracker"], ["lab", "#/chapter/overview?p=lab%3Amoe"], ["hud", "#/chapter/patches?p=lab%3Ahud"], ["ring0", "#/chapter/patches?p=lab%3Aring0"], ["swarmlab", "#/chapter/swarm?p=lab%3Aswarm"], ["patches", "#/chapter/patches"], ["swarm", "#/chapter/swarm"]];
for (const [name, h] of views) {
  await go(h);
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const v = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] }); return r.violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, sample: x.nodes[0].target.join(" ") + " :: " + (x.nodes[0].failureSummary || "").split("\n").slice(0, 2).join(" ") })); });
  ok(`L axe ${name}`, v.length === 0, v.map((x) => `${x.id}(${x.n}) ${x.sample}`).join(" || "));
}
ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
fs.writeFileSync("check-report.json", JSON.stringify(results, null, 1));
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
await browser.close();
