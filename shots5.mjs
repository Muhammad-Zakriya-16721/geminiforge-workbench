import { chromium } from "playwright-core";
import fs from "node:fs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const base = process.env.BASE || "http://127.0.0.1:5198/";
await p.goto(base + "#/chapter/overview", { waitUntil: "networkidle" });
await p.click(".foot-btn"); await p.waitForTimeout(300);
await p.screenshot({ path: "shots/s-01-menu.png" });
await p.keyboard.press("Escape");
await p.keyboard.press("Control+,"); await p.waitForTimeout(400);
await p.screenshot({ path: "shots/s-02-general.png" });
const res = [];
await p.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
for (const [i, t] of ["Features", "Shortcuts", "Answer engine", "Labs", "Data", "About", "General"].entries()) {
  await p.click(`.set-tab:has-text("${t}")`); await p.waitForTimeout(250);
  if (i < 6) await p.screenshot({ path: `shots/s-0${i + 3}-${t.toLowerCase().replace(/ /g, "")}.png` });
  const v = await p.evaluate(async () => (await window.axe.run(document.querySelector("dialog.set"), { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] })).violations.map((x) => x.id + ":" + x.nodes.length + " " + (x.nodes[0]?.html || "").slice(0, 120)));
  res.push(t + " -> " + (v.join(" || ") || "clean"));
}
console.log(res.join("\n"));
await p.setViewportSize({ width: 420, height: 800 }); await p.waitForTimeout(300);
await p.screenshot({ path: "shots/s-09-mobile.png" });
await b.close();
