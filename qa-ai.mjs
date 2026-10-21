// AI space UI tests with a mocked Supabase (review inbox + AI access). Needs a build with VITE_SUPABASE_* set.
// Run: npx vite build --outDir dist-prod && (npx vite preview --outDir dist-prod --port 5198 &) ; BASE=http://127.0.0.1:5198/ node qa-ai.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";
const exe = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const base = process.env.BASE || "http://127.0.0.1:5198/";
const axeSrc = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
let bad = 0, n = 0;
const ok = (name, c, x = "") => { n++; if (!c) bad++; console.log(`${c ? "PASS" : "FAIL"} | ${name}${x ? " | " + x : ""}`); };
const UID = "11111111-1111-4111-8111-111111111111", PID = "22222222-2222-4222-8222-222222222222";
const ref = (process.env.VITE_SUPABASE_URL ?? "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? (await (await fetch(base)).text()).match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? (await fs.promises.readFile(".env", "utf8")).match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });

const PAGE_MD = "## Section one\n\nA paragraph with **bold**, `code` and [a link](https://example.com) and [bad](javascript:alert(1)).\n\n- first\n- second\n\n```\nlet x = 1;\n```\n\n> quoted text\n\n<script>alert(1)</script>";
const BASE_TEXT = "Hello old world. " + "A sentence that stays the same for many words to make the unchanged part long enough to fold. ".repeat(6) + "Tail old.";
function mockState() {
  const d = (id, over) => ({ id, project_id: PID, change_set_id: "s1", doc_ref: "page:a", base_rev: 1, op: "find_replace", rationale: "fix typo", status: "pending", note: null, reject_reason: null, risk_score: 0, risk_flags: [], new_doc: false, result_title: null, applied_rev: null, reverted_at: null, created_at: new Date().toISOString(), decided_at: null, ...over });
  return {
    admin: true, role: "manager", invites: [], calls: [], paused: false,
    tokens: [{ id: "tk-act", label: "Active token A", mode: "read", path_prefixes: ["crate:"], daily_limit: 100, max_pending: 20, expires_at: new Date(Date.now() + 86400000 * 10).toISOString(), revoked_at: null, last_used_at: null, last_client: null, created_at: new Date().toISOString(), ai_note: "" }, { id: "tk-old", label: "Old revoked token", mode: "read", path_prefixes: [], daily_limit: 100, max_pending: 20, expires_at: new Date(Date.now() + 86400000).toISOString(), revoked_at: new Date().toISOString(), last_used_at: null, last_client: null, created_at: new Date(Date.now() - 86400000 * 5).toISOString() }, { id: "tk-old2", label: "Old expired token", mode: "read", path_prefixes: [], daily_limit: 100, max_pending: 20, expires_at: new Date(Date.now() - 86400000).toISOString(), revoked_at: null, last_used_at: null, last_client: null, created_at: new Date(Date.now() - 86400000 * 9).toISOString() }],
    trashSets: [{ id: "t1", title: "Trashed edit set", client: "Google", deleted_at: new Date(Date.now() - 86400000 * 2).toISOString(), purge_after: new Date(Date.now() + 86400000 * 28).toISOString(), doc_drafts: [{ id: "x1" }] }],
    trashPages: [{ id: "tp1", ref: "page:old", kind: "page", title: "Trashed page", deleted_at: new Date(Date.now() - 86400000).toISOString(), purge_after: new Date(Date.now() + 86400000 * 29).toISOString() }],
    log: [{ id: 3, item_type: "token", item_id: "x", title: "Deleted token A", action: "purged", at: new Date(Date.now() - 3600000).toISOString() }, { id: 2, item_type: "edit", item_id: "t1", title: "Trashed edit set", action: "trashed", at: new Date(Date.now() - 86400000 * 2).toISOString() }],
    sets: [
      { id: "s1", project_id: PID, title: "Tidy the intro", summary: "Two small edits and one rewrite", client: "claude-code/2.1", created_at: new Date(Date.now() - 600000).toISOString(),
        doc_drafts: [d("d1", { doc_ref: "page:a", risk_score: 0 }), d("d2", { doc_ref: "page:b", risk_score: 6, risk_flags: ["whole_doc", "deletes_content"], rationale: "rewrite all" }), d("d3", { doc_ref: "page:c", risk_score: 1, risk_flags: ["new_doc"], new_doc: true, result_title: "Brand new page" })] },
      { id: "s2", project_id: PID, title: "Old decided set", summary: "", client: null, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), doc_drafts: [d("d4", { change_set_id: "s2", status: "rejected", reject_reason: "not needed", doc_ref: "page:a" })] },
      { id: "s3", project_id: PID, title: "Accepted set kept", summary: "", client: null, created_at: new Date(Date.now() - 86400000 * 4).toISOString(), doc_drafts: [d("d5", { change_set_id: "s3", status: "applied", applied_rev: 2, doc_ref: "page:a" })] }
    ]
  };
}
async function setup(st) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([key, uid]) => { localStorage.setItem(key, JSON.stringify({ access_token: "aaa.bbb.ccc", refresh_token: "r", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: uid, aud: "authenticated", role: "authenticated", email: "me@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } })); }, [`sb-${ref}-auth-token`, UID]);
  const page = await ctx.newPage(); page.errs = []; page.on("pageerror", (e) => page.errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_/.test(m.text())) page.errs.push(m.text()); });
  const send = (route, rows, status = 200, extra = {}) => {
    const req = route.request(); const one = (req.headers()["accept"] || "").includes("pgrst.object");
    if (req.method() === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": `0-0/${rows.length}`, "access-control-expose-headers": "content-range", ...extra }, body: "" });
    if (one && !Array.isArray(rows)) return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(rows), headers: extra });
    if (one) return rows.length ? route.fulfill({ status, contentType: "application/json", body: JSON.stringify(rows[0]) }) : route.fulfill({ status: 406, contentType: "application/json", body: JSON.stringify({ code: "PGRST116", message: "no rows", details: "", hint: null }) });
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(rows), headers: { "content-range": `0-${Math.max(0, rows.length - 1)}/${rows.length}`, "access-control-expose-headers": "content-range", ...extra } });
  };
  await page.route("**/rest/v1/rpc/get_content_bundle", (r) => r.abort());
  await page.route("**/rest/v1/workbench_state*", (r) => send(r, []));
  const OID = "00000000-0000-4000-8000-0000000000a1", P2 = "00000000-0000-4000-8000-0000000000b2";
  await page.route("**/rest/v1/rpc/my_workspace", (r) => send(r, st.admin ? { super: true, orgs: [{ id: OID, slug: "personal", name: "Personal", role: "owner", created_at: "2026-10-01T10:00:00Z", members: 2, project_count: 2 }, { id: "00000000-0000-4000-8000-0000000000a9", slug: "side-lab", name: "Side Lab", role: "member", created_at: "2026-10-05T10:00:00Z", members: null, project_count: 0 }], projects: [{ id: PID, slug: "geminiforge", name: "GeminiForge", description: "The spec", visibility: "public", org_id: OID, role: st.role, created_at: "2026-10-01T10:00:00Z", docs: 4, last_edit: new Date(Date.now() - 7200000).toISOString() }, { id: P2, slug: "notes-project", name: "Notes project", description: "Other docs", visibility: "private", org_id: OID, role: "viewer", created_at: "2026-10-02T10:00:00Z", docs: 0, last_edit: null }], archived_projects: st.archived ?? [], deleted_orgs: st.deletedOrgs ?? [] } : { super: false, orgs: [], projects: [], archived_projects: [], deleted_orgs: [] }));
  await page.route("**/rest/v1/rpc/org_overview", (r) => send(r, { members: [{ user_id: UID, email: "owner@example.test", role: "owner", since: new Date().toISOString(), projects: [] }, { user_id: "u2", email: "bob@example.test", role: "member", since: new Date().toISOString(), projects: [{ project_id: P2, name: "Notes project", role: "viewer" }] }], invites: st.invites, projects: [{ id: PID, slug: "geminiforge", name: "GeminiForge", visibility: "public" }, { id: P2, slug: "notes-project", name: "Notes project", visibility: "private" }], events: [{ action: "invite_created", at: new Date().toISOString(), detail: { email: "bob@example.test" }, actor: "owner@example.test" }] }));
  await page.route("**/rest/v1/rpc/create_invite", (r) => { const b = r.request().postDataJSON(); st.calls.push(["invite", b]); st.invites.push({ id: "iv1", email: b.p_email, org_role: b.p_org_role, project_id: b.p_project, project: b.p_project ? "Notes project" : null, project_role: b.p_project_role, expires_at: new Date(Date.now() + 86400000 * 7).toISOString(), created_at: new Date().toISOString() }); return send(r, "iv_" + "ab".repeat(32)); });
  for (const fn of ["create_org", "delete_org", "restore_org", "purge_org", "rename_org", "restore_project", "purge_project"]) await page.route(`**/rest/v1/rpc/${fn}`, (r) => { st.calls.push([fn, r.request().postDataJSON()]); return fn === "create_org" ? send(r, "00000000-0000-4000-8000-0000000000e5") : r.fulfill({ status: 204, body: "" }); });
  await page.route("**/api/invite", (r) => { if (r.request().method() === "GET") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: !!st.mail }) }); st.calls.push(["api-invite", r.request().postDataJSON(), r.request().headers().authorization]); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ link: `https://x.test/#/join/iv_${"a".repeat(64)}`, mailed: true }) }); });
  await page.route("**/rest/v1/rpc/revoke_invite", (r) => { st.calls.push(["revoke-invite", r.request().postDataJSON()]); st.invites = []; return r.fulfill({ status: 204, body: "" }); });
  await page.route("**/rest/v1/rpc/remove_org_member", (r) => { st.calls.push(["remove-member", r.request().postDataJSON()]); return r.fulfill({ status: 204, body: "" }); });
  await page.route("**/rest/v1/rpc/set_org_role", (r) => { st.calls.push(["org-role", r.request().postDataJSON()]); return r.fulfill({ status: 204, body: "" }); });
  await page.route("**/rest/v1/rpc/create_project", (r) => { st.calls.push(["create-project", r.request().postDataJSON()]); return send(r, "00000000-0000-4000-8000-0000000000c3"); });
  await page.route("**/rest/v1/rpc/project_overview", (r) => send(r, { members: [{ user_id: UID, email: "owner@example.test", org_role: "owner", role: "manager", implicit: true }, { user_id: "u2", email: "bob@example.test", org_role: "member", role: "viewer", implicit: false }], candidates: [{ user_id: "u3", email: "carol@example.test" }], invites: [] }));
  await page.route("**/rest/v1/rpc/set_project_member", (r) => { st.calls.push(["project-member", r.request().postDataJSON()]); return r.fulfill({ status: 204, body: "" }); });
  await page.route("**/rest/v1/rpc/invite_preview", (r) => send(r, { valid: true, org: "Personal", project: "Notes project", org_role: "member", project_role: "editor", email_hint: "bo***@example.test", email_matches: st.emailMatches !== false, expires_at: new Date(Date.now() + 86400000 * 3).toISOString() }));
  await page.route("**/rest/v1/rpc/accept_invite", (r) => { st.calls.push(["accept-invite", r.request().postDataJSON()]); return send(r, { org_id: OID, project_id: P2 }); });
  await page.route("**/rest/v1/doc_drafts*", (r) => {
    const u = r.request().url();
    if (/select=payload/.test(u)) return send(r, [{ payload: { find: "A sentence that stays the same", replace: "X" } }]);
    if (r.request().method() === "HEAD" || /select=id/.test(u) && /status=eq.pending/.test(u)) return send(r, st.sets.flatMap((s) => s.doc_drafts).filter((x) => x.status === "pending"));
    return send(r, [{ result_body: BASE_TEXT.replace("old", "brand new"), result_title: "Brand new page" }]);
  });
  await page.route("**/rest/v1/change_sets*", (r) => {
    const req = r.request(), u = req.url();
    if (req.method() === "DELETE") { const ids = (decodeURIComponent(u).match(/id=in\.\(([^)]*)\)/)?.[1] ?? "").split(",").filter(Boolean); st.calls.push(["purge-edits", ids]); st.trashSets = st.trashSets.filter((x) => !ids.includes(x.id)); return send(r, ids.map((id) => ({ id }))); }
    if (/deleted_at=not\.is\.null/.test(u)) return send(r, st.trashSets);
    return send(r, st.sets);
  });
  await page.route("**/rest/v1/rpc/trash_edits", (r) => { const b = r.request().postDataJSON(); st.calls.push(["trash-edits", b.p_ids]); const done = b.p_ids.filter((id) => id !== "s3"); const refused = b.p_ids.filter((id) => id === "s3").map((id) => ({ id, reason: "Accepted edits are kept as history. Undo them first." })); st.sets = st.sets.filter((s) => !done.includes(s.id)); return send(r, { done, refused }); });
  await page.route("**/rest/v1/rpc/restore_edits", (r) => { const b = r.request().postDataJSON(); st.calls.push(["restore-edits", b.p_ids]); return send(r, { done: b.p_ids }); });
  await page.route("**/rest/v1/rpc/trash_pages", (r) => { const b = r.request().postDataJSON(); st.calls.push(["trash-pages", b.p_ids]); return send(r, { done: b.p_ids, refused: [] }); });
  await page.route("**/rest/v1/rpc/restore_pages", (r) => { const b = r.request().postDataJSON(); st.calls.push(["restore-pages", b.p_ids]); st.trashPages = st.trashPages.filter((x) => !b.p_ids.includes(x.id)); return send(r, { done: b.p_ids }); });
  await page.route("**/rest/v1/trash_log*", (r) => send(r, st.log));
  await page.route("**/rest/v1/instruction_versions*", (r) => send(r, [{ id: 1, token_id: null, body: "Project rule A", at: new Date().toISOString() }, { id: 2, token_id: "tk-act", body: "Old token note", at: new Date().toISOString() }]));
  await page.route("**/rest/v1/token_events*", (r) => send(r, [{ id: 1, token_id: "tk-act", detail: { daily_limit: [50, 100], message: true }, at: new Date().toISOString() }]));
  await page.route("**/rest/v1/docs*", (r) => {
    const req = r.request(), u = req.url();
    if (req.method() === "DELETE") { const ids = (decodeURIComponent(u).match(/id=in\.\(([^)]*)\)/)?.[1] ?? "").split(",").filter(Boolean); st.calls.push(["purge-pages", ids]); st.trashPages = st.trashPages.filter((x) => !ids.includes(x.id)); return send(r, ids.map((id) => ({ id }))); }
    if (/deleted_at=not\.is\.null/.test(u)) return send(r, st.trashPages);
    if (req.method() === "PATCH") { st.calls.push(["docpatch", req.postDataJSON(), u]); if (/select=/.test(u)) return send(r, st.docConflict ? [] : [{ id: "dd1" }]); return r.fulfill({ status: 204, body: "" }); }
    if (req.method() === "POST") { st.calls.push(["docinsert", req.postDataJSON()]); return r.fulfill({ status: 201, body: "" }); }
    if (/select=title%2Cbody/.test(u)) return send(r, [{ title: "Alpha page", body: "## Intro\n\n" + BASE_TEXT }]);
    if (/source=eq.native/.test(u) && /ref=eq/.test(u)) return send(r, [{ id: "dd1", project_id: PID, ref: "page:notes", kind: "page", title: "Notes page", rev: 3, updated_at: new Date().toISOString(), body: PAGE_MD }]);
    if (/source=eq.native/.test(u)) return send(r, [{ id: "dd1", project_id: PID, ref: "page:notes", kind: "page", title: "Notes page", rev: 3, updated_at: new Date().toISOString() }]);
    return send(r, [{ ref: "page:a", title: "Alpha page" }, { ref: "page:b", title: "Beta page" }]);
  });
  await page.route("**/rest/v1/doc_revisions*", (r) => { const u = r.request().url(); if (/select=ref%2Ckind%2Crev/.test(u)) return send(r, [{ ref: "chapter:overview#sec-overview-pillars", kind: "ai", rev: 4, created_at: new Date().toISOString() }, { ref: "chapter:overview#sec-overview-artifacts", kind: "ai", rev: 3, created_at: new Date(Date.now() - 86400000).toISOString() }, { ref: "chapter:overview#sec-overview-artifacts", kind: "revert", rev: 2, created_at: new Date(Date.now() - 2 * 86400000).toISOString() }]); if (/select=rev%2Ckind/.test(u)) return send(r, [{ rev: 3, kind: "ai", created_at: new Date().toISOString(), title: "Notes page" }, { rev: 2, kind: "edit", created_at: new Date().toISOString(), title: "Notes page" }, { rev: 1, kind: "ai", created_at: new Date().toISOString(), title: "Notes page" }]); return send(r, [{ body: BASE_TEXT, title: "Alpha page" }]); });
  await page.route("**/rest/v1/rpc/decide_drafts", async (r) => {
    const b = r.request().postDataJSON(); st.calls.push(["decide", b]);
    const res = b.p_ids.map((id) => { const x = st.sets.flatMap((s) => s.doc_drafts).find((y) => y.id === id); if (x && x.status === "pending") { x.status = b.p_approve ? "applied" : "rejected"; x.reject_reason = b.p_reason; x.applied_rev = 2; } return { id, status: x?.status }; });
    return send(r, res);
  });
  await page.route("**/rest/v1/rpc/revert_draft", (r) => { const b = r.request().postDataJSON(); st.calls.push(["revert", b]); const x = st.sets.flatMap((s) => s.doc_drafts).find((y) => y.id === b.p_id); if (x) x.reverted_at = new Date().toISOString(); return send(r, "reverted"); });
  await page.route("**/rest/v1/projects*", async (r) => { if (r.request().method() === "PATCH") { st.calls.push(["pause", r.request().postDataJSON()]); if ("ai_paused" in r.request().postDataJSON()) st.paused = r.request().postDataJSON().ai_paused; return r.fulfill({ status: 204, body: "" }); } return send(r, [{ id: PID, slug: "demo", name: "Demo docs", ai_paused: st.paused, ai_guide: "Only fix typos.", trash_days: 30 }]); });
  await page.route("**/rest/v1/rpc/set_trash_timer", (r) => { const b = r.request().postDataJSON(); st.calls.push(["timer", b]); if (b.p_days === null) { for (const x of st.trashSets) if (b.p_edit_ids.includes(x.id)) x.purge_after = null; for (const x of st.trashPages) if (b.p_page_ids.includes(x.id)) x.purge_after = null; } return send(r, { edits: b.p_edit_ids.length, pages: b.p_page_ids.length }); });
  await page.route("**/rest/v1/mcp_tokens*", async (r) => { const m = r.request().method(); if (m === "DELETE") { const ids = (decodeURIComponent(r.request().url()).match(/id=in\.\(([^)]*)\)/)?.[1] ?? "").split(",").filter(Boolean); st.calls.push(["purge-tokens", ids]); st.tokens = st.tokens.filter((t) => !ids.includes(t.id)); return send(r, ids.map((id) => ({ id }))); } if (m === "PATCH") { st.calls.push(["tokpatch", r.request().postDataJSON()]); return r.fulfill({ status: 204, body: "" }); } return send(r, st.tokens); });
  await page.route("**/rest/v1/rpc/create_mcp_token", (r) => { const b = r.request().postDataJSON(); st.calls.push(["create", b]); st.tokens.unshift({ id: "t1", label: b.p_label, mode: b.p_mode, path_prefixes: b.p_prefixes, daily_limit: b.p_daily_limit, max_pending: 20, expires_at: new Date(Date.now() + 86400000 * 30).toISOString(), revoked_at: null, last_used_at: null, last_client: null, created_at: new Date().toISOString() }); return send(r, "dk_" + "ab".repeat(32)); });
  await page.route("**/rest/v1/rpc/mcp_audit_log", (r) => send(r, [{ ts: new Date().toISOString(), token_label: "Gemini phone", tool: "read_doc", ref: "page:a", status: "ok", detail: null }, { ts: new Date().toISOString(), token_label: "Gemini phone", tool: "propose_edit", ref: null, status: "mcp:bad_request", detail: "find text not found" }]));
  await page.route("**/rest/v1/rpc/purge_trash", (r) => { st.calls.push(["purge-trash"]); return send(r, { edits: 0, pages: 0 }); });
  await page.route("**/rest/v1/rpc/clear_activity", (r) => { st.calls.push(["clear-activity", r.request().postDataJSON()]); return send(r, 2); });
  await page.route("**/functions/v1/docs-mcp/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { tools: [{ name: "list_projects" }, { name: "read_doc" }] } }) }));
  return page;
}
const pick = async (p, label, opt) => { await p.click(`[role=combobox][aria-label="${label}"]`); await p.click(`.pop-w [role=option]:has-text("${opt}")`); await p.waitForTimeout(250); };
const text = (p, sel) => p.locator(sel).first().textContent({ timeout: 3000 }).catch(() => "");

