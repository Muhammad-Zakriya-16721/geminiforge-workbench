# GeminiForge V20 workbench: rebuild plan (v2)

v2 changes: dark only (D7); no Tailwind, own CSS (D8); smarter local composer (D3 expanded, 3.3b); collapsible long drafts (3.3c); probe results (1b); in-app motion setting because your OS reports reduced motion (4); Claude Desktop details from new screenshots (3.1b).

Status: PLAN ONLY. No code written yet. Content (specs/versions/claims/numbers) is NOT touched until the re-audit phase.
Tags: [DOC] from official documentation fetched this session. [USER] confirmed by your own testing. [SHOT] read from your screenshots (approximate, confirm with clearer images). [MINE] my own knowledge/judgement, must be tested. [TEST] unknown, needs a test before relying on it.

## 0. Decisions

| # | Decision | Source |
|---|----------|--------|
| D1 | Runtime: Gemini Canvas (for now). Final deliverable: ONE .tsx file, only when you ask. | [USER] |
| D2 | Chat-first layout (Claude Desktop chat mode), not doc-reader + composer. | [USER] |
| D3 | Composer = local "Ask the spec": slash commands, notes, and a rule-based answer engine over the app's own data (counts, lists, dependencies, definitions, comparisons). No LLM. Optional LLM later, off by default. | [USER] "a little intelligent ... simple answers from what is written in the app" |
| D7 | Dark theme only. Parchment theme and the theme toggle are removed. | [USER] |
| D8 | No Tailwind. All styling is our own CSS with CSS variables in one injected style block. Reasons: Tailwind version in Canvas is unknown, runtime CDN generation costs speed, and it removes a whole class of "class not defined" bugs. | [MINE], needs your OK |
| D9 | Only libraries already proven in your Canvas: react, zustand, framer-motion, lucide-react. No new dependencies. | [USER] (current file renders) |
| D4 | Replace recharts with small inline SVG/CSS charts. | [USER] "yes" |
| D5 | Fix the composer/content overlap by making the composer part of the layout (not absolutely positioned over the scroll area). | [USER] bug report |
| D6 | Declutter: remove or merge anything that is not needed (see section 3.6). | [USER] |

Why D3: your top rule is "do not hallucinate". A retrieval composer answers only with exact spec items it can link to. An LLM can invent spec details. It is also instant, works offline and needs no key.

## 1. Environment facts

Verified [DOC]:
- Canvas supports generating and previewing React or HTML, has a console for errors and logs, and auto-saves changes (Google Workspace Updates, Gemini Apps Help).
- Shared Canvas links: "Anyone with that public link can view and edit data associated with the app." Do not keep secrets in app data.
- Shared links open only in gemini.google.com.

Implied by your test [USER]: the current file renders in Canvas, so react, zustand, framer-motion, lucide-react and recharts resolve there. Ctrl+1 to 7 and Ctrl+K work.

Not found in official docs, so [TEST]:
- localStorage, clipboard, file download, Google Fonts, Tailwind version, View Transitions, `<dialog>`.
- Other combos: Ctrl+B, Ctrl+Shift+D, Ctrl+Shift+Z, Alt/Ctrl+Escape.

Action: run `/home/user/canvas_probe.tsx` in Canvas (paste it as the Canvas code), click the 3 buttons, press the listed keys, send me the report text. Until then, every feature that depends on those is built with a fallback.

Community note (user-generated, not official): React output split into multiple files can break the Canvas preview. Single file is the right call.

## 1b. Probe results (your Canvas run) and what they mean

