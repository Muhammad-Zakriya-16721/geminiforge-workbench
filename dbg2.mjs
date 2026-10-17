import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://127.0.0.1:5198/#/home", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.goto("http://127.0.0.1:5198/#/home", { waitUntil: "networkidle" });
for (const t of [0, 300, 900]) { await page.waitForTimeout(t); console.log(t, JSON.stringify(await page.evaluate(() => { const r = document.querySelector(".gf").getBoundingClientRect(); return { gf: [r.width, r.height], inner: [innerWidth, innerHeight] }; }))); }
await page.screenshot({ path: "shots/dbg.png" });
await browser.close();
