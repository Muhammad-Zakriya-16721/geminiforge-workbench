# Setup status (Supabase + Vercel)

Done (by Claude via connectors): Supabase migrations 0001+0002 applied and documentation seeded; Vercel project created, env vars set, deployed at https://geminiforge-workbench.vercel.app. Every push to `main` redeploys.

## Your steps (cannot be done by Claude)
1. Supabase Dashboard > Authentication > Users > Add user > Create new user: your email + a password, tick **Auto Confirm User**.
2. Authentication > Sign In / Providers > turn **off** "Allow new users to sign up".
3. Authentication > URL Configuration > Site URL = `https://geminiforge-workbench.vercel.app`.
4. Project Settings > Database > reset the database password (the current one is weak).
5. Open the site > Settings > Sync > sign in. The first signed-in user can claim admin (needed to edit documentation).

## Notes
- The publishable key and project URL are public by design (`.env.example`). Never put the secret/service key in this project.
- Documentation lives in Supabase (`get_content_bundle()`); the copy in `parts/` is the offline/Canvas fallback. After changing content in Supabase, `node scripts/verify-content.mjs` compares the two.
- Vercel deployment protection (SSO) is off, so the URL is public.
