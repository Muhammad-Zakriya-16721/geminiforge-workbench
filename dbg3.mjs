import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://127.0.0.1:5198/#/home", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
console.log(JSON.stringify(await page.evaluate(() => { const q = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }; const gf = getComputedStyle(document.querySelector(".gf")); return { gf: q(".gf"), side: q(".side"), main: q(".main"), pane: q(".pane-col"), rows: gf.gridTemplateRows, cols: gf.gridTemplateColumns, ac: gf.alignContent }; })));
await browser.close();
