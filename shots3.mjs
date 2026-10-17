import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const base = "http://127.0.0.1:5198/";
for (const [w, h, name] of [[390, 844, "m"], [1024, 768, "t"]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  await page.goto(base + "#/home", { waitUntil: "networkidle" }); await page.evaluate(() => localStorage.clear()); await page.goto(base + "#/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(400); await page.screenshot({ path: `shots/${name}-01-home.png` });
  await page.goto(base + "#/chapter/overview", { waitUntil: "networkidle" }); await page.waitForTimeout(400); await page.screenshot({ path: `shots/${name}-02-chapter.png` });
  if (await page.$('button[aria-label="Open sidebar"]')) await page.click('button[aria-label="Open sidebar"]'); await page.waitForTimeout(400); await page.screenshot({ path: `shots/${name}-03-drawer.png` });
  await page.goto(base + "#/chapter/packs?p=pack%3APack%2010", { waitUntil: "networkidle" }); await page.waitForTimeout(500); await page.screenshot({ path: `shots/${name}-04-pane.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  console.log(name, "horizontal page overflow:", overflow);
}
await browser.close();
