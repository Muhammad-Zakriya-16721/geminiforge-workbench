// #region 5c. APP DOCS DATA: features, shortcuts, answer examples, changelog.
// Edit this region when you add or change a workbench feature; the Settings pages render straight from it.
export const TEXT_PX: Record<TextSize, string> = { s: "15.5px", m: "17px", l: "19px" };
export const WIDTH_PX: Record<ColWidth, string> = { narrow: "680px", normal: "780px", wide: "920px" };
export const APP_VERSION = "0.5.0";
export const BUILD_DATE = "2026-10-21";

export type FeatAction = { go: View } | { pane: PaneRef } | { ask: string } | { tab: string };
export interface Feature { group: string; name: string; desc: string; how: string; act?: { label: string; to: FeatAction } }

export const FEATURES: Feature[] = [
  { group: "AI space (owner)", name: "Review inbox", desc: "Everything an AI tool proposes through MCP waits here. Nothing becomes official until you accept it. Each edit shows a diff, the AI's reason and plain-language risk flags (numbers changed, new link, looks like instructions to an AI, and more).", how: "Sidebar: Review inbox. With an edit focused: j / k move, a accepts, r rejects, v opens the page.", act: { label: "Open Review inbox", to: { go: { kind: "inbox" } } } },
  { group: "AI space (owner)", name: "Page panel with highlight", desc: "Open the page an edit touches in a side panel, with the changed passage highlighted. Accept or reject from the panel, or open the real chapter.", how: "Review inbox: View page." },
  { group: "AI space (owner)", name: "Undo and history", desc: "Every accepted edit becomes a new version you can undo; accepted edits are kept as history. Chapters show an \"AI edited\" marker with the sections touched.", how: "Review inbox: Decided, then Undo." },
  { group: "AI space (owner)", name: "Live updates", desc: "New edits and decisions appear by themselves, without reloading or losing your place. A Live / Reconnecting badge shows the connection.", how: "Open the Review inbox; the tab title shows (n) when edits wait." },
  { group: "AI space (owner)", name: "AI access", desc: "Create, edit, rename, extend and revoke access tokens; choose read-only or propose mode, expiry, daily limit, waiting-edit cap and which document ids a token may reach. Pause all AI access with one switch. A message for AI tools (project-wide or per token) is shown to the AI by get_guide, with version history.", how: "Sidebar: AI access.", act: { label: "Open AI access", to: { go: { kind: "access" } } } },
  { group: "AI space (owner)", name: "Checks, activity and logs", desc: "A checks list (tokens expiring, never used, too broad), the recent calls of every AI tool with the reason for failures, a log of token changes, and a button to clear activity. Old activity is cleaned automatically after 180 days.", how: "AI access page." },
  { group: "AI space (owner)", name: "Backup and llms.txt", desc: "Download one JSON backup of your added pages with history, all change sets and decisions, messages and token settings (never secrets), or a plain-text map of all documents for AI tools.", how: "AI access: Download backup / Download llms.txt." },
  { group: "Pages and Trash (owner)", name: "Added pages", desc: "Write your own Markdown pages or keep pages an AI created and you accepted. Edit with preview, tables, version history and restore; import a .md file or download one. Saving refuses to overwrite a newer version.", how: "Sidebar: Added pages.", act: { label: "Open Added pages", to: { go: { kind: "pages" } } } },
  { group: "Pages and Trash (owner)", name: "Trash", desc: "Deleted edits and pages stay in the Trash for the time you set (30 days by default, any number of days, or until you delete them) and can be restored; you can change the timer of one item, a selection, or everything. Delete forever and Empty Trash ask twice; Undo appears after every removal. Deleted tokens cannot be restored.", how: "Sidebar: Trash.", act: { label: "Open Trash", to: { go: { kind: "trash" } } } },
  { group: "AI space (owner)", name: "MCP address for AI tools", desc: "AI tools such as Gemini, Claude Code and Cursor read your documentation through one address and can only propose edits, never publish them.", how: "AI access: Test it and the connection snippets." },
  { group: "Reading", name: "Seven numbered chapters", desc: "The whole specification as seven chapters in the sidebar, numbered 1 to 7.", how: "Click a chapter, or press Ctrl+1 to Ctrl+7.", act: { label: "Open chapter 1", to: { go: { kind: "chapter", id: "overview" } } } },
  { group: "Reading", name: "Collapsible detail rows", desc: "Crates, prompts and the three core principles open and close in place. Your open/closed choices are remembered.", how: "Click a row title. Use Expand all / Collapse all above the lists.", act: { label: "Open the crates", to: { go: { kind: "chapter", id: "planes" } } } },
  { group: "Reading", name: "Outline rail", desc: "A small set of dashes on the left edge of a chapter. Hover it to see the chapter's sections; the current one is highlighted as you scroll.", how: "Hover or Tab to the dashes, then pick a section." },
  { group: "Reading", name: "Side panel", desc: "Crates, packs, prompts, decisions, patches, spikes and labs open beside the chapter instead of replacing it.", how: "Click any item. Drag the panel's left edge, or focus it and use the arrow keys, to resize. Esc closes it." },
  { group: "Reading", name: "Library", desc: "Every crate, pack, prompt, confirmation, patch, spike and lab in one page, plus all your notes.", how: "Sidebar: Library.", act: { label: "Open Library", to: { go: { kind: "library" } } } },
  { group: "Reading", name: "Deep links and resume", desc: "The address in your browser tracks the chapter, section and open panel. Reloading brings you back to the same place.", how: "Copy the address from the browser bar. Works only where the host page allows address changes." },
  { group: "Reading", name: "Readable memory charts", desc: "The two memory charts use a log scale so 0.12 GB and 160 GB, or 28 MB and 3,200 MB, are both visible.", how: "Chapter 3.", act: { label: "Open chapter 3", to: { go: { kind: "chapter", id: "governor" } } } },
  { group: "Reading", name: "Print to PDF", desc: "Printing a chapter hides the sidebar and composer and includes the text of collapsed rows.", how: "Ctrl+P in your browser." },

  { group: "Asking", name: "Ask the spec", desc: "Type a question in plain words. The answer is built from the document's own data: counts, lists, filters, dependencies, reasons, comparisons, size totals, tiers and your next prompt. There is no AI and nothing is invented.", how: "Type in the composer and press Enter.", act: { label: "Try: how many packs?", to: { ask: "How many packs are there?" } } },
  { group: "Asking", name: "Answer sources", desc: "Every answer has a \"Used N sources\" row listing the exact chapters and items it used. Each one opens when clicked.", how: "Click \"Used N sources\" under an answer." },
  { group: "Asking", name: "Follow-up questions", desc: "Within one thread, \"and what does it depend on?\" refers to the last item you asked about.", how: "Ask a follow-up in the same thread." },
  { group: "Asking", name: "Answer detail", desc: "Brief gives one sentence. Standard adds the reason and key facts. Detailed also includes code or tool lists.", how: "Settings > General > Answer detail, or the picker in the composer." },
  { group: "Asking", name: "Honest fallbacks", desc: "If nothing matches exactly it shows the closest passages, or says it could not find the answer. Those questions are logged so you can see what to teach it.", how: "Settings > Answer engine.", act: { label: "Open the log", to: { tab: "answers" } } },
  { group: "Asking", name: "Slash commands", desc: "Jump straight to an item without searching: /chapter, /crate, /pack, /prompt, /confirm, /patch, /spike, /lab, /os.", how: "Type / in the composer, then arrow keys and Enter." },
  { group: "Asking", name: "Saved questions", desc: "Each question becomes a thread under Recents. Pin, rename, copy a link, archive or delete it.", how: "Hover a recent and click the dots, then press P, R, C, A or D." },

  { group: "Composer", name: "Collapsible long drafts", desc: "A long draft stops growing at 40% of the window. Collapse it to one line to read the conversation, and expand it later with the text intact.", how: "Collapse button, or Esc inside a long draft." },
  { group: "Composer", name: "Long paste chips", desc: "Pasting more than 12 lines or 1,500 characters turns the text into a \"Pasted text\" chip instead of flooding the box.", how: "Paste a long text. Click the chip to expand it." },
  { group: "Composer", name: "Scroll to bottom", desc: "A round button appears when you scroll up in a long page or thread.", how: "Click the arrow above the composer." },

  { group: "Plan keeping", name: "Pins", desc: "Pin chapters, items and questions. Pinned things stay at the top of the sidebar.", how: "The bookmark icon in the header or side panel." },
  { group: "Plan keeping", name: "Notes", desc: "Write notes on any chapter or panel item. All notes are listed in the Library.", how: "Notes box at the end of a chapter or panel, or type /note your text in the composer." },
  { group: "Plan keeping", name: "Prompt tracker", desc: "Mark each of the 14 research prompts To do, Running or Done, keep result notes, and see which to run next.", how: "Sidebar: Prompt tracker.", act: { label: "Open tracker", to: { go: { kind: "tracker" } } } },
  { group: "Plan keeping", name: "Backup and restore", desc: "Export everything you saved (pins, notes, tracker, questions, settings) as a JSON file, and import it back later or on another device.", how: "Settings > Data.", act: { label: "Open Data", to: { tab: "data" } } },
  { group: "Plan keeping", name: "Markdown export", desc: "The whole workbook, plus your tracker and notes, as one Markdown file.", how: "Settings > Data > Export document." },

  { group: "Labs", name: "Split-memory MoE calculator", desc: "Estimate whether a model fits your VRAM and RAM, and its rough speed. CPU-only setups work, and a model that does not fit says so.", how: "Pick a hardware preset or move the sliders.", act: { label: "Open lab", to: { pane: { kind: "lab", id: "moe" } } } },
  { group: "Labs", name: "409 checkout and pre-wake lab", desc: "Trigger heartbeats per agent, try atomic checkouts, see the 409 on a locked task, and watch the budget governor pause agents.", how: "Use the buttons in the panel.", act: { label: "Open lab", to: { pane: { kind: "lab", id: "swarm" } } } },
  { group: "Labs", name: "Emergency kill-switch HUD", desc: "A simulation of the specified emergency stop: release input, then terminate the whole worker subtree.", how: "Press Trigger emergency stop.", act: { label: "Open lab", to: { pane: { kind: "lab", id: "hud" } } } },
  { group: "Labs", name: "Ring-0 sanction gate", desc: "Shows a genuine click being accepted and a scripted click being rejected.", how: "Press both buttons.", act: { label: "Open lab", to: { pane: { kind: "lab", id: "ring0" } } } },
  { group: "Labs", name: "OS parity matrix", desc: "Sandboxing, termination, display, accessibility and acceleration for each OS target side by side.", how: "Chapter 2 or 7.", act: { label: "Open matrix", to: { pane: { kind: "os", id: "matrix" } } } },

  { group: "Asking", name: "Understood-as line and answer labels", desc: "Every answer starts with how the question was read (for example “Listing packs · mentioning ghidra”). Answers that are not an exact match are marked with a line on the left and say so.", how: "Read the grey line above an answer." },
  { group: "Asking", name: "Filters and keywords", desc: "Words in a list question that are not understood as filters are used to filter the list by text, so nothing is silently ignored. Unknown items such as “Pack 26” are reported as not existing.", how: "Ask “which packs mention ghidra” or “packs between 100 and 300 MB”." },
  { group: "Asking", name: "Smart matching (experimental, off by default)", desc: "For questions the rules cannot answer exactly, a small model that runs in your browser compares the meaning of your question with every passage and quotes the closest one, with its similarity score. It never writes new text. It downloads about 23 MB once per session; if that is blocked, normal answers keep working.", how: "Settings > Answer engine > Smart matching.", act: { label: "Open settings", to: { tab: "answers" } } },
  { group: "Asking", name: "Report a wrong answer", desc: "“Not what I meant” under an answer adds the question to the log in Settings so you can see what to teach it next.", how: "Click the button under an answer." },
  { group: "Asking", name: "Save an answer as a note", desc: "Keeps the question and its answer in your notes, listed in the Library.", how: "Click “Save as note” under an answer." },
  { group: "Saved questions", name: "All questions page", desc: "Every saved question, including archived ones: search, pin, archive or restore, delete one or many. Deletes can be undone for a few seconds.", how: "Sidebar: All questions, or the dots next to a recent question (right-click works too).", act: { label: "Open all questions", to: { go: { kind: "history" } } } },
  { group: "Saved questions", name: "Undo", desc: "Deleting or archiving a question, and deleting a note, shows an Undo button for a few seconds.", how: "Click Undo in the message at the bottom." },
  { group: "Plan keeping", name: "Spike tracker", desc: "Mark each prototype spike Not started, Running, Passed or Failed and record the measured result.", how: "Sidebar: Tracker, then Prototype spikes.", act: { label: "Open tracker", to: { go: { kind: "tracker" } } } },
  { group: "Plan keeping", name: "Claims review", desc: "A to-do list of facts in the documentation that differ from public sources or from each other, with a decision and note for each. The documentation text itself is not changed.", how: "Sidebar: Claims review.", act: { label: "Open claims review", to: { go: { kind: "audit" } } } },
  { group: "Plan keeping", name: "Backup reminder", desc: "If you have saved data and no backup in the last day, the start page offers to export one.", how: "Start page banner; Remind me later hides it for 3 days." },
  { group: "Interface", name: "Search finds your own things", desc: "Search also finds your saved questions and notes.", how: "Ctrl+K and type part of a question or note." },
  { group: "Interface", name: "Search", desc: "One search over chapters, crates, packs, prompts, decisions, patches, spikes, labs and actions.", how: "Ctrl+K, then type; arrows and Enter." },
  { group: "Interface", name: "Text size, width and font", desc: "Make reading text smaller or larger, the reading column narrower or wider, and switch between serif and sans.", how: "Settings > General." },
  { group: "Interface", name: "Animation control", desc: "Full, Reduced, or follow your system setting. The default is Full because your system may report reduced motion.", how: "Settings > General > Motion." },
  { group: "Interface", name: "Small screens", desc: "Under 900 px wide the sidebar becomes a drawer and the side panel opens full screen.", how: "Use the sidebar button in the header." },
  { group: "Interface", name: "Keyboard and screen readers", desc: "Everything is reachable with the keyboard, has visible focus, and uses proper roles and labels. Automated accessibility scans found no violations.", how: "Tab, Shift+Tab, Enter, Space, Esc. Menus also use the arrow keys." },
  { group: "Interface", name: "Local storage with warnings", desc: "Your data is saved in this browser only. Damaged or old saved data is ignored instead of breaking the page, a failed save shows a warning, and other open tabs stay in sync. In Gemini Canvas saved data may be gone after a reload, so export backups.", how: "Settings > Data shows what is stored." }
];

