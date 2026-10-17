// #region 5b. ANSWER ENGINE (rule-based, no LLM): intent + entities over the typed data, then prose retrieval.
// Every sentence it produces is a template filled from the document's own data; nothing is generated.
type EntKind = PaneKind | "chapter" | "agent" | "task" | "tier";
interface Ent { kind: EntKind; id: string }
export interface EngineOpts { depth: Depth; tracker: Record<string, { status: PromptStatus; note: string }>; ctx?: string }

const TIER_ORDER = ["E", "C", "B", "A", "S"] as const;
const tierLabel = (t: string) => TIER_CHART_DATA[TIER_ORDER.indexOf(t as (typeof TIER_ORDER)[number])]?.tier ?? `Tier ${t}`;
const sizeMB = (s: string) => Number(/([\d.]+)\s*MB/i.exec(s)?.[1] ?? 0);
const pad2 = (n: string) => n.padStart(2, "0");
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pluralWord = (w: string) => (/[^aeiou]y$/.test(w) ? w.slice(0, -1) + "ies" : /(ch|sh|s|x)$/.test(w) ? w + "es" : w + "s");
const plural = (n: number, w: string) => { const p = w.split(" "); const last = p.pop() as string; return `${n} ${[...p, n === 1 ? last : pluralWord(last)].join(" ")}`; };

const CRATE_ALIASES: { id: string; aliases: string[] }[] = CRATES_LIST.map((c) => {
  const tail = c.name.split("/").pop() ?? c.name;
  const aliases = tail.includes(",") ? ["forge-worker", "gf-tmux-shim", "gf-emergency-hud"] : tail === "geminiforge-daemon" ? ["geminiforge-daemon", "the daemon"] : [tail, tail.replace(/-/g, " ")];
  return { id: c.name, aliases };
});