| Result | Meaning for the build |
|---|---|
| localStorage PASS | Persistence works; still wrapped in try/catch, plus JSON export/import as backup. |
| clipboard.writeText PASS | Copy buttons work. |
| Google Fonts PASS | Serif/sans/mono web fonts load; keep system fallbacks. |
| View Transitions PASS | Usable for screen changes (with instant fallback). |
| content-visibility PASS | Usable for long lists. |
| `<dialog>.showModal` and `inert` exist | Native dialog is viable. (Probe only checked the API exists, not Tab/Esc behaviour; harness will test, you confirm in Canvas.) |
| Scroll-driven animations FAIL, interpolate-size FAIL | Per the guides these exist in Chrome/Edge but not Firefox, while View Transitions and content-visibility pass. That pattern looks like Firefox 144 or newer. [inference, please confirm browser] So: no scroll-driven animation (JS progress only if wanted), accordions use grid 0fr to 1fr. |
| Tailwind checks FAIL | Inconclusive: my probe read styles instantly, but Tailwind's runtime generates CSS after a delay. Moot because of D8. |
| viewport 0x0, 18 frames/s | Measured at mount while the preview was probably hidden or throttled. Not a real speed number. I'll measure properly in my harness. |
| OS prefers-reduced-motion = TRUE | IMPORTANT. See section 4. Your current app's CSS kills ALL CSS transitions and animations on your machine (`* { transition-duration: 0.01ms !important }` under that media query). Only Framer Motion animations still run. |
| OS prefers dark = TRUE | Matches dark-only. |
| Keys received: Ctrl+K, Ctrl+B, Ctrl+Shift+D, Ctrl+Shift+Z, Ctrl+/, Ctrl+4, Ctrl+5, Alt+Escape | Safe to use. Ctrl+1 to 7 confirmed earlier. |
| Ctrl+Escape: only "Ctrl" arrived, no "Escape" | Windows swallows Ctrl+Esc (Start menu). Do not use it. Alt+Escape arrives but Windows also uses it to cycle windows, so the HUD demo is opened from Labs or Ctrl+K, not from that shortcut. |
| Blob download | You did not say yes/no. Unknown. Export falls back to copy-to-clipboard until confirmed. |

Gemini Spark: Google's I/O 2026 post says Spark runs on Google Cloud virtual machines. Secondary sources say tasks run in isolated VMs. I treat this as: Gemini can build and run things for you. It does not change my plan: the final file still must work as one TSX pasted into Canvas, using only D9 libraries. I have not found Google documentation for a "Work" mode, so I am not assuming anything about it.

## 2. Confirmed problems (your tests + my audit)

Confirmed by you: calculator shows 999% and 540% Safe Cap; page too crowded; composer overlaps content and scrolling does not reach the end of the content.

Cause of the overlap [R]: composer is `absolute bottom-0` over the scroll area and the scroll area only has `pb-36`, but chips + a growing textarea + controls are taller than 144 px. Fix: make the composer a normal flex child below the scroll area (D5).

Still to be proven by running (from audit v1): scroll-spy dead after the first chapter, Enter on "Dismiss" triggers reap, `label` TypeScript error, toast timer restart, search keyword router errors, global `*` transitions, per-frame width animation. Items marked [R] in the audit are fixed by the rebuild; each gets a regression check (section 7).

Dropped from the audit because you tested it: "Ctrl+1 to 7 may not work in browsers". It works in Canvas.

## 3. Product design (chat-first)

### 3.1 What Claude Desktop chat mode looks like [SHOT]

- Left sidebar about 18% of the width. Top row: menu, sidebar toggle, back, forward, and a Chat | Code segmented switch.
- Sidebar content: Search field; New (highlighted); Projects; Artifacts; Scheduled; Customize; More. Then Pinned and Recents. Rows are about 32 px high with icon + label, rounded hover.
- Pinned and Recents rows carry number badges 1 to 9 (these match the Ctrl+number shortcuts). Sub-items sit indented under a thin vertical guide line. A blue dot marks "ready/unread". Document icons appear on the right of some rows.
- Footer: "Update available" pill with arrow, then account row (initials, name, plan, chevron).
- Home (empty state): terracotta asterisk glyph + serif greeting ("Hello, night owl" looks time-based), one large rounded composer ("Type / for skills", + button bottom-left, mic and waveform bottom-right), then "Project or folder" selector (left) and model + effort + mode (right), then "Jump back in" with one item card (icon, title, "Ready to review · Chat · 3 hours ago").
- Chat: header breadcrumb "Project / Title v". User message is a dark rounded bubble, right-aligned. Assistant text has NO bubble, is serif, with bold lead-ins, numbered lists, inline code in a pinkish colour on a subtle background. A muted collapsible line like "Used NotebookLM >" sits above the answer. A row of small icons (copy, speak, thumbs up/down, retry) sits under it.
- Composer is docked at the bottom of the conversation column ("Reply" + send icon). Under it: + , mic, centered disclaimer, model and mode on the right. A round "scroll to bottom" button appears above the composer when you scroll up.
- With a file open, the right side shows a rounded pane: tab strip (file tab with close), search, more, expand, close; breadcrumb path; a `</>` toggle (rendered vs source). The document renders serif. On its left edge is a small "outline rail" (3 short dashes). Hover expands it into a heading list with the active heading highlighted. A file-list view has a "Filter files..." input. The chat column narrows to make room.

