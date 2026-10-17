// Live end-to-end check of the docs MCP function. Usage: MCP_URL=https://<ref>.supabase.co/functions/v1/docs-mcp node scripts/mcp-e2e.mjs
const U = process.env.MCP_URL;
const META = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientInfo": { name: "e2e", version: "1" }, "io.modelcontextprotocol/clientCapabilities": {} };
let pass = 0, fail = 0; const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} | ${n}${x ? " | " + x : ""}`); };
const rpc = async (method, params = {}, url = U) => {
  const t0 = Date.now();
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": method, ...(params.name ? { "Mcp-Name": params.name } : {}) }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: META } }) });
  const t = await r.text(); const d = t.startsWith("event:") ? t.split("\n").find((l) => l.startsWith("data:")).slice(5) : t;
  let j; try { j = JSON.parse(d); } catch { j = { raw: t.slice(0, 200) }; }
  return { status: r.status, ms: Date.now() - t0, body: j.result ?? j };
};
const tool = (name, args) => rpc("tools/call", { name, arguments: args });
let r = await rpc("tools/list"); ok("tools/list: 7 tools", r.status === 200 && r.body.tools?.length === 7, `${r.ms}ms ${r.body.tools?.map((t) => t.name).join(",")}`);
r = await tool("list_projects", {}); ok("list_projects", /geminiforge/.test(r.body.content?.[0]?.text), `${r.ms}ms ${r.body.content?.[0]?.text?.slice(0, 80)}`);
r = await tool("search_docs", { query: "cgroup.kill", limit: 3 }); ok("search_docs finds crate", /crate:crates\/forge-sandbox/.test(r.body.content?.[0]?.text), `${r.ms}ms total=${r.body.structuredContent?.total}`);
r = await tool("search_docs", { query: "zzzzqqqq" }); ok("search_docs no match says so", /No matching documentation/.test(r.body.content?.[0]?.text));
r = await tool("read_doc", { ids: ["confirm:CONFIRM-01", "nope:1"] }); ok("read_doc + missing", /XInput2|second master cursor/i.test(r.body.content?.[0]?.text) && /Not found: nope:1/.test(r.body.content?.[0]?.text), `${r.ms}ms`);
r = await tool("get_outline", { kind: "pack", limit: 5 }); ok("get_outline paginates", r.body.structuredContent?.items?.length === 5 && r.body.structuredContent?.next_offset === 5, `total=${r.body.structuredContent?.total}`);
r = await tool("get_references", { id: "confirm:CONFIRM-01" }); ok("get_references", /Mentioned by/.test(r.body.content?.[0]?.text), `${r.ms}ms`);
r = await tool("query_dataset", { kind: "pack", filter: { minTier: "E" }, limit: 3 }); ok("query_dataset filter", r.body.structuredContent?.total === 13, `total=${r.body.structuredContent?.total}`);
r = await tool("get_changes", {}); ok("get_changes", r.status === 200 && !r.body.isError, r.body.content?.[0]?.text?.slice(0, 60));
r = await tool("search_docs", { query: "abc", project: "does-not-exist" }); ok("unknown project -> tool error", r.body.isError === true && /not_found/.test(r.body.content?.[0]?.text), r.body.content?.[0]?.text?.slice(0, 80));
r = await tool("read_doc", { ids: "chapter:planes" }); ok("read_doc section", /unaffected|crates|plane/i.test(r.body.content?.[0]?.text), `${r.ms}ms`);
r = await fetch(U + "/dk_" + "0".repeat(64), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/call", "Mcp-Name": "list_projects" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_projects", arguments: {}, _meta: META } }) });
const t = await r.text(); ok("bogus token -> invalid_token error", /invalid_token/.test(t), t.slice(0, 120).replace(/\n/g, " "));
const lg = await fetch(U, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } }) });
ok("legacy initialize", lg.status === 200 && /protocolVersion/.test(await lg.text()));
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
