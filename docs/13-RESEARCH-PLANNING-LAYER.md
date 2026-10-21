# Research 2026-10-21: planning layer (master file > phases > steps), decisions, document health

Pages fetched 2026-10-21. DESIGN = design inference by the researcher, no authoritative standard. UNVERIFIED = not confirmed. Feeds master plan phase 4.

## What other tools do
- Notion: sub-items by parent relation; deleting a parent deletes children; dependencies are an opt-in feature [N1]. Linear: initiatives group projects; statuses Proposed/Planned/Active/Completed/Canceled; health is a manual on/at-risk/off-track update [L1]; project graph counts unestimated issues as 1 point, in-progress at 1/4 in forecasts, cancelled issues lower scope [L3]. GitHub: sub-issues up to 8 levels and 100 children; Markdown tasklist blocks retired [G1][G2]; projects have typed fields, table/board/roadmap [G3].
- Obsidian Tasks: status = one character, each with a type TODO/IN_PROGRESS/ON_HOLD/DONE/CANCELLED/NON_TASK [O1]; Dataview `completed` only for `x`, `fullyCompleted` also needs all subtasks [O2]. Org-mode: `[/]`/`[%]` count direct children by default; parent box derives from children [OM1].
- Shape Up: hill charts track scopes, not tasks; percent complete misleads because tasks keep appearing; appetite = fixed time, variable scope; pitch = Problem, Appetite, Solution, Rabbit holes, No-gos [B1][B2].
- Takeaway: every tool separates a typed row (status, dates, parent) from free text. Use rows as the source of truth and render Markdown from them; import/export checkbox Markdown through a status-character map. We need states beyond done/not done: blocked, cancelled, deferred.

## Recommended schema (DESIGN; reuses docs, doc_revisions and the AI change sets)
```
plan_nodes: id, project_id, ref (step:4-3, unique per project), kind (phase|step; sub-step = step with a step parent),
  parent_id fk on delete RESTRICT, position text COLLATE "C" (fractional key) unique(parent_id, position),
  title, notes_md, doc_id null, status (todo|doing|done|blocked|cancelled|deferred), weight int>=0 default 1,
  owner, due, started_at, completed_at, rev, created_at, updated_at; check parent<>id; depth <= 4 by trigger
plan_edges(from_id, to_id, type blocked_by|relates)  -- trigger rejects cycles
decisions: id, project_id, ref D-0012 (sequential, never reused), title, status (proposed|accepted|rejected|deprecated|superseded),
  superseded_by, decided_on, decision_makers[], context_md, drivers_md, options jsonb, outcome_md, consequences_md, confirmation_md, review_by, rev
decision_links(decision_id, target_kind node|doc|decision, target_id, rel drives|blocks|motivated_by|supersedes)
docs add: owner, review_every_days, last_reviewed_at, reviewed_rev, verified_until
doc_links(from_doc, to_ref, resolved, checked_at)  -- rebuilt on save
```
- Hierarchy: adjacency list + `WITH RECURSIVE` (with CYCLE and a depth limit) [PG1]; a closure table or ltree only if queries get slow [CT1][CT2]; ltree availability on Supabase free UNVERIFIED.
- Ordering: fractional keys as text with COLLATE "C"; keys are case-sensitive and must not be sorted with localeCompare; one owner needs only the unique constraint plus a retry [FI1][FI2].
- RLS: inherit from project_id via the existing private.can_read_project / can_edit_project; wrap auth.uid() in (select …), index project_id and parent_id, name the role in every policy, keep definer helpers in the private schema with search_path '' [S1].
- AI proposals: the AI never writes plan tables. It submits ops {set_status|move|insert|retitle|edit_notes, node_id, base_rev, value} into the Review inbox; accept applies only if rev = base_rev, otherwise the op is stale. AI may only create decisions as `proposed`. Check marks are never auto-applied (a check mark is a claim of completion). Moves are validated for cycles and depth before display.

## Progress rules (DESIGN)
1. Only leaf steps count; parents are never stored. Phase % = sum(weight of done leaves) / sum(weight of countable leaves), over all descendants; show n/m beside the %.
2. Cancelled and deferred leaves leave the denominator (Linear lowers scope on cancel [L3]); do not group CANCELLED with done as Obsidian Tasks does [O1].
3. Blocked stays in the denominator as not done; show a red count and the reason from blocked_by.
4. `doing` counts 0 in the headline; optional toggle "in progress at 25%" [L3].
5. Weights default 1; small integers only; show the weight when siblings differ.
6. An empty container shows "no steps", never 0% or 100%; a phase is `done` only when every countable leaf is done; round down so 99.6% never shows 100%.
7. Marking a parent done while children are open: warn and offer "mark all children done"; never cascade silently.
8. Show scope change: store a baseline denominator when a phase starts and show "+N steps added" [B1]; optional uncertain/known flag (cheap hill chart).
9. Compute in a SQL view or RPC, never in a stored column.