### 3.2 Our information architecture

| Claude Desktop piece | GeminiForge equivalent |
|---|---|
| New | New question / note thread |
| Projects | Not needed (single project). Remove. |
| Artifacts | Library: Crates (14), Packs (25), Prompts (14), Confirmations (8), Patches (6), Spikes (7), OS matrix, Simulators |
| Pinned (numbered) | Chapters 01 to 07, numbered 1 to 7 so Ctrl+1 to 7 match what you see |
| Recents | Saved Q&A threads and notes |
| Scheduled | Prompt tracker (todo / running / done for Prompts 01 to 14) |
| Home "Jump back in" | Last chapter, last artifact, next prompt to run |
| Chat thread | A chapter opens as a thread: first an assistant "document message" (serif, headings, short cards), then Q&A turns below it |
| Right pane | Artifact viewer for crates, packs, prompts, patches, simulators |

### 3.3 Composer: "Ask the spec" (D3)

- Placeholder "Type / for commands". Slash menu: `/crate`, `/pack`, `/prompt`, `/confirm`, `/patch`, `/spike`, `/chapter`, `/note`, `/pin`, `/moe`, `/lab`.
- Free text goes to the answer engine (3.3b). Slash commands (typing `/`) open a menu like Claude's: a popup above the composer, filter as you type, arrow keys and Enter, a tooltip with a one-line description for the highlighted command.
- Footer text (honest): "Answers come from this document, not from an AI."
- Notes: `/note text` saves a note attached to the current chapter or artifact.
- Search index built once on first use. Scoring: exact id match, then title, then tags, then body. Same index feeds Ctrl+K.
- Fixes the old keyword router bug (`"ui"` matched "build", "guide", "required").
- Optional later (not now): "Ask Gemini" toggle. Needs a decision about keys and the "anyone with the link can view and edit" risk.

### 3.3b "A little intelligent": how Ask-the-spec answers (no LLM)

Two layers, both deterministic and checkable:
1. Structured answers from the typed data arrays (crates, packs, prompts, confirmations, patches, spikes, OS rows, roster, tasks). The engine detects an intent and the entities in the question, then computes the answer from fields:
   - count: "how many packs?" gives 25 (computed, not typed in)
   - list/filter: "which packs need Tier B?", "packs in Clean-Room RE", "crates in Layer 2"
   - lookup/define: "what is forge-db?", "what is Pack 10?", "CONFIRM-05"
   - why: uses the item's `whyItMatters` / `whyNeeded` / `plainWhy` text
   - depends/used-by: "what depends on forge-db?" computed from `deps`
   - compare: "Pack 02 vs Pack 03" side-by-side card
   - totals: "total size of CAT3 packs" (sizes parsed from "~620 MB" strings; shows "approx")
   - next step: "which prompt should I run next?" from tracker state