export const SHORTCUTS: { keys: string; what: string; where: string }[] = [
  { keys: "j / k / a / r / v", what: "Next / previous edit, accept, reject, open the page (owner)", where: "Review inbox, with an edit focused" },
  { keys: "Ctrl+K", what: "Open search", where: "Anywhere" },
  { keys: "Ctrl+B", what: "Show or hide the sidebar", where: "Anywhere" },
  { keys: "Ctrl+1–7", what: "Jump to chapter 1 to 7", where: "Anywhere" },
  { keys: "Ctrl+,", what: "Open Settings", where: "Anywhere" },
  { keys: "Alt+N", what: "New question", where: "Anywhere" },
  { keys: "/", what: "Focus the question box", where: "Anywhere (not while typing)" },
  { keys: "↑ / ↓ / Home / End", what: "Move through the items of a menu", where: "Open menus" },
  { keys: "Esc", what: "Close search, menus, Settings or the side panel", where: "Anywhere (not while typing in a box)" },
  { keys: "Enter", what: "Send the question", where: "Composer" },
  { keys: "Shift+Enter", what: "New line", where: "Composer" },
  { keys: "Esc", what: "Collapse a long draft, or close the slash menu", where: "Composer" },
  { keys: "/", what: "Open the command menu", where: "Composer" },
  { keys: "↑ / ↓ / Enter / Tab", what: "Move through and choose a command", where: "Slash menu" },
  { keys: "↑ / ↓ / Home / End / Enter", what: "Move through and open a result", where: "Search" },
  { keys: "Ctrl+Enter", what: "Save the note", where: "Notes box" },
  { keys: "P / R / C / A / D", what: "Pin, rename, copy link, archive, delete", where: "A saved question's menu" },
  { keys: "← / →", what: "Resize the side panel", where: "Panel edge, when focused" },
  { keys: "Ctrl+P", what: "Print the chapter", where: "Browser" }
];

