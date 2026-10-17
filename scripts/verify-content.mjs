// Checks that what the database returns (get_content_bundle) equals the app's built-in documentation.
// Usage: BASE=http://127.0.0.1:5198/ SUPABASE_URL=... SUPABASE_KEY=... node scripts/verify-content.mjs
import { canon } from "./content-map.mjs";
import { builtinSnapshot } from "./snapshot.mjs";
const { BASE = "http://127.0.0.1:5198/", SUPABASE_URL, SUPABASE_KEY } = process.env;
const local = await builtinSnapshot(BASE);
const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_content_bundle`, { method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: "{}" });
const remote = await res.json();
let bad = 0;
for (const k of Object.keys(local)) {
  if (k === "version") continue;
  if (canon(local[k]) !== canon(remote[k])) {
    bad++;
    const a = JSON.stringify(local[k]), b = JSON.stringify(remote[k]);
    let i = 0; while (i < a.length && a[i] === b?.[i]) i++;
    console.log(`DIFFERENT ${k}: first difference at ${i}\n  built-in: ${a.slice(Math.max(0, i - 40), i + 80)}\n  database: ${(b ?? "").slice(Math.max(0, i - 40), i + 80)}`);
  }
}
console.log(bad ? `${bad} sections differ` : `database content equals the built-in content (version ${remote.version})`);
process.exit(bad ? 1 : 0);
