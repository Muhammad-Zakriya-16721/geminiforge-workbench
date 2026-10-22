<!-- Raw ChatGPT Deep Research output (Part E+F), saved unedited 2026-10-22. citeturn... markers are ChatGPT citation placeholders. Audit: docs/22-AUDIT-RESEARCH-EF.md. Its sample code is UNTESTED and contains the defects listed in the audit. -->
# Zero-Cost Reliability and Email-Deliverability Review for GeminiForge Workbench

**Assumption:** GeminiForge remains a genuinely personal, non-commercial project with a few invited collaborators; “exactly $0” means no paid subscription, no purchased domain, no prepaid credit, and no service that requires entering a payment card merely to activate the recommended path.

**Research method and evidence standard.** I treated the four supplied PDFs as claims to audit, not as authorities. They describe the current 15 MB PostgreSQL 17.11 database, 33 public tables, public GitHub repository, Vercel Hobby deployment, missing Gmail credentials, planned custom SMTP, and the owner’s zero-cost decisions. fileciteturn0file0 fileciteturn0file1 fileciteturn0file2 fileciteturn0file3 Before web research I decomposed the problem into 120 specific questions, reproduced in the appendix. I then ran **84 distinct web searches** and preferentially opened vendor documentation, pricing/limit pages, changelogs, standards, and incident reports. Where the current primary source did not establish a requested fact, I say **UNVERIFIED** rather than carrying forward a number from the PDFs.

## Executive findings and decision record

The most important conclusion is that your master plan is directionally strong, but several of its numerical assumptions are either outdated or more certain than the primary sources justify.

| Risk rank | Finding | Verdict | Effort |
|---|---|---|---|
| 1 | **Your database currently has no managed Free-plan backup. Build the encrypted export immediately.** Supabase says automatic daily backups are for Pro, Team and Enterprise and tells Free projects to export with `supabase db dump` and keep off-site copies. citeturn22view1 | AGREE with master plan | M |
| 2 | **Do not wait for the “weekly restore” to discover that the dump is unusable.** Run an automated logical restore in the *same CI job that creates a fresh plaintext dump*, before encryption. Do not put the `age` private key into CI. This is an important correction to the proposed design. | MODIFY | M |
| 3 | **The Supabase pause rule is not “exactly seven days of zero activity.”** Current wording is low activity over a seven-day period and “sufficient user database activity”; Supabase says a few user database requests each day are typically enough. citeturn22view0 | MODIFY | S |
| 4 | **Use two independent external database reads for keep-alive, not `pg_cron`.** Vercel Cron plus GitHub Actions is reasonable, but the GitHub workflow needs a dead-man monitor because public-repository schedules can be disabled after long repository inactivity. | AGREE/MODIFY | S |
| 5 | **Gmail SMTP remains the best $0/no-domain primary mail path for this unusually small workload.** It avoids the DMARC problem created when a third-party provider attempts to transmit mail claiming `From: …@gmail.com`. Google still documents app passwords and requires 2-Step Verification for them. citeturn20view19 | AGREE | S |
| 6 | **Do not treat “500/day” as a verified Gmail-SMTP quota.** Google’s consumer Gmail help says sending can stop after more than 500 emails in a day or more than 500 recipients in one message, but SMTP/mail-client-specific lower limits circulating elsewhere were not established by a current first-party source in this research. citeturn20view18 | DISAGREE with the PDF’s confidence | — |
| 7 | **Your proposed application gate of 3/hour, 10/day per organization and 3/day per recipient is excellent.** It stays far below every plausible Gmail threshold and limits compromised-account abuse. These are your policy limits, not Google limits. | AGREE | S |
| 8 | **Supabase Edge Functions explicitly block outbound ports 25 and 587; port 465 is not listed.** Therefore “465 works from Edge Functions” is **UNVERIFIED**, not confirmed. Your Vercel Node sender avoids having to depend on that ambiguity. Supabase’s exact wording is: “Outgoing connections to ports `25` and `587` are not allowed.” citeturn22view2 | MODIFY | — |
| 9 | **Keep the invitation secret in the URL fragment and make link opening inert.** RFC 3986 specifies that the fragment is separated before URI dereferencing, so the HTTP origin request does not receive it. citeturn20view20 This is one of the strongest decisions in the design. | AGREE | S |
| 10 | **Do not depend on CSS animation or dark-mode media queries for meaning.** Keep the animated GIF and CSS animation only as progressive enhancement. Email-client support remains fragmented. citeturn20view21turn20view22turn20view23turn20view24 | AGREE/MODIFY | S |
| 11 | **Backblaze B2 is the best independently hosted backup destination I found under the no-card rule.** Current Backblaze material says the first 10 GB is free and a billing method is not required to get started. citeturn11search9 Encrypt locally/CI first with `age`; never trust the storage provider with plaintext. | RECOMMEND | M |
| 12 | **Cloudflare R2 is not my primary recommendation despite its good free allowance.** Its current Free Standard allowance includes 10 GB-month, but the R2 activation flow requires a subscription/checkout step and I did not establish from a primary source that it can always be completed without a payment card. citeturn20view12turn11search12 Under your hard rule, that uncertainty is disqualifying. | REJECT for now | — |
| 13 | **There is no zero-cost, no-card, drop-in Supabase replacement preserving `supabase-js`, PostgREST, Supabase Auth, `auth.uid()` RLS semantics, Realtime and Storage.** Neon is the best PostgreSQL exit destination, but a full application migration remains large. Its Free plan has recently become more generous. citeturn20view14 | Architectural fact | L |
| 14 | **Vercel Hobby is acceptable only while the project stays non-commercial.** Vercel explicitly limits Hobby to non-commercial personal use. citeturn20view6 Your zero-cost operational plan therefore needs Netlify/Cloudflare as rehearsed static/function exits before the project ever becomes commercial. | HIGH policy risk | M |
| 15 | **Monitoring must detect automation failure, not merely site failure.** Use UptimeRobot for externally visible service health and Healthchecks.io for keep-alive, backup and restore-job heartbeats. Both have useful free tiers; Healthchecks explicitly offers a free Hobby tier without requiring a card. citeturn8search8turn10search1turn10search15 | RECOMMEND | S |

The supplied plan correctly recognizes that Free-plan backups do not exist, the repository is public, Storage objects require separate backup, Gmail credentials are not yet configured, and real invitation mail has therefore never been tested. fileciteturn0file1 The architecture update also correctly records that the project has already migrated most application use to the newer Supabase publishable/secret key model. fileciteturn0file3

The single highest-value operational sequence is therefore:

**Gmail smoke test → external DB keep-alives → encrypted nightly database export → same-run restore validation → independent B2 copy → Storage-object export → dead-man alerts → end-to-end invitation/scanner/email-client drills.**

## Platform landscape, change history, and exit architecture

**E1 — Free-tier landscape and change history**

### Supabase

**Recommendation:** keep Supabase Free as the primary application platform, but operate it as a system that can disappear. Your data should be exportable every day and your application should tolerate a future migration.

Current primary evidence materially corrects the PDFs:

Supabase now says:

> “Supabase pauses Free Plan projects that show low activity over a 7-day period…” citeturn22view0

More importantly, its detailed definition is not “seven days without any request”; it says a Free project is inactive when it lacks **sufficient user database activity** over the previous week and that “a few user requests to the database each day” are typically sufficient. citeturn22view0 The same page says a warning email is sent roughly one week before pausing and a second email is sent after pausing. citeturn22view0

The current restore window is **up to one year**, not 90 days:

> “You can restore a paused project for up to 1 year after it was paused.” citeturn22view0

That directly supersedes the older 2024 Supabase announcement that described a 90-day window. citeturn0search8

Automatic backups remain unavailable on Free. Supabase’s current backup page says:

> “We automatically back up all Pro, Team, and Enterprise Plan projects on a daily basis.” citeturn22view1

It then tells Free users to export with the CLI and maintain off-site backups. citeturn22view1 This confirms the correction in your newer PDFs and disproves any older AI-generated assertion that Free had managed daily backups. fileciteturn0file1 fileciteturn0file3

A database backup also does **not** back up Storage object bytes:

> “Database backups do not include objects you store via the Storage API…” citeturn22view1

The database contains Storage metadata, but deleted object bodies do not reappear merely because database metadata is restored. citeturn22view1

Free accounts can have two active free projects; paused projects do not count toward that active-project allowance according to Supabase billing documentation surfaced in this research. citeturn0search4 The current Free database quota is 0.5 GB per active project. citeturn0search7 Your measured 15 MB database therefore uses roughly 3% of that allowance; that 15 MB figure comes from your live-project audit rather than a vendor source. fileciteturn0file3

The direct Postgres endpoint is IPv6-oriented unless the IPv4 add-on is used; Supabase recommends the Supavisor session pooler for IPv4-only environments such as GitHub Actions and documents session mode on port 5432. citeturn1search0turn1search7 That supports the master plan’s session-pooler decision.

**Free-tier catch:** inactivity pausing, no managed Free backup, constrained resources, and no contractual Free-plan SLA for your application.

**Card/phone:** you already have the project; I did not independently establish a universal current Supabase signup phone/card policy, so new-account signup requirements are **UNVERIFIED**.

**Paid-only items relevant here:** automatic managed backup tiers, protection from Free-project auto-pause through a paid plan, IPv4 add-on, and PITR. Current Supabase documentation prices PITR separately on eligible paid projects; it is out under the $0 rule. citeturn22view1

**Strongest counterargument:** deliberately producing synthetic requests to defeat an inactivity optimization might be considered contrary to the spirit of a Free tier. The counter-evidence is Supabase’s own pause guide, which explicitly says a warning can be avoided by making API calls or sending requests through the connected application. citeturn22view0 I therefore retain the keep-alive recommendation, while avoiding high-frequency artificial traffic.

**Three failure scenarios.** First, Supabase changes its activity classifier and daily reads cease to count; detect this through warning email plus deep-health checks, and recover by resuming the project and reviewing the current pause documentation. Second, the project gets deleted after a prolonged unattended pause; recover from encrypted off-platform database and Storage exports. Third, a logical dump restores incompletely because Supabase-specific roles/extensions differ; detect that in the weekly restore drill and preserve a separate full-platform exit rehearsal.

**Residual risk:** a Free service can change or remove a feature without offering the continuity a paid SLA would buy.

### Vercel

**Recommendation:** keep Vercel Hobby while GeminiForge is personal/non-commercial, but make the SPA deployable to a second host with one command.

Vercel’s current fair-use documentation explicitly characterizes Hobby as for **“non-commercial personal use only.”** citeturn20view6 This is not merely a resource quota. If the project becomes paid work, supports paid consulting, carries advertising, or otherwise becomes financially commercial, Hobby can cease to fit even if resource use remains tiny. citeturn20view6

For functions under the current Fluid Compute model, Hobby documentation surfaced a 2 GB / 1 vCPU function environment and a maximum/default duration of 300 seconds. citeturn2search3turn2search12turn2search13 Older short-duration figures in prior research should therefore not be reused.

Current platform limits include 200 projects, 100 deployments per day, one concurrent build on Hobby, and a 45-minute maximum build duration. citeturn20view8 The current Hobby cron policy permits up to 100 cron jobs per project, but the **minimum frequency is once per day**, and daily execution has hour-level scheduling precision with up to 59 minutes of variation rather than minute-precision guarantees. citeturn20view7

That means the master plan’s “at most once per day” assertion is directionally correct, but incomplete: the important operational catch is the possible timing jitter.

Vercel also changed Hobby deployment retention on September 16, 2026: Hobby has a 10 GB deployment-storage allowance and protects only a small recent set of deployments once old deployments age out. citeturn2search0 Do not use Vercel deployment history as your source archive or disaster-recovery system.

**Free-tier catch:** non-commercial restriction, once-daily minimum cron frequency, resource quotas, deployment-retention changes.

**Card/phone:** current universal signup requirements were **UNVERIFIED** in primary documentation; you already have the account.

**Paid-only:** commercial Pro use and more capable scheduling/resource levels.

**Counterargument:** migrating away just to avoid Hobby policy risk adds work to a tiny project. I agree; do not migrate now. Rehearse a static-host exit instead.

**Failure scenarios:** Vercel suspends a project for policy interpretation; deploy the static SPA to Netlify/Cloudflare and move `/api` functions separately. Cron silently fails; Healthchecks catches the missing heartbeat. Old deployment needed for rollback has been purged; recover from Git tags/GitHub source, not Vercel history.

**Residual risk:** your existing invitation links contain `geminiforge-workbench.vercel.app`; without a purchased custom domain, changing hosts changes the durable application URL.

### GitHub Actions and repository hosting

**Recommendation:** keep the repository public and Actions-based CI, but assume every CI-produced file associated with the public repository may become visible and therefore never create a plaintext user-data artifact.

GitHub states that use of standard GitHub-hosted runners in public repositories is free; private repositories instead consume plan-included Actions usage. citeturn3search10 Default artifact/log retention is 90 days, and public-repository retention can be configured only within the public maximum. citeturn3search0turn21search1

GitHub also documents an important scheduled-workflow condition: scheduled workflows in public repositories may be automatically disabled after **60 days without repository activity**. citeturn3search1 This makes GitHub Actions a poor *sole* keep-alive scheduler for a mature, rarely modified public project.

The supplied master plan records that the public repository’s workflow artifacts should be treated as accessible to signed-in GitHub users and consequently prohibits unencrypted backup artifacts. fileciteturn0file1 I did not find sufficiently explicit current first-party text in this research to independently reproduce the exact UI access semantics for every public artifact, so that part remains **user-verified but independently UNVERIFIED**. The security conclusion does not change: public-repo CI is not a suitable plaintext backup store.

GitHub’s artifact ecosystem itself has changed: artifact action v3 was retired from GitHub.com on January 30, 2025, forcing migration to v4. citeturn21search10 That is a useful example of why workflow dependencies need periodic review.

**Free-tier catch:** public Actions are attractive because execution is free, but public repositories are intentionally public surfaces and long-idle scheduled jobs can stop.

**Card/phone:** no new account is needed for your current setup. Requirements for a new account were not separately verified.

**Paid-only/private difference:** private-repository Actions consume the account’s plan allowance rather than receiving the public-repository standard-runner treatment. Exact current private-minute/concurrency figures were not established strongly enough in this research to supersede the PDF, so those numbers are **UNVERIFIED** here.

**Counterargument:** putting encrypted backups in public artifacts still leaks ciphertext and metadata. Correct. Therefore public artifacts are only one copy; B2 should be the independent copy.

### Netlify

**Recommendation:** rehearse Netlify as a Vercel static-host/function fallback, but do not treat old “100 GB plus 300 build minutes” notes as current.