export const ANSWER_EXAMPLES: { type: string; examples: string[] }[] = [
  { type: "Counts", examples: ["How many packs are there?", "How many crates?", "How many prompts are done?"] },
  { type: "Lists and filters", examples: ["Which packs need Tier B?", "Which packs are under 20 MB?", "Which packs are in the coding category?", "Which crates are in layer 2?", "List all spikes"] },
  { type: "What is it", examples: ["What is forge-hw?", "Tell me about pack 10", "What is CONFIRM-05?", "What is Tier S?", "What is agent-rust-02?"] },
  { type: "Why", examples: ["Why does forge-sandbox matter?", "Why is prompt 2 needed?"] },
  { type: "Dependencies", examples: ["What does forge-db depend on?", "What depends on forge-types?"] },
  { type: "Compare", examples: ["Compare pack 02 and pack 03", "Difference between forge-db and forge-vcs", "Compare tier a and tier s"] },
  { type: "Sizes and totals", examples: ["How big is pack 10?", "What is the largest pack?", "Total size of the clean-room packs"] },
  { type: "Your plan", examples: ["Which prompt should I run next?", "What is the progress on my prompts?"] },
  { type: "Filters and keywords", examples: ["Which packs mention ghidra?", "Which prompts mention ghidra?", "Packs between 100 and 300 MB", "Which crates are binaries?", "What has no dependencies?"] },
  { type: "Groups and totals", examples: ["How many categories?", "Which pack category has the most packs?", "What is the total size of all packs?", "Top 5 biggest packs"] },
  { type: "Status", examples: ["How many agents are paused?", "Which task is running?", "Which prompts are done?"] },
  { type: "Full text", examples: ["Give me full prompt 2", "Last pack", "Who does agent-arch-01 report to?"] },
  { type: "Checks", examples: ["Does pack 5 need a gpu?", "Does forge-db use sqlite?"] },
  { type: "Where", examples: ["Where is pack 10 covered?"] }
];

