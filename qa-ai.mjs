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
const ref = (await (await fetch(base)).text()).match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? (await fs.promises.readFile(".env", "utf8")).match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });

const PAGE_MD = "## Section one\n\nA paragraph with **bold**, `code` and [a link](https://example.com) and [bad](javascript:alert(1)).\n\n- first\n- second\n\n```\nlet x = 1;\n```\n\n> quoted text\n\n<script>alert(1)</script>";
const BASE_TEXT = "Hello old world. " + "A sentence that stays the same for many words to make the unchanged part long enough to fold. ".repeat(6) + "Tail old.";
function mockState() {
  const d = (id, over) => ({ id, project_id: PID, change_set_id: "s1", doc_ref: "page:a", base_rev: 1, op: "find_replace", rationale: "fix typo", status: "pending", note: null, reject_reason: null, risk_score: 0, risk_flags: [], new_doc: false, result_title: null, applied_rev: null, reverted_at: null, created_at: new Date().toISOString(), decided_at: null, ...over });
  return {
    admin: true, calls: [], paused: false,
    tokens: [{ id: "tk-old", label: "Old revoked token", mode: "read", path_prefixes: [], daily_limit: 100, max_pending: 20, expires_at: new Date(Date.now() + 86400000).toISOString(), revoked_at: new Date().toISOString(), last_used_at: null, last_client: null, created_at: new Date(Date.now() - 86400000 * 5).toISOString() }, { id: "tk-old2", label: "Old expired token", mode: "read", path_prefixes: [], daily_limit: 100, max_pending: 20, expires_at: new Date(Date.now() - 86400000).toISOString(), revoked_at: null, last_used_at: null, last_client: null, created_at: new Date(Date.now() - 86400000 * 9).toISOString() }],
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
  await page.route("**/rest/v1/app_admins*", (r) => send(r, st.admin ? [{ user_id: UID }] : []));
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
  await page.route("**/rest/v1/docs*", (r) => {
    const req = r.request(), u = req.url();
    if (req.method() === "DELETE") { const ids = (decodeURIComponent(u).match(/id=in\.\(([^)]*)\)/)?.[1] ?? "").split(",").filter(Boolean); st.calls.push(["purge-pages", ids]); st.trashPages = st.trashPages.filter((x) => !ids.includes(x.id)); return send(r, ids.map((id) => ({ id }))); }
    if (/deleted_at=not\.is\.null/.test(u)) return send(r, st.trashPages);
    if (req.method() === "PATCH") { st.calls.push(["docpatch", req.postDataJSON()]); return r.fulfill({ status: 204, body: "" }); }
    if (req.method() === "POST") { st.calls.push(["docinsert", req.postDataJSON()]); return r.fulfill({ status: 201, body: "" }); }
    if (/select=title%2Cbody/.test(u)) return send(r, [{ title: "Alpha page", body: "## Intro\n\n" + BASE_TEXT }]);
    if (/source=eq.native/.test(u) && /ref=eq/.test(u)) return send(r, [{ id: "dd1", project_id: PID, ref: "page:notes", kind: "page", title: "Notes page", rev: 3, updated_at: new Date().toISOString(), body: PAGE_MD }]);
    if (/source=eq.native/.test(u)) return send(r, [{ id: "dd1", project_id: PID, ref: "page:notes", kind: "page", title: "Notes page", rev: 3, updated_at: new Date().toISOString() }]);
    return send(r, [{ ref: "page:a", title: "Alpha page" }, { ref: "page:b", title: "Beta page" }]);
  });
  await page.route("**/rest/v1/doc_revisions*", (r) => { const u = r.request().url(); if (/select=rev%2Ckind/.test(u)) return send(r, [{ rev: 3, kind: "ai", created_at: new Date().toISOString(), title: "Notes page" }, { rev: 2, kind: "edit", created_at: new Date().toISOString(), title: "Notes page" }, { rev: 1, kind: "ai", created_at: new Date().toISOString(), title: "Notes page" }]); return send(r, [{ body: BASE_TEXT, title: "Alpha page" }]); });
  await page.route("**/rest/v1/rpc/decide_drafts", async (r) => {
    const b = r.request().postDataJSON(); st.calls.push(["decide", b]);
    const res = b.p_ids.map((id) => { const x = st.sets.flatMap((s) => s.doc_drafts).find((y) => y.id === id); if (x && x.status === "pending") { x.status = b.p_approve ? "applied" : "rejected"; x.reject_reason = b.p_reason; x.applied_rev = 2; } return { id, status: x?.status }; });
    return send(r, res);
  });
  await page.route("**/rest/v1/rpc/revert_draft", (r) => { const b = r.request().postDataJSON(); st.calls.push(["revert", b]); const x = st.sets.flatMap((s) => s.doc_drafts).find((y) => y.id === b.p_id); if (x) x.reverted_at = new Date().toISOString(); return send(r, "reverted"); });
  await page.route("**/rest/v1/projects*", async (r) => { if (r.request().method() === "PATCH") { st.calls.push(["pause", r.request().postDataJSON()]); st.paused = r.request().postDataJSON().ai_paused; return r.fulfill({ status: 204, body: "" }); } return send(r, [{ id: PID, slug: "demo", name: "Demo docs", ai_paused: st.paused, ai_guide: "Only fix typos." }]); });
  await page.route("**/rest/v1/mcp_tokens*", async (r) => { const m = r.request().method(); if (m === "DELETE") { const ids = (decodeURIComponent(r.request().url()).match(/id=in\.\(([^)]*)\)/)?.[1] ?? "").split(",").filter(Boolean); st.calls.push(["purge-tokens", ids]); st.tokens = st.tokens.filter((t) => !ids.includes(t.id)); return send(r, ids.map((id) => ({ id }))); } if (m === "PATCH") { st.calls.push(["tokpatch", r.request().postDataJSON()]); return r.fulfill({ status: 204, body: "" }); } return send(r, st.tokens); });
  await page.route("**/rest/v1/rpc/create_mcp_token", (r) => { const b = r.request().postDataJSON(); st.calls.push(["create", b]); st.tokens.unshift({ id: "t1", label: b.p_label, mode: b.p_mode, path_prefixes: b.p_prefixes, daily_limit: b.p_daily_limit, max_pending: 20, expires_at: new Date(Date.now() + 86400000 * 30).toISOString(), revoked_at: null, last_used_at: null, last_client: null, created_at: new Date().toISOString() }); return send(r, "dk_" + "ab".repeat(32)); });
  await page.route("**/rest/v1/rpc/mcp_audit_recent", (r) => send(r, [{ ts: new Date().toISOString(), token_label: "Gemini phone", tool: "read_doc", ref: "page:a", status: "ok" }]));
  await page.route("**/functions/v1/docs-mcp/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { tools: [{ name: "list_projects" }, { name: "read_doc" }] } }) }));
  return page;
}
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
ok("access: token and activity lists", /Gemini phone/.test(await text(p, ".col")) && /read_doc/.test(await text(p, ".ai-tbl")));
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

// 7. not an admin
st = mockState(); st.admin = false; p = await setup(st);
await p.goto(`${base}?gftest#/inbox`, { waitUntil: "networkidle" }); await p.waitForTimeout(600);
ok("non-admin: no AI entries and a clear message", !/Review inbox/.test(await text(p, ".side")) && /not an administrator/.test(await text(p, ".col")));
await p.context().close();
await browser.close();
console.log(`\n${n - bad}/${n} passed`); process.exit(bad ? 1 : 0);
