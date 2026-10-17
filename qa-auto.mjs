// Contract tests for the answer engine, generated from the data itself, so new packs/crates/prompts are covered automatically.
import { chromium } from "playwright-core";
const base = process.env.BASE || "http://127.0.0.1:5198/";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await (await browser.newContext()).newPage();
await page.goto(base + "?gftest#/home", { waitUntil: "load" });
const res = await page.evaluate(() => {
  const G = window.__gf, D = G.data;
  const fails = []; let n = 0;
  const ask = (q, tracker = {}) => G.answerQuestion(q, { depth: "standard", tracker });
  const text = (a) => G.answerPlain(a);
  const keys = (a) => a.blocks.filter((b) => b.t === "items").flatMap((b) => b.items.map((i) => i.key));
  const t = (name, q, cond, extra = "") => { n++; let a; try { a = ask(q); } catch (e) { fails.push(`${name} | ${q} | threw ${e.message}`); return; } let ok = false; try { ok = cond(a, text(a)); } catch (e) { extra = e.message; } if (!ok) fails.push(`${name} | ${q} | status=${a.status} | ${text(a).slice(0, 120).replace(/\n/g, " ")} ${extra}`); };
  const has = (s) => (a, tx) => tx.toLowerCase().includes(String(s).toLowerCase());
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

  for (const p of D.FORGEHUB_PACKS) {
    const num = String(Number(p.id.slice(5)));
    t("pack define", `what is pack ${num}`, has(p.name.replace(/&/g, "&")));
    t("pack size", `how big is ${p.id}`, has(p.size));
    t("pack tier", `what tier does pack ${num} need`, has(`Tier ${p.minTier}`));
    t("pack tools", `what does pack ${num} include`, has(p.tools.slice(0, 30)));
    t("pack mention check", `does ${p.id} need a quantum computer`, (a, tx) => /does not mention/.test(tx));
  }
  for (const c of D.CRATES_LIST) {
    const tail = c.name.split("/").pop();
    if (tail.includes(",")) continue;
    t("crate define", `what is ${tail}`, has(c.plainSummary.slice(0, 40)));
    t("crate why", `why does ${tail} matter`, has(c.whyItMatters.slice(0, 40)));
    t("crate deps", `what does ${tail} depend on`, has(c.deps.split(",")[0].slice(0, 20)));
    const users = D.CRATES_LIST.filter((x) => x.name !== c.name && new RegExp(`(?<![\\w-])${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`).test(x.deps)).map((x) => "crate:" + x.name);
    t("crate rdeps", `what depends on ${tail}`, (a) => users.length === 0 ? /No entry lists/.test(text(a)) : users.every((k) => keys(a).includes(k)) && keys(a).length === users.length);
  }
  for (const p of D.DEEP_PROMPTS) {
    const num = String(Number(p.id.slice(7)));
    t("prompt define", `what is prompt ${num}`, has(p.title.slice(0, 30)));
    t("prompt why", `why is prompt ${num} needed`, has(p.whyNeeded.slice(0, 30)));
    t("prompt full", `give me full prompt ${num}`, (a) => a.blocks.some((b) => b.t === "code" && b.code === p.fullPrompt));
  }
  for (const c of D.LOCKED_CONFIRMATIONS) t("confirm", `what is ${c.id}`, has(c.title.slice(0, 30)));
  for (const s of D.PROTOTYPE_SPIKES) t("spike", `what is ${s.id}`, has(s.target));
  for (const p of D.SPECIFICATION_PATCHES) t("patch", `what is ${p.id}`, has(p.target.slice(0, 20)));
  for (const a of D.INITIAL_ROSTER) { t("agent define", `what is ${a.id}`, has(a.role.slice(0, 20))); t("agent reports", `who does ${a.id} report to`, has(a.reportsTo.slice(0, 20))); }
  for (const k of D.INITIAL_TASKS) t("task", `what is ${k.taskId}`, has(k.title.slice(0, 20)));
  const order = ["E", "C", "B", "A", "S"];
  for (const T of order) {
    const exact = D.FORGEHUB_PACKS.filter((p) => p.minTier === T).map((p) => "pack:" + p.id);
    const upto = D.FORGEHUB_PACKS.filter((p) => order.indexOf(p.minTier) <= order.indexOf(T)).map((p) => "pack:" + p.id);
    t("tier exact list", `which packs need tier ${T}`, (a) => exact.length === 0 ? /No pack/.test(text(a)) : sameSet(keys(a), exact));
    t("tier can run", `which packs can run on tier ${T}`, (a) => sameSet(keys(a), upto));
    t("tier count", `how many packs need tier ${T}`, (a, tx) => tx.includes(`**${exact.length}**`) || tx.includes(` ${exact.length} `) || tx.includes(`${exact.length} pack`) || /There (is|are)/.test(tx) && tx.includes(String(exact.length)));
    t("tier define", `what is tier ${T}`, has(`Tier ${T}`));
  }
  for (const nmb of [20, 50, 100, 200, 500]) {
    const mb = (p) => Number(/([\d.]+)\s*MB/i.exec(p.size)?.[1] ?? 0);
    const u = D.FORGEHUB_PACKS.filter((p) => mb(p) < nmb).map((p) => "pack:" + p.id), o = D.FORGEHUB_PACKS.filter((p) => mb(p) > nmb).map((p) => "pack:" + p.id);
    t("size under", `which packs are under ${nmb} MB`, (a) => u.length ? sameSet(keys(a), u) : /No pack/.test(text(a)));
    t("size over", `which packs are over ${nmb} MB`, (a) => o.length ? sameSet(keys(a), o) : /No pack/.test(text(a)));
  }
  const total = D.FORGEHUB_PACKS.reduce((s, p) => s + Number(/([\d.]+)\s*MB/i.exec(p.size)?.[1] ?? 0), 0);
  t("total size", "what is the total size of all packs", has(total.toLocaleString("en-US")));
  // keyword filter: every pack must be found by a distinctive word of its own name
  for (const p of D.FORGEHUB_PACKS) {
    const w = p.name.toLowerCase().match(/[a-z][a-z0-9]{6,}/g)?.find((x) => !["pack","polyglot","hardware","scraping","browser"].includes(x));
    if (!w) continue;
    t("keyword filter", `which packs mention ${w}`, (a) => keys(a).includes("pack:" + p.id));
  }
  for (const [q, cnt] of [["how many packs are there", D.FORGEHUB_PACKS.length], ["how many prompts are there", D.DEEP_PROMPTS.length], ["how many confirmations", D.LOCKED_CONFIRMATIONS.length], ["how many patches", D.SPECIFICATION_PATCHES.length], ["how many spikes", D.PROTOTYPE_SPIKES.length], ["how many chapters", D.CHAPTERS.length], ["how many agents", D.INITIAL_ROSTER.length], ["how many tasks", D.INITIAL_TASKS.length]]) t("count", q, has(String(cnt)));
  t("count crates", "how many crates", has(String(D.CRATES_LIST.length)));
  // unknown items must be refused, never guessed
  for (const q of [`pack ${D.FORGEHUB_PACKS.length + 1}`, "pack 99", "prompt 99", "spike 9", "chapter 9", "tell me about forge-nonexistent", "confirm 9"]) t("unknown item", q, (a) => a.status === "none" && /There is no/.test(text(a)));
  // out of scope must say so
  for (const q of ["what is the weather", "tell me a joke", "write me a poem", "who won the world cup", "hello", "asdf", "what is the capital of france", "translate this to german", "how do I bake bread"]) t("out of scope", q, (a) => a.status === "none");
  // regressions found by the 150-question fuzz (each of these used to return a confident wrong answer)
  t("reg ghidra prompts", "which prompts mention ghidra", (a) => keys(a).length < D.DEEP_PROMPTS.length && !/Prompt 01/.test(text(a)) || /No prompt/.test(text(a)));
  t("reg ghidra packs", "which packs mention ghidra", (a) => keys(a).includes("pack:Pack 10") && keys(a).length < 5);
  t("reg paused", "how many agents are paused", (a, tx) => /paused/.test(tx) && !/There are 4 agents/.test(tx));
  t("reg tier compare", "compare tier a and tier s", has("Tier S"));
  t("reg 3-way compare", "difference between pack 2 and pack 3 and pack 4", (a, tx) => /Pack 04/.test(tx));
  t("reg acp", "what is acp", (a) => a.status !== "exact");
  t("reg swarm lab", "how to use the swarm lab", (a) => !/Swarms & ForgeLab/.test(text(a)));
  t("reg patches list", "list patches", (a) => keys(a).length === D.SPECIFICATION_PATCHES.length);
  t("reg categories", "how many categories", has("5"));
  t("reg disk total", "how much disk do all packs need", has("MB"));
  t("reg binaries", "which crates are binaries", (a) => keys(a).every((k) => k.startsWith("crate:bins/")) && keys(a).length >= 1);
  t("reg tiers word", "what are the locked decisions about tiers", (a) => !/^Tier S is listed/.test(text(a)));
  t("reg first/last", "last pack", has("Pack 25"));
  t("reg between", "packs between 100 and 300 MB", (a) => keys(a).length > 0 && keys(a).every((k) => { const p = D.FORGEHUB_PACKS.find((x) => "pack:" + x.id === k); const m = Number(/([\d.]+)/.exec(p.size)[1]); return m >= 100 && m <= 300; }));
  t("reg no deps", "what has no dependencies", has("forge-types"));
  // tracker-aware answers
  const tr = { "Prompt 01": { status: "done", note: "" }, "Prompt 02": { status: "running", note: "" } };
  { n++; const a = ask("which prompts are done", tr); if (!(keys(a).length === 1 && keys(a)[0] === "prompt:Prompt 01")) fails.push("tracker done | " + text(a).slice(0, 100)); }
  { n++; const a = ask("what should I run next", tr); if (!/Prompt 02/.test(text(a))) fails.push("tracker next | " + text(a).slice(0, 100)); }
  { n++; const a = ask("what is my progress", tr); if (!/1 of 14/.test(text(a))) fails.push("tracker progress | " + text(a).slice(0, 100)); }
  // never throws, always returns blocks
  const words = "pack crate prompt tier b e s mb under over 10 25 forge-db what how many which is the of and mention ghidra 0 -1 ? ! , . : ; ( ) \" ' / \\ [ ] { } < > $ ^ * + | ~ # @ % & = _ ".split(" ");
  let seed = 7; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  for (let i = 0; i < 1500; i++) {
    const q = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => words[Math.floor(rnd() * words.length)]).join(" ");
    n++;
    try { const a = ask(q); if (!Array.isArray(a.blocks) || !a.blocks.length) fails.push("empty answer | " + q); else if (!["exact","closest","none"].includes(a.status)) fails.push("no status | " + q); } catch (e) { fails.push("THREW | " + q + " | " + e.message); }
  }
  return { n, fails };
});
console.log(`${res.n - res.fails.length}/${res.n} contract checks passed`);
res.fails.slice(0, 60).forEach((f) => console.log("FAIL", f));
await browser.close();
process.exit(res.fails.length ? 1 : 0);
