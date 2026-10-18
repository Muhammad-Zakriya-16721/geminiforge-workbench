// Live check of propose_changes with a throwaway propose-mode token (TOK=dk_... node scripts/mcp-e2e-propose.mjs). It leaves pending test drafts: reject them and revoke the token afterwards.
const TOKEN = process.env.TOK;
const U = "https://plbvgcnyfclillatpowc.supabase.co/functions/v1/docs-mcp/" + TOKEN;
const META = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientInfo": { name: "e2e", version: "1" }, "io.modelcontextprotocol/clientCapabilities": {} };
let pass = 0, fail = 0; const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} | ${n}${x ? " | " + x : ""}`); };
const rpc = async (method, params = {}) => {
  const r = await fetch(U, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "User-Agent": "e2e-0004/1", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": method, ...(params.name ? { "Mcp-Name": params.name } : {}) }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: META } }) });
  const t = await r.text(); const d = t.startsWith("event:") ? t.split("\n").find((l) => l.startsWith("data:")).slice(5) : t; const j = JSON.parse(d); return j.result ?? j;
};
const tool = (name, args) => rpc("tools/call", { name, arguments: args });
let r = await rpc("tools/list"); ok("token tools/list has 10 tools", r.tools.length === 10 && r.tools.some((t) => t.name === "propose_changes"), r.tools.map(t=>t.name).join());
r = await tool("read_doc", { ids: ["confirm:CONFIRM-01", "confirm:CONFIRM-02"] }); const docs = r.structuredContent.docs; const body1 = r.content[0].text.split("# ")[1].split("\n\n")[1]; const FIND = body1.split(/\s+/).find((w) => /^[A-Za-z]{6,}$/.test(w)); console.log("FIND", FIND);
ok("read_doc revs", docs.length === 2 && docs.every((d) => d.rev >= 1), JSON.stringify(docs.map((d) => d.rev)));
r = await tool("propose_changes", { title: "e2e: bad set", edits: [{ id: "confirm:CONFIRM-01", base_rev: 99, find: "x", replace: "y" }, { id: "nope:1", base_rev: 1, body: "z" }] });
ok("bad set refused with per-edit reasons", r.isError && /#1 confirm:CONFIRM-01/.test(r.content[0].text) && /#2 nope:1/.test(r.content[0].text), r.content[0].text.replace(/\n/g, " | ").slice(0, 200));
r = await tool("propose_changes", { title: "e2e: hidden text", edits: [{ id: "confirm:CONFIRM-01", base_rev: docs[0].rev, op: "insert_after", anchor: FIND, text: " hi\u{E0041}" }] });
ok("tag characters refused", r.isError && /Tag characters/.test(r.content[0].text), r.content[0].text.replace(/\n/g, " | ").slice(0, 160));
r = await tool("propose_changes", { title: "e2e: please reject", summary: "automated test", idempotency_key: "e2e-0004-a", edits: [
  { id: "confirm:CONFIRM-01", base_rev: docs[0].rev, op: "find_replace", find: FIND, replace: FIND + " (e2e)", expected: 1, rationale: "test" },
  { id: "confirm:CONFIRM-02", base_rev: docs[1].rev, op: "insert_after", anchor: "zzzz-not-there", text: "x", rationale: "should fail on empty anchor" }] });
ok("empty anchor refused", r.isError, r.content[0].text.replace(/\n/g, " | ").slice(0, 200));
r = await tool("propose_changes", { title: "e2e: please reject", summary: "automated test", idempotency_key: "e2e-0004-a", edits: [
  { id: "confirm:CONFIRM-01", base_rev: docs[0].rev, op: "find_replace", find: FIND, replace: FIND + " (e2e)", expected: 1, rationale: "test" }] });
ok("valid set saved", !r.isError && /saved with 1 edit/.test(r.content[0].text), r.content[0].text.slice(0, 220));
const cs = r.structuredContent?.change_set_id;
const r2 = await tool("propose_changes", { title: "e2e: please reject", idempotency_key: "e2e-0004-a", edits: [{ id: "confirm:CONFIRM-01", base_rev: docs[0].rev, body: "other" }] });
ok("idempotency returns same set", r2.structuredContent?.duplicate === true && r2.structuredContent.change_set_id === cs);
r = await tool("get_draft", { draft_id: cs ?? "00000000-0000-4000-8000-000000000000" }); ok("get_draft by change set id", /pending/.test(r.content[0].text), r.content[0].text.replace(/\n/g, " | ").slice(0, 160));
r = await tool("propose_edit", { id: "confirm:CONFIRM-02", base_rev: docs[1].rev, op: "replace", body: "z".repeat(50), rationale: "e2e whole replace" });
ok("propose_edit single works and flags risk", !r.isError && /Flagged/.test(r.content[0].text), r.content[0].text.slice(0, 260));
console.log("CS", cs); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
