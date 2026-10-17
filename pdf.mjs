import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
await page.goto("http://127.0.0.1:5198/#/chapter/overview", { waitUntil: "networkidle" });
await page.pdf({ path: "shots/print-test.pdf", format: "A4" });
await browser.close();
