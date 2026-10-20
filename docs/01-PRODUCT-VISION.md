# Product vision: a documentation workspace for many projects

## The owner's goal (their words, condensed)
One app to hold the documentation of ALL their projects. Each project has **one master file** (main ideas, links/paths to phases). Each **phase** has its own files, steps, sub-steps, decisions and check marks. Nothing is fixed: chapters, sections and every document must be addable, editable, movable and deletable in the app. Each project has its own settings and functions.

## Hierarchy (target)
```
Organization            (name, members, default settings, AI policy)
 └─ Project             (settings, theme, AI tokens, templates, status)
     ├─ Master file     (type: master)  one per project: vision, goals, links to every phase
     ├─ Phase           (type: phase)   order, status, owner, dates, progress %
     │   ├─ Step / Sub-step  (type: step) checkbox, status, notes, linked decisions
     │   ├─ Decision    (type: decision) question, options, choice, reason, date, status
     │   └─ Document    (type: page / chapter / spec / note / checklist / prompt ...)
     └─ Library         shared items: glossary, claims ledger, prompts, files
```
Rules: every node has a stable id (`kind:slug`), a parent, a position, a status and history (revisions). Links between nodes use ids, so renames never break links. "Progress" of a phase = done steps / total steps (computed, never typed).

## What already exists (reuse, do not rebuild)
`projects` and `docs` tables (docs has ref, kind, parent_ref, title, body, rev, source native|derived), `doc_revisions` (history), AI space (change sets, Review inbox), Trash with retention, tokens with prefixes, Added pages editor (Markdown + preview + history), Realtime. The current GeminiForge spec is ONE project whose chapters are `derived` docs generated from typed tables (chapters, crates, packs...). To make it editable like everything else, migrate derived docs to `native` docs (plan below).

## Build order (each step shippable and tested)
1. **Organizations**: tables `organizations`, `org_members(role owner|admin|editor|viewer)`; `projects.org_id`; RLS by membership (replace the single `app_admins` rule; keep it as super-admin). Org switcher + Project switcher in the sidebar; routes `#/o/<org>/p/<project>/...`.
2. **Project settings page**: name, description, visibility (private|unlisted|public), AI policy (propose allowed? default token expiry, default prefixes), retention days (trash), theme/accent, template.
3. **Node types + templates**: add `docs.kind` values master|phase|step|decision|checklist|page; a project template creates master + 5 phases. Step status enum todo|doing|done|blocked; decision status open|decided|superseded.
4. **Master/phase views**: master file renders a live table of phases (status, progress bar, next step); phase view lists steps with checkboxes (toggle writes a revision), decisions, linked documents. Drag-and-drop ordering (position column).
5. **Full editor for every document**: block or Markdown editor with preview, autosave drafts, revision restore, slash commands, internal links `[[kind:slug]]`, backlinks, table support (renderer exists in parts/49-pages.tsx `Md`).
6. **Migrate the spec**: write a one-time script (scripts/) that turns each derived chapter/crate/pack/prompt row into a native doc (body Markdown + data JSON), keeps ids, then retire the sync trigger (`docs_after_write`/derived_edit path) once parity tests pass (scripts/verify-content.mjs, qa-content.mjs).
7. **Per-project AI**: tokens belong to a project (already) -> add org-level policy and per-project get_guide message (exists as `projects.ai_guide`).

## Data-model sketch (SQL, to be reviewed by the owner before applying)
```
organizations(id, slug unique, name, created_by, created_at)
org_members(org_id, user_id, role, primary key(org_id,user_id))
projects add: org_id references organizations, settings jsonb default '{}', template text
docs add: position int, status text, assignee uuid, due date, data jsonb (already), parent_ref (already)
RLS: can_read_project / can_edit_project take membership into account (functions already centralise this: private.can_read_project, private.can_edit_project).
```
Keep ALL permission logic inside those two functions so policies and RPCs do not change.

## UX principles
Chat-style reader stays for Q&A; editing is always one click away from reading ("Edit this" on any passage); every destructive action has Trash/Undo; one search box (Ctrl+K) across org > project > documents; mobile first.