Netlify replaced its older quota model with a credit system in 2025. The current Free plan is advertised at $0 with 300 monthly credits and one concurrent build, and the Free plan hard-stops instead of automatically generating a paid overage. citeturn20view11turn4search8 That hard cap is actually desirable under your $0 rule.

The credit conversion changed again in April 2026, including changes to bandwidth/compute/request credit rates. citeturn4search3 Therefore any 2024-era free quota table in an attached PDF is stale. citeturn4search1

**Free-tier catch:** exhausting the account’s Free credits can pause all projects on that account until the next cycle. citeturn20view11

**Card:** older official Netlify material said Free signup did not require a card, but I did not verify a current 2026 signup page explicitly enough; current no-card signup is therefore **UNVERIFIED**.

**Phone:** **UNVERIFIED**.

**Paid-only:** larger credit pools, additional seats/concurrency and overage behavior.

Netlify is nevertheless an attractive exit because a Vite SPA is trivial to move and Node-style functions are closer to your existing `/api` implementation than a Worker runtime would be.

### Cloudflare Pages, Workers, R2 and D1

**Recommendation:** use Cloudflare Pages/Workers as a rehearsed frontend/API alternative, but do not make R2 the primary backup target until you personally prove activation requires no card.

Current Workers Free limits include 100,000 requests per day, 10 ms CPU per invocation, 128 MB memory, five cron triggers, a 3 MB Worker bundle and other documented limits. citeturn20view13 Pages documentation surfaced 500 builds/month, 20,000 files/site and 100 Pages projects/account. citeturn5search1turn5search10

R2 Standard includes 10 GB-month of storage free per month plus free-tier request allowances and free Internet egress. citeturn20view12 But the setup documentation describes activating an R2 subscription and completing checkout. citeturn11search12 I did not obtain a primary statement saying “no payment method required,” so it fails your stricter signup criterion until tested.

D1 remains SQLite-based rather than PostgreSQL. It is consequently a rewrite target, not a Supabase replacement. Its previous Free limits also changed significantly after 2023, which is another reason not to encode a D1 number in architecture assumptions without a fresh pre-migration check. citeturn5search12

**Card for R2:** **UNVERIFIED; treat as required-until-proven-otherwise for this project.**

**Phone:** **UNVERIFIED**.

**Paid-only:** usage beyond Free quotas.

### Neon

**Recommendation:** Neon is the strongest database *data-layer* exit candidate, but not a drop-in Supabase platform replacement.

On October 2, 2026, Neon announced a substantially expanded Free plan: current official material describes up to 100 free projects, 1 GB storage per project, 100 compute-unit hours per project/month, 10 branches and a six-hour restore window, alongside newer integrated services. citeturn20view14 Older research describing 10 projects or 0.5 GB is outdated. citeturn6search2

Official older signup material explicitly advertised no credit card requirement. citeturn6search12 I found no evidence in the current plan announcement that this had changed.

**Critical trade-off:** moving your PostgreSQL tables is relatively easy; reproducing Supabase Auth, PostgREST behavior, `auth.uid()`-based RLS, Realtime, Storage and Edge Functions is not. A naive database restore to Neon would leave much of GeminiForge nonfunctional.

**Free-tier catch:** compute sleeps/scales according to Neon’s model; not all Supabase platform features exist with equivalent semantics.

**Card:** primary material has advertised no card.

**Phone:** **UNVERIFIED**.

### Turso

Turso currently advertises a $0 plan and says users can start free without a credit card. citeturn20view15 It is built around SQLite/libSQL rather than PostgreSQL. That makes it a poor GeminiForge database exit despite its attractive quota envelope.

**Recommendation:** reject for the current application unless you are already undertaking a full persistence rewrite.

**Card:** no card according to current official pricing material. citeturn20view15

**Phone:** **UNVERIFIED**.

### Render

Render’s Free web services sleep after 15 minutes of inactivity, and its Free PostgreSQL databases are intentionally temporary: official documentation has described Free Postgres expiry after 30 days, followed by a deletion grace period. citeturn6search19turn6search4turn6search6

**Recommendation:** reject as a persistent database failover for GeminiForge.

The service is useful for experiments and restore drills, but a datastore designed to expire is not a disaster-recovery target.

### Fly.io

Fly is no longer a true “free forever” production fallback. Current official material describes a trial bounded by time/usage, after which payment setup is required to continue, and Fly has explicitly documented the disappearance of earlier Free Postgres allowances. citeturn20view16turn21search9 Fly documentation also says most organizations require a credit card. citeturn7search1

**Recommendation:** reject under the no-card/no-paid rule.

### Railway

Railway’s current Free plan is $0 and advertises a small monthly resource credit; a new account starts with a time-limited trial credit, and Railway says no card is required for the Free path. citeturn20view17turn8search0turn8search3 Free volumes and trial resources have retention/deletion caveats. citeturn8search1turn8search3

**Recommendation:** useful for tiny experiments, not a reliable full Supabase replacement. Its resource allowance is too small to design a high-confidence always-on recovery platform around.

### Backblaze B2

**Recommendation:** use B2 for the second encrypted backup copy.

Backblaze currently provides 10 GB of free B2 storage and says a billing method is not required merely to get started. citeturn11search9 That combination is unusually well matched to your hard requirements.

At the current 15 MB database size, an intentionally conservative uncompressed retention set of 14 daily copies + 8 weekly copies + 12 monthly copies would be about **510 MB** before Storage objects. This is a sizing calculation from your current database measurement, not a vendor limit. The actual SQL dumps should compress substantially, but design capacity without assuming a compression ratio.

**Card:** no billing method required to get started, per current Backblaze material. citeturn11search9

**Phone:** **UNVERIFIED**.

**Paid-only:** storage/transactions beyond the Free allowance.

### Real risk ranking for your current stack

The greatest loss-of-service/data risks are:

| Layer | Risk | Reason |
|---|---|---|
| Supabase data | **High** | No managed Free backup; inactivity pause; heavy application coupling. citeturn22view0turn22view1 |
| Gmail sender account | **High** | One consumer account is both identity and mail relay; rate/abuse controls are not a transactional-mail SLA. citeturn20view18turn20view19 |
| Supabase Storage objects | **High until exported** | DB dump does not contain object bytes. citeturn22view1 |
| GitHub scheduled operations | **Medium-high** | Public-repo schedules can disable after prolonged inactivity. citeturn3search1 |
| Vercel Hobby policy | **Medium-high** | Explicitly non-commercial. citeturn20view6 |
| Vercel deployment history | **Medium** | Hobby deployment retention/storage changed in 2026. citeturn2search0 |
| GitHub source | **Low-medium** | Easy to mirror/export; still protect root account and recovery. |
| Static frontend | **Low** | Vite output can move quickly to Netlify/Pages. |
| CI tests | **Low** | GitHub Actions workflow logic is portable to local runners/other CI if necessary. |

**E2 — Exit plan**

The uncomfortable but important finding is that **there is no credible $0/no-card hot standby for the entire Supabase platform**. Your exit strategy should therefore optimize for **recoverability**, not pretend there is a transparent failover.

| Layer | Primary today | $0 fallback | Migration | Breakage | Effort |
|---|---|---|---|---|---|
| Static SPA | Vercel | Netlify or Cloudflare Pages | Build `dist/`, deploy | hostname changes; old invite URLs break | S |
| `/api` Node functions | Vercel | Netlify Functions first; Workers second | adapt handlers/env | SMTP/socket/runtime differences | M |
| PostgreSQL | Supabase | Neon | restore tables/data, extensions, privileges | Supabase-specific roles/functions need work | M for DB, L for app |
| RLS | Supabase | PostgreSQL RLS on Neon | replace Supabase Auth JWT assumptions | `auth.uid()` unavailable as-is | L |
| Auth | Supabase Auth | application Auth layer on Neon/other | export users where supported, reset/re-enrol credentials | session/JWT semantics change | L |
| PostgREST/Data API | Supabase | standalone API/PostgREST-compatible layer | provision/configure | API URLs and JWT claims change | L |
| Realtime | Supabase | polling initially | replace subscriptions | no instant updates | M |
| Storage | Supabase Storage | Backblaze B2 | export objects + manifest | URLs/API/RLS semantics change | M |
| Edge Function MCP | Supabase Edge | Vercel/Netlify/Workers | port Deno handler | runtime/env/log semantics | M |
| Cron | Vercel + GH | Healthchecks-triggered external scheduler/GH | move HTTP job | scheduler semantics | S |
| CI | GitHub Actions | local `act`/shell or other free CI | preserve scripts | platform YAML changes | M |

**Top database+auth candidates**

**Neon** is first because your actual data remains PostgreSQL and the Free plan is strong. citeturn20view14 The cost is rebuilding Supabase platform glue.

**A second Supabase Free project** is operationally the fastest recovery location and may fit within the two-active-project allowance, but it is not a vendor exit and therefore does not protect against a Supabase-wide policy or account problem. citeturn0search4 It is best thought of as a migration rehearsal target.

**Turso/Cloudflare D1 with custom auth** rank third only as full-rewrite options; both sacrifice native PostgreSQL compatibility. Turso is at least explicitly no-card and Free. citeturn20view15

I would **not** choose Render Free because the database expires, Fly because the lasting free tier is gone, or Railway as a primary recovery database because the perpetual resource budget is too constrained for a platform replacement. citeturn6search19turn21search9turn20view17

**Rehearsable exit drill**

Every quarter:

1. Produce the normal logical Supabase dump and Storage-object manifest.
2. Restore database-only objects into a clean PostgreSQL 17 instance and run row-count/checksum tests.
3. Restore a selected subset into a fresh Supabase project when the two-project allowance makes that practical.
4. Deploy the Vite `dist/` build to the alternate static host.
5. Configure a temporary `.env` for the recovery backend without committing secrets.
6. Run Playwright against the recovery URL.
7. Prove organization/project/document reads, a write, Auth, RLS separation, invitation lookup and an MCP read.
8. Delete the temporary target.

The drill is considered successful only if a document created immediately before the test can be read from the recovery deployment and unauthorized access tests still fail.

**Counterargument:** keeping a second Supabase project around solely for DR could itself consume your limited project allowance and require keep-alive. Correct. Do **not** maintain it as a permanent hot standby. Create a temporary recovery project only for a scheduled drill when practical.

**E6 — GitHub Actions and Vercel operational limits**

The verified operationally important facts are:

Vercel Hobby cron’s minimum interval is daily and can have up to 59 minutes of scheduling variation. citeturn20view7 Therefore never set a 24-hour healthcheck grace period so tight that normal Vercel jitter generates incidents.

Vercel currently supports up to 100 Hobby cron jobs/project, far more than you need. citeturn20view7 Use **one** keep-alive cron rather than creating many jobs.

Current Vercel platform documentation lists 100 deployments/day and one concurrent Hobby build. citeturn20view8 Your solo project is nowhere near these quotas.

GitHub public repositories receive free standard hosted-runner usage, while private repository use falls under plan allowances. citeturn3search10 A public-repo schedule can disable after 60 days of repository inactivity. citeturn3search1 Artifact/log retention defaults to 90 days. citeturn3search0 Cache behavior differs from artifact retention; current GitHub material describes a repository cache quota and automatic cache eviction rather than treating cache as permanent storage. citeturn3search0

**UNVERIFIED current exacts:** I did not obtain sufficiently strong current first-party evidence in this run for every requested GitHub concurrency ceiling, the exact private-Free monthly minute quota after all 2026 changes, every Vercel environment-variable byte/count limit, or the exact current Hobby runtime-log lookback. Do not copy those PDF numbers into an SRE runbook until you verify the corresponding live vendor limit page.

**Playwright optimization recommendation:** shard only after runtime demands it. For a solo project, cache browser binaries only if measured savings outweigh cache churn; run Chromium on normal pushes, cross-browser smoke tests nightly or before release, and retain traces/screenshots only on failure. This minimizes both Actions execution and artifact storage without sacrificing useful failure evidence.

**E7 — Solo-owner operational model**

Self-imposed service targets should be deliberately weaker than paid commercial SLAs:

| Objective | Owner target |
|---|---|
| Frontend availability | 99.0% monthly, best effort |
| Deep health: frontend + API + database | 98.5% monthly |
| Database RPO | ≤24 hours |
| Storage-object RPO | ≤24 hours once exporter is implemented |
| Routine application recovery | ≤1 day |
| Detection of missing daily automation | ≤30 hours |
| Backup restore test | weekly automated logical restore |
| End-to-end encrypted recovery test | monthly offline |
| Complete platform exit rehearsal | quarterly |

These are **design targets**, not vendor guarantees.

**Weekly:** inspect backup/restore heartbeats; investigate every missing job; scan Gmail for DSNs/bounces; confirm the deep-health monitor; review dependency/security alerts; check the newest B2 backup timestamp; send one test invitation if mail code changed.

**Monthly:** download a random encrypted off-site backup and decrypt it using the offline identity; run row counts; review Supabase/Vercel/GitHub usage dashboards; check vendor pricing/limits/changelogs; test Google account recovery; confirm the age private key still exists in two offline physical copies; review pending/expired invitations and PII cleanup.

**Two-week absence automation:** Vercel and GitHub keep-alives, Healthchecks dead-man alerts, UptimeRobot external health, nightly dump/encrypt/upload, weekly same-run restore test, Storage export, and immediate email-send error logging must all run without the owner opening a dashboard.

The owner should never be required to “remember to visit Supabase once a week.” That is exactly the kind of human dependency SRE automation should eliminate.

## Supabase survival: keep-alive, backups, monitoring, and CI/Vercel operations

**E3 — Pause and keep-alive**

**Single recommendation:** perform a harmless database read once per day from Vercel and separately once per day from GitHub Actions, at different times, while Healthchecks monitors both.

Do **not** rely on `pg_cron` as your keep-alive. Supabase’s current criterion is “user database activity,” and it specifically describes API calls or requests through a connected application as ways of producing activity. citeturn22view0 It does **not** document internal `pg_cron` executions as a guaranteed qualifying signal.

The following classifications are therefore the defensible ones:

| Activity | Counts toward pause prevention? |
|---|---|
| PostgREST query that reaches PostgreSQL | **Best-supported yes**; directly fits “user database activity/API calls.” citeturn22view0 |
| Direct database query | Likely, but exact classifier details are not documented; **UNVERIFIED** |
| Auth-only health request with no DB work | **UNVERIFIED** |
| Edge Function invocation that does not touch DB | **UNVERIFIED** |
| `pg_cron` internal query | **UNVERIFIED; do not rely on it** |
| Dashboard visit | Explicitly documented as activity after a warning. citeturn22view0 |

