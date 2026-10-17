import { chromium } from "playwright-core";
const base = process.env.BASE || "http://127.0.0.1:5199/";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto(base + "#/home", { waitUntil: "networkidle" }); await page.evaluate(() => localStorage.clear());
const cases = [
  ["how many packs are there?", ["25"]],
  ["How many crates?", ["14", "12 under"]],
  ["how many prompts", ["14"]],
  ["how many confirmations are locked", ["8"]],
  ["how many patches", ["6"]],
  ["how many spikes", ["7"]],
  ["how many chapters", ["7"]],
  ["how many agents", ["4"]],
  ["how many tasks", ["4"]],
  ["what does forge-db depend on?", ["forge-types"]],
  ["what depends on forge-db?", ["forge-vcs", "forge-swarm"]],
  ["which crates depend on forge-types", ["forge-hw"]],
  ["why does forge-sandbox matter", ["catch_unwind"]],
  ["what is forge-hw?", ["Detects your exact CPU"]],
  ["tell me about pack 10", ["Native & Polyglot Binary Decompiler"]],
  ["how big is pack 10", ["~620 MB"]],
  ["what tier does pack 3 need?", ["Tier B"]],
  ["which packs need tier B?", ["packs whose minimum tier is exactly Tier B", "Pack 03", "Pack 10"], ["Pack 01", "core overhead"]],
  ["which packs can run on tier E?", ["Pack 01", "Pack 02"], ["Pack 10"]],
  ["Which packs run on tier C?", ["Pack 05"], ["Pack 10"]],
  ["what is the largest pack?", ["Pack 10"]],
  ["smallest pack", ["Pack 21"]],
  ["total size of the clean-room packs", ["945 MB"]],
  ["compare pack 02 and pack 03", ["140 MB", "185 MB"]],
  ["what is CONFIRM-05?", ["Declarative A2UI"]],
  ["explain confirm 8", ["iced.rs"]],
  ["show patch F.4", ["VRAM_req"]],
  ["what is spike 3", ["Mod Runtime Isolation"]],
  ["what is tier S?", ["192GB"]],
  ["what is prompt 13?", ["Paperclip"]],
  ["which prompt should I run next?", ["Prompt 01"]],
  ["what is chapter 4 about?", ["Paperclip Org-Swarm"]],
  ["list all spikes", ["SPIKE-01", "SPIKE-07"]],
  ["which crates are in layer 2", ["forge-policy", "forge-vcs"], ["forge-types"]],
  ["what is the weather today", ["could not find"]],
  ["paperclip 3401 heartbeat token burn", ["3401"]],
  ["how many packs in the coding category", ["5"]],
  ["which packs are in computer use", ["Pack 02", "Pack 03"]],
  ["what is geminiforge?", ["organized as follows"]],
  ["where is pack 10 covered", ["Chapter 05"]],
  ["what does the daemon depend on", ["All library crates"]],
  ["what does gf-emergency-hud depend on", ["iced"]],
  ["difference between forge-db and forge-vcs", ["Layer 1", "Layer 2"]],
  ["what is agent-rust-02", ["Principal Rust Kernel Engineer"]],
  ["what is GF-T05-119", ["has_actionable_work"]],
  ["which packs are under 20 MB", ["Pack 21", "Pack 18"], ["Pack 10"]],
  ["how many packs need tier B", ["5"]],
  ["how many packs can run on tier E", ["13"]],
  ["does pack 10 need a lot of RAM", ["Tier B"]],
  ["who is the chief architect", ["Chief Systems Architect"]],
  ["what is the kernel engineer agent", ["Principal Rust Kernel Engineer"]],
  ["what are the four meta tools", ["search_capabilities"]],
  ["explain the pre-wake gate", ["Pre-Wake"]],
  ["what is cgroup.kill used for", ["cgroup"]],
  ["which pack has ghidra", ["Pack 10"]],
  ["which crate handles sandboxing", ["forge-sandbox"]],
  ["what does pack 24 include", ["open-code-review"]],
  ["show me the code for forge-db", ["PRAGMA"]],
  ["what does CONFIRM-02 say", ["authoritative_audit.db"]],
  ["why is prompt 2 needed", ["15 ms"]],
  ["list the prompts", ["Prompt 14"]],
  ["what is the total size of all packs", ["MB"]],
  ["how does the zero token heartbeat work", ["has_actionable_work"]],
  ["what is the anti bloat diet", ["canonical"]],
  ["what are the OS targets", ["Linux Mint"]]
];
let pass = 0; const fails = [];
for (const [q, inc, exc = []] of cases) {
  await page.goto(base + "#/home", { waitUntil: "load" }); await page.waitForSelector(".home .cmp textarea");
  await page.fill(".home .cmp textarea", q); await page.keyboard.press("Enter");
  await page.waitForSelector(".ans"); await page.waitForTimeout(60);
  const t = await page.evaluate(() => [...document.querySelectorAll(".ans")].pop().innerText);
  const ok = inc.every((s) => t.includes(s)) && exc.every((s) => !t.includes(s));
  if (ok) pass++; else fails.push({ q, inc, exc, got: t.slice(0, 400) });
}
// follow-up
await page.goto(base + "#/home", { waitUntil: "load" });
await page.fill(".home .cmp textarea", "what is forge-db?"); await page.keyboard.press("Enter"); await page.waitForSelector(".ans");
await page.fill(".dock .cmp textarea", "and what does it depend on?"); await page.keyboard.press("Enter"); await page.waitForFunction(() => document.querySelectorAll(".ans").length === 2);
const fu = await page.evaluate(() => [...document.querySelectorAll(".ans")].pop().innerText);
if (fu.includes("forge-types") && fu.includes("depends on")) pass++; else fails.push({ q: "follow-up", got: fu });
console.log(`${pass}/${cases.length + 1} answered as expected`);
fails.forEach((f) => console.log("FAIL:", JSON.stringify(f)));
console.log(errs.length ? "errors: " + errs.join(" | ") : "no page errors");
await browser.close();
