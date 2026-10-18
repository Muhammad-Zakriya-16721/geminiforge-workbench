// #region 5g3. OWNER TOOLS (stub for the Canvas build: it has no Supabase connection)
async function exportOwnerBackup(_notify: (m: string) => void) { /* no cloud in Canvas */ }
async function exportLlmsTxt(_notify: (m: string) => void, _mcpUrl: string) { /* no cloud in Canvas */ }
interface CheckTok { label: string; mode: string; path_prefixes: string[]; expires_at: string | null; revoked_at: string | null; last_used_at: string | null; created_at: string }
function accessChecks(_t: CheckTok[], _p: boolean, _g: string, _f: number): { level: "warn" | "info" | "ok"; text: string }[] { return []; }
function useTitleBadge() { /* nothing in Canvas */ }
function AiTrail(_p: { prefix: string }) { return null; }
// #endregion
