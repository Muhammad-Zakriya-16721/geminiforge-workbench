// Reads the built-in documentation out of a running build of the app (needs ?gftest) and returns it as a bundle.
import { chromium } from "playwright-core";
export async function builtinSnapshot(base) {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  try {
    const page = await (await browser.newContext()).newPage();
    await page.goto(base + "?gftest&nolive#/home", { waitUntil: "load" });
    return await page.evaluate(() => window.__gf.contentSnapshot());
  } finally { await browser.close(); }
}