function findEntities(q: string): Ent[] {
  const out: Ent[] = [];
  const add = (kind: EntKind, id: string) => { if (!out.some((e) => e.kind === kind && e.id === id)) out.push({ kind, id }); };
  for (const m of q.matchAll(/\bpacks?\s*[-#]?\s*0*(\d{1,2})\b/g)) { const id = `Pack ${pad2(m[1])}`; if (FORGEHUB_PACKS.some((p) => p.id === id)) add("pack", id); }
  for (const m of q.matchAll(/\bprompts?\s*[-#]?\s*0*(\d{1,2})\b/g)) { const id = `Prompt ${pad2(m[1])}`; if (DEEP_PROMPTS.some((p) => p.id === id)) add("prompt", id); }
  for (const m of q.matchAll(/\bconfirm(?:ation)?s?[-\s#]*0*(\d)\b/g)) add("confirm", `CONFIRM-0${m[1]}`);
  for (const m of q.matchAll(/\b(?:patch\s*)?f\.\s*([1-6])\b|\bpatch\s*f?\s*\.?\s*([1-6])\b/g)) add("patch", `Patch F.${m[1] ?? m[2]}`);
  for (const m of q.matchAll(/\bspikes?[-\s#]*0*(\d)\b/g)) add("spike", `SPIKE-0${m[1]}`);
  for (const m of q.matchAll(/\bch(?:apter)?\.?\s*0*([1-7])\b/g)) add("chapter", CHAPTERS[Number(m[1]) - 1].id);
  for (const m of q.matchAll(/\btier[\s-]+([ecbas])\b/g)) add("tier", m[1].toUpperCase());
  for (const m of q.matchAll(/\bgf-t\d+-\d+\b/g)) { const t = INITIAL_TASKS.find((x) => x.taskId.toLowerCase() === m[0]); if (t) add("task", t.taskId); }
  for (const a of INITIAL_ROSTER) {
    const role = a.role.toLowerCase().replace(/\(.*\)/, "").trim();
    const words = role.split(/[\s/&-]+/).filter((w) => w.length > 4 && !["principal", "adversarial", "chief", "systems"].includes(w));
    if (q.includes(a.id) || q.includes(role) || /\b(chief|ceo|cto)\b.*\barchitect|\barchitect\b/.test(q) && a.id === "agent-arch-01" || (words.length > 0 && words.every((w) => q.includes(w)))) add("agent", a.id);
  }
  for (const c of CRATE_ALIASES) if (c.aliases.some((al) => new RegExp(`(?<![\\w-])${esc(al)}(?![\\w-])`, "i").test(q))) add("crate", c.id);
  return out;
}

const NOUNS: { re: RegExp; label: string; count: () => number }[] = [
  { re: /\bpacks?\b/, label: "pack", count: () => FORGEHUB_PACKS.length },
  { re: /\bcrates?\b/, label: "crate", count: () => CRATES_LIST.length },
  { re: /\bprompts?\b/, label: "prompt", count: () => DEEP_PROMPTS.length },
  { re: /\bconfirm(?:ation)?s?\b/, label: "confirmation", count: () => LOCKED_CONFIRMATIONS.length },
  { re: /\bpatch(?:es)?\b/, label: "patch", count: () => SPECIFICATION_PATCHES.length },
  { re: /\bspikes?\b/, label: "spike", count: () => PROTOTYPE_SPIKES.length },
  { re: /\bchapters?\b/, label: "chapter", count: () => CHAPTERS.length },
  { re: /\bagents?\b/, label: "agent", count: () => INITIAL_ROSTER.length },
  { re: /\btasks?\b/, label: "task", count: () => INITIAL_TASKS.length }
];

const P = (text: string): AnsBlock => ({ t: "p", text });
const KV = (rows: [string, string][]): AnsBlock => ({ t: "kv", rows });
const refItem = (ref: PaneRef, sub: string): { key: string; title: string; sub: string } => ({ key: refKey(ref), title: paneContent(ref)?.title ?? ref.id, sub });
const ans = (blocks: AnsBlock[], sources: string[], ctx?: string): Answer => ({ blocks, sources, ctx });
const pkRef = (id: string): PaneRef => ({ kind: "pack", id });

function describeEnt(e: Ent, sub: string, depth: Depth, tracker: EngineOpts["tracker"]): Answer | null {
  switch (e.kind) {
    case "crate": {
      const c = CRATES_LIST.find((x) => x.name === e.id);
      if (!c) return null;
      const ref: PaneRef = { kind: "crate", id: c.name };
      const key = refKey(ref);
      if (sub === "deps") return ans([P(`**${c.name}** depends on: ${c.deps}.`)], [key], key);
      if (sub === "rdeps") {
        const tail = c.name.split("/").pop() ?? "";
        const users = CRATES_LIST.filter((x) => x.name !== c.name && new RegExp(`(?<![\\w-])${esc(tail)}(?![\\w-])`).test(x.deps));
        const all = CRATES_LIST.filter((x) => x.deps.startsWith("All library crates"));
        const blocks: AnsBlock[] = [P(users.length ? `${plural(users.length, "entry")} list **${c.name}** as a dependency:` : `No entry lists **${c.name}** as a dependency.`)];
        if (users.length) blocks.push({ t: "items", items: users.map((u) => refItem({ kind: "crate", id: u.name }, `Depends on: ${u.deps}`)) });
        if (all.length && !c.name.startsWith("bins/")) blocks.push(P(`${all.map((a) => `**${a.name}**`).join(", ")} depends on all library crates, so it includes this one too.`));
        return ans(blocks, [key, ...users.map((u) => refKey({ kind: "crate", id: u.name }))], key);
      }
      if (sub === "why") return ans([P(`**${c.name}**: ${c.whyItMatters}`)], [key], key);
      if (sub === "plane") return ans([P(`**${c.name}** is in ${c.plane} (${c.layer}).`)], [key], key);
      if (sub === "code") return ans([P(`Definition for **${c.name}**:`), { t: "code", code: c.code, lang: langOf(c.code) }], [key], key);
      const blocks: AnsBlock[] = [P(`**${c.name}** (${c.layer}). ${c.plainSummary}`)];
      if (depth !== "brief") blocks.push(P(`**Why it matters:** ${c.whyItMatters}`), KV([["Allowed dependencies", c.deps], ["Plane", c.plane]]));
      if (depth === "detailed") blocks.push({ t: "code", code: c.code, lang: langOf(c.code) });
      return ans(blocks, [key], key);
    }
    case "pack": {
      const p = FORGEHUB_PACKS.find((x) => x.id === e.id);
      if (!p) return null;
      const key = refKey(pkRef(p.id));
      if (sub === "size") return ans([P(`**${p.id}: ${p.name}** is about **${p.size}** compressed.`)], [key], key);
      if (sub === "tier") return ans([P(`**${p.id}** needs at least **Tier ${p.minTier}** (${tierLabel(p.minTier)}).`)], [key], key);
      if (sub === "tools") return ans([P(`**${p.id}** bundles: ${p.tools}.`)], [key], key);
      const blocks: AnsBlock[] = [P(`**${p.id}: ${p.name}.** ${p.plainPurpose}`)];
      if (depth !== "brief") blocks.push(KV([["Size", p.size], ["Minimum tier", `Tier ${p.minTier} (${tierLabel(p.minTier)})`], ["Category", p.catLabel]]));
      if (depth === "detailed") blocks.push(P(`**Tools:** ${p.tools}`));
      return ans(blocks, [key], key);
    }
    case "prompt": {
      const p = DEEP_PROMPTS.find((x) => x.id === e.id);
      if (!p) return null;
      const key = refKey({ kind: "prompt", id: p.id });
      const st = tracker[p.id]?.status ?? "todo";
      if (sub === "why") return ans([P(`**${p.id}**: ${p.whyNeeded}`)], [key], key);
      if (sub === "full") return ans([P(`The full dispatch prompt for **${p.id}: ${p.title}** (copy it with the button on the code block):`), { t: "code", code: p.fullPrompt, lang: "text" }], [key], key);
      const blocks: AnsBlock[] = [P(`**${p.id}: ${p.title}.** ${p.plainGoal}`)];
      if (depth !== "brief") blocks.push(P(`**Why it is needed:** ${p.whyNeeded}`), KV([["Target specification files", p.files], ["Your tracker status", st === "todo" ? "To do" : st === "running" ? "Running" : "Done"]]));
      if (depth === "detailed" || sub === "code") blocks.push({ t: "code", code: p.fullPrompt, lang: "text" });
      return ans(blocks, [key], key);
    }
    case "confirm": {
      const c = LOCKED_CONFIRMATIONS.find((x) => x.id === e.id);
      if (!c) return null;
      const key = refKey({ kind: "confirm", id: c.id });
      return ans([P(`**${c.id}: ${c.title}.** ${c.plainWhy}`)], [key], key);
    }
    case "patch": {
      const p = SPECIFICATION_PATCHES.find((x) => x.id === e.id);
      if (!p) return null;
      const key = refKey({ kind: "patch", id: p.id });
      const blocks: AnsBlock[] = [P(`**${p.id}** targets ${p.target}: ${p.summary}.`)];
      if (depth !== "brief" || sub === "code") blocks.push({ t: "code", code: p.code, lang: langOf(p.code) });
      return ans(blocks, [key], key);
    }
    case "spike": {
      const s = PROTOTYPE_SPIKES.find((x) => x.id === e.id);
      if (!s) return null;
      const key = refKey({ kind: "spike", id: s.id });
      return ans([P(`**${s.id}: ${s.target}.** Candidate A is ${s.candA}; candidate B is ${s.candB}.`), P(`**Falsification gate:** ${s.gate}.`)], [key], key);
    }
    case "chapter": {
      const c = CHAPTERS.find((x) => x.id === e.id);
      if (!c) return null;
      const secs = CHAPTER_SECTIONS[c.id];
      return ans([P(`**Chapter ${c.num}: ${c.title}.** ${c.subtitle}.`), { t: "items", items: secs.map((s) => ({ key: `chapter:${c.id}/${s.id}`, title: s.title, sub: `Section ${s.num}` })) }], [`chapter:${c.id}`], `chapter:${c.id}`);
    }
    case "agent": {
      const a = INITIAL_ROSTER.find((x) => x.id === e.id);
      if (!a) return null;
      const tasks = INITIAL_TASKS.filter((t) => t.assignee === a.id);
      if (sub === "reports") return ans([P(`**${a.role}** (${a.id}) reports to **${a.reportsTo}**.`)], ["chapter:swarm/sec-swarm-agents"], undefined);
      return ans([P(`**${a.role}** (${a.id}). ${a.plainRoleExplanation}`), KV([["Reports to", a.reportsTo], ["Model tier", a.tier], ["Budget", `${fmtMicros(a.spentMicros)} of ${fmtMicros(a.budgetMicros)} (${pct(a.spentMicros, a.budgetMicros)}%)`], ["Tasks", tasks.map((t) => t.taskId).join(", ") || "none"]])], ["chapter:swarm/sec-swarm-agents"], undefined);
    }
    case "task": {
      const t = INITIAL_TASKS.find((x) => x.taskId === e.id);
      if (!t) return null;
      return ans([P(`**${t.taskId}: ${t.title}.** ${t.plainExplanation}`), KV([["Status", t.status.replace("_", " ")], ["Assignee", t.assignee], ["Confidence", `${t.confidence}%`], ["Ancestry", t.ancestry]])], ["chapter:swarm/sec-swarm-tasks"], undefined);
    }
    case "tier": {
      const i = TIER_ORDER.indexOf(e.id as (typeof TIER_ORDER)[number]);
      const d = TIER_CHART_DATA[i];
      if (!d) return null;
      const runs = FORGEHUB_PACKS.filter((p) => TIER_ORDER.indexOf(p.minTier) <= i);
      const needs = FORGEHUB_PACKS.filter((p) => p.minTier === e.id);
      return ans([P(`**Tier ${e.id}** is listed as ${d.tier} in the memory chart: about ${d.overheadGb} GB core overhead and ${d.modelGb === 0 ? "no local model budget" : `up to ${d.modelGb} GB for local models`}.`), P(`${plural(runs.length, "pack")} can run on it (minimum tier ${e.id} or lower); ${needs.length} ${needs.length === 1 ? "needs" : "need"} exactly Tier ${e.id}${needs.length ? ": " + needs.map((p) => p.id).join(", ") : ""}.`)], ["chapter:governor/sec-governor-chart1"], undefined);
    }
    default:
      return null;
  }
}

// ---- prose retrieval (BM25-lite) ----
interface Passage { key: string; title: string; text: string; disp?: string; toks: string[]; tset: Set<string>; w?: number }
const STOP = new Set("the a an is are was were be been of to in on for and or how what whats why does do did it its this that these those with about tell me explain which who where can could should i you we my our there any all from by as at than then so if not no yes please give show list v20 geminiforge used use using work works mean means describe definition thing stuff".split(" "));
const NUMW: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10" };
// shortcut: plural-only stemming + number words; no real stemmer, upgrade if recall on odd phrasings is poor.
const norm = (t: string) => NUMW[t] ?? (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);
function toks(s: string): string[] {
  const out: string[] = [];
  for (const m of s.toLowerCase().matchAll(/[a-z0-9][a-z0-9._#]*(?:[-/][a-z0-9._#]+)*/g)) {
    const t = m[0];
    if (STOP.has(t)) continue;
    out.push(norm(t));
    if (/[-/]/.test(t)) t.split(/[-/]/).forEach((x) => { if (x.length >= 2 && !STOP.has(x)) out.push(norm(x)); });
  }
  return out;
}

let PASSAGES: Passage[] | null = null;
let IDF = new Map<string, number>();
let AVG = 1;
let CORPUS = "";
function passages(): Passage[] {
  if (PASSAGES) return PASSAGES;
  const list: Omit<Passage, "toks" | "tset">[] = [];
  (Object.keys(CHAPTER_BLOCKS) as ChapterId[]).forEach((cid) => {
    const chapter = CHAPTERS.find((c) => c.id === cid)!;
    let sec = `sec-${cid}-top`;
    let secTitle = "Overview";
    CHAPTER_BLOCKS[cid].forEach((b, bi, arr) => {
      const key = `chapter:${cid}/${sec}`;
      const title = `${chapter.title} › ${secTitle}`;
      if (b.t === "h1") list.push({ key, title, text: stripMd(b.text) });
      else if (b.t === "h2") {
        sec = b.id; secTitle = stripMd(b.text);
        if (arr[bi + 1]?.t !== "p") list.push({ key: `chapter:${cid}/${sec}`, title: `${chapter.title} › ${secTitle}`, text: secTitle });
      }
      else if (b.t === "p") list.push({ key, title, text: stripMd(b.text) });
      else if (b.t === "rows") b.items.forEach((r) => list.push({ key, title: `${title} › ${r.title}`, text: `${r.title}. ${r.body.map(stripMd).join(" ")}` }));
      else if (b.t === "cards") b.items.forEach((c) => list.push({ key, title: `${title} › ${c.title}`, text: `${c.tag}. ${c.title}. ${c.text}` }));
      else if (b.t === "table") b.rows.forEach((r) => list.push({ key, title, text: r.join(" · "), w: 0.7 }));
    });
  });
  // Items with a side panel are indexed on their keyword string, but shown with their real text.
  INDEX.forEach((it) => { if (it.ref) list.push({ key: it.key, title: it.title, text: it.kw.replace(it.title.toLowerCase(), "").trim() || it.title, disp: paneContent(it.ref)?.why, w: 0.85 }); });
  PASSAGES = list.map((p) => ({ ...p, toks: toks(p.text), tset: new Set(toks(p.title)) }));
  CORPUS = list.map((p) => p.text).join("\n").toLowerCase();
  const df = new Map<string, number>();
  PASSAGES.forEach((p) => new Set([...p.toks, ...p.tset]).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const N = PASSAGES.length;
  IDF = new Map([...df].map(([t, d]) => [t, Math.log(1 + (N - d + 0.5) / (d + 0.5))]));
  AVG = PASSAGES.reduce((a, p) => a + p.toks.length, 0) / N;
  return PASSAGES;
}
const corpusHas = (t: string) => { passages(); return CORPUS.includes(t.toLowerCase()); };

function retrieve(q: string, n: number): { p: Passage; score: number; hit: string[]; qt: string[] }[] {
  const ps = passages();
  const qt = [...new Set(toks(q))];
  if (!qt.length) return [];
  const res = ps.map((p) => {
    const tf = new Map<string, number>();
    p.toks.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    let score = 0;
    const hit: string[] = [];
    qt.forEach((t) => {
      const f = tf.get(t) ?? 0;
      const inTitle = p.tset.has(t);
      if (!f && !inTitle) return;
      hit.push(t);
      const body = f ? (f * 2.2) / (f + 1.2 * (0.5 + 0.5 * (p.toks.length / AVG))) : 0;
      score += (IDF.get(t) ?? 0) * (/[._#\d-]/.test(t) ? 2 : 1) * (body + (inTitle ? 0.5 : 0));
    });
    return { p, score: score * (0.6 + 0.4 * (hit.length / qt.length)) * (p.text.length < 90 ? 0.55 : 1) * (p.w ?? 1), hit, qt };
  });
  return res.filter((r) => r.hit.length > 0 && r.score >= 2.2).sort((a, b) => b.score - a.score).slice(0, n);
}

function snippet(text: string, hit: string[]): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const best = sentences.map((s) => ({ s, n: hit.filter((h) => s.toLowerCase().includes(h)).length })).sort((a, b) => b.n - a.n)[0]?.s ?? text;
  return best.length > 230 ? best.slice(0, 227) + "..." : best;
}
// Excerpt around the sentence that matches the question best (the match is often not the first sentence).
function excerpt(text: string, hit: string[], max = 520): string {
  const sents = text.split(/(?<=[.!?])\s+/);
  let at = 0, bestN = -1;
  sents.forEach((x, i) => { const n = hit.filter((h) => x.toLowerCase().includes(h)).length; if (n > bestN) { bestN = n; at = i; } });
  let out = "";
  for (let i = at; i < sents.length && out.length < max; i++) out += (out ? " " : "") + sents[i];
  if (out.length > max) out = out.slice(0, max).replace(/\s+\S*$/, "") + " …";
  return (at > 0 ? "… " : "") + out;
}

export function sourceInfo(key: string): { title: string; run: () => void } | null {
  const st = useStore.getState();
  if (key.startsWith("chapter:")) {
    const [cid, sec] = key.slice(8).split("/");
    const c = CHAPTERS.find((x) => x.id === cid);
    if (!c) return null;
    const s = CHAPTER_SECTIONS[c.id].find((x) => x.id === sec);
    return { title: s && s.num !== "1" ? `${c.title} › ${s.title}` : c.title, run: () => st.go({ kind: "chapter", id: c.id, sec: sec && sec !== `sec-${cid}-top` ? sec : undefined }) };
  }
  if (key.startsWith("thread:")) {
    const t = st.threads.find((x) => x.id === key.slice(7));
    return t ? { title: `Question: ${t.title}`, run: () => st.go({ kind: "thread", id: t.id }) } : null;
  }
  const r = refFromKey(key);
  const pc = r ? paneContent(r) : null;
  return r && pc ? { title: pc.title, run: () => st.openPane(r) } : null;
}

// ---- intents ----
const RE = {
  cmp: /\b(vs\.?|versus|compare|comparison|difference|differences|differ|better than)\b/,
  dep: /\b(depend|depends|dependency|dependencies|require|requires|built on|relies)\b/,
  rev: /\b(what|which|who|crates?)\s+(?:crates?\s+|entries\s+)?(depend|depends|use|uses|need|needs|rely|relies)\b|\bused by\b|\bdepend(?:s|ing)? on (?:it|this)\b/,
  why: /\b(why|reason|rationale|matter|matters|purpose|needed|important)\b/,
  size: /\b(size|big|disk|footprint|megabytes|mb|weigh|heavy|large|largest|smallest|biggest|lightest|heaviest)\b/,
  tier: /\b(tier|hardware|minimum|min|laptop|ram|memory|vram)\b/,
  tools: /\b(tools?|includes?|contains?|bundles?|ships?|inside|components?)\b/,
  code: /\b(code|snippet|rust|sql|schema|trait|definition|implementation)\b/,
  full: /\b(full|complete|entire|whole|exact|raw)\b.*\bprompt\b|\bprompt\b.*\b(text|body|in full)\b|\bdispatch prompt\b/,
  plane: /\bwhich (plane|layer)\b|\bwhat (plane|layer)\b/,
  reports: /\breports? to\b|\bboss\b|\bmanager\b|\bsupervisor\b/,
  many: /\bhow many\b|\bnumber of\b|\bcount\b|\bhow much\b/,
  list: /\b(list|show|which|what are|name|give me|all|every|sort|order|rank)\b/,
  next: /\bnext\b.*\bprompt\b|\bprompt\b.*\bnext\b|\bwhich prompt\b.*\b(run|start)\b|\bwhat should i (run|do|start)\b|\bnext (one )?to run\b/,
  progress: /\b(progress|done|completed|finished|status|left|remaining)\b.*\b(prompt|prompts|tracker)\b|\bhow many prompts\b.*\b(done|completed|finished|left|remaining)\b|\bmy progress\b|\bhow am i doing\b/,
  overview: /\bwhat is (geminiforge|this (app|project|document|workbench))\b|\b(summary|summarize|summarise|overview|tl;?dr)\b/,
  where: /\b(where|which chapter|what chapter|which section)\b/,
  extreme: /\b(largest|biggest|heaviest|smallest|lightest)\b/,
  total: /\btotal\b|\bin total\b|\ball together\b|\bsum\b/,
  runsOn: /\b(run on|runs on|work on|works on|available|fit|fits|support|supported|for tier|can i use|can run)\b/,
  aux: /^(does|do|is|are|can|has|have|will|did|should)\b/
};

const CATS: { re: RegExp; id: string; label: string }[] = [
  { re: /\bcoding\b|\bacp\b|\blsp\b/, id: "CAT1", label: "Coding & ACP" },
  { re: /computer[- ]use|\bbrowser\b|\baccessibility\b/, id: "CAT2", label: "Computer Use" },
  { re: /clean[- ]room|reverse[- ]engineering|\bdecompil/, id: "CAT3", label: "Clean-Room RE" },
  { re: /\bswarms?\b|forgelab|\bsimulation/, id: "CAT4", label: "Swarms & ForgeLab" },
  { re: /\bvoice\b|\bstudio\b|\bnpu\b|local (llm|ai)/, id: "CAT5", label: "AI, Voice & Studio" }
];

// Words that carry no filtering meaning. Anything else left in a list question must filter the results (or be reported).
const GENERIC = new Set("locked lot lots list show name give which what how many much number count all every each mention mentions mentioned mentioning include includes including contain contains containing use uses using used has have having with without that need needs require requires required run runs support supports supported pack packs crate crates prompt prompts confirm confirmation confirmations patch patches patche entrie categorie disk space footprint megabytes big large weigh heavy storage spike spikes chapter chapters agent agents task tasks tier tiers category categories size sizes mb gb under over below above less more than between largest biggest smallest lightest heaviest total sum top first last are there is in of the by sort order rank ranked most fewest least can could does do will would should about called named tell me for from to and or not no one ones thing things also any test tests testing handle handles handling responsible cover covers covering involve involves feature features related relate relates".split(" "));

interface Item { key: string; title: string; sub: string; text: string; f: Record<string, string | number | boolean> }
const clip = (s: string, n = 110) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
function collection(label: string): { items: Item[]; src: string[] } | null {
  switch (label) {
    case "pack": return { src: ["chapter:packs/sec-packs-registry"], items: FORGEHUB_PACKS.map((p) => ({ key: refKey(pkRef(p.id)), title: `${p.id}: ${p.name}`, sub: `${p.size} · Tier ${p.minTier} · ${p.catLabel}`, text: `${p.id} ${p.name} ${p.plainPurpose} ${p.tools} ${p.catLabel} ${p.size}`, f: { mb: sizeMB(p.size), tier: p.minTier, cat: p.cat } })) };
    case "crate": return { src: ["chapter:planes/sec-planes-crates"], items: CRATES_LIST.map((c) => ({ key: refKey({ kind: "crate", id: c.name }), title: c.name, sub: `${c.layer} · ${c.plainSummary}`, text: `${c.name} ${c.layer} ${c.plane} ${c.plainSummary} ${c.whyItMatters} ${c.deps} ${c.code}`, f: { layer: /Layer (\d)/.exec(c.layer)?.[1] ?? "", planes: [...c.plane.matchAll(/Plane (\d)/g)].map((m) => m[1]).join(","), bin: c.name.startsWith("bins/"), leaf: /^None/.test(c.deps) } })) };
    case "prompt": return { src: [], items: DEEP_PROMPTS.map((p) => ({ key: refKey({ kind: "prompt", id: p.id }), title: `${p.id}: ${p.title}`, sub: clip(p.plainGoal), text: `${p.id} ${p.title} ${p.files} ${p.plainGoal} ${p.whyNeeded} ${p.fullPrompt}`, f: {} })) };
    case "confirmation": return { src: [], items: LOCKED_CONFIRMATIONS.map((c) => ({ key: refKey({ kind: "confirm", id: c.id }), title: `${c.id}: ${c.title}`, sub: clip(c.plainWhy), text: `${c.id} ${c.title} ${c.plainWhy}`, f: {} })) };
    case "patch": return { src: [], items: SPECIFICATION_PATCHES.map((p) => ({ key: refKey({ kind: "patch", id: p.id }), title: `${p.id} · ${p.target}`, sub: clip(p.summary), text: `${p.id} ${p.target} ${p.summary} ${p.code}`, f: {} })) };
    case "spike": return { src: [], items: PROTOTYPE_SPIKES.map((s) => ({ key: refKey({ kind: "spike", id: s.id }), title: `${s.id} · ${s.target}`, sub: clip(`${s.candA} vs ${s.candB}`), text: `${s.id} ${s.target} ${s.candA} ${s.candB} ${s.gate}`, f: {} })) };
    case "agent": return { src: ["chapter:swarm/sec-swarm-agents"], items: INITIAL_ROSTER.map((a) => ({ key: "chapter:swarm/sec-swarm-agents", title: a.role, sub: `${a.id} · ${a.tier}`, text: `${a.id} ${a.role} ${a.plainRoleExplanation} ${a.reportsTo} ${a.tier}`, f: { paused: a.paused } })) };
    case "task": return { src: ["chapter:swarm/sec-swarm-tasks"], items: INITIAL_TASKS.map((t) => ({ key: "chapter:swarm/sec-swarm-tasks", title: `${t.taskId} · ${t.title}`, sub: `${t.status.replace("_", " ").toLowerCase()} · ${t.assignee}`, text: `${t.taskId} ${t.title} ${t.plainExplanation} ${t.ancestry} ${t.assignee}`, f: { status: t.status } })) };
    case "chapter": return { src: [], items: CHAPTERS.map((c) => ({ key: `chapter:${c.id}`, title: `${c.num} · ${c.title}`, sub: c.subtitle, text: `${c.title} ${c.subtitle}`, f: {} })) };
    default: return null;
  }
}

// Searchable text for one entity (used to answer "does X mention Y?" from the entry itself).
function entityText(e: Ent): string {
  const it = collection(e.kind === "confirm" ? "confirmation" : e.kind)?.items.find((x) => x.key === refKey({ kind: e.kind as PaneKind, id: e.id }) || (e.kind === "agent" && x.text.includes(e.id)) || (e.kind === "task" && x.text.includes(e.id)));
  return it?.text ?? "";
}

const finish = (a: Answer, understood: string, status: Answer["status"] = "exact"): Answer => ({ ...a, understood, status });
const NONE_MSG = "I could not find that in this document. Try a pack, crate, prompt or chapter name, or press Ctrl K to search.";

function closestAnswer(raw: string): Answer {
  const found = retrieve(raw, 12);
  const top = found[0];
  const qt = top?.qt ?? [];
  const terms = [...new Set(toks(raw))].slice(0, 6).map((t) => `“${t}”`).join(", ");
  const content = qt.filter((t) => !GENERIC.has(t));
  const strong = !!top && content.length > 0 && (top.hit.filter((t) => content.includes(t)).length / content.length >= 0.6 || top.hit.some((t) => /[._#\d-]/.test(t) && (IDF.get(t) ?? 0) > 1.5));
  if (!top || !strong) return finish(ans([P(NONE_MSG)], []), terms ? `Searched the document text for ${terms}` : "Nothing to search for", "none");
  const seen = new Set<string>([top.p.key]);
  const more = found.slice(1).filter((f) => (seen.has(f.p.key) ? false : (seen.add(f.p.key), true))).slice(0, 2);
  const last = top.p.title.split(" › ").pop() ?? "";
  let body = top.p.disp ?? top.p.text;
  if (last && body.startsWith(last)) body = body.slice(last.length).replace(/^[.\s]+/, "") || body;
  const blocks: AnsBlock[] = [P("This is not an exact answer. The closest part of the document says:"), P(`**${top.p.title}.** ${excerpt(body, top.hit)}`)];
  if (more.length) blocks.push(P("Also close:"), { t: "items", items: more.map((f) => ({ key: f.p.key, title: f.p.title, sub: snippet(f.p.disp ?? f.p.text, f.hit) })) });
  return finish(ans(blocks, [top.p.key, ...more.map((f) => f.p.key)]), `No rule matched, so I searched the document text for ${terms}`, "closest");
}

function checkUnknown(q: string): Answer | null {
  const miss = (what: string, range: string) => finish(ans([P(`There is no ${what} in this document. ${range}`)], []), `Looked for ${what}`, "none");
  for (const m of q.matchAll(/\bpacks?\s*[-#]?\s*0*(\d{1,3})\b/g)) if (!FORGEHUB_PACKS.some((p) => p.id === `Pack ${pad2(m[1])}`)) return miss(`Pack ${pad2(m[1])}`, `The registry has Pack 01 to Pack ${pad2(String(FORGEHUB_PACKS.length))}.`);
  for (const m of q.matchAll(/\bprompts?\s*[-#]?\s*0*(\d{1,3})\b/g)) if (!DEEP_PROMPTS.some((p) => p.id === `Prompt ${pad2(m[1])}`)) return miss(`Prompt ${pad2(m[1])}`, `There are Prompt 01 to Prompt ${pad2(String(DEEP_PROMPTS.length))}.`);
  for (const m of q.matchAll(/\bconfirm(?:ation)?s?[-\s#]*0*(\d{1,3})\b/g)) if (!LOCKED_CONFIRMATIONS.some((c) => c.id === `CONFIRM-0${m[1]}`)) return miss(`CONFIRM-${pad2(m[1])}`, `There are ${LOCKED_CONFIRMATIONS.length} locked confirmations.`);
  for (const m of q.matchAll(/\bspikes?[-\s#]*0*(\d{1,3})\b/g)) if (!PROTOTYPE_SPIKES.some((s) => s.id === `SPIKE-0${m[1]}`)) return miss(`SPIKE-${pad2(m[1])}`, `There are ${PROTOTYPE_SPIKES.length} spikes.`);
  for (const m of q.matchAll(/\bch(?:apter)?\.?\s*0*(\d{1,3})\b/g)) if (Number(m[1]) < 1 || Number(m[1]) > CHAPTERS.length) return miss(`Chapter ${m[1]}`, `There are ${CHAPTERS.length} chapters.`);
  for (const m of q.matchAll(/\b(?:forge|geminiforge|gf)-[a-z0-9][a-z0-9-]*\b/g)) {
    const t = m[0];
    const known = CRATE_ALIASES.some((c) => c.aliases.some((a) => a === t)) || INITIAL_ROSTER.some((a) => a.id === t) || /^gf-t\d+-\d+$/.test(t) && INITIAL_TASKS.some((x) => x.taskId.toLowerCase() === t);
    if (!known && !corpusHas(t)) return miss(`item called “${t}”`, "Try Ctrl K to search by name.");
  }
  return null;
}

type Pred = { note: string; test: (i: Item) => boolean; kw?: boolean };

export function answerQuestion(raw: string, opts: EngineOpts): Answer {
  const q = raw.toLowerCase().replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
  const { depth, tracker } = opts;
  if (!q) return finish(ans([P("Type a question first.")], []), "Empty question", "none");
  let ents = findEntities(q);

  const unknown = checkUnknown(q);
  if (unknown) return unknown;

  // follow-up: "and what does it depend on?" reuses the previous subject
  if (ents.length === 0 && opts.ctx && /\b(it|its|this|that|those|they|their|them|more|also)\b|^and\b/.test(q)) {
    const r = refFromKey(opts.ctx);
    if (r) ents = [{ kind: r.kind, id: r.id }];
    else if (opts.ctx.startsWith("chapter:")) ents = [{ kind: "chapter", id: opts.ctx.slice(8) }];
  }

  // ordinals: "first prompt", "last pack"
  const ord = /\b(first|last|latest|final)\s+(pack|prompt|crate|spike|patch|confirmation|chapter)\b/.exec(q);
  if (ord && ents.length === 0) {
    const label = ord[2];
    const col = collection(label);
    const it = col && (/first/.test(ord[1]) ? col.items[0] : col.items[col.items.length - 1]);
    const r = it ? refFromKey(it.key) : null;
    if (r) ents = [{ kind: r.kind, id: r.id }];
    else if (it?.key.startsWith("chapter:")) ents = [{ kind: "chapter", id: it.key.slice(8) }];
  }

  // tracker questions
  const tr = (st: PromptStatus) => DEEP_PROMPTS.filter((p) => (tracker[p.id]?.status ?? "todo") === st);
  if (RE.next.test(q)) {
    const n = DEEP_PROMPTS.find((p) => (tracker[p.id]?.status ?? "todo") !== "done");
    if (!n) return finish(ans([P("Every prompt is marked done in your tracker.")], []), "Next prompt to run, from your tracker");
    const running = tr("running");
    return finish(ans([P(`${running.length ? `You have ${plural(running.length, "prompt")} marked running (${running.map((p) => p.id).join(", ")}). ` : ""}The next prompt not yet done is **${n.id}: ${n.title}**. ${n.plainGoal}`), { t: "items", items: [refItem({ kind: "prompt", id: n.id }, "Open the dispatch prompt")] }], [refKey({ kind: "prompt", id: n.id })], refKey({ kind: "prompt", id: n.id })), "Next prompt to run, from your tracker");
  }
  if (RE.progress.test(q) && !/\bwhich\b/.test(q)) {
    const done = tr("done").length;
    return finish(ans([P(`**${done} of ${DEEP_PROMPTS.length}** prompts are marked done in your tracker; ${tr("running").length} running and ${tr("todo").length} still to do.`)], []), "Your prompt progress, from your tracker");
  }
  if (RE.overview.test(q) && ents.length === 0) {
    return finish(ans([P("**GeminiForge V20** is described in this document as a free, local-first AI coding, computer-use and reverse-engineering workstation. It is organized as follows:"), { t: "items", items: CHAPTERS.map((c) => ({ key: `chapter:${c.id}`, title: `${c.num} · ${c.title}`, sub: c.subtitle })) }], ["chapter:overview"]), "Overview of the document");
  }

  // comparison of two or more items of the same kind
  const same = ents.filter((e) => e.kind === ents[0]?.kind);
  if (RE.cmp.test(q) && same.length >= 2) {
    const kind = same[0].kind;
    const row = (label: string, vals: string[]): [string, string] => [label, vals.join("  |  ")];
    const names = same.map((e) => e.id);
    if (kind === "pack") {
      const ps = same.map((e) => FORGEHUB_PACKS.find((p) => p.id === e.id)!);
      return finish(ans([P(`Comparison of ${ps.map((p) => `**${p.id}**`).join(", ")}:`), KV([row("Name", ps.map((p) => p.name)), row("Size", ps.map((p) => p.size)), row("Minimum tier", ps.map((p) => p.minTier)), row("Category", ps.map((p) => p.catLabel)), row("Purpose", ps.map((p) => p.plainPurpose))])], ps.map((p) => refKey(pkRef(p.id)))), `Comparing ${names.join(", ")}`);
    }
    if (kind === "crate") {
      const cs = same.map((e) => CRATES_LIST.find((c) => c.name === e.id)!);
      return finish(ans([P(`Comparison of ${cs.map((c) => `**${c.name}**`).join(", ")}:`), KV([row("Layer", cs.map((c) => c.layer)), row("Plane", cs.map((c) => c.plane)), row("Dependencies", cs.map((c) => c.deps)), row("Summary", cs.map((c) => c.plainSummary))])], cs.map((c) => refKey({ kind: "crate", id: c.name }))), `Comparing ${names.join(", ")}`);
    }
    if (kind === "tier") {
      const ds = same.map((e) => ({ id: e.id, d: TIER_CHART_DATA[TIER_ORDER.indexOf(e.id as (typeof TIER_ORDER)[number])] }));
      return finish(ans([P(`Comparison of ${ds.map((x) => `**Tier ${x.id}**`).join(", ")}:`), KV([row("Memory", ds.map((x) => x.d.tier)), row("Core overhead", ds.map((x) => `${x.d.overheadGb} GB`)), row("Local model budget", ds.map((x) => (x.d.modelGb === 0 ? "none" : `up to ${x.d.modelGb} GB`))), row("Packs that need exactly this tier", ds.map((x) => String(FORGEHUB_PACKS.filter((p) => p.minTier === x.id).length)))])], ["chapter:governor/sec-governor-chart1"]), `Comparing ${names.map((n) => `Tier ${n}`).join(", ")}`);
    }
  }

  // entity questions
  const tierQuery = ents[0]?.kind === "tier" && (RE.many.test(q) || /\bpacks?\b/.test(q));
  if (ents.length > 0 && !tierQuery) {
    const e = ents[0];
    const label = `${e.kind} ${e.id}`;
    let sub = "define";
    if (e.kind === "crate") sub = RE.rev.test(q) ? "rdeps" : RE.dep.test(q) ? "deps" : RE.why.test(q) ? "why" : RE.plane.test(q) ? "plane" : RE.code.test(q) ? "code" : "define";
    else if (e.kind === "pack") sub = RE.size.test(q) ? "size" : RE.tier.test(q) ? "tier" : RE.tools.test(q) ? "tools" : "define";
    else if (e.kind === "prompt") sub = RE.full.test(q) ? "full" : RE.why.test(q) ? "why" : RE.code.test(q) ? "code" : "define";
    else if (e.kind === "patch") sub = RE.code.test(q) ? "code" : "define";
    else if (e.kind === "agent") sub = RE.reports.test(q) ? "reports" : "define";

    // "does pack 5 need a gpu?": check the entry's own text for the word instead of describing the entry
    if (RE.aux.test(q) && sub === "define") {
      const idWords = new Set(toks(e.id).concat(toks(label)));
      const terms = toks(q).filter((t) => !GENERIC.has(t) && !idWords.has(t) && !e.id.toLowerCase().includes(t) && t.length > 1 && !/^\d+$/.test(t));
      const txt = entityText(e);
      if (terms.length && txt && !RE.size.test(q) && !RE.tier.test(q) && !RE.runsOn.test(q) && !RE.why.test(q)) {
        const lower = txt.toLowerCase();
        const present = terms.filter((t) => lower.includes(t));
        const absent = terms.filter((t) => !lower.includes(t));
        const d = describeEnt(e, "define", "brief", tracker);
        if (d) {
          const head = absent.length === 0
            ? `The entry for **${e.id}** mentions ${terms.map((t) => `“${t}”`).join(", ")}: “${snippet(txt, present)}”`
            : `The entry for **${e.id}** does not mention ${absent.map((t) => `“${t}”`).join(", ")}${present.length ? ` (it does mention ${present.map((t) => `“${t}”`).join(", ")})` : ""}. This only checks the wording of the entry; it does not say whether the thing is true in general.`;
          return finish(ans([P(head), ...d.blocks], d.sources, d.ctx), `Checking whether the entry for ${e.id} mentions ${terms.join(", ")}`);
        }
      }
    }

    if (RE.where.test(q) && e.kind !== "chapter") {
      const item = INDEX.find((i) => i.ref && i.ref.kind === e.kind && i.ref.id === e.id);
      const ch = CHAPTERS.find((c) => CHAPTER_BLOCKS[c.id].some((b) => (e.kind === "pack" && b.t === "packs") || (e.kind === "crate" && b.t === "crates") || (e.kind === "prompt" && b.t === "prompts") || (e.kind === "confirm" && b.t === "confirms") || (e.kind === "patch" && b.t === "patches")));
      if (item && ch) return finish(ans([P(`**${item.title}** is covered in Chapter ${ch.num}: ${ch.title}, and opens in the side panel from the list there.`), { t: "items", items: [{ key: item.key, title: item.title, sub: "Open in side panel" }, { key: `chapter:${ch.id}`, title: `Chapter ${ch.num}: ${ch.title}`, sub: ch.subtitle }] }], [item.key, `chapter:${ch.id}`], item.key), `Where ${e.id} is covered`);
    }
    const a = describeEnt(e, sub, depth, tracker);
    if (a) {
      const u = `${label} · ${sub === "define" ? "what it is" : sub}`;
      if (ents.length > 1 && ents[1].kind === e.kind && !RE.cmp.test(q)) {
        const more = ents.slice(1).map((x) => describeEnt(x, sub, depth, tracker)).filter((x): x is Answer => !!x);
        return finish(ans([...a.blocks, ...more.flatMap((m) => m.blocks)], [...a.sources, ...more.flatMap((m) => m.sources)], a.ctx), `${u} (and ${ents.slice(1).map((x) => x.id).join(", ")})`);
      }
      return finish(a, u);
    }
  }

  // set questions: one engine for every collection. Every filter in the question is applied, and every leftover word filters by text.
  let noun = NOUNS.find((n) => n.re.test(q));
  const asksBins = /\bbin(?:ary|aries|s)?\b/.test(q);
  if (!noun && asksBins) noun = NOUNS.find((n) => n.label === "crate");
  const tierEnt = ents.find((e) => e.kind === "tier");
  const catAllowed = noun?.label === "pack" || /\bcategor/.test(q);
  const cat = catAllowed ? CATS.find((c) => c.re.test(q)) : undefined;

  // groupings: "what are the categories", "how many categories", "which category has the most packs"
  if (/\bcategor/.test(q) && (!noun || noun.label === "pack")) {
    const groups = [...new Map(FORGEHUB_PACKS.map((p) => [p.cat, p.catLabel])).entries()].map(([id, label]) => ({ id, label, n: FORGEHUB_PACKS.filter((p) => p.cat === id).length }));
    const src = ["chapter:packs/sec-packs-registry"];
    if (/\b(most|biggest|largest|fewest|least|smallest)\b/.test(q)) {
      const most = !/\b(fewest|least|smallest)\b/.test(q);
      const best = Math.max(...groups.map((g) => (most ? g.n : -g.n)));
      const win = groups.filter((g) => (most ? g.n : -g.n) === best);
      return finish(ans([P(`${most ? "Most" : "Fewest"} packs: **${win.map((g) => g.label).join(" and ")}** with ${win[0].n} ${win[0].n === 1 ? "pack" : "packs"}${win.length > 1 ? " each" : ""}.`), KV(groups.map((g) => [g.label, String(g.n)]))], src), "Pack categories, counted from the registry");
    }
    if (RE.many.test(q) && !cat) return finish(ans([P(`There are **${groups.length}** pack categories: ${groups.map((g) => `${g.label} (${g.n})`).join(", ")}.`)], src), "Number of pack categories");
    if (!cat) return finish(ans([P(`${plural(groups.length, "pack category")}:`), KV(groups.map((g) => [g.label, plural(g.n, "pack")]))], src), "List of pack categories");
  }
  if (/\btiers\b/.test(q) && !noun && !tierEnt && RE.many.test(q)) {
    return finish(ans([P(`There are **${TIER_CHART_DATA.length}** hardware tiers: ${TIER_CHART_DATA.map((t) => t.tier).join(", ")}.`)], ["chapter:governor/sec-governor-chart1"]), "Hardware tiers");
  }

  const hasPackFilter = !!tierEnt || !!cat || /\b\d+\s*mb\b/.test(q);
  const label = noun?.label ?? (hasPackFilter ? "pack" : /\bno dependenc|\bwithout dependenc|\bleaf\b/.test(q) ? "crate" : "");
  const col = label ? collection(label) : null;
  if (col && (noun || hasPackFilter || label === "crate")) {
    let rest = q;
    const take = (re: RegExp) => { const m = re.exec(rest); if (m) rest = rest.replace(re, " "); return m; };
    const preds: Pred[] = [];
    const num = (s: string) => Number(s);
    let sizeSort: "asc" | "desc" | null = null;
    let topN = 0;

    if (label === "pack") {
      if (tierEnt) {
        const i = TIER_ORDER.indexOf(tierEnt.id as (typeof TIER_ORDER)[number]);
        take(/\btier[\s-]+[ecbas]\b/g);
        if (RE.runsOn.test(q) || /\bcan\b/.test(q)) preds.push({ note: `that can run on Tier ${tierEnt.id} (minimum tier ${tierEnt.id} or lower)`, test: (it) => TIER_ORDER.indexOf(it.f.tier as (typeof TIER_ORDER)[number]) <= i });
        else preds.push({ note: `whose minimum tier is exactly Tier ${tierEnt.id}`, test: (it) => it.f.tier === tierEnt.id });
      }
      if (cat) { take(cat.re); preds.push({ note: `in the category ${cat.label}`, test: (it) => it.f.cat === cat.id }); }
      const btw = take(/\bbetween\s*(\d+)\s*(?:mb)?\s*(?:and|to|-)\s*(\d+)\s*mb\b/);
      if (btw) { const lo = Math.min(num(btw[1]), num(btw[2])), hi = Math.max(num(btw[1]), num(btw[2])); preds.push({ note: `between ${lo} and ${hi} MB`, test: (it) => (it.f.mb as number) >= lo && (it.f.mb as number) <= hi }); }
      const lim = take(/\b(under|below|smaller than|less than|over|above|larger than|bigger than|more than)\s*(\d+)\s*mb\b/);
      if (lim) { const n = num(lim[2]); const less = /under|below|smaller|less/.test(lim[1]); preds.push({ note: `${less ? "under" : "over"} ${n} MB`, test: (it) => (less ? (it.f.mb as number) < n : (it.f.mb as number) > n) }); }
      const tn = take(/\btop\s*(\d+)\b|\b(\d+)\s+(?:largest|biggest|smallest|lightest|heaviest)\b/);
      if (tn) topN = num(tn[1] ?? tn[2]);
      if (/\b(sort|order|rank)\b/.test(q) && /\bsize\b|\bmb\b/.test(q)) sizeSort = /\b(asc|ascending|smallest first|lightest first)\b/.test(q) ? "asc" : "desc";
    }
    if (label === "crate") {
      const layer = take(/\blayers?\s*([0-5])\b/);
      if (layer) preds.push({ note: `in Layer ${layer[1]}`, test: (it) => it.f.layer === layer[1] });
      const plane = take(/\bplanes?\s*([1-5])\b/);
      if (plane) preds.push({ note: `in Plane ${plane[1]}`, test: (it) => String(it.f.planes).split(",").includes(plane[1]) });
      if (asksBins) { rest = rest.replace(/\bbin(?:ary|aries|s)?\b/g, " "); preds.push({ note: "under bins/ (binaries)", test: (it) => it.f.bin === true }); }
      if (/\bno dependenc|\bwithout dependenc|\bleaf\b/.test(q)) { rest = rest.replace(/\b(no|without) dependenc\w*|\bleaf\b/g, " "); preds.push({ note: "with no dependencies", test: (it) => it.f.leaf === true }); }
    }
    if (label === "prompt") {
      const st = (p: Item) => tracker[p.title.split(":")[0]]?.status ?? "todo";
      const done = take(/\b(done|completed|finished)\b/); if (done) preds.push({ note: "marked done in your tracker", test: (it) => st(it) === "done" });
      const run = take(/\b(running|in progress)\b/); if (run) preds.push({ note: "marked running in your tracker", test: (it) => st(it) === "running" });
      const todo = take(/\b(to ?do|not started|remaining|left|pending|unfinished)\b/); if (todo) preds.push({ note: "still to do in your tracker", test: (it) => st(it) === "todo" });
    }
    if (label === "task") {
      for (const [re, code, nice] of [[/\brunning\b/, "RUNNING", "running"], [/\bpending\b/, "PENDING", "pending"], [/\b(completed|done|finished)\b/, "COMPLETED", "completed"], [/\bin review\b/, "IN_REVIEW", "in review"]] as [RegExp, string, string][]) if (take(re)) preds.push({ note: `with status ${nice}`, test: (it) => it.f.status === code });
    }
    if (label === "agent") {
      if (take(/\bpaused\b/)) preds.push({ note: "currently paused", test: (it) => it.f.paused === true });
      else if (take(/\b(active|running|not paused)\b/)) preds.push({ note: "currently not paused", test: (it) => it.f.paused === false });
    }
    if (label === "crate" && /\b(largest|biggest|smallest|lightest|heaviest)\b/.test(q)) return finish(ans([P("The registry gives no size for crates. Only packs have sizes.")], ["chapter:planes/sec-planes-crates"]), "Size of crates", "none");

    // leftover words must filter, otherwise the answer would silently ignore part of the question
    rest = rest.replace(/\b\d+(?:\.\d+)?\b/g, " ");
    const words = [...new Set(toks(rest))].filter((t) => !GENERIC.has(t) && t.length > 1 && !/^(mb|gb)$/.test(t));
    const idWords = new Set(ents.flatMap((e) => toks(e.id)));
    const kw = words.filter((t) => !idWords.has(t));
    if (kw.length) preds.push({ kw: true, note: `mentioning ${kw.map((t) => `“${t}”`).join(" and ")}`, test: (it) => { const l = it.text.toLowerCase(); const ts = new Set(toks(it.text)); return kw.every((t) => ts.has(t) || l.includes(t)); } });

    let items = col.items.filter((it) => preds.every((p) => p.test(it)));
    const notes = preds.map((p) => p.note);
    const nounLabel = label === "confirmation" ? "locked confirmation" : label;
    const und = `${RE.many.test(q) ? "Counting" : "Listing"} ${pluralWord(nounLabel)}${notes.length ? " · " + notes.join(" · ") : ""}`;
    const srcs = [...col.src, ...items.slice(0, 8).map((i) => i.key)];

    if (RE.extreme.test(q) && label === "pack") {
      const asc = /smallest|lightest/.test(q);
      items = items.slice().sort((a, b) => (asc ? 1 : -1) * ((a.f.mb as number) - (b.f.mb as number)));
      const top = items.slice(0, topN || 3);
      if (!top.length) return finish(ans([P(`No pack matches: ${notes.join(" and ") || "that filter"}.`)], col.src), und);
      return finish(ans([P(`The ${asc ? "smallest" : "largest"} ${topN || 3} packs${notes.length ? " " + notes.join(" and ") : ""} by listed size:`), { t: "items", items: top.map((i) => ({ key: i.key, title: i.title, sub: i.sub })) }], top.map((i) => i.key)), und);
    }
    if (sizeSort) {
      items = items.slice().sort((a, b) => (sizeSort === "asc" ? 1 : -1) * ((a.f.mb as number) - (b.f.mb as number)));
      return finish(ans([P(`${plural(items.length, "pack")}${notes.length ? " " + notes.join(" and ") : ""}, sorted by listed size (${sizeSort === "asc" ? "smallest" : "largest"} first):`), { t: "items", items: items.map((i) => ({ key: i.key, title: i.title, sub: i.sub })) }], srcs), und);
    }
    if (label === "pack" && (RE.total.test(q) || (RE.many.test(q) && /\b(mb|size|disk|space)\b/.test(q)))) {
      const sum = items.reduce((a, i) => a + (i.f.mb as number), 0);
      return finish(ans([P(`The ${plural(items.length, "pack")}${notes.length ? " " + notes.join(" and ") : ""} add up to about **${sum.toLocaleString("en-US")} MB** (${(sum / 1024).toFixed(2)} GB), summing the approximate sizes listed in the registry.`)], ["chapter:packs/sec-packs-registry"]), und);
    }
    if (label === "crate" && RE.many.test(q) && notes.length === 0) {
      const crates = CRATES_LIST.filter((c) => c.name.startsWith("crates/")).length;
      return finish(ans([P(`The registry lists **${CRATES_LIST.length}** entries: ${crates} under \`crates/\` and ${CRATES_LIST.length - crates} under \`bins/\` (the last entry covers three binaries). The chapter text calls it a 14-crate workspace.`)], col.src), und);
    }
    if (RE.many.test(q)) {
      if (label === "chapter") return finish(ans([P(`There are **${CHAPTERS.length}** chapters.`), { t: "items", items: items.map((i) => ({ key: i.key, title: i.title, sub: i.sub })) }], items.map((i) => i.key)), und);
      return finish(ans([P(`There ${items.length === 1 ? "is" : "are"} **${items.length}** ${items.length === 1 ? nounLabel : pluralWord(nounLabel)}${notes.length ? " " + notes.join(" and ") : notes.length === 0 && label === "pack" ? " in the registry" : " in this document"}${items.length && items.length <= 12 && label === "pack" ? ": " + items.map((i) => i.title.split(":")[0]).join(", ") : ""}.`)], srcs), und);
    }
    const structured = preds.some((p) => !p.kw);
    if (!structured && !RE.list.test(q) && !RE.many.test(q) && ents.length === 0 && !RE.extreme.test(q)) return closestAnswer(raw);
    if (items.length === 0) return finish(ans([P(`No ${nounLabel} matches: ${notes.join(" and ") || "that filter"}.`)], col.src), und);
    if (notes.length || RE.list.test(q) || ents.length === 0) {
      return finish(ans([P(`${plural(items.length, nounLabel)}${notes.length ? " " + notes.join(" and ") : ""}:`), { t: "items", items: items.map((i) => ({ key: i.key, title: i.title, sub: i.sub })) }], srcs), und);
    }
  }

  return closestAnswer(raw);
}

export function answerPlain(a: Answer): string {
  return a.blocks.map((b) => (b.t === "p" ? stripMd(b.text) : b.t === "kv" ? b.rows.map((r) => `${r[0]}: ${r[1]}`).join("\n") : b.t === "items" ? b.items.map((i) => `- ${i.title} (${i.sub})`).join("\n") : b.code)).join("\n\n");
}
// #endregion
