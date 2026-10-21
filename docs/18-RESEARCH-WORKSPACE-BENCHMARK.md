# Research 2026-10-21: document-workspace benchmark vs our master plan
Legend: Y yes, P partial, N no/not found, ? UNVERIFIED (no first-party page reached), $ paid, EE enterprise. A "?" is a gap in evidence, not proof of absence. Universal basics (tree, move, trash, Markdown export) omitted.

## Capability matrix (products: Notion, Outline, Docmost, AFFiNE, AppFlowy, BookStack, Confluence, GitBook, Slab, Obsidian, Anytype)
- Verified/owner/expiry: Notion Y$, Outline N, Docmost EE, Confluence P, GitBook P, Slab Y on the free plan, Obsidian N. (N2 notion.com/help/wikis-and-verified-pages; S1 slab.com/pricing; S2 help.slab.com/en/articles/4136379-post-verification)
- Per-page permission override: Notion Y, Outline Y, Docmost Y$ (Business), AppFlowy Y (v0.9.4), BookStack Y, GitBook roles only.
- Guests: Notion Y (10 free), Outline $, Slab Y (3/user paid), Anytype Y. Comments + mentions: Outline Y (read-only users can comment), Docmost P (resolve EE), GitBook Y (change-request review).
- Version history: Notion 7 days free, Docmost free + compare (v0.96), Slab 90 days free, Obsidian 1 month/12 months paid. Public share: Notion Y (expiry), Outline Y, Docmost Y free, GitBook Y (private links paid), Obsidian Publish.
- API/webhooks: Notion, Outline, BookStack (webhooks since v21.12), Confluence, GitBook, Slab Y; Docmost API EE. MCP: Notion, Outline, GitBook Y; Docmost EE.
- Audit log: Enterprise in Notion, Slab, Docmost, GitBook; BookStack Y (admin). Page analytics: Notion basic free, GitBook all plans, Slab 30 days free, Confluence Premium+ (1-year lookback, privacy mode).
- Notifications inbox: Notion, Docmost (v0.71), GitBook, Slab. Favorites/recents: Notion, Docmost (v0.80). Search: Notion split keyword vs AI on 2026-09-02; Docmost filters v0.96, vector EE; Slab facets (verified/expired).
- AI Q&A: Notion $20 Business, Outline $, Docmost EE, AppFlowy $8.9 add-on, GitBook Essential+, Slab Business+. SSO/SCIM mostly paid tiers.
Sources: notion.com/{pricing,help/sharing-and-permissions,help/use-pages-offline}, developers.notion.com/page/changelog, github.com/outline/outline/releases, getoutline.com/{changelog,pricing}, releasebot.io/updates/docmost, docmost.com/{docs,pricing}, affine.pro/pricing, appflowy.com/pricing, bookstackapp.com/blog/, support.atlassian.com/confluence-cloud/docs/view-analytics-to-see-how-content-is-performing/, gitbook.com/{docs/changelog,pricing}, slab.com/pricing/, obsidian.md/{pricing,help/Obsidian+Sync/Version+history}.

## 15 highest-value gaps for a solo owner on free tiers (with recommendation)
1 **Verified / owner / review-by** (Slab on free plan: primary verifier, review frequency, green banner with expiry, yellow once lapsed, diff since last verification; Notion: owner required, expiry date or indefinite, inbox + email at expiry, search badge). Add owner_id, verified_by, verified_at, verified_until; daily pg_cron flips to expired and inserts a notification; badge, filter, "changed since verified" diff.
2 **Trust-weighted search and ask-the-docs** (Notion ranks verified pages higher, notion.com/releases/2025-03-26): rank boost in FTS; mark each cited quote verified/unverified; allow "verified documents only".
3 **Real notification inbox** (2.29): one `notifications` table (AI edit waiting, verification due, mention, role change) over Realtime; skip the email digest.
4 **Request access + a `restricted` flag** instead of full per-page ACLs (Outline added "Request access" 2026-06-01): keep org/project roles; one boolean per document; button creates a notification.
5 **Share-link hardening**: the `#/s/` payload must contain no editor ids or emails; last_viewed and view count per link; extend the anon SQL matrix to the share route.
6 **Page view analytics**: `doc_view_daily(doc_id, day, count)` upsert RPC, no per-view rows; 30-day views, last viewed, "unread 90 days" as staleness signal.
7 **Revision attribution, retention, provenance** (Notion 2026-10-13, Outline v1.10/v1.11 reasons): `revisions.actor_kind` (human | ai-token | import) with the token name; keep last N plus every verified; optional reason on delete.
8 **Per-token usage panel + `report_issue` MCP tool** (GitBook Agents & MCP report 2026-09-22; sendFeedback 2026-07-29; Notion admin can see last used per AI tool): last used, call count, documents touched per token from the audit log; `report_issue(doc, text)` lands in the Review inbox; defer OAuth.
9 **Content-gap list** (GitBook, 2026-10-06): log every question with no verbatim quote found, with a count; top ten on the dashboard.
10 **Templates, small**: `is_template` flag, "New from template" copies the page, no variables yet.
11 **Favorites** table (user, doc); recents stay in localStorage (as the palette).
12 **Offline: read cache only** (Notion offline is per-device, no subpage/permission sync): service worker + IndexedDB of last N opened documents.
13 **Human suggestions and comment resolution**: viewers' "suggest" edits go through the Review inbox; comments carry an anchor quote and a resolved flag, no threads yet.
14 **Minimal import/export with an exit guarantee**: Markdown zip in and out + Notion export zip import; DOCX later; keep zip export working always.
15 **Search filter chips** (project, kind, verified state, owner, labels); keyword-only until the 40-question set fails.

