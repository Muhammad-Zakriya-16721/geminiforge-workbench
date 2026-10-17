import { makeFetch } from "./core.mjs";

const url = Deno.env.get("SUPABASE_URL")!;
let key = "";
try { key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ?? ""; } catch { /* fall back to the legacy key */ }
if (!key) key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// secret-key requests go on the apikey header only; legacy JWT keys also need Authorization
const rpc = async (fn: string, args: Record<string, unknown>) => {
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json", ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error(`database answered ${r.status}`);
  return r.json();
};

const handle = makeFetch({ rpc });
Deno.serve((req: Request) => (key ? handle(req) : new Response("server is not configured", { status: 500 })));
