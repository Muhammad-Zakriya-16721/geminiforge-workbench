// #region 3b. RUNTIME CONTENT: the documentation can be replaced while the app runs (it is stored in Supabase; the copy in this file is the built-in fallback)
export interface ContentBundle {
  version: number;
  chapters: { id: string; num: string; title: string; subtitle: string; icon: string }[];
  chapterBlocks: Record<string, Block[]>;
  crates: CrateEntry[]; roster: AgentRosterItem[]; tasks: SwarmTaskItem[]; packs: ForgeHubPack[]; prompts: DeepPromptEntry[];
  confirmations: Confirmation[]; patches: SpecPatch[]; spikes: Spike[]; osRows: OsRow[];
  tierChart: { tier: string; overheadGb: number; modelGb: number }[];
  pssChart: { name: string; s1: number; s10: number }[];
  antiBloat: { layer: string; retained: string; pruned: string; impact: string }[];
  claims: Claim[]; claimsConfirmed: string[]; claimsOutdated: string; claimsUnchecked: string;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// The current in-memory content as a bundle (the built-in copy until a newer one is applied). Used to seed the database and to detect changes.
export const contentSnapshot = (version = 0): ContentBundle => ({
  version,
  chapters: CHAPTERS.map(({ id, num, title, subtitle, icon }) => ({ id, num, title, subtitle, icon })),
  chapterBlocks: clone(CHAPTER_BLOCKS),
  crates: clone(CRATES_LIST), roster: clone(INITIAL_ROSTER), tasks: clone(INITIAL_TASKS), packs: clone(FORGEHUB_PACKS), prompts: clone(DEEP_PROMPTS),
  confirmations: clone(LOCKED_CONFIRMATIONS), patches: clone(SPECIFICATION_PATCHES), spikes: clone(PROTOTYPE_SPIKES), osRows: clone(OS_PARITY_ROWS),
  tierChart: clone(TIER_CHART_DATA), pssChart: clone(HARNESS_PSS_DATA), antiBloat: clone(ANTI_BLOAT_ROWS),
  claims: clone(CLAIMS), claimsConfirmed: clone(CLAIMS_CONFIRMED), claimsOutdated: CLAIMS_TEXT.outdated, claimsUnchecked: CLAIMS_TEXT.unchecked
});

// Everything that arrives from outside is checked before it replaces what is on screen; anything unexpected keeps the current content.
const STR_FIELDS: Record<string, string[]> = {
  chapters: ["id", "num", "title", "subtitle", "icon"],
  crates: ["name", "layer", "plane", "plainSummary", "whyItMatters", "deps", "badge", "code"],
  roster: ["id", "role", "reportsTo", "tier", "plainRoleExplanation"],
  tasks: ["taskId", "ancestry", "title", "plainExplanation", "assignee", "status", "planHash"],
  packs: ["id", "cat", "catLabel", "name", "size", "minTier", "plainPurpose", "tools"],
  prompts: ["id", "files", "title", "plainGoal", "whyNeeded", "fullPrompt"],
  confirmations: ["id", "title", "plainWhy"],
  patches: ["id", "target", "summary", "code"],
  spikes: ["id", "target", "candA", "candB", "gate"],
  osRows: ["dim", "mint_x11", "mint_wayland", "ubuntu_wayland", "win_x64", "macos"],
  tierChart: ["tier"], pssChart: ["name"],
  antiBloat: ["layer", "retained", "pruned", "impact"],
  claims: ["id", "where", "claim", "found", "action"]
};
const NUM_FIELDS: Record<string, string[]> = { roster: ["budgetMicros", "spentMicros"], tasks: ["confidence"], tierChart: ["overheadGb", "modelGb"], pssChart: ["s1", "s10"] };
const TEXT_BLOCKS = ["badge", "h1", "p"];
const LIST_BLOCKS = ["rows", "cards", "chips"];
const PLAIN_BLOCKS = ["crates", "packs", "prompts", "confirms", "patches", "tasks", "roster"];

function validBlock(b: unknown): boolean {
  if (!isObj(b) || !isStr(b.t)) return false;
  if (TEXT_BLOCKS.includes(b.t)) return isStr(b.text);
  if (b.t === "h2") return isStr(b.text) && isStr(b.id);
  if (LIST_BLOCKS.includes(b.t)) return Array.isArray(b.items) && b.items.every(isObj);
  if (b.t === "chart") return b.id === "tier" || b.id === "pss";
  if (b.t === "table") return Array.isArray(b.head) && Array.isArray(b.rows);
  return PLAIN_BLOCKS.includes(b.t);
}

export function validateBundle(x: unknown): ContentBundle | null {
  if (!isObj(x) || typeof x.version !== "number") return null;
  for (const [k, fields] of Object.entries(STR_FIELDS)) {
    const a = x[k];
    if (!Array.isArray(a)) return null;
    for (const it of a) if (!isObj(it) || fields.some((f) => !isStr(it[f])) || (NUM_FIELDS[k] ?? []).some((f) => typeof it[f] !== "number")) return null;
  }
  if (!Array.isArray(x.claimsConfirmed) || !x.claimsConfirmed.every(isStr) || !isStr(x.claimsOutdated) || !isStr(x.claimsUnchecked)) return null;
  const chapters = x.chapters as { id: string }[];
  if (chapters.length === 0 || !isObj(x.chapterBlocks)) return null;
  for (const c of chapters) { const bl = (x.chapterBlocks as Record<string, unknown>)[c.id]; if (!Array.isArray(bl) || !bl.every(validBlock)) return null; }
  return x as unknown as ContentBundle;
}

const swap = <T,>(dst: T[], src: T[]) => { dst.length = 0; dst.push(...src); };

// Replaces the content in place (every part of the app reads these arrays) and rebuilds what is derived from them.
export function applyContent(b: ContentBundle) {
  swap(CRATES_LIST, b.crates); swap(INITIAL_ROSTER, b.roster); swap(INITIAL_TASKS, b.tasks); swap(FORGEHUB_PACKS, b.packs); swap(DEEP_PROMPTS, b.prompts);
  swap(LOCKED_CONFIRMATIONS, b.confirmations); swap(SPECIFICATION_PATCHES, b.patches); swap(PROTOTYPE_SPIKES, b.spikes); swap(OS_PARITY_ROWS, b.osRows);
  swap(TIER_CHART_DATA, b.tierChart); swap(HARNESS_PSS_DATA, b.pssChart); swap(ANTI_BLOAT_ROWS, b.antiBloat);
  swap(CHAPTERS, b.chapters.map((c) => ({ ...c, Icon: chapterIcon(c.icon) })));
  Object.keys(CHAPTER_BLOCKS).forEach((k) => delete CHAPTER_BLOCKS[k]);
  Object.assign(CHAPTER_BLOCKS, clone(b.chapterBlocks));
  swap(CLAIMS, b.claims); swap(CLAIMS_CONFIRMED, b.claimsConfirmed);
  CLAIMS_TEXT.outdated = b.claimsOutdated; CLAIMS_TEXT.unchecked = b.claimsUnchecked;
  rebuildSections(); rebuildIndex(); resetEngine(); resetSmart();
}
// #endregion
