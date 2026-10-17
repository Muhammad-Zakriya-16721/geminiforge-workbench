import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:5198/#/chapter/overview", { waitUntil: "networkidle" });
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
await cdp.send("Profiler.start");
await cdp.send("Tracing.start", { traceConfig: { includedCategories: ["devtools.timeline"] } }).catch(()=>{});
for (let i = 0; i < 3; i++) for (const n of ["5", "3", "2", "6", "1"]) {
  await page.evaluate(async (n) => { [...document.querySelectorAll(".side .nav")].find((b) => b.querySelector(".nav-n")?.textContent === n).click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }, n);
}
const { profile } = await cdp.send("Profiler.stop");
const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas; profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
const total = [...self.values()].reduce((a, b) => a + b, 0);
console.log("total sampled ms:", Math.round(total / 1000));
[...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log(String(Math.round(v / 1000)).padStart(5), "ms", k));
await browser.close();
