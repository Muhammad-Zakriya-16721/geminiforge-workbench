# GeminiForge V20 Workbench

A chat-style reader and plan keeper for the GeminiForge V20 specification. React 18 + TypeScript + Zustand, own CSS (dark only), no server needed.

## How the code is organised
- `parts/*.tsx` is the source of truth, concatenated in file-name order into `App.tsx` by `build.mjs` (so `App.tsx` is generated and git-ignored).
  - `10-data.tsx`, `11-chapters.tsx`: the specification data and chapter text. `35-features.tsx`: the app's own feature docs. `36-audit.tsx`: claims review data.
  - `45-engine.tsx`: the rule-based answer engine. `46-smart.tsx`: optional meaning-based matching (browser model).
- The same parts also build the single-file version for Gemini Canvas (`npm run build:canvas` -> `final/geminiforge_v20_workbench.tsx`).

## Commands
| Command | What it does |
|---|---|
| `npm install` | install dependencies |
| `npm run dev` | build `App.tsx` and start the dev server on http://127.0.0.1:5199 |
| `npm run build` | type-check and produce `dist/` (static files; deploy anywhere) |
| `npm run typecheck` | type-check only |
| `npm run build:canvas` | produce the single file for Canvas |
| `npm test` | build, type-check, and run the browser checks (needs Chromium; see `check.mjs`) |

## Notes
- Data is saved in the browser (localStorage). Export a backup from Settings > Data.
- Tests: `check.mjs` (behaviour), `qa.mjs` and `qa-auto.mjs` (answer engine), `ffcheck.mjs` (real Firefox).
- Project notes and decisions: `docs/geminiforge_project_notes.md`.