### Keep-alive table

**Untested — migration**

```sql
-- supabase/migrations/YYYYMMDD_ops_keepalive.sql
-- Deliberately contains no user data.

create table if not exists public.ops_keepalive (
  id smallint primary key,
  marker text not null default 'ok',
  constraint ops_keepalive_singleton check (id = 1)
);

insert into public.ops_keepalive (id, marker)
values (1, 'ok')
on conflict (id) do nothing;

alter table public.ops_keepalive enable row level security;

revoke all on public.ops_keepalive from public;
revoke all on public.ops_keepalive from anon, authenticated;

grant select on public.ops_keepalive to anon, authenticated;

create policy "keepalive row is readable"
on public.ops_keepalive
for select
to anon, authenticated
using (id = 1);
```

This table deliberately allows a public read of one meaningless row. That avoids putting a service-role secret into either keep-alive producer.

**Test:** with only the project URL and publishable/anon key, `GET /rest/v1/ops_keepalive?id=eq.1&select=id` must return exactly `[{"id":1}]`; requesting other rows returns none; inserts/updates/deletes must fail.

### GitHub keep-alive

**Untested — `.github/workflows/keepalive.yml`**

```yaml
name: Supabase keepalive

on:
  schedule:
    # Design choice: different time from Vercel.
    - cron: "41 15 * * *"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: supabase-keepalive
  cancel-in-progress: false

jobs:
  ping:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Query the keepalive row
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
        run: |
          set -euo pipefail

          body="$(
            curl \
              --fail \
              --silent \
              --show-error \
              --retry 3 \
              --retry-all-errors \
              --max-time 20 \
              "${SUPABASE_URL}/rest/v1/ops_keepalive?id=eq.1&select=id" \
              -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
              -H "Authorization: Bearer ${SUPABASE_PUBLISHABLE_KEY}"
          )"

          test "$body" = '[{"id":1}]'

      - name: Tell Healthchecks the job succeeded
        if: success()
        env:
          HEALTHCHECKS_URL: ${{ secrets.HEALTHCHECKS_KEEPALIVE_GH_URL }}
        run: curl --fail --silent --show-error --max-time 20 "$HEALTHCHECKS_URL"
```

**Test:** use `workflow_dispatch`; temporarily change the table name to a nonexistent table and prove the workflow fails and the dead-man monitor eventually alerts.

### Vercel keep-alive endpoint

**Untested — `/api/ops-keepalive.ts`**

```ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false });
    return;
  }

  const baseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!baseUrl || !key) {
    res.status(500).json({ ok: false });
    return;
  }

  try {
    const response = await fetch(
      `${baseUrl}/rest/v1/ops_keepalive?id=eq.1&select=id`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      res.status(503).json({ ok: false });
      return;
    }

    const data: unknown = await response.json();

    if (
      !Array.isArray(data) ||
      data.length !== 1 ||
      typeof data[0] !== "object" ||
      data[0] === null ||
      (data[0] as { id?: unknown }).id !== 1
    ) {
      res.status(503).json({ ok: false });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
}
```

**Untested — `vercel.json` addition**

```json
{
  "crons": [
    {
      "path": "/api/ops-keepalive",
      "schedule": "17 3 * * *"
    }
  ]
}
```

Current Hobby permits daily scheduling but not more frequent schedules and may vary execution within the hour. citeturn20view7

**Test:** deploy, use the Vercel dashboard to observe a successful invocation, and verify the database endpoint receives the read. Then deliberately return 503 for one scheduled run and prove your monitoring detects it.

**Counterargument:** both requests eventually depend on Supabase itself, so “two sources” do not create service redundancy. Correct. They create **scheduler redundancy**, which is what the keep-alive problem needs. Uptime monitoring separately detects a Supabase outage.

**Failure scenarios**

1. **GitHub disables the schedule after prolonged repository inactivity.** Detection: missing Healthchecks heartbeat. Recovery: re-enable schedule; Vercel continues the daily read. GitHub explicitly documents the inactivity-disable behavior. citeturn3search1
2. **Vercel cron is delayed.** Detection: do not alert until a generous post-daily grace period; the documented schedule may vary by as much as 59 minutes. citeturn20view7
3. **Supabase changes what counts as activity.** Detection: pause-warning email despite green pings. Recovery: immediately create genuine dashboard/application DB activity, resume if necessary, and revisit the current pause guide.
4. **Publishable key rotates.** Detection: both pings return 401/403. Recovery: update the GitHub/Vercel configuration; no user data is exposed by the keep-alive table.
5. **Supabase project is actually paused.** Deep-health endpoint fails; owner receives Supabase confirmation email; resume from Dashboard. Current documentation says it can be resumed within the one-year window. citeturn22view0

**Residual risk:** Supabase deliberately keeps the classifier qualitative; “a few user requests each day” is guidance, not a contractual threshold. citeturn22view0

**E4 — Backups with a public repository**

**Single recommendation:** create a three-part backup set every night—roles, schema and data—restore-test a fresh dump before encrypting it, encrypt the combined archive with `age`, upload encrypted ciphertext as a short-lived GitHub artifact, and copy encrypted ciphertext to B2. Export Storage objects independently.

Supabase’s documented restore workflow uses separate role/schema/data dumps. Official examples include:

```text
supabase db dump ... --role-only
supabase db dump ...
supabase db dump ... --use-copy --data-only
```

and recommend the session pooler where IPv4 connectivity is required. citeturn20view4turn20view3

The session-pooler connection format documented by Supabase is of the form:

```text
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres
```

with the exact region/host copied from the live project’s Connect dialog. citeturn1search6 **Do not hand-construct the hostname from an assumed AWS region.**

### Why `age` is the right encryption choice

`age` is specifically designed around recipient public keys and private identities; the encryption side needs only the public recipient while decryption needs the private identity. citeturn12search0turn12search4turn12search6

That fits your threat model perfectly:

- Repository: may contain the **public `age` recipient**.
- GitHub Actions: needs no decryption secret.
- B2: sees ciphertext only.
- Owner: keeps the **private identity offline**.

I prefer it to GPG because there is no keyring/trust-db complexity for this one-recipient automation. I prefer it to password-based OpenSSL because symmetric encryption would force CI to hold the same secret capable of decrypting every backup.

### Important correction: automated restore versus offline private key

Your hard rule says **CI should hold only the public key**. That means CI cannot download yesterday’s encrypted backup and decrypt it for a weekly restore without violating that rule.

So split the tests:

**Automated weekly restore drill:** make a fresh logical dump and restore *that plaintext dump within the same ephemeral CI job*, before encryption/upload.

**Monthly end-to-end recovery drill:** the owner downloads an encrypted object from B2, decrypts it offline, and restores/checks it locally.

This gives you both guarantees without putting the decryption key in GitHub.

### Backup workflow

**Untested — `.github/workflows/backup.yml`**

```yaml
name: Encrypted database backup

on:
  schedule:
    - cron: "23 1 * * *"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: production-backup
  cancel-in-progress: false

jobs:
  backup:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      restore_db:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: restore-test
          POSTGRES_USER: postgres
          POSTGRES_DB: restore_test
        ports:
          - 55432:5432
        options: >-
          --health-cmd "pg_isready -U postgres -d restore_test"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 20

    env:
      SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
      AGE_RECIPIENT: ${{ vars.BACKUP_AGE_RECIPIENT }}

    steps:
      - uses: actions/checkout@v4

      - name: Install age
        run: |
          set -euo pipefail
          sudo apt-get update
          sudo apt-get install -y age

      - name: Install Supabase CLI
        run: |
          set -euo pipefail
          npm install --global supabase

      - name: Create logical dumps
        run: |
          set -euo pipefail
          mkdir -p backup

          supabase db dump \
            --db-url "$SUPABASE_DB_URL" \
            -f backup/roles.sql \
            --role-only

          supabase db dump \
            --db-url "$SUPABASE_DB_URL" \
            -f backup/schema.sql

          supabase db dump \
            --db-url "$SUPABASE_DB_URL" \
            -f backup/data.sql \
            --use-copy \
            --data-only

          test -s backup/schema.sql
          test -s backup/data.sql

          bytes="$(wc -c < backup/data.sql)"
          test "$bytes" -gt 1000

      - name: Record integrity manifest
        run: |
          set -euo pipefail
          (
            cd backup
            sha256sum roles.sql schema.sql data.sql > SHA256SUMS
            wc -c roles.sql schema.sql data.sql > SIZES.txt
            date -u +"%Y-%m-%dT%H:%M:%SZ" > CREATED_UTC.txt
          )

      # This verifies today's dump before encryption.
      # A vanilla PostgreSQL restore does NOT prove every hosted-Supabase
      # platform component can be recreated; see the report.
      - name: Weekly logical restore smoke test
        if: github.event_name == 'workflow_dispatch' || github.event.schedule == '23 1 * * 0'
        env:
          PGPASSWORD: restore-test
        run: |
          set -euo pipefail

          # Roles may contain Supabase-specific roles that vanilla PostgreSQL
          # cannot reproduce exactly, so first prove schema/data separately.
          psql \
            --host 127.0.0.1 \
            --port 55432 \
            --username postgres \
            --dbname restore_test \
            --set ON_ERROR_STOP=1 \
            --file backup/schema.sql

          psql \
            --host 127.0.0.1 \
            --port 55432 \
            --username postgres \
            --dbname restore_test \
            --set ON_ERROR_STOP=1 \
            --file backup/data.sql

          psql \
            --host 127.0.0.1 \
            --port 55432 \
            --username postgres \
            --dbname restore_test \
            --set ON_ERROR_STOP=1 \
            --command "select count(*) from public.projects;" \
            > restore-count.txt

          grep -Eq '[0-9]+' restore-count.txt

      - name: Archive
        run: |
          set -euo pipefail
          stamp="$(date -u +%Y%m%dT%H%M%SZ)"
          archive="geminiforge-db-${stamp}.tar.gz"
          tar -C backup -czf "$archive" .
          echo "BACKUP_ARCHIVE=$archive" >> "$GITHUB_ENV"

      - name: Encrypt
        run: |
          set -euo pipefail
          age \
            --recipient "$AGE_RECIPIENT" \
            --output "${BACKUP_ARCHIVE}.age" \
            "$BACKUP_ARCHIVE"

          test -s "${BACKUP_ARCHIVE}.age"

          # Remove plaintext before any upload step.
          rm -rf backup "$BACKUP_ARCHIVE"

      - name: Upload encrypted short-retention copy
        uses: actions/upload-artifact@v4
        with:
          name: encrypted-database-backup
          path: ${{ env.BACKUP_ARCHIVE }}.age
          retention-days: 14
          if-no-files-found: error

      - name: Upload encrypted B2 copy
        env:
          RCLONE_CONFIG_B2_TYPE: b2
          RCLONE_CONFIG_B2_ACCOUNT: ${{ secrets.B2_KEY_ID }}
          RCLONE_CONFIG_B2_KEY: ${{ secrets.B2_APPLICATION_KEY }}
          B2_BUCKET: ${{ secrets.B2_BUCKET }}
        run: |
          set -euo pipefail

          sudo -v
          curl https://rclone.org/install.sh | sudo bash

          rclone copy \
            "${BACKUP_ARCHIVE}.age" \
            "b2:${B2_BUCKET}/database/" \
            --checkers 2 \
            --transfers 1

      - name: Notify backup heartbeat
        if: success()
        env:
          HEALTHCHECKS_URL: ${{ secrets.HEALTHCHECKS_BACKUP_URL }}
        run: curl --fail --silent --show-error "$HEALTHCHECKS_URL"
```

This is explicitly **untested**. The Supabase CLI also requires Docker for some database commands in its supported workflow, and GitHub’s runner currently provides Docker; nevertheless, validate the exact CLI install invocation in a branch before enabling the schedule. Supabase’s own docs should remain the source of truth for current dump syntax. citeturn20view4

### Stronger restore assertions

A mere `psql` exit status is not enough. Add an application-owned manifest query before the dump:

```sql
select 'organizations', count(*) from public.organizations
union all
select 'projects', count(*) from public.projects
union all
select 'docs', count(*) from public.docs
union all
select 'doc_revisions', count(*) from public.doc_revisions;
```

After restore, compare exact counts. For selected immutable rows such as revision bodies, compute application-level hashes and compare them too.

Do not publish those counts as a separate public artifact; put them inside the encrypted archive or keep the ephemeral comparison only in job output if the values themselves are non-sensitive.

### What the logical dump must prove

A Supabase backup needs more than `public` application rows. Your database includes Auth users, Storage metadata, extensions, RLS policies, functions and Vault usage. fileciteturn0file3 Supabase’s CLI intentionally performs Supabase-specific filtering instead of acting as an unmodified `pg_dump`. citeturn20view4

**Exact treatment of every hosted `auth`, `storage` and `vault` object under the current CLI filters is not sufficiently established by the primary material I retrieved; therefore it is UNVERIFIED.** Do not “solve” that uncertainty by guessing schema flags. Instead:

```bash
grep -E '^(CREATE|COPY|INSERT).* (auth|storage|vault)\.' \
  backup/schema.sql backup/data.sql
```

and inspect the restore result during the first drill.

Storage object bodies are unquestionably separate from the DB backup. citeturn22view1

### Storage backup

The minimum acceptable Storage backup has:

- object bucket;
- object path;
- byte size;
- content hash calculated after download;
- last-modified timestamp if available;
- encrypted object copy or an encrypted tar archive;
- manifest cross-check against `storage.objects`.

A generic exporter should recursively list each bucket, download each object, hash it and then encrypt before upload.

**UNTESTED implementation sketch:**

```ts
// scripts/export-storage.ts
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

const root = process.argv[2] ?? "storage-export";
await mkdir(root, { recursive: true });

const { data: buckets, error: bucketError } =
  await supabase.storage.listBuckets();

if (bucketError) throw bucketError;

const manifest: Array<{
  bucket: string;
  path: string;
  bytes: number;
  sha256: string;
}> = [];

async function walk(bucket: string, prefix = ""): Promise<void> {
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) throw error;
    if (!data?.length) break;

    for (const item of data) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;

      // Supabase list responses can represent folders differently;
      // verify this logic against your buckets before production use.
      if (!item.id) {
        await walk(bucket, objectPath);
        continue;
      }

      const { data: blob, error: downloadError } =
        await supabase.storage.from(bucket).download(objectPath);

      if (downloadError) throw downloadError;

      const bytes = Buffer.from(await blob.arrayBuffer());
      const sha256 = createHash("sha256").update(bytes).digest("hex");

      const output = path.join(root, bucket, objectPath);
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, bytes);

      manifest.push({
        bucket,
        path: objectPath,
        bytes: bytes.length,
        sha256,
      });
    }

    if (data.length < limit) break;
    offset += limit;
  }
}

for (const bucket of buckets ?? []) {
  await walk(bucket.name);
}

await writeFile(
  path.join(root, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
```

