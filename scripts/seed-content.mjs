// Loads the app's built-in documentation into Supabase as an admin.
// Usage: BASE=http://127.0.0.1:5198/ SUPABASE_URL=... SUPABASE_KEY=<publishable key> SEED_EMAIL=... SEED_PASSWORD=... node scripts/seed-content.mjs
import fs from "node:fs";
import { TABLES } from "./content-map.mjs";
import { builtinSnapshot } from "./snapshot.mjs";
const { BASE = "http://127.0.0.1:5198/", SUPABASE_URL, SUPABASE_KEY, SEED_EMAIL, SEED_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY || !SEED_EMAIL || !SEED_PASSWORD) { console.error("Set SUPABASE_URL, SUPABASE_KEY, SEED_EMAIL and SEED_PASSWORD"); process.exit(1); }
const bundle = await builtinSnapshot(BASE);
fs.mkdirSync("supabase/seed", { recursive: true });
fs.writeFileSync("supabase/seed/content.json", JSON.stringify(bundle, null, 1));
const tok = await (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }) })).json();
if (!tok.access_token) { console.error("Sign-in failed:", tok.error_description || tok.msg || JSON.stringify(tok)); process.exit(1); }
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" };
// become admin if nobody is yet (the database only allows this for the first user)
const claim = await fetch(`${SUPABASE_URL}/rest/v1/app_admins`, { method: "POST", headers: { ...H, Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ user_id: tok.user.id }) });
console.log("claim admin:", claim.status, claim.ok ? "" : await claim.text());
for (const [table, conflict, rows] of TABLES) {
  const data = rows(bundle);
  for (let i = 0; i < data.length; i += 40) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflict}`, { method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(data.slice(i, i + 40)) });
    if (!res.ok) { console.error(`FAILED ${table}:`, res.status, await res.text()); process.exit(1); }
  }
  console.log(`${table}: ${data.length} rows`);
}
console.log("seeded");