export const LABS: { ref: PaneRef; name: string; desc: string }[] = [
  { ref: { kind: "lab", id: "moe" }, name: "Split-memory MoE calculator", desc: "Fits-or-not and speed estimate for a model on your VRAM and RAM." },
  { ref: { kind: "lab", id: "swarm" }, name: "409 checkout and pre-wake lab", desc: "Heartbeats per agent, atomic checkout, 409 conflicts, budget pause." },
  { ref: { kind: "lab", id: "hud" }, name: "Emergency kill-switch HUD", desc: "Simulated release-input-then-reap sequence." },
  { ref: { kind: "lab", id: "ring0" }, name: "Ring-0 sanction gate", desc: "Genuine click versus scripted click." },
  { ref: { kind: "os", id: "matrix" }, name: "OS parity matrix", desc: "Per-OS sandbox, kill, display, accessibility and acceleration." }
];

export const CHANGELOG: { v: string; date: string; items: string[] }[] = [
  { v: "0.5.0", date: "2026-10-21", items: ["AI space: Review inbox with diffs, risk flags, page panel, undo and live updates.", "AI access: tokens you can edit, message for AI tools with history, activity log, checks, backup and llms.txt export.", "Trash with restore and 30-day clean-up; Added pages with import, download and tables.", "Safer MCP: per-address limits, hidden-text and injection-phrase checks."] },
  { v: "0.4.0", date: "2026-10-17", items: ["Works on React 18 (the Gemini Canvas version).", "Answer engine rebuilt: shows how a question was read, applies every filter and keyword, refuses items that do not exist, answers status, category, between-size, binary and full-prompt questions.", "All questions page, undo for deletes, restore archived questions, delete-all.", "Save warnings, tabs stay in sync, backup reminder.", "Spike tracker and Claims review page.", "Menus work with arrow keys, focus is kept, printing includes collapsed rows, new shortcuts (Alt+N, /).", "Optional smart matching (local model) for questions the rules cannot answer."] },
  { v: "0.3.0", date: "2026-10-17", items: ["Settings and app-docs page (Ctrl ,) with features, shortcuts, answer-engine guide, data tools, about and labs.", "Reading controls: text size, width, font. Display name.", "Log of questions the answer engine could not answer."] },
  { v: "0.2.0", date: "2026-10-17", items: ["Ask-the-spec answer engine with sources, follow-ups and answer detail.", "Notes, JSON backup and restore, Markdown export.", "Emergency HUD and Ring-0 labs. Small-screen layout."] },
  { v: "0.1.0", date: "2026-10-16", items: ["Chat-first rebuild: sidebar, chapters as documents, side panel, search, slash commands, collapsible composer, prompt tracker, deep links."] }
];
// #endregion