**Test:** upload three known test files including a nested path, zero-byte file if supported, and a binary image; export; delete local originals; restore to a temporary bucket; compare every SHA-256 hash.

The directory must be encrypted before becoming a GitHub artifact or B2 object.

### Retention

My recommended policy for this tiny database is a **policy choice**, not a vendor default:

- encrypted GitHub artifacts: 14 days;
- B2 daily: 14 days;
- B2 weekly: 8 copies;
- B2 monthly: 12 copies.

At today’s 15 MB raw DB size that is roughly 510 MB before compression and Storage, leaving a very large margin under B2’s currently documented 10 GB free allowance. citeturn11search9

Delete old ciphertext only after the newest backup and restore check succeed.

### Settings backup

A database dump does not preserve every control-plane setting. Once per month export a **redacted configuration inventory**, not secret values:

```text
Vercel
  project name
  production branch
  configured env-variable NAMES
  cron paths/schedules
  framework/build commands

Supabase
  project ref/region
  Auth settings
  redirect URLs
  SMTP host/port/sender name/address
  enabled extensions
  Edge Function names
  Storage bucket names/policies
  API/Data API settings

GitHub
  branch/rulesets
  Actions permissions
  secret NAMES
  Dependabot settings
  workflow inventory
```

Never export actual Gmail app passwords, Supabase secret keys, B2 application keys or `age` identities into this file.

### Backup failure scenarios

**Empty/truncated dump.** Detect `test -s`, minimum byte threshold, expected table names and row-count manifest. Do not emit the Healthchecks success ping.

**Database backup succeeds but Storage export fails.** Treat the whole nightly backup as degraded; alert; do not call it a complete recovery point.

**GitHub succeeds but B2 fails.** Keep the encrypted short-term artifact, alert, and retry B2 next run. Do not silently report overall success.

**B2 credentials compromised.** Attacker can potentially delete ciphertext. Restrict the B2 application key to the backup bucket where possible and preserve GitHub copies plus offline occasional downloads.

**`age` private identity is lost.** Every backup becomes useless. Keep two offline copies in physically separate locations; test decryption monthly.

**Private identity is stolen.** Existing ciphertext becomes readable to the thief. Generate a new recipient for future backups after incident containment; old copies remain exposed and should be replaced where possible.

**Restore succeeds into PostgreSQL but Auth/Realtime behavior is broken.** That is why quarterly full-platform exit drills are distinct from the weekly logical SQL restore.

**Strongest counterargument:** B2 becomes another cloud dependency with credentials in GitHub. Correct. It is nevertheless better than having the only backup in the same GitHub account that executes the backup. Encryption keeps B2 from seeing plaintext.

**Residual risk:** true consistency between database and Storage is not atomic; a file may change between database dump and Storage export. For a few-user documentation workspace this is acceptable if manifests/timestamps identify the window.

**Lessons from real failures:** Atlassian’s 2022 incident is especially relevant. A maintenance script deleted hundreds of customer sites and restoration required substantial manual recovery; some early restoration attempts produced inconsistent points before procedures were corrected. citeturn21search0 The lesson is not merely “have a backup”; it is “prove the restore procedure and validation before the disaster.”

**E5 — Monitoring and alerting**

**Single recommendation:** keep monitoring deliberately small:

- **UptimeRobot:** external HTTP availability.
- **Healthchecks.io:** dead-man switch for backup, restore drill and both keep-alives.
- **Your own small operations table:** application-level events and last-success timestamps.
- **Gmail mobile push:** primary owner notification channel.
- Optional second phone channel only after you personally verify the signup/privacy behavior of Telegram or ntfy; I do not rely on an unverified channel in the baseline.

UptimeRobot currently advertises a Free tier with 50 monitors and five-minute monitoring intervals, with no card needed for the Free signup path. citeturn8search8

Healthchecks.io’s Hobby tier supports 20 checks and explicitly advertises no credit card requirement. citeturn10search1turn10search15 That is enough to monitor every scheduled operation in this project.

Better Stack is a credible alternative, but its Free tier currently has fewer uptime/heartbeat monitors and three-minute checking; phone/SMS responder functionality is not part of the zero-cost path. citeturn9search0turn9search1turn9search3 I would not add it unless you prefer its interface.

Sentry has a free developer offering and has changed its included telemetry allowances over time; current public materials surfaced free log allocation and 30-day lookback information, but I did not retrieve a sufficiently complete 2026 first-party pricing table to restate every error/event quota. citeturn10search2turn10search16turn10search18 **Sentry’s exact Free event allowance is UNVERIFIED here.** For this project, a small first-party error table plus Vercel/Supabase logs is simpler.

### Minimal monitoring specification

| Check | Method | Interval/threshold | Failure action |
|---|---|---|---|
| SPA reachable | UptimeRobot `GET /` | 5 min | email alert |
| Deep API+DB | UptimeRobot `GET /api/health/deep` | 5 min | email alert |
| Vercel keep-alive | Healthchecks heartbeat | daily + generous grace | alert |
| GitHub keep-alive | Healthchecks heartbeat | daily + generous grace | alert |
| DB backup | Healthchecks | every 24h; warn after ~30h | alert |
| Weekly restore | Healthchecks | every 7d + half-day grace | alert |
| Storage backup | own heartbeat | every 24h | alert |
| DB usage | scheduled SQL/dashboard check | warning 70%, critical 85% of quota | owner review |
| Storage/egress | dashboard review | warning 70%, critical 85% | owner review |
| SMTP send error | application log | any failure | immediate owner email/UI alert |
| Auth SMTP smoke | synthetic reset to owner test account | monthly | owner alert |
| Last keepalive age | own ops endpoint | >30h | owner alert |
| TLS/certificate | external HTTPS monitor | every 5 min | owner alert |

The 70/85% warning levels are **design choices**, not vendor limits.

### Deep health endpoint

**Untested**

```ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    res.status(503).json({ ok: false });
    return;
  }

  try {
    const upstream = await fetch(
      `${url}/rest/v1/ops_keepalive?id=eq.1&select=id`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    const ok = upstream.ok && (await upstream.text()) === '[{"id":1}]';

    res.setHeader("Cache-Control", "no-store");
    res.status(ok ? 200 : 503).json({ ok });
  } catch {
    res.status(503).json({ ok: false });
  }
}
```

Do not make a “health” endpoint that returns 200 merely because the Vercel function runtime started. The point is to prove the database path.

**Failure scenarios:** monitor vendor outage; detect by absence of expected monitor alerts during a forced test, so test alerts monthly. Gmail account itself unavailable; keep Healthchecks/UptimeRobot dashboard URLs in the owner runbook and configure a second recovery mailbox where supported. Deep health gives false green due caching; send `Cache-Control: no-store` and make monitor bypass caches. Error-table growth fills DB; retain only bounded operational data and aggregate old events.

**Residual risk:** a single owner can miss an email even when automation correctly emits it. Monthly “alert reaches my phone” drills are mandatory.

## Email transport, scanners, rendering, deliverability, and invitation workflow

**F1 — Email provider matrix and recommendation**

### Primary sender

**Use the owner’s dedicated Gmail account through Gmail SMTP with an app password for both:**

1. `/api/invite` on Vercel; and
2. Supabase Auth custom SMTP.

Google continues to document app passwords in 2026. Its help page describes an app password as a 16-digit passcode and requires 2-Step Verification. citeturn20view19 Google also lists conditions where app passwords are unavailable, including some organization/Advanced Protection configurations. citeturn20view19 Changing the Google Account password revokes existing app passwords, which is operationally important. citeturn20view19

### The Gmail quota correction

Google’s current consumer Gmail help states that sending may be stopped after sending more than 500 emails in a day or addressing more than 500 recipients in a single email. citeturn20view18 It also says a sending block can last roughly one to 24 hours, and excessive invalid-recipient/bounce behavior can trigger temporary blocking. citeturn20view18

However, I did **not** find current first-party Google documentation proving that the exact Gmail SMTP/mail-client limit for a free consumer account is 500/day. Other Google-community material reports lower mail-client/SMTP thresholds. Because that evidence is not authoritative enough for your rule, the SMTP-specific daily ceiling is:

**UNVERIFIED. Do not put “500 SMTP messages/day” in the runbook.**

Your own limit of 10/day per organization makes the ambiguity operationally irrelevant.

### Supabase Auth custom SMTP

Supabase’s default sender is explicitly intended only for trying Auth: current docs say the built-in service is best-effort, restricted to authorized team addresses and limited to two messages per hour. citeturn22view3turn1search3

With custom SMTP, Supabase currently starts with a low default mail rate of around 30 messages/hour, adjustable through Auth rate-limit settings. citeturn1search3turn1search4 That is far more than your genuine workload needs.

**Exact intended configuration — untested**

```text
SMTP host:        smtp.gmail.com
SMTP port:        465
Encryption:       implicit TLS / SSL
SMTP username:    <dedicated-owner@gmail.com>
SMTP password:    <Google app password>
Sender email:     <same dedicated-owner@gmail.com>
Sender name:      GeminiForge
```

**Evidence caveat:** the Gmail app-password mechanism is primary-source verified. citeturn20view19 In this research run I did **not** obtain a current first-party Google help page explicitly listing `smtp.gmail.com:465`, despite this being the longstanding Gmail SMTP configuration. Therefore the host/port pair itself is **UNVERIFIED from a current primary Google source** and must be proven by your smoke test before production.

The Supabase SMTP form expects sender address, sender name, host, port, username and password. citeturn22view3

**Supabase Edge distinction:** Auth’s SMTP subsystem is a Supabase platform service; it is not your Edge Function opening an SMTP socket. Therefore the Edge Function restriction on outbound ports 25/587 does not imply that Supabase Auth custom SMTP cannot use an SMTP provider. Supabase documents custom SMTP as a supported Auth feature. citeturn22view3turn22view2

**Port 465:** Supabase’s Edge Function limit page lists only ports 25 and 587 as prohibited. citeturn22view2 It does not say 465 is blocked. The correct statement is **“465 is not documented as blocked,” not “465 is guaranteed to work.”**

### Fallback

For **invitation mail**, the operational fallback should be your existing **copy-link + `mailto:`** path.

For **Supabase Auth reset mail**, there is no equally clean mail-free fallback. Maintain an owner recovery procedure: manually verify the affected user and use the server-side admin flow appropriate to the account rather than weakening signup/reset security.

I do **not** recommend a third-party SMTP provider as an automatic Gmail fallback while `From:` remains a `gmail.com` address. DMARC alignment is the problem.

### DMARC consequence

DMARC evaluates whether an authenticated SPF or DKIM identity aligns with the visible RFC5322 `From` domain. Sending `From: owner@gmail.com` through Gmail’s own infrastructure gives Gmail the ability to authenticate that Gmail identity. Sending the same header through an unrelated SMTP provider normally gives that provider control over its own envelope/DKIM domains, not `gmail.com`.

Therefore a generic ESP transmitting `From: owner@gmail.com` risks losing DMARC alignment unless it rewrites the visible sender or has a special mechanism it is authorized to use. That is why modern ESPs strongly prefer a domain the customer can verify and authenticate.

**Test rather than assume:** after the first real Gmail SMTP invitation, open Gmail’s “Show original” / equivalent source viewer and record:

```text
spf=pass
dkim=pass
dmarc=pass
header.from=gmail.com
header.d=<expected signing domain>
```

The exact observed authentication headers are a required acceptance criterion.

### Provider matrix

“Phone” is marked **UNVERIFIED** wherever the provider does not publish a deterministic no-phone signup guarantee; anti-abuse systems can make phone prompts conditional.

| Provider | Current free path found | Domain required for sensible production use? | Card | Phone | Sender verification / freemail fit | Verdict |
|---|---|---|---|---|---|---|
| **Gmail SMTP** | Consumer Gmail; Google general send controls apply. citeturn20view18 | No | Existing account; signup card not required as a paid service | Conditional/UNVERIFIED | App password requires 2SV. citeturn20view19 Best alignment for `@gmail.com` | **Primary** |
| **Gmail API** | API quotas; Google changed quota/billing model in 2026. citeturn13search2 | No | Billing uncertainty above free quota | UNVERIFIED | OAuth sender identity | Reject: needless OAuth complexity |
| **Apps Script** | Free consumer quotas exist | No | No paid plan needed for small scripts | UNVERIFIED | Sends as Google identity | Possible fallback, but current exact daily quota **UNVERIFIED** |
| **Outlook.com SMTP** | Consumer service exists | No | UNVERIFIED | UNVERIFIED | Could work only as a separate Outlook identity | **UNVERIFIED** current SMTP/app-password rules |
| **Brevo** | Free `$0`, currently advertises 300/day. citeturn15search0turn15search3 | Domain strongly preferable | UNVERIFIED | UNVERIFIED | Freemail From alignment poor through unrelated ESP | Reject for Gmail From |
| **Mailjet** | Free tier currently 200/day, 6,000/month; official signup material says no card. citeturn15search16 | Prefer verified domain | No card per source | UNVERIFIED | Freemail From problematic | Reject |
| **MailerSend** | Free path after trial; current limits exist. citeturn15search1 | Production domain strongly expected | UNVERIFIED | UNVERIFIED | Domain-centric | Reject |
| **SMTP2GO** | Free 1,000/month, with tighter limits absent a verified domain. citeturn15search2turn15search8 | Single sender addresses supported, domain preferable | UNVERIFIED | UNVERIFIED | Technically flexible, but Gmail DMARC issue remains | Invitation fallback only after real deliverability test |
| **Elastic Email** | Free `$0`, current source advertises 3,000/month and 100/day. citeturn16search3 | Domain-oriented | Official page says no credit card. citeturn16search6 | UNVERIFIED | Designed around SPF/DKIM on your domain | Reject without domain |
| **Resend** | Free currently 3,000/month and 100/day. citeturn16search11 | Yes for sensible production sending | UNVERIFIED | UNVERIFIED | Domain-centric | Reject under no-domain rule |
| **Postmark** | Free developer allowance of 100/month. citeturn16search0 | Can verify a sender signature instead of whole domain | No card to try Free path. citeturn16search4 | UNVERIFIED | Single Gmail sender can potentially be verified, but provider cannot authenticate `gmail.com` as yours | Reject for normal Gmail From |
| **Mailgun** | Current Free tier advertises 100/day. citeturn17search3 | Domain-oriented | UNVERIFIED | UNVERIFIED | Not good for `gmail.com` alignment | Reject |
| **Amazon SES** | New-account SES-specific historical free allowance ended for new customers in July 2026. citeturn17search15 | Verified sender/domain | AWS account/billing model conflicts with requirement | UNVERIFIED | Sandbox also restricts recipients. citeturn17search16 | Reject |
| **Supabase default SMTP** | Two/hour, authorized team recipients only, best effort. citeturn22view3 | N/A | Included | N/A | Testing only | Reject production |