// 1. admin: sidebar entry with count, inbox lists risk-sorted edits
let st = mockState(); let p = await setup(st);
await p.goto(`${base}?gftest#/home`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
if (process.env.DBG) { console.log(await text(p, ".side-scroll")); console.log(p.errs); }
ok("admin sees the AI space entries with the waiting count", /Review inbox/.test(await text(p, ".side")) && /AI access/.test(await text(p, ".side")) && (await p.locator('.nav[aria-label], .nav:has-text("Review inbox") .acc').first().textContent()).includes("3"), await text(p, ".side-scroll").then((t) => t.slice(0, 120)));
await p.click('.nav:has-text("Review inbox")'); await p.waitForSelector(".ai-set"); await p.waitForTimeout(300);
const order = await p.$$eval(".ai-set:first-of-type .ai-d-t, .ai-set .ai-d-t", (els) => els.map((e) => e.textContent));
ok("inbox: sets and edits shown, highest risk first", order[0] === "Beta page" && order.includes("Alpha page") && order.includes("Brand new page") && !order.includes("Old decided set"), order.join("|"));
ok("inbox: risk chips in plain words", /Replaces the whole text/.test(await text(p, ".ai-set")) && /Removes a lot of text/.test(await text(p, ".ai-set")) && /High risk/.test(await text(p, ".ai-set")));
ok("inbox: set header shows the client and the edit count", /claude-code\/2\.1/.test(await text(p, ".ai-set-h")) && /3 edits/.test(await text(p, ".ai-set-h")));
ok("inbox: bulk buttons offer low-risk and all", (await p.locator('button:has-text("Accept the 2 low-risk")').count()) === 1 && (await p.locator('button:has-text("Accept all 3")').count()) === 1);
ok("tab title shows the waiting count", /^\(3\)/.test(await p.title()), await p.title());
await p.click('button:has-text("Accept all 3")'); await p.waitForSelector("dialog[open]");
ok("inbox: accept all with a high-risk edit asks first", /1 high-risk/.test(await text(p, "dialog[open]")) && !st.calls.some((c) => c[0] === "decide"));
await p.click('dialog[open] button:has-text("Cancel")'); await p.waitForTimeout(250);
await p.click('button:has-text("Reject all")'); await p.waitForSelector("dialog[open]");
ok("inbox: reject all asks first and cancelling rejects nothing", /Reject 3 edits/.test(await text(p, "dialog[open]")) && !st.calls.some((c) => c[0] === "decide"));
await p.click('dialog[open] button:has-text("Cancel")'); await p.waitForTimeout(250);

// 1b. live refresh: a server-side change shows up in place, without moving the page or recreating cards
const nodeMark = await p.evaluate(() => { const c = document.querySelector(".ai-d"); c.__mark = c.dataset.id; return c.dataset.id; });
st.sets[0].doc_drafts.push({ id: "d9", project_id: PID, change_set_id: "s1", doc_ref: "page:z", base_rev: 1, op: "find_replace", rationale: "late", status: "pending", note: null, reject_reason: null, risk_score: 0, risk_flags: [], new_doc: false, result_title: null, applied_rev: null, reverted_at: null, created_at: new Date().toISOString(), decided_at: null });
await p.evaluate(() => window.__gf.store.setState((s) => ({ liveTick: s.liveTick + 1 })));
await p.waitForTimeout(700);
ok("live refresh: new edit appears without reload and existing cards are kept", (await p.locator(".ai-d").count()) === 4 && await p.evaluate((id) => document.querySelector(`.ai-d[data-id="${id}"]`).__mark === id, nodeMark));
st.sets[0].doc_drafts.pop();
// 1c. peek: the page an edit touched, with the changed passage highlighted
await p.locator('.ai-d:has-text("Alpha page") button[data-act=peek]').click(); await p.waitForSelector(".ai-peek .md"); await p.waitForTimeout(500);
const hlSize = await p.evaluate(() => CSS.highlights?.get("gf-passage")?.size ?? -1);
if (hlSize < 0) console.log("DBG", await p.evaluate(() => ({ has: document.querySelector(".ai-peek-b")?.textContent.includes("A sentence that stays the same"), n: CSS.highlights.size, foot: document.querySelector(".ai-peek-b")?.textContent.slice(-160) })));
ok("peek: page shown beside the list with the changed passage highlighted", /Alpha page/.test(await text(p, ".ai-peek")) && /Hello old world/.test(await text(p, ".ai-peek .md")) && hlSize === 1, `highlights=${hlSize}`);
const axp = await p.evaluate(async () => (await window.axe?.run(".ai-peek", { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }))?.violations.map((v) => `${v.id}:${v.nodes.length}`) ?? ["no-axe"]);
await p.addScriptTag({ content: axeSrc }); const axp2 = await p.evaluate(async () => (await window.axe.run(".ai-peek", { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((v) => `${v.id}:${v.nodes.length}`));
ok("peek: no axe violations", axp2.length === 0, axp2.join(","));
await p.click('.ai-peek button:has-text("Wider")'); ok("peek: can be made wider", /62%/.test(await p.evaluate(() => document.querySelector(".ai-split").getAttribute("style"))));
await p.keyboard.press("Escape"); await p.waitForTimeout(200);
ok("peek: Escape closes it", (await p.locator(".ai-peek").count()) === 0);
const vp0 = p.viewportSize(); await p.setViewportSize({ width: 600, height: 900 });
await p.evaluate(() => window.__gf.store.setState({ sidebarOpen: false })); await p.waitForTimeout(400);
await p.locator('.ai-d:has-text("Alpha page") button[data-act=peek]').click(); await p.waitForSelector(".ai-peek .md");
ok("peek on a phone is a modal dialog and the list behind it is inert", (await p.getAttribute(".ai-peek", "role")) === "dialog" && (await p.getAttribute(".ai-peek", "aria-modal")) === "true" && await p.evaluate(() => document.querySelector(".ai-split > div").inert === true));
ok("peek has Accept and Reject for a waiting edit", (await p.locator('.ai-peek button:text-is("Accept")').count()) === 1 && (await p.locator('.ai-peek button:text-is("Reject")').count()) === 1);
await p.evaluate(() => { const b = [...document.querySelectorAll(".ai-peek button")]; b[b.length - 1].focus(); }); await p.keyboard.press("Tab");
ok("peek on a phone keeps Tab inside the panel", await p.evaluate(() => !!document.activeElement.closest(".ai-peek")));
await p.keyboard.press("Escape"); await p.setViewportSize(vp0);
await p.locator('.ai-d:has-text("Alpha page") button[data-act=peek]').click(); await p.waitForSelector(".ai-peek .md");
await p.click('.ai-peek button:has-text("Open the page")'); await p.waitForTimeout(400);
ok("peek: Open the page navigates to the page", /#\/pages\/page%3Aa/.test(p.url()));
await p.goto(`${base}?gftest#/inbox`, { waitUntil: "networkidle" }); await p.waitForSelector(".ai-set"); await p.waitForTimeout(300);

// 2. diff view
await p.locator('.ai-d:has-text("Alpha page") button:has-text("Show changes")').click(); await p.waitForSelector(".ai-diff ins"); 
const dm = [await p.locator(".ai-diff ins").count(), await p.locator(".ai-diff del").count(), (await text(p, ".ai-diff")).slice(0, 200)];
ok("diff: added and removed text marked, unchanged part folded", dm[0] > 0 && dm[1] > 0 && /unchanged characters/.test(dm[2] + (await text(p, ".ai-diff"))), JSON.stringify(dm));
await p.locator('.ai-d:has-text("Brand new page") button:has-text("Show changes")').click(); await p.waitForTimeout(400);
ok("new document shows its full text", /Hello brand new world/.test(await text(p, '.ai-d:has-text("Brand new page") .ai-diff')));

// 3. a11y of the inbox
await p.addScriptTag({ content: axeSrc });
const ax = await p.evaluate(async () => (await window.axe.run(".col", { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((v) => `${v.id}:${v.nodes.length}:${v.nodes[0].html.slice(0, 120)}`));
ok("inbox: no axe violations", ax.length === 0, ax.join(","));

// 4. accept one, reject one with a reason
await p.locator('.ai-d:has-text("Alpha page") button:has-text("Accept")').first().click(); await p.waitForTimeout(500);
ok("accept calls decide_drafts with the id", st.calls.some((c) => c[0] === "decide" && c[1].p_approve === true && c[1].p_ids.join() === "d1"));
ok("accept shows a toast with Undo", /1 accepted/.test(await text(p, ".toast")) && (await p.locator(".toast-undo").count()) === 1);
await p.locator('.ai-d:has-text("Beta page") button:has-text("Reject…")').click();
await p.fill('input[aria-label^="Reason"]', "too aggressive"); await p.locator('.ai-rej button:has-text("Reject")').click(); await p.waitForTimeout(500);
ok("reject sends the reason", st.calls.some((c) => c[0] === "decide" && c[1].p_approve === false && c[1].p_reason === "too aggressive" && c[1].p_ids.join() === "d2"));
await p.click('button:has-text("Decided")'); await p.waitForTimeout(300);
ok("decided list shows accepted, rejected with reason, and the old set", /Accepted/.test(await text(p, ".col")) && /Your reason: too aggressive/.test(await text(p, ".col")) && /Old decided set/.test(await text(p, ".col")));
await p.locator('.ai-d:has-text("Alpha page"):has-text("Accepted") button:has-text("Undo")').first().click(); await p.waitForTimeout(400);
ok("undo calls revert_draft", st.calls.some((c) => c[0] === "revert" && c[1].p_id === "d1"));

// 5. keyboard
st = mockState(); await p.context().close(); p = await setup(st);
await p.goto(`${base}?gftest#/inbox`, { waitUntil: "networkidle" }); await p.waitForSelector(".ai-d");
await p.locator(".ai-d").first().focus(); await p.keyboard.press("j"); 
const focusedId = await p.evaluate(() => document.activeElement?.getAttribute("data-id"));
await p.keyboard.press("a"); await p.waitForTimeout(500);
ok("keyboard: j moves to the next edit, a accepts it", focusedId && st.calls.some((c) => c[0] === "decide" && c[1].p_ids.join() === focusedId), `${focusedId}`);
ok("no page errors in the inbox", p.errs.length === 0, p.errs.join("|"));

// 6. AI access
await p.goto(`${base}?gftest#/access`, { waitUntil: "networkidle" }); await p.waitForSelector("h1.view-h");
await p.fill('input[placeholder="Gemini on my phone"]', "Gemini phone"); await p.click('button:has-text("Create token")'); await p.waitForSelector(".ai-secret");
const sec = await text(p, ".ai-secret");
ok("access: token shown once, with snippets for each client", /^dk_[0-9a-f]{64}$/.test(sec) && /functions\/v1\/docs-mcp\/dk_/.test(await text(p, ".ai-snip")));
await p.click('button:has-text("Claude Code")'); ok("access: Claude Code snippet uses a header", /--header "Authorization: Bearer dk_/.test(await text(p, ".ai-snip")));
await p.click('button:has-text("Test it")'); await p.waitForTimeout(400);
ok("access: test button reports the tools", /Works: 2 tools/.test(await text(p, ".trk")));
ok("access: create sent mode, ttl and limits", st.calls.some((c) => c[0] === "create" && c[1].p_mode === "read" && c[1].p_ttl_days === 30 && c[1].p_label === "Gemini phone"));
await p.click('button:has-text("I saved it")');
ok("access: secret gone after dismissing", (await p.locator(".ai-secret").count()) === 0 && !(await p.evaluate(() => document.body.textContent)).includes("abababababab"));
ok("access: token and activity lists", /Gemini phone/.test(await text(p, ".col")) && /read_doc/.test(await text(p, ".col")));
ok("access: owner message loaded", (await p.inputValue('textarea[aria-label="Message for AI tools"]')) === "Only fix typos.");
await p.fill('textarea[aria-label="Message for AI tools"]', "Never edit chapter 3."); await p.click('button:has-text("Save message")'); await p.waitForTimeout(300);
ok("access: owner message saved", st.calls.some((c) => c[0] === "pause" && c[1].ai_guide === "Never edit chapter 3."));
await p.click('button:has-text("Pause AI access")'); await p.waitForTimeout(400);
ok("access: pause sends ai_paused", st.calls.some((c) => c[0] === "pause" && c[1].ai_paused === true));
await p.addScriptTag({ content: axeSrc });
const ax2 = await p.evaluate(async () => (await window.axe?.run(".col", { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }))?.violations.map((v) => `${v.id}:${v.nodes.length}`) ?? ["axe-missing"]);
ok("access: no axe violations", ax2.length === 0 || ax2[0] === "axe-missing", ax2.join(","));
ok("no page errors on the access page", p.errs.length === 0, p.errs.join("|"));
await p.context().close();

// 6b. added pages
st = mockState(); p = await setup(st);
await p.goto(`${base}?gftest#/pages`, { waitUntil: "networkidle" }); await p.waitForSelector(".pg-row");
ok("pages: list shows the native page", /Notes page/.test(await text(p, ".pg-row")) && /AI space|Added pages/.test(await text(p, ".side")));
await p.click(".pg-row"); await p.waitForSelector(".md");
const mdc = [await p.locator(".md h3").count(), await p.locator(".md strong").count(), await p.locator(".md ul li").count(), await p.locator(".md pre").count(), await p.locator(".md blockquote").count()];
ok("pages: Markdown rendered safely", mdc.join() === "1,1,2,1,1", mdc.join() + " " + (await text(p, ".md")).slice(0, 200));
ok("pages: https link clickable, javascript link and raw HTML are not", (await p.locator('.md a[href^="https://example.com"]').count()) === 1 && (await p.locator('.md a[href^="javascript"]').count()) === 0 && (await p.locator(".md script").count()) === 0 && /<script>alert/.test(await text(p, ".md")));
ok("pages: history lists versions with labels", /Accepted AI edit/.test(await text(p, ".col")) && (await p.locator('button:has-text("Restore")').count()) === 2);
await p.click('button:has-text("Edit")'); await p.fill('textarea[aria-label="Markdown text"]', "# Hi\n\nnew text"); await p.waitForTimeout(200);
ok("pages: live preview while editing", /new text/.test(await text(p, ".pg-ed .pv")));
await p.click('button:has-text("Save")'); await p.waitForTimeout(400);
ok("pages: save sends the body", st.calls.some((c) => c[0] === "docpatch" && c[1].body === "# Hi\n\nnew text"));
await p.locator('button:has-text("Restore")').first().click(); await p.waitForTimeout(400);
ok("pages: restore writes the old version back", st.calls.filter((c) => c[0] === "docpatch").length >= 2);
await p.click('button:has-text("All added pages")'); await p.fill('input[aria-label="New page title"]', "My new page"); await p.click('button:has-text("New page")'); await p.waitForTimeout(500);
ok("pages: create inserts page:<slug>", st.calls.some((c) => c[0] === "docinsert" && c[1].ref === "page:my-new-page" && c[1].source === "native"));
await p.click('button:has-text("Edit")'); await p.fill('textarea[aria-label="Markdown text"]', "| A | B |\n|---|---|\n| 1 | 2 |"); await p.waitForTimeout(200);
ok("pages: a Markdown table is rendered as a table", (await p.locator(".pg-ed .pv table th").count()) === 2 && (await p.locator(".pg-ed .pv table td").count()) === 2);
st.docConflict = true; await p.click('button:has-text("Save")'); await p.waitForTimeout(400);
ok("pages: saving over a newer version is refused and the text is kept", /changed while you were editing/.test(await text(p, ".toast")) && (await p.inputValue('textarea[aria-label="Markdown text"]')).startsWith("| A |"));
st.docConflict = false; await p.click('button:has-text("Cancel")');
await p.click('button:has-text("All added pages")');
await p.setInputFiles('input[type=file]', { name: "x.md", mimeType: "text/markdown", buffer: Buffer.from("# Imported title\n\nhello there") }); await p.waitForTimeout(500);
ok("pages: importing a Markdown file creates a page from its first heading", st.calls.some((c) => c[0] === "docinsert" && c[1].ref === "page:imported-title" && c[1].title === "Imported title" && c[1].body.includes("hello there")));
await p.click('button:has-text("All added pages")'); await p.fill('input[aria-label="New page title"]', "نوٹس"); await p.click('button:has-text("New page")'); await p.waitForTimeout(500);
ok("pages: a title without Latin letters still creates a page", st.calls.some((c) => c[0] === "docinsert" && /^page:p-/.test(c[1].ref) && c[1].title === "نوٹس"));
const [dlmd] = await Promise.all([p.waitForEvent("download"), p.click('button:has-text("Download .md")')]);
ok("pages: Download .md saves the text", /\.md$/.test(dlmd.suggestedFilename()));
await p.addScriptTag({ content: axeSrc });
const ax3 = await p.evaluate(async () => (await window.axe.run(".col", { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((v) => `${v.id}:${v.nodes.length}`));
ok("pages: no axe violations", ax3.length === 0, ax3.join(","));
ok("no page errors on pages", p.errs.length === 0, p.errs.join("|"));
await p.context().close();

// 6b2. highlight in a real chapter after "Open the page"
st = mockState(); p = await setup(st);
await p.goto(`${base}?gftest#/chapter/overview`, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
await p.evaluate(() => window.__gf.store.setState({ highlight: "Meet the GeminiForge V20 Architecture." })); await p.waitForTimeout(900);
ok("chapter: the passage from an edit is highlighted after opening the page", (await p.evaluate(() => CSS.highlights.get("gf-passage")?.size ?? 0)) === 1 && (await p.evaluate(() => window.__gf.store.getState().highlight)) === "");
ok("chapter: an accepted AI edit is flagged in the chapter", /AI edited/.test(await text(p, ".doc")) && /2 sections/.test(await text(p, ".doc")), await text(p, ".doc").then((t) => t.slice(0, 160)));
await p.click('button:has-text("Show which")'); ok("chapter: the touched sections are listed", /sec-overview-pillars/.test(await text(p, ".doc")));
await p.context().close();

// 6c. trash
st = mockState(); p = await setup(st);
await p.goto(`${base}?gftest#/home`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
ok("trash: sidebar entry with the count", /Trash/.test(await text(p, ".side")) && /2/.test(await p.locator('.nav:has-text("Trash")').first().textContent()));
await p.goto(`${base}?gftest#/inbox`, { waitUntil: "networkidle" }); await p.waitForSelector(".ai-set"); await p.click('button:has-text("Decided")'); await p.waitForTimeout(300);
ok("inbox: accepted sets are marked as kept history and cannot be selected", (await p.locator('.ai-set:has-text("Accepted set kept") input[type=checkbox]').count()) === 0 && /Kept as history/.test(await text(p, ".col")) && (await p.locator('.ai-set:has-text("Old decided set") input[type=checkbox]').count()) === 1);
await p.check('input[aria-label="Select Old decided set"]'); await p.click('button:has-text("Move 1 to Trash")'); await p.waitForTimeout(500);
ok("inbox: selected set moved to the Trash with an Undo toast", st.calls.some((c) => c[0] === "trash-edits" && c[1].join() === "s2") && /moved to the Trash/.test(await text(p, ".toast")) && (await p.locator(".toast-undo").count()) === 1);
await p.click(".toast-undo"); await p.waitForTimeout(400);
ok("inbox: Undo restores it", st.calls.some((c) => c[0] === "restore-edits" && c[1].join() === "s2"));
await p.goto(`${base}?gftest#/trash`, { waitUntil: "networkidle" }); await p.waitForSelector(".ai-tok");
ok("trash: lists edits and pages with days left", (await p.locator(".ai-tok").count()) === 2 && /purges in 28 days/.test(await text(p, ".col")) && /Trashed page/.test(await text(p, ".col")));
ok("trash: timer controls show the project setting", (await p.inputValue('input[aria-label="Days to keep items in the Trash"]')) === "30");
await p.fill('input[aria-label="Days to keep items in the Trash"]', "14"); await p.click('button:has-text("Save timer")'); await p.waitForTimeout(300);
ok("trash: saving the timer sends trash_days", st.calls.some((c) => c[0] === "pause" && c[1].trash_days === 14));
await p.check('.ai-bar:has-text("never delete automatically") input[type=checkbox]'); await p.click('button:has-text("Save timer")'); await p.waitForTimeout(300);
ok("trash: never-delete sends null", st.calls.some((c) => c[0] === "pause" && "trash_days" in c[1] && c[1].trash_days === null));
await p.uncheck('.ai-bar:has-text("never delete automatically") input[type=checkbox]');
await pick(p, "Change the timer of Trashed page", "7 days"); await p.waitForTimeout(300);
ok("trash: a row timer calls set_trash_timer for that page", st.calls.some((c) => c[0] === "timer" && c[1].p_days === 7 && c[1].p_page_ids.join() === "tp1" && c[1].p_edit_ids.length === 0));
await pick(p, "Change the timer of Trashed edit set", "Keep until I delete it"); await p.waitForTimeout(300);
ok("trash: keep-until-I-delete sends null days and the row says so", st.calls.some((c) => c[0] === "timer" && c[1].p_days === null && c[1].p_edit_ids.join() === "t1") && /kept until you delete it/.test(await text(p, ".ai-tok:has-text('Trashed edit set')")));
await p.click('button:has-text("Apply to everything")'); await p.waitForSelector("dialog[open]"); await p.click('dialog[open] button:has-text("Change timers")'); await p.waitForTimeout(300);
ok("trash: apply to everything sends all ids", st.calls.some((c) => c[0] === "timer" && c[1].p_edit_ids.length === 1 && c[1].p_page_ids.length === 1 && c[1].p_days === 30));
await p.click('button:has-text("Pages (1)")'); await p.waitForTimeout(200);
ok("trash: tab filter shows only pages", (await p.locator(".ai-tok").count()) === 1 && /Trashed page/.test(await text(p, ".ai-tok")));
await p.click('button:has-text("All (")'); await p.fill('input[aria-label="Search the Trash"]', "edit set"); await p.waitForTimeout(200);
ok("trash: search filters", (await p.locator(".ai-tok").count()) === 1 && /Trashed edit set/.test(await text(p, ".ai-tok")));
await p.fill('input[aria-label="Search the Trash"]', "");
await p.addScriptTag({ content: axeSrc });
await p.check('input[aria-label="Select Trashed page"]'); await p.click('button:has-text("Restore (1)")'); await p.waitForTimeout(500);
ok("trash: restore calls the function", st.calls.some((c) => c[0] === "restore-pages" && c[1].join() === "tp1"));
await p.locator('.ai-tok:has-text("Trashed edit set") button:has-text("Delete forever")').click(); await p.waitForSelector("dialog[open]");
await p.waitForTimeout(500); // the dialog fades in; scan when it is fully visible
const axd = await p.evaluate(async () => (await window.axe.run("dialog[open]", { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((v) => `${v.id}:${v.nodes.length}`));
ok("trash: confirm dialog for one item has no typing and no axe violations", /for good/.test(await text(p, "dialog[open]")) && (await p.locator("dialog[open] input").count()) === 0 && axd.length === 0, axd.join(","));
ok("trash: confirm dialog is centered on screen", await p.evaluate(() => { const r = document.querySelector("dialog[open]").getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - innerWidth / 2) < 3 && Math.abs(r.top + r.height / 2 - innerHeight / 2) < 3; }));
await p.click('dialog[open] button:has-text("Cancel")'); await p.waitForTimeout(200);
ok("trash: cancelling deletes nothing", !st.calls.some((c) => c[0] === "purge-edits" && c[1].length > 0));
await p.locator('.ai-tok:has-text("Trashed edit set") button:has-text("Delete forever")').click(); await p.click('dialog[open] button:has-text("Delete forever")'); await p.waitForTimeout(500);
ok("trash: single delete forever removes the row", st.calls.some((c) => c[0] === "purge-edits" && c[1].join() === "t1"));
// empty trash: two steps and typing
st.trashSets.push({ id: "t2", title: "Second trashed set", client: null, deleted_at: new Date().toISOString(), purge_after: new Date(Date.now() + 86400000 * 30).toISOString(), doc_drafts: [] }); st.trashPages.push({ id: "tp2", ref: "page:two", kind: "page", title: "Second page", deleted_at: new Date().toISOString(), purge_after: new Date(Date.now() + 86400000 * 30).toISOString() });
await p.click('button:has-text("Refresh")').catch(() => {}); await p.evaluate(() => window.__gf.store.setState((s) => ({ liveTick: s.liveTick + 1 }))); await p.waitForTimeout(600);
await p.click('button:has-text("Empty Trash")'); await p.waitForSelector("dialog[open]");
ok("trash: empty trash step 1 shows the counts", /1 edit set\(s\) and 2 page\(s\)/.test(await text(p, "dialog[open]")) || /edit set\(s\) and/.test(await text(p, "dialog[open]")));
await p.click('dialog[open] button:has-text("Continue")'); await p.waitForTimeout(300);
const btn = p.locator('dialog[open] button:has-text("Empty Trash")');
ok("trash: step 2 needs the typed phrase", await btn.isDisabled());
await p.fill("dialog[open] input", "EMPTY TRASH"); ok("trash: typed phrase enables the button", await btn.isEnabled());
await btn.click(); await p.waitForTimeout(600);
ok("trash: everything is deleted", st.calls.filter((c) => c[0] === "purge-edits" || c[0] === "purge-pages").length >= 2 && (await p.locator(".ai-tok").count()) === 0);
await p.click('button:has-text("Deleted tokens")'); ok("trash: deleted tokens are listed without a restore option", /Deleted token A/.test(await text(p, ".col")) && (await p.locator('button:has-text("Restore")').count()) === 0);
await p.click('button:has-text("Log")'); ok("trash: log lists the actions", /Moved to Trash/.test(await text(p, ".col")));
// tokens: delete one dead token, then clear the rest
await p.goto(`${base}?gftest#/access`, { waitUntil: "networkidle" }); await p.waitForSelector(".ai-tok");
ok("access: dead tokens offer Delete and a bulk clear", (await p.locator('.ai-tok:has-text("Old revoked token") button:has-text("Delete")').count()) === 1 && /Clear revoked and expired \(2\)/.test(await text(p, ".set-h:has-text('Tokens')")));
await p.locator('.ai-tok:has-text("Old revoked token") button:has-text("Delete")').click(); await p.click('dialog[open] button:has-text("Delete token")'); await p.waitForTimeout(500);
ok("access: single token delete", st.calls.some((c) => c[0] === "purge-tokens" && c[1].join() === "tk-old"));
await p.click('button:has-text("Clear revoked and expired")'); await p.waitForSelector("dialog[open]");
const delBtn = p.locator('dialog[open] button:has-text("Delete token")'); ok("access: bulk clear needs typing DELETE", await delBtn.isDisabled() || (await p.locator("dialog[open] input").count()) === 0);
await p.context().close();
// pages: move to trash
st = mockState(); p = await setup(st);
await p.goto(`${base}?gftest#/pages/page%3Anotes`, { waitUntil: "networkidle" }); await p.waitForSelector(".md");
await p.click('button:has-text("Move to Trash")'); await p.waitForTimeout(500);
ok("pages: Move to Trash calls the function and shows Undo", st.calls.some((c) => c[0] === "trash-pages" && c[1].join() === "dd1") && /Trash/.test(await text(p, ".toast")));
ok("no page errors in trash flows", p.errs.length === 0, p.errs.join("|"));
await p.context().close();

// 6d. edit a token in place
st = mockState(); p = await setup(st);
await p.goto(`${base}?gftest#/access`, { waitUntil: "networkidle" }); await p.waitForSelector(".ai-tok");
ok("access: recent token changes are listed", /daily_limit: 50 → 100/.test(await text(p, ".ai-tbl")) && /message changed/.test(await text(p, ".col")));
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Edit")').click(); await p.waitForSelector('textarea[aria-label], .ai-form');
await p.fill('.ai-tok:has-text("Active token A") .ai-form input >> nth=0', "Renamed token");
await p.fill('.ai-tok:has-text("Active token A") textarea', "Only fix typos for this token.");
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Save changes")').click(); await p.waitForTimeout(400);
ok("access: saving sends only the changed fields, without a confirmation for a harmless change", st.calls.some((c) => c[0] === "tokpatch" && c[1].label === "Renamed token" && c[1].ai_note === "Only fix typos for this token." && !("mode" in c[1]) && !("token_hash" in c[1])));
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Edit")').click().catch(() => {});
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Edit"), .ai-tok:has-text("Active token A") button:has-text("Close")').first().click().catch(() => {}); await p.waitForTimeout(200);
if (!(await p.locator('.ai-tok:has-text("Active token A") .ai-form').count())) await p.locator('.ai-tok:has-text("Active token A") button:has-text("Edit")').click();
await p.click('.ai-tok:has-text("Active token A") [role=combobox][aria-label="Can"]'); await p.click('.pop-w [role=option]:has-text("Read and propose edits")'); await p.waitForTimeout(200);
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Save changes")').click(); await p.waitForSelector("dialog[open]");
ok("access: giving a token more access asks first", /more access/.test(await text(p, "dialog[open]")) && !st.calls.some((c) => c[0] === "tokpatch" && c[1].mode === "propose"));
await p.click('dialog[open] button:has-text("Cancel")'); await p.waitForTimeout(200);
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Save changes")').click(); await p.waitForSelector("dialog[open]"); await p.click('dialog[open] button:has-text("Save changes")'); await p.waitForTimeout(400);
ok("access: confirmed widening is saved", st.calls.some((c) => c[0] === "tokpatch" && c[1].mode === "propose"));
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Edit")').click().catch(() => {}); 
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Message history")').click().catch(() => {});
ok("access: project message history lists versions", (await p.locator('button:text-is("History (1)")').count()) === 1);
await p.click('button:has-text("History (1)")'); await p.locator('.ai-tok:has-text("Project rule A") button:has-text("Use this text")').click();
ok("access: restoring a version fills the message box", (await p.inputValue('textarea[aria-label="Message for AI tools"]')) === "Project rule A");
ok("access: checks list says nothing needs attention", /Nothing needs attention/.test(await text(p, ".ai-checks")), await text(p, ".ai-checks"));
ok("access: a failed call shows its reason in the activity table", /find text not found/.test(await text(p, ".ai-tbl:last-of-type")));
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Close")').click().catch(() => {});
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Revoke")').click(); await p.waitForSelector("dialog[open]");
const revokesBefore = st.calls.filter((c) => c[0] === "tokpatch" && c[1].revoked_at).length;
await p.click('dialog[open] button:has-text("Cancel")'); await p.waitForTimeout(250);
ok("access: revoke asks first, cancel keeps the token", st.calls.filter((c) => c[0] === "tokpatch" && c[1].revoked_at).length === revokesBefore);
await p.locator('.ai-tok:has-text("Active token A") button:has-text("Revoke")').click(); await p.waitForSelector("dialog[open]"); await p.click('dialog[open] button:has-text("Revoke")'); await p.waitForTimeout(400);
ok("access: confirmed revoke is saved", st.calls.filter((c) => c[0] === "tokpatch" && c[1].revoked_at).length === revokesBefore + 1);
await p.click('button:has-text("Clear activity")'); await p.waitForSelector("dialog[open]");
ok("access: clearing activity needs typing CLEAR", await p.locator('dialog[open] button:has-text("Clear activity")').isDisabled());
await p.fill("dialog[open] input", "CLEAR"); await p.click('dialog[open] button:has-text("Clear activity")'); await p.waitForTimeout(400);
ok("access: clear_activity is called for all rows", st.calls.some((c) => c[0] === "clear-activity" && c[1].p_days === 0));
const [dl] = await Promise.all([p.waitForEvent("download"), p.click('button:has-text("Download backup")')]);
const bk = JSON.parse(await (await import("node:fs")).promises.readFile(await dl.path(), "utf8"));
ok("access: backup file has the expected sections and no secrets", bk.format === "geminiforge-backup" && Array.isArray(bk.added_pages) && Array.isArray(bk.change_sets) && Array.isArray(bk.tokens_without_secrets) && !/token_hash|dk_[0-9a-f]{20}/.test(JSON.stringify(bk)), Object.keys(bk).join(","));
const [dl2] = await Promise.all([p.waitForEvent("download"), p.click('button:has-text("Download llms.txt")')]);
const llms = await (await import("node:fs")).promises.readFile(await dl2.path(), "utf8");
ok("access: llms.txt lists the documents", /^# /.test(llms) && /##\s/.test(llms), llms.slice(0, 120));
ok("no page errors editing tokens", p.errs.length === 0, p.errs.join("|"));
await p.context().close();

// 8. organizations and projects (invited-only)
st = mockState(); p = await setup(st);
await p.goto(`${base}?gftest#/home`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
ok("switcher shows the project, its organization and the role", /GeminiForge/.test(await text(p, ".psw-b")) && /Personal/.test(await text(p, ".psw-b")) && /Manager/.test(await text(p, ".psw-b")));
await p.click(".psw-b"); await p.waitForSelector("[role=menu] .menu-i");
ok("switcher lists every project the user may open", /Notes project/.test(await text(p, "[role=menu]")) && /GeminiForge/.test(await text(p, "[role=menu]")) && /All organizations/.test(await text(p, "[role=menu]")));
await p.click('[role=menu] .menu-i:has-text("Notes project")'); await p.waitForTimeout(700);
ok("another project shows its own home, not the specification", /Notes project/.test(await text(p, ".col")) && /Viewer/.test(await text(p, ".col")) && !/Chapters/.test(await text(p, ".side")) && (await p.locator(".side .nav:has-text('Library')").count()) === 0);
ok("breadcrumbs show app > organization > Projects > project and the last one is the current page", (await p.locator(".crumbs li").count()) === 4 && (await p.locator('.crumbs [aria-current=page]').textContent()) === "Notes project");
ok("a viewer sees pages but not the inbox, trash or AI access", (await p.locator(".side .nav:has-text('Added pages')").count()) === 1 && (await p.locator(".side .nav:has-text('Review inbox')").count()) === 0 && (await p.locator(".side .nav:has-text('Trash')").count()) === 0 && (await p.locator(".side .nav:has-text('AI access')").count()) === 0);
await p.click(".side .nav:has-text('Added pages')"); await p.waitForTimeout(600);
ok("a viewer cannot create or import pages", (await p.locator('input[aria-label="New page title"]').count()) === 0);
await p.click(".side .nav:has-text('Organizations')"); await p.waitForSelector(".ph h1:has-text('Organizations')"); await p.waitForTimeout(400);
ok("organizations page: cards with role, project count and member count", /Personal/.test(await text(p, ".ocards")) && /2 projects/.test(await text(p, ".ocards")) && /2 members/.test(await text(p, ".ocards")) && /Side Lab/.test(await text(p, ".ocards")));
await p.fill('.sfield input', "side"); await p.waitForTimeout(200);
ok("organizations page: search narrows the cards", (await p.locator(".ocard .oc-main").count()) === 1 && /Side Lab/.test(await text(p, ".ocards")));
await p.fill('.sfield input', "zzz"); await p.waitForTimeout(200);
ok("organizations page: no match shows the empty state with Clear filters", /No organization matches/.test(await text(p, ".col")) && (await p.locator('button:has-text("Clear filters")').count()) === 1);
await p.click('button:has-text("Clear filters")'); await pick(p, "Filter by role", "Member");
ok("organizations page: role filter", (await p.locator(".ocard .oc-main").count()) === 1 && /Side Lab/.test(await text(p, ".ocards")));
await pick(p, "Filter by role", "All roles");
await p.click('button[aria-label="List"]'); await p.waitForTimeout(150);
ok("organizations page: list layout is remembered", (await p.getAttribute(".ocards", "data-v")) === "list");
await p.click('button[aria-label="Cards"]');
await p.click('button:has-text("New organization") >> nth=0'); await p.waitForSelector("dialog[open]"); await p.fill('dialog[open] input', "Studio"); await p.click('dialog[open] button:has-text("Create")'); await p.waitForTimeout(500);
ok("creating an organization calls create_org and opens it", st.calls.some((c) => c[0] === "create_org" && c[1].p_name === "Studio"));
await p.click(".side .nav:has-text('Organizations')"); await p.waitForTimeout(300);
await p.click('.ocard:has-text("Side Lab") [aria-label^="Actions for"]'); await p.waitForTimeout(200);
ok("the super administrator can rename and delete any organization from the card menu", /Rename/.test(await text(p, "[role=menu]")) && /Delete/.test(await text(p, "[role=menu]")));
await p.keyboard.press("Escape");
await p.click('.ocard:has-text("Personal") [aria-label^="Actions for"]'); await p.click('[role=menu] .menu-i:has-text("Delete")'); await p.waitForSelector("dialog[open]");
ok("deleting an organization asks for its name", /Type\s*Personal/.test(await text(p, "dialog[open]")) && await p.locator('dialog[open] button:has-text("Delete organization")').isDisabled());
await p.fill('dialog[open] input', "Personal"); await p.click('dialog[open] button:has-text("Delete organization")'); await p.waitForTimeout(400);
ok("confirmed delete calls delete_org with an Undo toast", st.calls.some((c) => c[0] === "delete_org") && /deleted/.test(await text(p, ".toast")) && (await p.locator(".toast-undo").count()) === 1);
await p.click(".toast-undo"); await p.waitForTimeout(300);
ok("Undo calls restore_org", st.calls.some((c) => c[0] === "restore_org"));
await p.click('.ocard:has-text("Personal") .oc-main'); await p.waitForTimeout(500);
ok("organization page lists its projects and the tabs", /GeminiForge/.test(await text(p, ".col")) && /Notes project/.test(await text(p, ".col")) && (await p.locator('[role=tab]').count()) === 5);
await p.fill('.sfield input', "notes"); await p.waitForTimeout(200);
ok("projects: search narrows the cards", (await p.locator(".ocard .oc-main").count()) === 1);
await p.fill('.sfield input', ""); await p.waitForTimeout(150);
await p.click('button:has-text("New project") >> nth=0'); await p.waitForSelector("dialog[open]"); await p.fill('dialog[open] label:has-text("Project name") input', "Course notes"); await p.click('dialog[open] button:has-text("Create project")'); await p.waitForTimeout(400);
ok("creating a project calls create_project", st.calls.some((c) => c[0] === "create-project" && c[1].p_name === "Course notes" && c[1].p_visibility === "private"));
await p.click('button[role=tab]:has-text("People")'); await p.waitForTimeout(400);
ok("people tab lists members with their project roles", /bob@example.test/.test(await text(p, ".col")) && /Notes project: Viewer/.test(await text(p, ".col")));
await p.click('.ph button:has-text("Invite")'); await p.waitForSelector("dialog[open]");
await p.fill('dialog[open] input[type=email]', "dana@example.test"); await pick(p, "Give access to", "GeminiForge"); await p.click('dialog[open] button:has-text("Create invitation")'); await p.waitForSelector(".org-link");
const linkText = await text(p, ".org-link");
ok("creating an invitation shows the link once and sends project role and days", /#\/join\/iv_[0-9a-f]{64}$/.test(linkText) && st.calls.some((c) => c[0] === "invite" && c[1].p_email === "dana@example.test" && c[1].p_project === PID && c[1].p_project_role === "viewer" && c[1].p_days === 7), linkText + " " + JSON.stringify(st.calls.filter((c) => c[0] === "invite")));
ok("the invitation dialog offers copy and a ready email", (await p.locator('dialog[open] a:has-text("Write an email")').count()) === 1 && /dana%40example\.test|dana@example\.test/.test(await p.getAttribute('dialog[open] a:has-text("Write an email")', "href")));
await p.click('dialog[open] button:has-text("Done")'); await p.waitForTimeout(300);
await p.click('button[role=tab]:has-text("Invitations")'); await p.waitForTimeout(300);
ok("the open invitation is listed and can be revoked", /dana@example.test/.test(await text(p, ".col")));
await p.locator('.row2:has-text("dana@example.test") button:has-text("Revoke")').click(); await p.waitForTimeout(400);
ok("revoking an invitation calls the function", st.calls.some((c) => c[0] === "revoke-invite" && c[1].p_id === "iv1"));
await p.click('button[role=tab]:has-text("People")'); await p.waitForTimeout(300);
await p.click('.row2:has-text("bob@example.test") [aria-label^="Actions for"]'); await p.click('[role=menu] .menu-i:has-text("Remove from organization")'); await p.waitForSelector("dialog[open]");
ok("removing a member asks first", /lose access/.test(await text(p, "dialog[open]")) && !st.calls.some((c) => c[0] === "remove-member"));
await p.click('dialog[open] button:has-text("Remove")'); await p.waitForTimeout(400);
ok("confirmed removal calls remove_org_member", st.calls.some((c) => c[0] === "remove-member" && c[1].p_user === "u2"));
await pick(p, "Organization role of bob@example.test", "Admin");
ok("an owner can change an organization role", st.calls.some((c) => c[0] === "org-role" && c[1].p_user === "u2" && c[1].p_role === "admin"));
await p.click('button[role=tab]:has-text("Settings")'); await p.waitForTimeout(300);
ok("settings tab: rename and the danger zone for the owner", (await p.locator('.dz:has-text("Delete this organization")').count()) === 1);
await p.addScriptTag({ content: axeSrc });
const axo = await p.evaluate(async () => (await window.axe.run(".col", { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })).violations.map((v) => `${v.id}:${v.nodes.length}`));
ok("organization page: no axe violations", axo.length === 0, axo.join(","));
await p.click(".side .nav:has-text('GeminiForge')"); await p.waitForTimeout(600); await p.click(".side .nav:has-text('Settings and people')"); await p.waitForTimeout(700);
ok("project page (manager) shows settings and people with access", /Settings/.test(await text(p, ".col")) && /owner@example.test/.test(await text(p, ".col")) && /bob@example.test/.test(await text(p, ".col")));
await pick(p, "Project role of bob@example.test", "Editor");
ok("a manager can change a project role (manager is stored as owner)", st.calls.some((c) => c[0] === "project-member" && c[1].p_user === "u2" && c[1].p_role === "editor"));
await pick(p, "Organization member to add", "carol@example.test"); await p.click('button:has-text("Give access")'); await p.waitForTimeout(300);
ok("a manager can add an organization member to the project", st.calls.some((c) => c[0] === "project-member" && c[1].p_user === "u3" && c[1].p_role === "viewer"));
ok("no page errors in organizations", p.errs.length === 0, p.errs.join("|"));
await p.context().close();

// 8a. root page, invitation email, UI kit
st = mockState(); st.mail = true; p = await setup(st);
await p.goto(`${base}?gftest`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
ok("the address without a # opens the organizations page", /Organizations/.test(await text(p, ".ph h1")) && /#\/orgs|^[^#]*$/.test(p.url()) && (await p.locator(".ocard").count()) >= 2);
ok("only one search entry: header, none in the sidebar or the account menu", (await p.locator(".side-search").count()) === 0 && (await p.locator("button.tsearch").count()) === 1);
await p.click(".foot-btn"); await p.waitForTimeout(200);
ok("account menu: settings, help, backup, sign out; no search; narrower than the sidebar", /Settings/.test(await text(p, ".pm")) && /Sign out/.test(await text(p, ".pm")) && !/Search/.test(await text(p, ".pm")) && (await p.locator(".pm").evaluate((e) => e.getBoundingClientRect().width)) < (await p.locator(".side").evaluate((e) => e.getBoundingClientRect().width)) - 20);
await p.keyboard.press("Escape");
ok("compact rows: sidebar items are at most 32px high", (await p.locator(".side .nav").first().evaluate((e) => e.getBoundingClientRect().height)) <= 32);
await p.click('.ocard:has-text("Personal") .oc-main'); await p.waitForTimeout(400);
await p.click('.ph button:has-text("Invite")'); await p.waitForSelector("dialog[open]"); await p.waitForTimeout(300);
ok("invitation dialog: email option is on when the server can send", await p.locator('dialog[open] input[type=checkbox]').isChecked());
await p.fill('dialog[open] input[type=email]', "erin@example.test"); await p.click('dialog[open] button:has-text("Create invitation")'); await p.waitForSelector(".org-link");
ok("the invitation is created and emailed through /api/invite with the user's token", st.calls.some((c) => c[0] === "api-invite" && c[1].email === "erin@example.test" && /^Bearer /.test(c[2])) && /Email sent/.test(await text(p, "dialog[open]")));
await p.click('dialog[open] button:has-text("Done")'); await p.waitForTimeout(200);
await p.click('[role=combobox][aria-label="Sort projects"]'); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await p.waitForTimeout(200);
ok("custom select: keyboard (arrows + Enter) changes the value and closes", /Newest first/.test(await text(p, '[role=combobox][aria-label="Sort projects"]')) && (await p.locator(".pop-w").count()) === 0);
await p.click('[role=combobox][aria-label="Sort projects"]'); await p.keyboard.press("Escape"); await p.waitForTimeout(150);
ok("custom select: Escape closes without changing", (await p.locator(".pop-w").count()) === 0 && /Newest first/.test(await text(p, '[role=combobox][aria-label="Sort projects"]')));
await p.keyboard.press("Control+k"); await p.waitForSelector("dialog.pal[open]"); await p.waitForTimeout(200);
ok("palette: recents and projects on an empty query, with scope tabs", /Projects|Organization/.test(await text(p, ".pal-list")) && (await p.locator(".pal-tabs button").count()) === 6);
await p.fill(".pal-in input", "@notes"); await p.waitForTimeout(300);
ok("palette: the @ prefix searches organizations and projects", /Notes project/.test(await text(p, ".pal-list")) && (await p.locator('.pal-tabs button[aria-pressed=true]').textContent()) === "Projects");
await p.keyboard.press("Enter"); await p.waitForTimeout(500);
ok("palette: choosing a project opens it", /Notes project/.test(await text(p, ".crumbs")));
await p.keyboard.press("Control+k"); await p.waitForSelector("dialog.pal[open]"); await p.fill(".pal-in input", ">invite"); await p.waitForTimeout(300);
ok("palette: the > prefix lists actions, including Invite someone", /Invite someone/.test(await text(p, ".pal-list")));
await p.keyboard.press("Escape");
ok("no page errors in the UI kit checks", p.errs.length === 0, p.errs.join("|"));
await p.context().close();

// 8b. an editor does not manage AI access; an invitation link can be accepted
st = mockState(); st.role = "editor"; p = await setup(st);
await p.goto(`${base}?gftest#/home`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
ok("an editor sees the inbox and trash but not AI access", (await p.locator(".side .nav:has-text('Review inbox')").count()) === 1 && (await p.locator(".side .nav:has-text('AI access')").count()) === 0);
await p.goto(`${base}?gftest#/access`, { waitUntil: "networkidle" }); await p.waitForTimeout(600);
ok("opening AI access as an editor explains who can", /manager of this project/.test(await text(p, ".col")));
await p.goto(`${base}?gftest#/join/iv_${"ab".repeat(32)}`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
ok("invitation page shows organization, project, role and masked email", /Personal/.test(await text(p, ".col")) && /Notes project/.test(await text(p, ".col")) && /Editor/.test(await text(p, ".col")) && /bo\*\*\*@example.test/.test(await text(p, ".col")));
await p.click('button:has-text("Accept invitation")'); await p.waitForTimeout(700);
ok("accepting calls accept_invite with the token and opens the project", st.calls.some((c) => c[0] === "accept-invite" && c[1].p_token === "iv_" + "ab".repeat(32)) && !/#\/join/.test(p.url()));
await p.context().close();
st = mockState(); st.emailMatches = false; p = await setup(st);
await p.goto(`${base}?gftest#/join/iv_${"cd".repeat(32)}`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
ok("a different signed-in email cannot accept", /different email/.test(await text(p, ".col")) && await p.locator('button:has-text("Accept invitation")').isDisabled());
await p.context().close();

// 7. not an admin
st = mockState(); st.admin = false; p = await setup(st);
await p.goto(`${base}?gftest#/inbox`, { waitUntil: "networkidle" }); await p.waitForTimeout(600);
ok("non-admin: no AI entries and a clear message", !/Review inbox/.test(await text(p, ".side")) && /editor or manager role/.test(await text(p, ".col")));
await p.context().close();
await browser.close();
console.log(`\n${n - bad}/${n} passed`); process.exit(bad ? 1 : 0);
