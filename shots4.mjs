import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const base = "http://127.0.0.1:5198/";
const shot = async (n) => { await page.waitForTimeout(450); await page.screenshot({ path: `shots/${n}.png` }); };
await page.goto(base + "#/home", { waitUntil: "networkidle" }); await page.evaluate(() => localStorage.clear()); await page.goto(base + "#/home", { waitUntil: "networkidle" });
await shot("a-01-home");
await page.fill(".home .cmp textarea", "which packs need tier B?"); await page.keyboard.press("Enter"); await page.waitForSelector(".ans");
for (const q of ["what does forge-db depend on?", "compare pack 02 and pack 03", "what is the largest pack?"]) { await page.fill(".dock .cmp textarea", q); await page.keyboard.press("Enter"); await page.waitForTimeout(250); }
await page.click(".srcs-b >> nth=0");
await shot("a-02-thread-answers");
await page.goto(base + "#/chapter/patches?p=lab%3Ahud", { waitUntil: "networkidle" }); await page.click('button:has-text("Trigger emergency stop")'); await shot("a-03-hud-lab");
await page.goto(base + "#/chapter/swarm", { waitUntil: "networkidle" }); await page.fill(".notes textarea", "Check whether paused agents can check out."); await page.click('.notes button:has-text("Save note")'); await page.evaluate(() => { const t = document.querySelector(".thread"); t.scrollTop = t.scrollHeight; }); await shot("a-04-notes");
await page.click(".foot-btn"); await shot("a-05-settings-menu");
await page.keyboard.press("Escape"); await page.click(".foot-btn"); await page.click('button:has-text("Import backup")'); await shot("a-06-import");
await browser.close();