**Strongest counterargument to Gmail:** Google can temporarily block consumer sending, revoke app passwords after password changes, alter anti-abuse requirements or lock the account. citeturn20view18turn20view19 This is real. But at 10 organization invitations/day maximum and a handful of Auth messages, every domain-based ESP alternative either violates your no-domain rule or creates worse DMARC identity alignment. Gmail therefore survives the counterargument for the present workload.

**Cost check:** Gmail is $0 with the existing consumer account and app password. No purchased domain. Paid Google Workspace is not required for this design.

**Supabase Auth email-template availability on Free:** Supabase supports customizing Auth email templates, but I did not obtain primary evidence in this run proving the exact current per-template Free-plan feature matrix after all 2026 changes. **UNVERIFIED:** verify in Dashboard → Authentication → Email Templates before relying on a specific template feature.

**F2 — Link scanners and one-time tokens**

**Single recommendation:** retain the fragment design exactly in spirit:

```text
https://geminiforge-workbench.vercel.app/#/join/<secret>
```

or, preferably for cleaner routing if your application supports it:

```text
https://geminiforge-workbench.vercel.app/join#<secret>
```

The key property is that the secret remains after `#`, not in the network URI sent to the origin.

RFC 3986 states that a fragment is separated from the rest of a URI prior to dereferencing and interpreted by the user agent rather than sent as part of the resource request. citeturn20view20

Microsoft Defender Safe Links performs mail-time URL inspection/rewrite and time-of-click checks, and Microsoft documents link scanning/detonation behavior. citeturn18search0turn18search1turn18search15turn18search17 However, vendors do not publish a reliable universal contract saying every scanner uses GET versus HEAD or that none uses a full browser. Therefore scanner behavior should be treated as hostile and variable.

Apple Mail Privacy Protection automatically retrieves remote email content in ways designed to obscure user IP/activity, but that is evidence about remote content/images, not proof that invitation links are activated. citeturn18search5

For Proofpoint, Mimecast, Gmail link protection, Slack, WhatsApp, iMessage and Teams, exact current **GET-versus-HEAD behavior and JavaScript execution behavior are UNVERIFIED** from suitable primary sources in this run.

That uncertainty is exactly why the architecture should require no scanner-specific assumptions.

### Safe flow

```text
GET /join
    ↓
render inert page
    ↓
browser JS may read location.hash into memory
    ↓
NO membership change
NO token consume
NO account creation
NO state-changing request
    ↓
user clicks "Accept invitation"
    ↓
POST /api/join
body = { token, intended operation }
    ↓
server validates:
  valid
  unexpired
  not revoked
  unused
  email-bound
    ↓
perform account/membership operation transactionally
    ↓
consume token
    ↓
history.replaceState(...) removes fragment
```

A scanner can fetch the network resource all day without possessing the fragment at the HTTP server. Even a sophisticated scanner that renders JavaScript and can inspect `location.hash` cannot cause acceptance unless the page itself performs a state-changing action automatically.

**Do not:**

```ts
useEffect(() => {
  fetch("/api/join", {
    method: "POST",
    body: JSON.stringify({ token: location.hash.slice(1) }),
  });
}, []);
```

That destroys the key safety property.

### Free scanner test harness

Create an invitation to a test account and record:

```sql
select
  id,
  accepted_at,
  revoked_at,
  expires_at
from invitations
where id = '<test-id>';
```

Then send the message through each test mailbox and wait before human clicking. Any pre-click network scanning must leave `accepted_at IS NULL`.

Create a harmless `/api/scanner-observe` endpoint for a separate **non-secret** URL that logs:

```text
timestamp
method
path
selected safe User-Agent fragment
```

Do not include invitation secrets in that endpoint.

Test with:

- Gmail;
- Outlook.com / Defender-protected account where available;
- Apple Mail with Privacy Protection;
- Slack private test channel;
- Teams test chat if available;
- WhatsApp;
- iMessage.

The question is not “which scanner made which request?” The acceptance criterion is: **none of those previews/scans changes invitation state.**

### Alternatives

**Token in query string:** reject. It reaches servers, logs, referrers and scanners.

**One-time numeric code typed manually:** scanner-resistant but much worse usability and adds brute-force/rate-limit design.

**Magic link whose GET consumes the token:** reject.

**Magic link GET followed by explicit confirmation POST:** safe, but the fragment design protects the secret even earlier in the path.

**Counterargument:** a fragment can be read by JavaScript, browser extensions and anything executing in the page. Correct. It is not a substitute for XSS prevention or explicit confirmation. It specifically removes the secret from ordinary HTTP dereference and mail-scanner URL requests.

**Residual risk:** compromised browser/client or malicious extension can still read the secret.

**F3 — Email rendering in 2026**

**Single recommendation:** keep the current 600 px table-based static layout, remote GIF, frame-zero final state, inline styles, HTML+plain text and alt text. Treat animation, `prefers-color-scheme` and sophisticated dark styling as optional enhancement.

Can I Email’s current data shows that CSS animation/keyframes support is far from universal across mail clients. citeturn20view23turn20view24 Its current `prefers-color-scheme` matrix likewise shows limited overall coverage rather than a universally dependable feature. citeturn20view21 Animated GIF support is broader, but classic Outlook behavior remains an important reason to make the static/initial frame complete. citeturn20view22

Your PDF already describes the correct progressive-enhancement strategy. fileciteturn0file2

### Concrete changes to the existing template

**Keep frame 0 complete.** No recipient should need animation to understand the message.

**Make the image nonessential.** The visible invitation headline, inviter, organization, expiry text and button must all be ordinary HTML text outside the GIF.

**Explicit dimensions:**

```html
<img
  src="https://geminiforge-workbench.vercel.app/email/invite-hero.gif"
  width="600"
  height="..."
  alt="GeminiForge invitation"
  style="display:block;width:100%;max-width:600px;height:auto;border:0;"
>
```

Use the actual intrinsic height rather than the placeholder.

**Layout tables:**

```html
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
```

**Document language:**

```html
<html lang="en">
```

**Never depend on dark media queries.** Base colors must have readable contrast in normal rendering; dark-mode CSS may improve clients that support it but may also be ignored.

**No CSS-only animated content with semantic meaning.**

**Keep plain text**, for example:

```text
<Inviter> invited you to join <Organization> in GeminiForge.

Open the invitation:
https://geminiforge-workbench.vercel.app/#/join/<token>

The invitation is single-use and expires <date/time>.

Opening the link does not accept the invitation. You must explicitly confirm.

If you were not expecting this invitation, ignore this message.
```

**Do not put the token into preheader text.**

**No tracking pixel.**

**Visible fallback URL:** useful for trust, but because the fragment contains the invitation secret, avoid breaking/wrapping it in a way that causes accidental partial copies.

**Classic Outlook/VML:** do not add VML unless you discover a concrete broken button/background during testing. Every MSO-specific branch is maintenance cost for a solo owner.

**Web fonts:** do not depend on them. Use a system font stack.

**Gmail clipping:** the familiar ~102 KB HTML clipping behavior was not established from a current primary Google source in this run, so the exact threshold is **UNVERIFIED** under your evidence rules. Nevertheless, keeping the HTML body materially smaller than 100 KB remains a prudent compatibility goal and costs nothing. Measure the serialized HTML in CI instead of trusting an approximate template size.

**Remote image blocking:** Apple explicitly provides controls/behavior around remote content, and privacy protections can proxy/retrieve it. citeturn18search5 Therefore the invitation must remain fully understandable with every image absent.

### Free rendering test matrix

At minimum cover:

| Client | What to inspect |
|---|---|
| Gmail web | CTA, GIF, dark mode, authentication headers |
| Gmail mobile | narrow layout, tap target, image blocked/offline |
| Outlook.com web | CTA, GIF/static rendering |
| Classic Outlook Windows, if available | first-frame behavior, table/button |
| Apple Mail iPhone | light/dark, animation, MPP remote images |
| Apple Mail macOS | animation/dark mode |
| Yahoo Mail web | GIF/table layout |
| Proton Mail | static fallback; CSS animation is not supported according to current matrix evidence. citeturn19search18 |
| Samsung Email, if available | animation/mobile width |

No Litmus/Email on Acid subscription is required for the baseline: send to your own free accounts/devices.

**Failure scenarios:** image host unavailable → text invitation still complete; CSS stripped → inline static design remains usable; dark mode inverts unexpected colors → base layout remains legible and automated screenshot test catches major regression; GIF fails → finished first frame remains meaningful.

**Residual risk:** no free testing setup gives exhaustive coverage of every Outlook build and managed enterprise security stack.

**F4 — Deliverability and trust without a domain**

There is no evidence-based way to promise “will land in Inbox” at Gmail, Outlook, Yahoo or Proton. Spam placement is the product of recipient-specific reputation and filtering systems whose complete ranking logic is intentionally undisclosed.

The defensible statement is narrower:

**At your tiny volume, using the actual Gmail account through Gmail’s own SMTP infrastructure is substantially more identity-coherent than pretending to be `@gmail.com` through a third-party ESP. But inbox placement remains empirical and must be seed-tested.**

### `*.vercel.app` link reputation

I found no primary evidence establishing that an otherwise benign `*.vercel.app` link receives a specific spam penalty across Gmail, Outlook, Yahoo or Proton. Any claim like “Vercel links reduce deliverability by X” is therefore **UNVERIFIED**.

Mitigate reputation ambiguity by:

- using the real application hostname directly;
- not using URL shorteners;
- not adding redirect chains;
- displaying enough context to explain why the link exists;
- naming the inviter and organization;
- stating the expiry;
- having no tracking parameters;
- keeping the visible URL and actual URL consistent;
- providing the copy-link fallback.

### Sender display name

Current format:

```text
"<inviter> via GeminiForge" <owner@gmail.com>
Reply-To: <inviter>
```

is reasonable, but the user-controlled inviter string must never be copied blindly into a raw header.

**Untested hardening:**

```ts
export function safeMailDisplayName(value: string): string {
  const cleaned = value
    .replace(/[\r\n\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80); // Application policy choice.

  return cleaned || "A GeminiForge member";
}
```

Nodemailer performs its own MIME/header encoding, but server-side validation remains worthwhile.

Do not let the browser supply:

```json
{
  "from": "...",
  "subject": "...",
  "html": "..."
}
```

Send only the invite identifier. The server should load the actual inviter, invitee, organization and expiration and build all headers/body itself.

### Reply-To privacy

`Reply-To: inviter@example.com` means the recipient learns the inviter’s reply address. For an invited collaborator this is usually intentional, but it is still personal-data disclosure. Make sure that relationship is expected. If not, use the owner mailbox instead.

### Bounces

An SMTP “250 accepted” result means the upstream server accepted the message; it does **not** prove the destination mailbox received it.

Gmail can later return delivery-status notifications/bounces to the sender. Google documents temporary blocking where many messages go to invalid addresses. citeturn20view18

Record:

```text
invite_id
send_attempted_at
smtp_accepted_at
smtp_message_id
send_error_class
```

Do **not** record `delivered_at` unless you actually have delivery evidence.

For your scale, manually watching a Gmail label for DSNs is simpler than implementing Gmail API ingestion.

### No tracking

Do not add open pixels, click redirectors or recipient identifiers. They add privacy cost, can be distorted by image proxies such as Apple Mail Privacy Protection, and provide no important information for a handful of invitees. Apple’s privacy system explicitly changes remote-content retrieval behavior, making open tracking particularly untrustworthy. citeturn18search5

### Unsubscribe

These are individualized access/transactional messages rather than a marketing newsletter. Exact statutory duties vary by jurisdiction and recipient context; this report is not legal advice. Operationally: never reuse the invitation list for marketing, never send recurring promotional messages, and allow a recipient to ignore/revoke an invite without further mail.

### Should copy-link + mailto become primary?

**No.**

It is an excellent fallback, but making it primary would:

- require the owner/inviter’s local mail client;
- make sender formatting unpredictable;
- make failures less observable;
- make consistent plain-text/HTML content harder;
- make the audit trail weaker.

Use automated Gmail SMTP when healthy; show “Copy invitation link” immediately if the send fails.

**Failure scenarios:** Gmail account temporarily send-blocked → do not retry in a tight loop; expose copy-link fallback and alert owner. Recipient spam folder → seed-test and show visible trusted context. Vercel domain becomes flagged by a recipient’s enterprise system → user can copy the exact URL and contact recipient out-of-band; no $0 technical mechanism guarantees allowlisting.

**Residual risk:** without owning a domain you cannot build an independent sender/domain reputation or maintain a host-neutral permanent application URL.

**F5 — End-to-end invitation workflow**

**Single recommendation:** preserve the existing single-use, email-bound secret model; formalize state transitions and failure recovery.

I recommend the following **application policy choices**, not vendor limits:

```text
Expiry:                 72 hours
Per organization:       3 sends/hour
                         10 sends/day
Per recipient:          3 sends/day
Opening link:           no state change
Acceptance:             explicit POST only
Resend:                 revoke old token, issue new token
Revocation:             immediate
Duplicate email data:   delete after resolved/reconciled
```

The send limits are already your chosen revised design. fileciteturn0file1 The 72-hour expiry is my suggested policy: short enough to constrain leaked-link lifetime, long enough for a small invited collaboration across weekends/time zones. It does not come from a vendor quota.

A durable invitation state model is:

```text
pending
  ├── accepted
  ├── revoked
  └── expired
```

Resend is not “send the same bearer secret again”; it should revoke/supersede the previous secret and produce a new one.

### Minimum audit data

Keep:

```text
invitation id
organization id
inviter user id
normalized invitee email while pending
created_at
expires_at
revoked_at
accepted_at
last send attempt
send result category
SMTP message id if available
```

Never log:

```text
raw token
full invitation URL
Gmail app password
SMTP Authorization credentials
request body containing token
raw Authorization header
```

After invite resolution, follow your already decided policy of removing redundant invitee email data where it is no longer needed. fileciteturn0file1turn0file3

### Partial failure handling

The dangerous sequence is:

```text
create Auth user
→ database membership insert fails
→ token state?
```

Make `/api/join` idempotent around a reconciliation record so retries converge rather than producing an orphaned Auth user or consumed invitation.

High-level transaction boundary:

```text
validate invite
↓
create/locate intended Auth user
↓
transaction:
  verify invite still pending
  insert membership idempotently
  mark invitation accepted
↓
return success
```

If Auth-user creation succeeds but the DB transaction fails, retain a reconciliation marker and allow a safe retry rather than issuing a second account.

### Three core failures

**SMTP failure before user receives link:** invitation remains pending; UI shows send failed + copy link.

**Scanner opens link:** invitation remains pending.

**Two acceptance attempts race:** one transactional state transition wins; the second gets an already-used generic result.

**Token expires while page is open:** POST fails as expired; owner can issue a fresh invitation.

**Recipient signed in as wrong address:** do not consume the invite; require the bound account.

**Residual risk:** a legitimate recipient can forward the secret; email binding prevents a different account from using it, but whoever controls the invited mailbox/account can accept it.

## Comparison matrices, incidents, and what changed

### Backup storage target comparison

| Target | Current free allowance / retention | Encryption | Card/phone | Strength | Catch | Verdict |
|---|---|---|---|---|---|---|
| **Public GitHub Actions artifact** | Default artifact retention currently 90 days; configure shorter. citeturn3search0turn21search1 | **Mandatory before upload** | Existing account | Simplest automatic copy | Same GitHub failure domain; public-repo exposure concerns | Secondary only |
| **Backblaze B2** | First 10 GB free. citeturn11search9 | Mandatory | Billing method not required to get started; phone UNVERIFIED | Off-platform, API-friendly, large margin | Long-lived upload credential | **Primary off-site** |
| **Private GitHub repository** | Exact useful artifact/release capacity for this use not fully verified | Mandatory anyway | Existing account | Easy | Same account/control plane as source and CI | Reject as only off-site copy |
| **Cloudflare R2** | 10 GB-month Standard free. citeturn20view12 | Mandatory | Checkout/subscription documented; card requirement **UNVERIFIED**. citeturn11search12 | Excellent API/egress model | Violates hard rule until no-card proven | Hold |
| **Google Drive + rclone** | Current consumer capacity and signup conditions **UNVERIFIED from primary source in this run** | Mandatory | UNVERIFIED | Familiar independent provider | OAuth refresh credential in CI; file API semantics | Secondary candidate only |
| **MEGA** | Current free quota/API/signup conditions **UNVERIFIED** | Mandatory | UNVERIFIED | Independent provider | Quota/API stability not verified | Reject pending research |
| **Local offline copy** | Your disk capacity | Already ciphertext | No account | Independent from all clouds | Requires owner discipline/device durability | Monthly third copy |

**Recommendation:** encrypted GitHub artifact + encrypted B2 + periodic offline encrypted copy.

### `age` versus GPG versus OpenSSL

| Tool | CI secret requirement | Operational complexity | Recommendation |
|---|---|---|---|
| `age` public-key recipient | **No decryption secret in CI** | Low | **Use** |
| GPG public-key encryption | No private key needed to encrypt | Higher keyring/identity complexity | Acceptable but unnecessary |
| OpenSSL symmetric/password | Requires encryption secret in CI | Low command complexity, worse secret model | Reject |

The `age` public-recipient/private-identity separation is directly documented by the project. citeturn12search0turn12search4

### Real incidents and free-tier/platform changes with operational lessons

These are not all “outages”; the requested category also includes free-tier withdrawals and restrictions, which are just as relevant to zero-cost architecture.

| Date | Incident/change | Evidence | Lesson for GeminiForge |
|---|---|---|---|
| Apr 2022 | Atlassian cloud deletion incident removed customer sites during a maintenance operation and required lengthy restore work. | Atlassian post-incident report. citeturn21search0 | Tested restore beats merely possessing backups. |
| Jun 2024 | Supabase documented a 90-day paused-project restore window. | Supabase changelog. citeturn0search8 | Free retention policy is not permanent architecture. |
| 2024–2026 | Fly’s historical free allowances disappeared; current model is a trial/payment path. | Fly official 2026 update. citeturn21search9 | Never name a Free host as “permanent fallback.” |
| Jan 2025 | GitHub Actions artifact v3 became unsupported on GitHub.com. | GitHub changelog. citeturn21search10 | CI dependencies require maintenance even if app code is frozen. |
| Sep 2025 | Netlify replaced legacy Free usage quotas with a credit model. | Netlify announcement. citeturn4search0 | Legacy quota spreadsheets become wrong wholesale. |
| Apr 2026 | Netlify changed credit consumption rates again. | Netlify announcement. citeturn4search3 | Even a new pricing model can shift within months. |
| Jul 2026 | SES-specific free-tier treatment changed for new customers. | AWS SES official material. citeturn17search15 | Do not build a permanent `$0` fallback around promotional introductory credits. |
| Sep 2026 | Vercel changed Hobby deployment storage/retention behavior. | Vercel changelog. citeturn2search0 | Deployment history is not backup storage. |
| Sep/Oct 2026 | GitHub changed how Actions retention settings govern workflow-related records/artifacts. | GitHub changelog. citeturn21search1 | Re-check CI retention after platform changes. |
| Oct 2026 | Neon substantially expanded Free projects/storage. | Neon announcement. citeturn20view14 | Free changes can improve as well as deteriorate; reevaluate exits periodically. |
| Current 2026 | Supabase now documents a one-year paused-project restore window rather than the old 90-day wording. | Current Supabase docs. citeturn22view0 | Current docs override remembered historical rules. |

The user also specifically requested the **GitLab 2017 backup incident**. It remains a canonical historical backup/restore lesson, but it falls outside the requested 2022–2026 incident window and I exhausted the web-research call budget before reopening GitLab’s original incident report. Under your evidence rule I will not reproduce remembered figures. **UNVERIFIED in this report; verify against GitLab’s official 2017 postmortem before quoting it.**

### What became outdated in 2025–2026

Several facts in older research should now be actively deleted from the operating documentation:

**“Supabase paused projects have 90 days to restore.”** Outdated. Current window is up to one year. citeturn22view0turn0search8

**“Supabase Free has managed daily backups.”** Wrong. Managed daily backup applies to paid tiers identified in the current backup docs; Free should export itself. citeturn22view1

**“Netlify Free = the old fixed bandwidth/build-minute quotas.”** Outdated. Free moved to credits in 2025 and credit rates changed again in 2026. citeturn4search0turn4search3

**“Neon Free = 10 projects / 0.5 GB.”** Outdated. The October 2026 announcement describes 100 projects and 1 GB/project. citeturn20view14turn6search2

**“Fly has a permanent useful free hosting allowance.”** Outdated for new deployments; current official material emphasizes the trial/payment model. citeturn21search9turn20view16

**“Vercel Hobby function limits are the old short serverless limits.”** Outdated under current Fluid Compute; current documentation surfaced 300-second duration and 2 GB/1 vCPU Hobby functions. citeturn2search3turn2search12

**“Vercel keeps enough old deployments that it acts like rollback storage.”** Unsafe after the September 2026 retention change. citeturn2search0

**“Gmail API quotas are stable and completely free.”** Unsafe assumption. Google changed Gmail API quota accounting in May 2026 and has introduced billing-related threshold mechanics. citeturn13search2 For this tiny sender, SMTP is simpler.

**“Port 465 is definitely blocked by Supabase Edge.”** Unsupported. The official limit names 25 and 587 only. citeturn22view2

**“GitHub artifact action v3 is fine.”** Outdated; v4 is required on GitHub.com. citeturn21search10

## Operations test pack, operating cadence, thirty-day plan, and risk register

### Operations test pack

The following drills are intended to be numbered test cases in `docs/OPERATIONS-TEST-PACK.md`.

**1. Production homepage test.** Fetch `/`; require TLS and HTTP 200.

**2. Deep-health database test.** Call `/api/health/deep`; require 200 and a genuine Supabase row read.

**3. Deep-health negative test.** Temporarily point the function at a nonexistent table; require 503.

**4. Uptime alert drill.** Temporarily point the monitor at a known 404 endpoint and prove the alert reaches the owner’s phone.

**5. Uptime recovery drill.** Restore endpoint and prove the monitor sends/records recovery.

**6. GitHub keep-alive manual run.** Trigger `workflow_dispatch` and verify the exact row response.

**7. GitHub keep-alive failure.** Break the table name and prove the workflow fails.

**8. GitHub dead-man drill.** Temporarily stop or redirect its Healthchecks success ping and prove a missed-job alert arrives.

**9. Vercel keep-alive drill.** Manually invoke `/api/ops-keepalive`; verify a database read.

**10. Vercel keep-alive failure.** Remove/alter the publishable key in Preview and require 503.

**11. Supabase pause-warning routing.** Confirm the Supabase project-owner mailbox is one the owner actually monitors.

**12. Database dump smoke test.** Produce roles/schema/data dumps; require non-zero schema/data.

**13. Backup content test.** Confirm `public.projects`, `public.docs` and `public.doc_revisions` appear in appropriate dump files.

**14. Auth/Storage/Vault coverage test.** Inspect dump contents and document exactly which relevant schemas/objects the Supabase CLI includes. Anything missing becomes an explicit separate export.

**15. Plaintext-artifact guard.** Search the workflow YAML for `upload-artifact`; CI test must fail if any backup upload path lacks `.age`.

**16. Encryption drill.** Encrypt a known 1 KB test file with the repository public recipient; decrypt locally with the offline identity; compare SHA-256.

**17. Lost-key simulation.** Attempt decryption without the identity and confirm ciphertext is unusable.

**18. Backup restore drill.** Restore fresh schema/data into PostgreSQL 17; require `ON_ERROR_STOP`.

**19. Row-count drill.** Compare organizations/projects/docs/revisions counts source versus restored DB.

**20. Content-checksum drill.** Hash a fixed sample of document/revision bodies before/after restore.

**21. B2 upload drill.** Upload encrypted test ciphertext; list it; download it; compare ciphertext hash.

**22. B2 credential-scope drill.** Confirm the application key cannot access unrelated buckets/resources beyond intended scope where provider controls allow it.

**23. Missing-backup alert.** Disable one success heartbeat and prove an alert occurs.

**24. Storage export drill.** Export a nested binary object, delete local copy and restore it from encrypted backup.

**25. Storage manifest drill.** Require every exported object’s SHA-256 to match the restored copy.

**26. Git repository exit drill.** Clone the repository into an empty environment using only documented setup instructions and build successfully.

**27. Vercel exit drill.** Deploy the static `dist/` output to an alternate Free host and load every major hash route.

**28. Database exit drill.** Restore the application schema/data into Neon or a local PostgreSQL equivalent and record all Supabase-specific failures.

**29. Full Supabase recovery drill.** When project allowance permits, restore to a throwaway Supabase project and run RLS tests.

**30. Gmail SMTP connection drill.** Send one invitation to an owner-controlled mailbox; require accepted SMTP result.

**31. Gmail Auth SMTP drill.** Trigger a Supabase password-reset mail to an owner-controlled test account.

**32. Gmail authentication-result drill.** Inspect the received raw headers; record SPF/DKIM/DMARC result and aligned domains.

**33. App-password revocation runbook drill.** Do not actually change the account password solely for testing; instead document that a password change revokes app passwords and prove the owner knows where to issue a replacement. Google documents this behavior. citeturn20view19

**34. SMTP credential-missing drill.** Remove Gmail variables from a Preview deployment; invitation send must fail gracefully and expose copy-link fallback without exposing diagnostics.

**35. Invitation-rate test.** Verify the application rejects the fourth send in an hour for the same organization under your 3/hour policy.

**36. Daily organization-rate test.** Verify the eleventh send is blocked under the 10/day policy.

**37. Per-recipient-rate test.** Verify the fourth send to the same recipient is blocked under the 3/day policy.

**38. Scanner inert-GET drill.** Open the invitation URL using `curl`, HEAD/GET tools and preview services; invitation must remain pending.

**39. Fragment transport drill.** Server request logs must never contain the fragment token. This follows from standard URI semantics and should still be verified operationally. citeturn20view20

**40. JavaScript-rendering scanner simulation.** Use Playwright to load the join page and wait without clicking. Invitation must remain pending.

**41. Explicit-accept drill.** Click Accept exactly once; membership appears and invitation becomes used.

**42. Double-submit drill.** Fire two acceptance POSTs concurrently; exactly one state transition succeeds.

**43. Wrong-user drill.** Sign in as an address other than the invitation-bound address; acceptance must fail without consuming token.

**44. Revocation drill.** Revoke an invitation; old link must never accept.

**45. Resend drill.** Resend produces a new token and makes the old token unusable.

**46. Expiry drill.** Use a test invitation with a short synthetic test expiry; after expiry, explicit acceptance fails.

**47. HTML email Gmail-web drill.** Inspect hero, body, CTA, visible URL, sender and Reply-To.

**48. Image-blocking drill.** Block remote images; message still communicates who invited the recipient and how to join.

**49. First-frame drill.** Render only GIF frame zero; design must look complete.

**50. CSS-animation-disabled drill.** Remove `@keyframes`; no information disappears.

**51. Dark-mode drill.** Test Apple Mail/Gmail/Outlook modes you own; text remains readable despite forced inversion.

**52. Plain-text drill.** View MIME plain-text part alone; invitation remains actionable.

**53. Mobile drill.** Render at narrow width; no horizontal scrolling and CTA remains usable.

**54. Outlook/Proton static-fallback drill.** Clients without animation must still show a finished invitation.

**55. Bounce drill.** Send to an owner-controlled deliberately invalid domain/address only if safe; confirm the sender mailbox receives/records the DSN without causing repeated retries.

**56. Header-injection drill.** Set inviter display name to `Alice\r\nBcc: attacker...`; generated headers must contain no injected field.

**57. Reply-To drill.** Reply to test invitation; it goes only to the intended validated inviter.

**58. No-tracking drill.** Inspect source; no tracking pixel, click redirector or third-party analytics URL.

**59. Vercel hostname trust drill.** Verify the email shows the real application hostname and does not use a shortener.

**60. Two-week-away drill.** For 14 days, do not manually touch scheduled systems; all keep-alives/backups/monitors should remain green without owner intervention.

**61. Public-repository confidentiality drill.** Review every CI artifact from a test run; no plaintext database, Storage object, token, email or `.env` is downloadable.

**62. Recovery-from-B2 drill.** Start with nothing except repository, B2 ciphertext and offline `age` identity; decrypt and restore a test database.

**63. Account recovery drill.** Verify offline recovery material exists for GitHub, Google, Supabase and Vercel.

**64. Vendor-change drill.** Monthly, compare saved limits against current vendor docs and record changed assumptions.

### Prioritized thirty-day plan