## Over-engineered for a solo owner (cut or defer)
6.7 two-person approval; 6.4 hash chain and replay (plain append-only log + CSV is enough; audit logs are Enterprise tier elsewhere); 6.3 rotation with overlap / new-client alert (keep kill switch and per-token limits); 6.5 OAuth server (Docmost makes MCP OAuth Enterprise-only; tokens suffice for one owner — but see docs/14 for client compatibility); 8.4 pgvector until FTS fails the evaluation set; 4.6 timeline/board/ICS (list view only); 5.9 attachments (Notion free caps 5 MB, Slab 10 MB; use the 1 GB bucket, images only); 2.23/Q11 move project across organizations (export/import covers it); 2.25 chords, 2.27 visual-regression screenshots, 2.28 logos/accents; 9.10 domain + Resend until you invite more than a few people; 8.5 listen/focus/split view; 5.8 four importers at once (start with Markdown zip); 9.3 backup encryption until backups leave a private repo.

## Mistakes and risks other products hit
- Public pages leaking editor identity: April 2026 reports say public Notion pages expose editors' names/emails via an unauthenticated API (cyberinsider.com/notion-pages-have-leaked-user-data-via-an-unauthenticated-api-since-2022/; secondary, fix status UNVERIFIED).
- AI edits taking effect before approval (PromptArmor: promptarmor.com/resources/notion-ai-unpatched-data-exfiltration; simonwillison.net/2025/Sep/19/notion-lethal-trifecta): our Review inbox is the right design; a pending diff must never auto-load remote images or links.
- BookStack 2026 security releases are almost all permission leaks (drafts, attachments, comments on recycled pages via API, hidden content in Markdown exports, search showing drafts): extend the RLS matrix to drafts, trash, attachments, exports, search, comments.
- Atlassian April 2022 outage (a script with wrong ids deleted ~400 customers' sites; fix = universal soft delete; atlassian.com/blog/how-we-build/post-incident-review-april-2022-outage): keep soft delete and add a TESTED restore from backup.
- Obsidian Sync silent overwrites (forum.obsidian.md/t/obsidian-sync-on-iphone-overwrites-newer-data-causing-data-loss/85214; anecdotes): keep both versions on conflict; no offline writes in v1.
- Confluence "Verified" cleared by any edit, no timestamp (CONFCLOUD-84852): store verified_at and decide explicitly what an edit does. Rubber-stamp risk: do not accept a bare "still accurate" button (Slab shows a diff since last verification).
- Vendor comparison pages can be wrong (one said Slab has no verification; Slab's own pricing lists it on free): trust first-party pages.
- Notion API churn (2026-03-11 `archived` -> `in_trash`; 2026-07-15 page links moved to app.notion.com; per-workspace rate limit 2026-06-16; notion-search keyword-only 2026-09-02): version our MCP tool schemas and key `[[kind:slug]]` links on ids. AI pricing shifts (AI bundled into Business at $20/member): keep AI off the free path, bring-your-own key.
- Supabase free pause: see docs/16.
Not checked: Outline mobile, AFFiNE and Anytype 2026 changelogs, Docmost/AppFlowy permission details beyond citations, Confluence native expiry.