## Decision record
MADR 4.0.0 (2024-09-17) with optional YAML front matter status/date/decision-makers/consulted/informed [M1]; Y-statement as the one-line summary [Y1]. Lifecycle: proposed > accepted > deprecated | superseded by another record | rejected; never delete or renumber; the old record points to its replacement [NY1]; accepted records are immutable except status and supersession (our rule).
```
---
id: D-0012
status: proposed   # proposed|accepted|rejected|deprecated|superseded by D-00NN
date: 2026-10-21
decision-makers: [owner]
review-by: 2027-01-21
drives: [step:4-3]
---
# Short title naming problem and solution
In the context of <..>, facing <..>, we decided for <..> and neglected <..>, to achieve <..>, accepting that <..>.
## Context and Problem Statement / Decision Drivers / Considered Options / Decision Outcome / Consequences / Confirmation / Pros and Cons / More Information
```
Linking: `[[D-0012]]` in a step or document creates a decision_links row on save; a step blocked_by an open/proposed decision shows "waiting on D-0012"; accepting a decision offers to unblock linked steps; superseding shows a badge on old links; review-by feeds the stale list.

## Document health, ranked for a solo owner
1. Owner + last_reviewed_at + review_every_days + "verified" state (Notion verified pages: owner, until-date, expiry notice [N2]); an AI-accepted edit does NOT renew the review; reviewed_rev flips the page to "changed since verified" after any later edit; default window about 90 days for fast-changing docs [MB1].
2. Stale/blocked dashboard (overdue review, review window passed, blocked steps, proposed decisions) via pg_cron nightly (Supabase suggests at most 8 concurrent jobs, each under 10 minutes [S2]).
3. In-app link check on save (doc_links; broken links, orphan pages, duplicate titles, steps pointing to a deleted decision); no network needed.
4. markdownlint on save, warnings only (MD001, MD024, MD051, MD052/53); has a browser build [ML1].
5. lychee in CI for external links on exported Markdown, scheduled, not on every push; `--offline`, `--cache`, GITHUB_TOKEN to avoid rate limits [LY1].
6. Vale: CLI only (not browser/Edge); low value for one author [V1]. 7. Drift detection from code: skip.

## Templates (DESIGN)
Software: Shape (problem, appetite, rabbit holes, no-gos) > Build > Test > Release > Operate; seed decisions stack/hosting/auth. Research: Question and scope > Sources and method > Collection > Analysis > Writing > Review; step type "claim to verify" with a source link. Course: Outcomes > Syllabus > Content production (module sub-steps, weight by hours) > Practice and assessment > Launch > Revise. Trip: Dates and budget decision > Transport > Stay > Itinerary by day > Bookings (deadlines) > Pre-departure checklist (+ ICS feed). "This master plan": import our `[x]/[~]/[ ]/[?]` Markdown via a status map (`~` doing, `?` blocked "waiting on owner").

## Mistakes to avoid
Stored progress on parents; counting cancelled/deferred/empty phases; blocked treated as done or invisible; AI-accepted edits counted as reviews; parsing the plan only from Markdown text (no stable ids); closure table / ltree too early; integer positions or locale-sorted fractional keys; AI changing checks, decisions or moves without base_rev; cascade delete (use on delete restrict + Trash); editing accepted decisions in place; one global review window; lint that blocks saving; percent alone (also show blocked count, scope added, next step).

## Not verified
GFM nested checkbox behaviour; Supabase ltree availability; exact Notion rollup and GitHub sub-issue progress formulas.

## Sources
[N1] notion.com/help/tasks-and-dependencies · [N2] notion.com/help/wikis-and-verified-pages · [L1] linear.app/docs/initiatives · [L3] linear.app/docs/project-graph · [G1] docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues · [G2] docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/about-tasklists · [G3] docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects · [O1] publish.obsidian.md/tasks/Getting+Started/Statuses · [O2] blacksmithgu.github.io/obsidian-dataview/annotation/metadata-tasks/ · [OM1] orgmode.org/manual/Checkboxes.html · [B1] basecamp.com/shapeup/3.4-chapter-12 · [B2] basecamp.com/shapeup/1.2-chapter-03 · [M1] adr.github.io/madr/ · [Y1] ozimmer.ch/practices/2020/04/27/ArchitectureDecisionMaking.html · [NY1] cognitect.com/blog/2011/11/15/documenting-architecture-decisions · [PG1] postgresql.org/docs/current/queries-with.html · [CT1] percona.com/?p=2688 · [CT2] dev.to/dowerdev (secondary) · [FI1] github.com/rocicorp/fractional-indexing · [FI2] figma.com/blog/realtime-editing-of-ordered-sequences/ · [S1] supabase.com/docs/guides/database/postgres/row-level-security · [S2] supabase.com/docs/guides/cron · [MB1] metabase.com/metrics/documentation-freshness (vendor page) · [ML1] github.com/DavidAnson/markdownlint · [LY1] github.com/lycheeverse/lychee · [V1] docs.vale.sh