| Priority | Action | Effort | Files/settings touched |
|---|---|---|---|
| 1 | Create dedicated Gmail app password under 2SV; set `GMAIL_USER` and `GMAIL_APP_PASSWORD`; send real invitation | S | Google Account, Vercel env |
| 2 | Configure Gmail custom SMTP for Supabase Auth and send reset-mail smoke test | S | Supabase Auth SMTP settings |
| 3 | Add `ops_keepalive` migration and exact DB-read health endpoint | S | migration, `/api/health`, `/api/ops-keepalive` |
| 4 | Add Vercel daily cron and GitHub second-source keep-alive | S | `vercel.json`, `.github/workflows/keepalive.yml` |
| 5 | Create UptimeRobot + Healthchecks monitors; test that alerts reach phone | S | external dashboards, secrets |
| 6 | Generate `age` keypair offline; put only public recipient in GitHub | S | offline recovery media, GitHub variable |
| 7 | Implement nightly roles/schema/data dump + encryption + short-lived artifact | M | `.github/workflows/backup.yml` |
| 8 | Create B2 bucket/restricted application key and copy ciphertext off GitHub | S/M | B2, Actions secrets |
| 9 | Add same-run weekly PostgreSQL restore + row-count/checksum checks | M | backup workflow, SQL test script |
| 10 | Implement separate Storage exporter and restore test | M | `scripts/export-storage.ts`, backup workflow |
| 11 | Lower invitation gate to 3/hour, 10/day org, 3/day recipient and add tests | S | `/api/invite`, SQL/rate-limit tests |
| 12 | Finish scanner-safe `/api/join`: inert load, explicit POST, race tests | M | join route, React join screen, Playwright |
| 13 | Run email rendering/authentication seed matrix; fix only observed failures | M | email template, test notes |
| 14 | Write control-plane settings inventory and offline recovery runbook | S | `docs/OPERATIONS.md` |
| 15 | Rehearse static frontend exit and one database restore into alternate PostgreSQL | M/L | deployment config, `docs/EXIT-DRILL.md` |

### Risk register

| Risk | Likelihood | Impact | Current state | Mitigation | Residual |
|---|---|---|---|---|---|
| No usable production backup | High until built | Critical | Free has no managed daily backup. citeturn22view1 | nightly encrypted dump + restore | Medium |
| Storage objects omitted from DB backup | High | High | Confirmed by Supabase. citeturn22view1 | separate exporter | Low/Med |
| Supabase pauses | Medium | High | Low activity over 7-day period. citeturn22view0 | dual external reads + warning mail | Low/Med |
| GitHub schedule silently disabled | Medium over long idle period | Medium | documented inactivity behavior. citeturn3search1 | Vercel second source + dead-man | Low |
| Gmail app password revoked/account blocked | Medium | High | Google may revoke/block. citeturn20view18turn20view19 | copy-link fallback; smoke monitor | Medium |
| Mail accepted but spam-foldered | Medium | Medium | no guaranteed inbox placement | seed testing, clean content | Medium |
| No custom domain means host migration breaks links | Medium long-term | Medium | architectural constraint | short invite expiry; new host in new mail | Medium |
| Vercel Hobby becomes policy-incompatible | Low now / high if commercialized | High | non-commercial only. citeturn20view6 | alternate-host rehearsal | Low now |
| GitHub ciphertext is publicly exposed | Expected | High only if key compromised | public repo | `age`, private key offline | Low |
| `age` identity lost | Low | Critical | not yet managed | two offline copies + monthly drill | Low |
| B2 credential compromised/deletes backups | Low | High | future | scoped key + GitHub/offline copies | Low/Med |
| Full Supabase restore semantics differ from vanilla Postgres | Medium | High | unavoidable coupling | quarterly full-platform drill | Medium |
| Link scanner consumes invite | Low with proposed design | High | design is sound | fragment + explicit POST | Low |
| User-controlled inviter causes header abuse | Low | Medium | must harden | server-generated header + sanitization | Low |
| Free-tier provider changes | High over years | High | multiple 2025–26 examples | quarterly exit drill + monthly doc check | Medium |
| Owner unavailable | Medium | High | solo owner | fully automatic jobs + recovery runbook | Medium |
| Alert channel and Gmail fail together | Low | High | same human/account ecosystem | second recovery mailbox/dashboard checks | Medium |
| Exact Supabase activity classifier changes | Medium | Medium | intentionally qualitative | warning monitor + current-doc review | Medium |
| Public-project backup/artifact semantics change | Medium | Medium | GitHub changes occur | ciphertext only; B2 independent | Low |
| Third-party `vercel.app` reputation worsens | Unknown | Medium | no public metric | direct clean URL; mailto fallback | Unknown |

### The eight most important questions for the owner

These are questions to **answer during implementation**, not clarifications needed for this report:

1. Is the dedicated Gmail account recoverable without depending on the same phone/device that holds every other admin login?
2. Can you keep two offline copies of the `age` private identity in physically separate places?
3. Does the first real Gmail SMTP message show aligned `spf=pass`, `dkim=pass`, `dmarc=pass`?
4. Does Supabase Auth actually accept the Gmail `smtp.gmail.com:465` configuration in your project?
5. Does the first CLI backup contain all Auth/Storage/Vault metadata your recovery requires?
6. Can a clean throwaway Supabase project pass your complete RLS test matrix after restore?
7. Does your specific Storage layout include any object whose loss cannot be reconstructed from Markdown/database content?
8. Would any foreseeable use of GeminiForge become commercial enough to violate the Vercel Hobby non-commercial restriction?

## Audit appendix: PDF verdicts, uncertainties, sub-questions, sources, and coverage

### Verdicts on operations and email decisions in the supplied PDFs

The context pack describes the project as a zero-cost personal documentation workspace, and the newer state-update page explicitly says newer corrections override older material. fileciteturn0file0 fileciteturn0file3 The master plan’s operations section and email section contain the decisions audited below. fileciteturn0file1 The earlier research PDF contains several older numbers that should not be promoted into policy without this revalidation. fileciteturn0file2

| PDF decision/claim | Verdict | Reason |
|---|---|---|
| Supabase Free has no managed database backup | **AGREE** | Current backup docs explicitly support this. citeturn22view1 |
| Nightly `supabase db dump` | **AGREE** | Supabase tells Free projects to export with CLI. citeturn22view1 |
| Use session pooler from GitHub Actions | **AGREE** | Correct for IPv4-hosted environments. citeturn1search0turn20view3 |
| Separate roles/schema/data dump | **AGREE** | Matches official restore guidance. citeturn20view4 |
| Storage backup separately | **AGREE** | Object bytes are not in database backup. citeturn22view1 |
| Weekly automated restore drill | **AGREE, MODIFY implementation** | Fresh plaintext dump can be restored within same job; encrypted off-site artifact cannot be decrypted in CI if private key stays offline. |
| Put `age` private key offline and only public key in CI | **STRONGLY AGREE** | Correct public-key model. citeturn12search0turn12search4 |
| Public GitHub artifacts may never contain plaintext backup | **STRONGLY AGREE** | Safe regardless of exact artifact-access nuance. |
| Private GitHub repo as sole backup target | **DISAGREE** | Same-account/common-mode failure; B2 is preferable independent copy. |
| Supabase “pauses after seven days of inactivity” | **MODIFY** | Current wording is low/sufficient user database activity over a seven-day window, not a binary zero-request rule. citeturn22view0 |
| Daily external DB read for keep-alive | **AGREE** | Closely matches current Supabase guidance. citeturn22view0 |
| Rely on in-database `pg_cron` to keep project alive | **DISAGREE** | It is not documented as qualifying user activity. |
| Vercel daily cron | **AGREE** | Hobby minimum schedule is once/day; allow for scheduling variation. citeturn20view7 |
| GitHub Actions second keep-alive source | **AGREE, with dead-man monitor** | Public schedules can disable after long inactivity. citeturn3search1 |
| 90-day Supabase paused-project restore window | **DISAGREE / OUTDATED** | Current docs say up to one year. citeturn22view0 |
| Gmail app-password sender | **AGREE** | Current Google documentation still supports app passwords with 2SV. citeturn20view19 |
| Gmail becomes Supabase Auth custom SMTP | **AGREE** | Best available under no-domain/no-paid constraints. |
| “Gmail SMTP = about 500/day” | **DISAGREE AS A VERIFIED SMTP LIMIT** | 500 appears in Google’s general consumer Gmail sending help, but exact SMTP-specific threshold remains UNVERIFIED. citeturn20view18 |
| Gmail app password requires 2-Step Verification | **AGREE** | Google primary documentation. citeturn20view19 |
| Gmail `smtp.gmail.com:465` from Vercel | **AGREE PENDING SMOKE TEST** | Configuration is plausible/currently conventional; primary-source host/port evidence was not adequately retrieved. |
| Edge Functions block outbound SMTP 25 and 587 | **AGREE** | Exact Supabase rule. citeturn22view2 |
| Edge Functions also block 465 | **DISAGREE if stated as fact** | Official restriction names only 25 and 587; 465 behavior is UNVERIFIED. citeturn22view2 |
| Supabase default SMTP suitable for real users | **DISAGREE** | Best-effort, two/hour, authorized team recipients only. citeturn22view3 |
| Lower invite gate to 3/hour, 10/day/org, 3/day/recipient | **AGREE** | Sensible application policy; substantially below provider limits. |
| Token in URL fragment | **STRONGLY AGREE** | Fragment is removed before dereference. citeturn20view20 |
| Opening link never consumes token | **STRONGLY AGREE** | Essential defense against scanners/prefetchers. |
| Explicit user acceptance | **AGREE** | Makes scanner method irrelevant to state transition. |
| Animated GIF with complete first frame | **AGREE** | Correct graceful degradation for heterogeneous clients. citeturn20view22 |
| CSS keyframes as progressive enhancement | **AGREE** | Support is not universal. citeturn20view23turn20view24 |
| `prefers-color-scheme` dark block | **AGREE ONLY AS ENHANCEMENT** | Current support remains partial. citeturn20view21 |
| Plain-text MIME part | **AGREE** | Valuable resilience/accessibility fallback. |
| 600 px table layout | **AGREE** | Conservative email approach; exact width is your design choice. |
| Remote 250 KB GIF | **AGREE CONDITIONALLY** | Keep optional; image blocking must not hide essential content. |
| Copy link + `mailto:` fallback | **AGREE AS FALLBACK** | Robust escape hatch. |
| Copy link + `mailto:` should be primary | **DISAGREE** | Worse observability, consistency and automation. |
| No tracking pixel | **AGREE** | Better privacy; image proxies undermine open metrics anyway. citeturn18search5 |
| Vercel Hobby is non-commercial | **AGREE** | Explicit current fair-use policy. citeturn20view6 |
| Old Netlify fixed Free quotas | **DISAGREE / OUTDATED** | Credit model replaced them. citeturn4search0turn4search3 |
| Fly as a durable free fallback | **DISAGREE / OUTDATED** | Current new-user model is trial/payment-oriented. citeturn21search9 |
| Neon old 0.5 GB/10-project limits | **DISAGREE / OUTDATED** | October 2026 Free expansion. citeturn20view14 |
| SES as a permanent no-cost fallback | **DISAGREE** | 2026 changes plus AWS billing/account model conflict with requirements. citeturn17search15 |
| Vercel deployment history can serve as rollback archive | **MODIFY** | September 2026 retention/storage change reduces confidence. citeturn2search0 |
| GitHub Actions artifact v3 examples | **DISAGREE / OUTDATED** | v3 retired; use v4. citeturn21search10 |

### Unknown unknowns

The highest-risk things vendors do **not** fully publish are the most likely places a zero-cost architecture can surprise you.

Supabase does not publish a deterministic formula for “sufficient user database activity”; it gives qualitative guidance. citeturn22view0 A daily synthetic read can therefore be recommended but not mathematically guaranteed.

Gmail’s anti-abuse system can impose limits or temporary blocks that are more contextual than the public “500” consumer guidance. citeturn20view18 Tiny volume is a mitigation, not an SLA.

Google and other providers may condition signup or account recovery on phone verification depending on abuse signals, country or account state. This is why many provider “phone required?” fields remain **UNVERIFIED** rather than “no.”

Enterprise mail gateways do not publish complete scanner implementations. A vendor can change from simple URL fetch to browser detonation without notice. The fragment + explicit POST design is valuable because it does not depend on that detail.

Mailbox providers do not publish complete spam-scoring treatment of `vercel.app` links.

An off-platform SQL restore can prove database integrity without proving hosted Supabase Auth/Realtime/Storage behavior.

Database and Storage exports do not form one atomic distributed snapshot.

The Google account is a concentration risk: it is both a root identity and transactional sender.

A future Vercel policy interpretation could decide that usage associated with paid work is commercial even when the app itself charges nothing; Vercel’s fair-use language is broader than “does this website have a checkout button?” citeturn20view6

Free products can simply disappear, as the Fly/SES/Netlify history illustrates. citeturn21search9turn17search15turn4search0

### Ten least-certain claims and how to verify them

| Claim | Confidence | Verification |
|---|---|---|
| Exact consumer Gmail SMTP daily ceiling | Low | Ask Google support/check current Gmail SMTP-specific help; do not stress-test by intentionally mass sending |
| `smtp.gmail.com:465` remains the exact recommended consumer SMTP endpoint | Medium/high operationally, weak evidence here | Configure Preview and make one TLS-authenticated send |
| Supabase Edge can open outbound 465 | Low | Deploy a temporary TCP/TLS connectivity test to Gmail:465 without credentials; remove afterward |
| Auth-only calls count toward Supabase activity | Low | Controlled idle-project experiment or written Supabase support confirmation |
| `pg_cron` counts toward pause activity | Low | Do not rely on it; controlled test only |
| Cloudflare R2 can be activated without a payment card | Low | Walk signup/checkout up to final activation without entering card |
| Current Google Drive no-card capacity/API suitability | Medium | Check current Google One/Drive primary account documentation and create restricted OAuth test |
| Public-repo artifact exact download visibility to arbitrary signed-in GitHub users | Medium, owner says verified | Test with a second unrelated GitHub account against a harmless artifact |
| Proofpoint/Mimecast/Slack/Teams exact HTTP method/JS behavior | Low | Use a harmless instrumented URL and inspect logs |
| Specific ESP signup phone requirements | Low | Walk each candidate’s current signup; do not rely on third-party comparison sites |

### Research sub-questions written before searching

The following were formulated before the first web search.