2. Text retrieval over every prose block (chapter paragraphs, plain-English fields) with simple ranking (id, title, tags, body). Returns the best 3 passages with the matched words highlighted.
Rules: an answer states only what is in the data; shows a collapsible "Used 3 sources >" row (like Claude's "Used NotebookLM >") listing items it used, each opening in the pane; if nothing matches well it says "I could not find that in this document" and shows the nearest items. It remembers the last entity, so "and what does it depend on?" works. Answers are templated sentences plus cards, no invented text.
Limit (be honest): it cannot reason about things the document does not say, and it is not an LLM. Known question shapes will be tested as a list; unknown shapes fall back to layer 2.

### 3.3c Long drafts: make the composer smaller

You asked for a way to shrink a long message so you can review the conversation behind it:
- Composer grows only up to about 40% of the window height, then scrolls inside itself, so it can never cover the conversation again.
- Collapse button (chevron) on the composer: shrinks the draft to a one-line preview such as "Draft · 38 lines · click to expand". Draft is kept.
- Long paste (for example over 12 lines or 1,500 characters) becomes a chip "Pasted text · 120 lines" like Claude's attachments; click to expand and edit, X to remove.
- Optional drag handle on the top edge to set your own height.
- Esc inside the composer collapses it if it is long.

### 3.3d Menus and small details taken from the new screenshots [SHOT]

- Sidebar item "..." menu: Open in, Pin (P), Mark as unread (U), Rename (R), Share, Copy link (C), Move to, Archive (A), Delete (D, red). Ours: Pin, Rename, Mark as to-do, Copy link (deep link), Archive, Delete, Export. Single-letter shortcuts shown right-aligned.
- Slash menu: group of top actions, then a long scrollable list with icons, tooltip to the right of the highlighted item, composer text shows "/" then "Type to filter", send button turns terracotta when there is text.
- Tool-step grouping: "Created 2 files v" opens a bordered list of rows. We reuse this look for "Used 3 sources v" under answers and for grouped steps.
- Code blocks: rounded border, language label top-left, syntax colours (keyword pink, string green, comment grey), mono. Ours: a tiny tokenizer for rust/sql/ts/json/bash, copy button on hover.
- Round "scroll to bottom" button above the composer when not at the bottom.
- Header: "Title v" dropdown on the left (rename, pin, export), and a pane toggle on the right.
- Idle right panel (from the Claude Code view): stacked cards. Ours: "This chapter" (section progress), "Pinned", "Notes", "Prompt tracker".

### 3.4 Right pane (artifact viewer)

- Header: tab strip, expand, close. Breadcrumb path. Rendered/source toggle where it makes sense (prompts, patches, crate code).
- Outline rail with hover popover, replacing the sticky section bar, the TOC popover and the Outline button.
- Actions: Copy, Download (if the probe says downloads work, else a copy-only fallback), Pin.
- Resizable by dragging the divider (keyboard accessible: arrow keys on the divider, with `role="separator"`). Min and max widths saved.
- Small screens: pane becomes a full-width overlay and the sidebar becomes a drawer.

### 3.5 Plan-saving features (your stated purpose)

1. Deep links: hash route, e.g. `#/chapter/swarm/sec-swarm-tasks` and `#/artifact/Pack%2010`. Refresh and Back keep your place.
2. Resume: last location, scroll position and open artifact restored on load.
3. Prompt tracker: status per Prompt 01 to 14, a result-notes field, "copy next prompt to run".
4. Notes and pins on any chapter, section or artifact.
5. Export and import all state as JSON (copy and paste works even if downloads and localStorage are blocked).
6. Print stylesheet for a clean PDF of a chapter.
7. Pack tier badge: warn when a pack's `minTier` is above your chosen tier (the tier selector does something real).

### 3.6 Declutter rules

Remove: five-level breadcrumb (keep "Project / Chapter v"); TOC button AND Outline button (replaced by the outline rail); sticky section bar; Zen mode (closing the pane and sidebar covers it); header status pill; "Super+Esc" button in the sidebar (HUD demo moves to Labs); duplicate scroll-to-top buttons; emoji used as icons; the toast on every action.
Keep toasts only for errors and undo. Copy shows a check icon on the button, no toast.
Move: tier selector into the MoE lab and pack filter; Export into Ctrl+K and the sidebar footer menu; Ring-0 verifier into Labs.
Shrink: chapter pages to what a reader needs first (summary, then collapsible detail rows), instead of every card fully expanded.

## 4. Visual and motion system

Tokens: dark only (D7). Keep the obsidian values as CSS variables, drop the parchment set (about half the CSS tokens go away). Colour pairs are re-checked for contrast: body text and small text at least 4.5:1, large text and UI boundaries at least 3:1 [DOC color guide]. Known failures to fix: stone-on-parchment small text about 3.3:1, terracotta text about 3.5:1, white on terracotta about 3.9:1 [C from audit v1; re-verify with a tool].
- Add `color-scheme` so scrollbars and form controls match; add a `forced-colors` fallback [DOC].
- No Tailwind (D8). For the record, Tailwind's `dark:` follows the OS setting unless overridden with `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` [DOC Tailwind]; with one dark theme we never need it. Own CSS only, using `color-scheme: dark`.
- Performance on modest GPUs: avoid `backdrop-filter`, large blurred shadows and many stacked translucent layers; they are expensive, especially in Firefox on Windows [MINE, will measure].
- Type: serif for assistant/document text, sans for UI, mono for code. Load only the weights actually used. Fonts have a system fallback and `display=swap`.

Motion (all compositor-friendly: opacity and transform only, per guide [DOC motion]):
- Chapter switch: instant content swap with a 120 to 160 ms fade and 6 to 8 px rise. No skeleton, no fake delay.
- Sidebar and pane: slide with transform; the column resize snaps once instead of every frame (layout per frame was a jank source). Check in Canvas.
- Accordion rows: `grid-template-rows: 0fr to 1fr` [MINE, test]. `interpolate-size` is Chrome and Edge only [DOC].
- Theme switch: View Transitions where available, with an immediate fallback [DOC: baseline since 2025-10-14].
- Reading progress: scroll-driven animation with `@supports (animation-timeline: scroll())`, scroll-listener fallback because Firefox lacks it [DOC].
- Long lists: `content-visibility: auto` with `contain-intrinsic-size` [DOC: baseline since 2025-09-15].
- Reduced motion: wrap in `MotionConfig reducedMotion="user"` (disables transform and layout animations, opacity still runs) [DOC Motion]. Remove the global `animation-duration: 0.01ms !important` rule, because the guide warns it can make things more jarring [DOC]. Note: with "user", Motion also disables animations while developing if your OS has reduced motion on.
- Remove global `*` transitions. Transition only specific properties on specific controls.
- Motion setting inside the app (new): Full / Reduced / Match system, in the sidebar footer menu. Default = Full, because you want smooth animation and your OS currently reports reduced motion (probe), which would otherwise switch off every transform animation [DOC Motion: "user" follows the device]. Motion's docs explicitly allow a per-site override. Reduced mode keeps only opacity fades. To change the OS side on Windows: Settings > Accessibility > Visual effects > Animation effects. [MINE, menu names may vary by version]
- View Transitions replace the theme-switch idea (no theme toggle now): used for chapter and pane changes where it looks better than a plain fade; instant fallback.

## 5. Architecture (still one file)

Regions in the file: types; tokens/CSS; data (static, hoisted); search index; store; hooks; primitives; sidebar; thread view; artifact pane; palette; composer; labs; app shell.
- Split App into small components with narrow Zustand selectors. No 55-field selector. Handlers use `getState()` so key listeners register once.
- Zustand `persist` with `name`, `version`, `migrate`, `partialize` [DOC]. Docs warn the default JSON storage has no runtime validation, so add a type-guard validator on load and a safe fallback to defaults [DOC]. Wrap storage in try/catch; if the probe says storage is blocked, use memory and rely on export/import.
- ErrorBoundary around the app and around each lab, so one bad item never blanks the page.
- Hash router (tiny, no dependency). Chapter content components are lazy in structure (only the active one renders).
- Modal behaviour: prefer native `<dialog>` with `showModal()`: the browser makes the outside inert, so no hand-written focus trap [DOC a11y guide]. Command palette follows the APG combobox pattern: `role="combobox"`, `aria-controls`, `aria-expanded`, `aria-activedescendant`, Up/Down/Enter/Escape [DOC APG]. Custom overlays (if `<dialog>` is unusable in Canvas) use `inert` on the outside.
- Accordions: heading containing a `<button aria-expanded aria-controls>` [DOC APG]. Cards are real buttons or links, never clickable divs.
- Focus: visible `:focus-visible` outline with offset on every control, no bare `outline: none` [DOC].
- Keep Framer Motion only where it earns its place (presence animations); prefer CSS elsewhere. Keep the existing import path unless the probe shows a problem. (Motion's docs now use `motion/react`; I have not verified whether `framer-motion` and `motion/react` both resolve in Canvas.)
- Charts: tiny inline SVG, theme-aware, with a text/table alternative. Use log or labeled scale so small values (28 MB vs 3,200 MB, 0.12 GB vs 160 GB) stay readable.
- MoE lab: fix CPU-only case (no VRAM needed when offload is 0), cap percentages sensibly, show "does not fit" instead of 999% or 540%, include the PCIe term to match Patch F.4, label every output "estimate".

## 6. Phases (each ends with a check you can see)

| Phase | Work | Done when |
|---|---|---|
| P0 | Canvas probe results; baseline snapshot of current file; set up my test harness (Vite + React 19 + Tailwind + Playwright + tsc + eslint + axe) | probe report received; baseline screenshots and metrics saved |
| P1 | Foundation: tokens, store with persist/migrate/validate, router, search index, ErrorBoundary | tsc strict clean; reload keeps place; corrupt storage does not crash |
| P2 | Chat shell: sidebar, home, thread layout, docked composer, header | overlap bug gone at all window heights; you review screenshots |
| P3 | Migrate content into threads and collapsible rows (content unchanged) | every old item reachable; counts match the data arrays |
| P4 | Artifact pane: tabs, outline rail, resize, copy/download, labs (MoE, 409, HUD, Ring-0) | pane keyboard-operable; MoE edge cases correct |
| P5 | Composer + Ctrl+K: slash commands, retrieval, notes | every old palette item still found; no router false matches |
| P6 | Plan features: pins, notes, prompt tracker, export/import, print | export then import restores state exactly |
| P7 | Polish: motion pass, reduced motion, contrast, a11y, perf | checks in section 7 pass |
| P8 | Content re-audit (claims, versions, numbers, counts) | each claim tagged verified (with source) or flagged or removed |
| P9 | Final single .tsx | only when you ask |

You review after P2 and after P3. I send screenshots from my harness at each review.

## 7. Verification plan

- `tsc --noEmit` strict, eslint with react-hooks rules.
- Playwright (Chromium) scripts: chapter switch time, long tasks over 50 ms [DOC performance guide: split tasks over 50 ms for INP], scroll-spy/outline correctness after switching chapters, composer never overlaps content at several viewport heights, Enter on a focused button does not trigger other actions, palette opens and routes every item.
- axe-core scan for accessibility; script for contrast of every token pair in both themes.
- Reduced-motion run (emulated) to confirm no transform animation.
- Storage tests: empty, corrupt, old-version data, blocked storage.
- Your Canvas checklist per milestone (what to click) plus the probe results for anything the harness cannot prove.
- Limit: my harness is Chromium. Canvas behaviour is confirmed only by your tests.

## 8. Risks

- Canvas may block storage, downloads, fonts or `<dialog>`; fallbacks are planned but unproven until the probe.
- Single-file size (~3,000 lines now). Keep regions tidy; remove dead code (unused icons, variants, constants).
- Chat-first means big restructuring; content stays unchanged in P3 so diffs are reviewable.
- Visual match is from screenshots only; clearer images reduce guesswork.

## 9. What I need from you

Done: probe report, current-look screenshot, slash-menu / code-block / item-menu / long-draft screenshots, dark only, smarter composer.
Still open:
1. Which browser (name and version) do you use for Canvas? (My inference from the probe is Firefox 144+.)
2. Did `gf_probe.txt` download after "Test download"? (yes/no)
3. OK with D8 (no Tailwind) and with motion default = Full?
4. Optional: the model picker popover open, and the plus (+) menu open in the composer.
5. Later, when I produce the first build: a sample of 10 real questions you would ask the composer, so I can test the answer engine against them.
