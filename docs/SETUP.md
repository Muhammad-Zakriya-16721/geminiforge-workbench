# Setup checklist (Supabase + Vercel)

## Supabase (project geminiforge-workbench, ref plbvgcnyfclillatpowc)
1. Open Dashboard > SQL Editor > New query, paste `supabase/migrations/0001_workbench_state.sql`, Run.
2. Dashboard > Authentication > Users > Add user > Create new user. Enter your email and a password and tick **Auto Confirm User**.
3. Dashboard > Authentication > Sign In / Providers > turn **off** "Allow new users to sign up" (it is on by default; anyone with the public key could otherwise create accounts and store data).
4. After the first deploy: Authentication > URL Configuration > set Site URL to the Vercel address.
5. The two public values the app needs are in `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The publishable key is safe in the browser; row level security limits each user to their own row. Never put the secret/service key in this project.

## Vercel
1. Vercel > Add New > Project > import `Muhammad-Zakriya-16721/geminiforge-workbench`. Framework: Vite (detected). Build command: `npm run build`. Output: `dist`.
2. Settings > Environment Variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production, Preview and Development, then redeploy.
3. Every push to `main` deploys to production; other branches get preview URLs.

## Letting Claude use the connectors
- Vercel: claude.ai > Settings > Connectors > Vercel > reconnect, and approve the scope `muhamamd-zakrias-projects`.
- Supabase: claude.ai > Settings > Connectors > Supabase > reconnect, and approve the project `geminiforge-workbench` (the connector currently lists only the three older projects).