1. What is the current Supabase Free active-project count?
2. What are current database, Storage, egress, Auth, Realtime and Edge quotas?
3. What exactly triggers Free-project pausing?
4. Does a PostgREST read count as pause-preventing activity?
5. Do Auth requests count?
6. Do direct PostgreSQL connections count?
7. Does `pg_cron` activity count?
8. Does an Edge invocation without DB work count?
9. When are pause warning emails sent?
10. How long can a paused project be restored?
11. When is an old paused project permanently deleted?
12. Do paused projects count toward the active Free-project quota?
13. Does Free have any managed database backup?
14. What exactly does `supabase db dump` export?
15. What is the current session-pooler/IPv4 connection format?
16. What does a complete Auth/Storage/Vault restore require?
17. Which SMTP ports do Supabase Edge Functions block?
18. Is Supabase Auth custom SMTP separate from Edge Function networking?
19. What is the custom-SMTP Auth email rate limit?
20. Which Auth email templates are customizable on Free?
21. What SMTP/template changes occurred in 2025–2026?
22. What exactly is Vercel Hobby’s non-commercial restriction?
23. What are current Hobby function duration, CPU and memory limits?
24. What are current Hobby invocation/bandwidth limits?
25. What are current build/deployment limits?
26. What are current cron count, frequency and timing guarantees?
27. What are current Vercel environment-variable limits?
28. What is current Hobby runtime-log retention?
29. What rollback/deployment retention remains on Hobby?
30. What changes operationally if the GitHub repo becomes private?
31. Are public-repository Actions minutes still free?
32. What current minutes apply to private Free repositories?
33. What are current job and concurrency limits?
34. What are Actions cache limits and eviction rules?
35. What are artifact storage/retention rules?
36. Who can retrieve artifacts in a public repository?
37. Does the public-repository 60-day scheduled-workflow rule still exist?
38. What is current maximum Actions job runtime?
39. What are current GitHub Pages/Packages Free limits?
40. What is Netlify’s current Free model?
41. What Netlify Free restrictions/pricing changes occurred since 2023?
42. What are Cloudflare Pages Free limits?
43. What are Workers Free limits?
44. What are R2 Free limits and signup-payment requirements?
45. What are D1 current quotas and restore capabilities?
46. What are Neon Free limits/inactivity rules?
47. How compatible is Neon with Supabase Auth/PostgREST assumptions?
48. What are Turso Free limits and relational trade-offs?
49. What Render Free resources expire or sleep?
50. Does Fly still have a lasting Free tier and does it require a card?
51. What does Railway Free actually provide and require?
52. What is B2’s Free allowance and card policy?
53. Is a private GitHub repository suitable as backup storage?
54. What is current Google Drive free capacity and API authentication?
55. Is MEGA suitable for automated encrypted backup?
56. Does R2 require a card even below its Free allowance?
57. Is `age` suitable for public-key-only CI encryption?
58. How do GPG and OpenSSL compare?
59. What retention fits the current 15 MB database?
60. How should the ephemeral restore drill work?
61. What lessons apply from GitLab’s 2017 backup failure?
62. What lessons apply from Atlassian’s 2022 restore incident?
63. What other 2022–2026 incidents matter?
64. What is UptimeRobot Free today?
65. What is Better Stack Free today?
66. What is Healthchecks.io Free today?
67. What is Sentry Free today?
68. How long are Vercel/Supabase Free logs retained?
69. Is ntfy.sh suitable as a free phone alert?
70. Is Telegram Bot API suitable as a free phone alert?
71. Do Gmail app passwords still exist in October 2026?
72. What is the official consumer Gmail send limit?
73. What is the per-message recipient limit?
74. What automated-mail policies apply to Gmail?
75. What are current Gmail API limits/cost implications?
76. What is the OAuth “Testing” refresh-token lifetime?
77. What are Apps Script MailApp/GmailApp quotas?
78. What are current Outlook.com SMTP rules?
79. Is Brevo usable free without a domain?
80. Is Mailjet usable free without a domain?
81. Is MailerSend usable free without a domain?
82. Is SMTP2GO usable free without a domain?
83. Is Elastic Email usable free without a domain?
84. Is Resend usable free without a domain?
85. Is Postmark usable free without a domain?
86. Is Mailgun usable free without a domain?
87. Is Amazon SES genuinely compatible with $0/no-card?
88. What can Supabase default SMTP really do?
89. Does mail sent through Gmail SMTP align for DMARC?
90. What happens to DMARC when a third-party ESP sends `From: gmail.com`?
91. How does Gmail’s own DKIM/SPF identity behave?
92. How does Microsoft Safe Links fetch/inspect links?
93. How does Proofpoint inspect links?
94. How does Mimecast inspect links?
95. Does Gmail prefetch or scan email links?
96. What does Apple Mail Privacy Protection fetch?
97. What does Slack fetch for link previews?
98. What do WhatsApp/iMessage/Teams unfurl?
99. Are URL fragments sent to an HTTP origin?
100. Can a browser-based scanner read a fragment through JavaScript?
101. Which 2026 clients animate GIFs?
102. What does Outlook desktop do with GIF frames?
103. Which clients support CSS keyframes?
104. Which clients support `prefers-color-scheme`?
105. Which clients force dark-mode inversion?
106. How should remote-image blocking be handled?
107. Does Gmail still clip large HTML around 102 KB?
108. What is current support for web fonts/background images/VML?
109. What email accessibility requirements matter?
110. Can Gmail SMTP guarantee inbox placement at major providers?
111. Is `*.vercel.app` penalized by phishing/spam systems?
112. How are Gmail bounces surfaced?
113. What privacy impact does `Reply-To` create?
114. How should user-supplied inviter names be protected from header injection?
115. What unsubscribe rules apply to transactional invitations?
116. Should copy-link + mailto be primary or fallback?
117. What invitation expiry is appropriate?
118. How should resend and revocation work?
119. What invitation personal data should be retained?
120. How should partial failures in join/account creation recover?

### Full dated primary-source list used for the substantive conclusions

All web sources below were accessed **2026-10-22** unless the source itself is an older dated changelog/incident.

**Supabase — Project Pausing.** Current definition of low activity, user DB requests, warnings and one-year restore. citeturn22view0

**Supabase — Database Backups.** Paid daily backups, Free `db dump` recommendation, Storage-object exclusion and PITR. citeturn22view1

**Supabase — Edge Functions Limits.** Memory/runtime/function limits and explicit SMTP-port restriction. citeturn22view2

**Supabase — Auth custom SMTP.** Default/custom SMTP behavior and configuration. citeturn22view3

**Supabase — Backup/restore with CLI and self-hosted migration guidance.** Dump segmentation and restore workflow. citeturn20view3turn20view4

**Supabase — PostgreSQL connection documentation.** Session pooler/IPv4 behavior. citeturn1search0turn1search7

**Supabase — Billing/project quotas.** Active Free projects and paused-project treatment. citeturn0search4

**Supabase — January 2025 database-size update.** Free active-project database allowance. citeturn0search7

**Supabase — July 2025 egress change.** Free cached/uncached egress split. citeturn0search5

**Supabase — 2024 pause-window changelog.** Historical 90-day policy used to identify outdated prior research. citeturn0search8

**Vercel — Fair Use Guidelines.** Hobby non-commercial limitation. citeturn20view6

**Vercel — Cron Jobs Usage and Pricing.** Hobby daily minimum, job count and timing precision. citeturn20view7

**Vercel — Platform Limits.** Project/deployment/build constraints. citeturn20view8

**Vercel — Function Limits/Fluid Compute.** Current Hobby memory/CPU/duration figures. citeturn2search3turn2search12turn2search13

**Vercel — September 16, 2026 Hobby deployment-retention change.** citeturn2search0

**GitHub — Actions usage/billing documentation.** Public standard-runner usage. citeturn3search10

**GitHub — Events that trigger workflows / schedule behavior.** Public inactivity disable condition. citeturn3search1

**GitHub — Actions artifact/cache retention documentation.** Default retention and cache behavior. citeturn3search0

**GitHub — August/October 2026 retention change.** citeturn21search1

**GitHub — September 2026 expired-artifact behavior.** citeturn21search5

**GitHub — artifact v3 retirement.** citeturn21search10

**Netlify — current Free pricing/credit model.** citeturn20view11turn4search8

**Netlify — September 2025 credit-model announcement.** citeturn4search0

**Netlify — April 2026 credit-rate update.** citeturn4search3

**Netlify — legacy Free limits, used only to identify stale prior facts.** citeturn4search1

**Cloudflare — Workers Limits.** Free request/runtime/resource limits. citeturn20view13

**Cloudflare — Pages limits.** citeturn5search1turn5search10

**Cloudflare — R2 pricing.** Free Standard storage/request allowance. citeturn20view12

**Cloudflare — R2 activation/subscription setup.** Used for card-requirement uncertainty. citeturn11search12

**Cloudflare — D1 historical limit changes.** citeturn5search12

**Neon — October 2, 2026 Free-plan expansion.** citeturn20view14

**Neon — earlier Free-plan change.** Used to identify stale 10-project figures. citeturn6search2

**Neon — no-card Free-plan material.** citeturn6search12

**Turso — current pricing.** Free plan/no-credit-card statement. citeturn20view15

**Render — Free service/Postgres documentation.** Sleep/expiration behavior. citeturn6search19turn6search4turn6search6

**Fly.io — current trial documentation.** citeturn20view16

**Fly.io — September 2026 official update on Free allowances.** citeturn21search9

**Fly.io — payment-method documentation.** citeturn7search1

**Railway — current pricing/Free documentation.** citeturn20view17turn8search0turn8search1turn8search3

**Backblaze — B2 Free allowance and billing-method guidance.** citeturn11search9

**age — official project documentation.** Public recipients/private identities and encryption model. citeturn12search0turn12search4turn12search6

**UptimeRobot — current Free monitoring plan.** citeturn8search8

**Better Stack — current Free uptime/observability plan.** citeturn9search0turn9search1turn9search3

**Healthchecks.io — current Hobby plan.** citeturn10search1turn10search15

**Sentry — current Free/developer/log materials.** citeturn10search2turn10search16turn10search18

**Google Account Help — App Passwords.** Current 2-Step Verification/app-password conditions. citeturn20view19

**Google Gmail Help — sending limits/temporary blocks.** citeturn20view18

**Google Gmail API — May 2026 quota/accounting update.** citeturn13search2

**Brevo — Free pricing.** citeturn15search0turn15search3

**Mailjet — Free plan.** citeturn15search16

**MailerSend — Free/trial plan.** citeturn15search1

**SMTP2GO — Free plan and sender/domain limits.** citeturn15search2turn15search8

**Elastic Email — Free plan/no-card material.** citeturn16search3turn16search6

**Resend — Free pricing.** citeturn16search11

**Postmark — Free developer plan and sender-signature documentation.** citeturn16search0turn16search4turn16search9

**Mailgun — Free plan.** citeturn17search3

**Amazon SES — 2026 Free Tier change and sandbox limitations.** citeturn17search15turn17search16

**RFC 3986 — URI fragment semantics.** Fragment separation prior to dereference. citeturn20view20

**Microsoft Defender — Safe Links documentation.** Scanning/rewrite/time-of-click behavior. citeturn18search0turn18search1turn18search15turn18search17

**Apple — Mail Privacy Protection documentation.** Remote-content privacy retrieval. citeturn18search5

**Can I Email — animated GIF support.** citeturn20view22

**Can I Email — `prefers-color-scheme`.** citeturn20view21

**Can I Email — CSS animation / keyframes.** citeturn20view23turn20view24

**Proton Mail CSS support evidence.** Used for animation fallback. citeturn19search18

**Atlassian — April 2022 cloud outage post-incident review.** Restore/deletion lessons. citeturn21search0

**User-provided Context Pack, dated 2026-10-22.** Current product stack and live-state facts. fileciteturn0file0

**User-provided Master Plan v2.1, dated 2026-10-22.** Operations/email proposals audited above. fileciteturn0file1

**User-provided Prior Research, dated 2026-10-21.** Historical claims challenged against current vendor material. fileciteturn0file2

**User-provided Architecture/Security State Update, dated 2026-10-22.** Live DB/repository/configuration state and newer corrections. fileciteturn0file3

**NOT COVERED**

The research established the core architecture, current pause/backup rules, major free-platform landscape, backup target, keep-alive design, current Gmail/app-password status, Supabase SMTP behavior, fragment safety, principal email-client constraints, incidents, workflows, operations tests, risk register and PDF verdicts. The following requested details remain **UNVERIFIED rather than guessed**, principally because no sufficiently current primary source was retrieved before the web-research tool limit was reached:

- exact current GitHub private-Free Actions minutes, every concurrency ceiling and maximum job duration after all 2026 changes;
- exact current Vercel Hobby environment-variable count/size and runtime-log retention;
- exact GitHub public-artifact download authorization behavior for an arbitrary unrelated signed-in user, beyond the owner’s own verified observation;
- exact Supabase activity-classifier treatment of Auth-only traffic, Edge-only traffic, direct DB connections and internal `pg_cron`;
- exact current Supabase CLI inclusion/exclusion behavior for every `auth`, `storage` and Vault object; first restore drill must inventory it;
- exact current Free-plan matrix for every Supabase Auth email-template customization;
- a current first-party Google page explicitly specifying `smtp.gmail.com`, port 465 versus 587 and the exact **consumer SMTP-specific** daily quota;
- Google OAuth “Testing” consent-screen refresh-token lifetime in its current 2026 form;
- current first-party Google Apps Script `MailApp`/`GmailApp` consumer quotas;
- current Outlook.com SMTP authentication/app-password limits;
- deterministic phone-number requirements at Gmail, Brevo, Mailjet, MailerSend, SMTP2GO, Elastic Email, Resend, Postmark, Mailgun, Backblaze, R2, Neon and other anti-abuse-sensitive signup flows;
- a primary-source guarantee that Cloudflare R2 activation never requires a card;
- current Google Drive consumer free capacity/card/signup terms as a backup target;
- current MEGA free quota, automation/API stability and signup requirements;
- exact HTTP method and JavaScript execution behavior of Proofpoint, Mimecast, Gmail scanners, Slack, WhatsApp, iMessage and Teams unfurlers;
- a current primary Google statement for Gmail’s often-cited HTML clipping threshold;
- quantitative evidence that `*.vercel.app` links incur or do not incur a spam-score penalty;
- precise inbox-placement probabilities at Gmail, Outlook.com, Yahoo and Proton—no provider publishes such a guarantee;
- current primary-source log-retention values for every Supabase Free and Vercel Hobby log stream;
- ntfy.sh and Telegram’s full current zero-cost/signup/privacy matrix;
- GitHub Pages and GitHub Packages exact 2026 Free quotas;
- the original GitLab 2017 postmortem source and exact incident figures; because this is outside the requested 2022–2026 incident set and was not re-opened, remembered numbers were deliberately not repeated.