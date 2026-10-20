# Security and token safety

## Built (verified)
Hashed tokens (sha256, never stored raw, shown once); modes read|propose; id-prefix limits; daily limits; pending cap; pause switch; per-address limits + failed-token lockout (0012); RLS everywhere; definer RPCs with `search_path=''`; hidden-Unicode and injection-phrase checks; tool output wrapped in `<untrusted-docs id=random>`; owner message via `get_guide`; audit log with error text; retention job; token secret immutable (column grants + trigger); AI can only create drafts.

## Known weaknesses (open)
1. **Path tokens**: the Gemini app needs the token inside the URL. Supabase request logs store URLs (the owner saw full URLs in edge_logs; an audit counted hundreds of rows with tokens). Anyone with dashboard/log access can replay a token until it expires.
2. Tokens are long-lived bearer secrets with no binding to a client.
3. No alert when a token is used from a new client.
4. Leaked-password protection (Supabase Auth setting) is off.
5. `private.apply_draft`/`derived_edit` still granted to `authenticated` (not reachable via API; harden later).
6. Count-then-insert races on the pending cap and idempotency.

## Researched direction (sources fetched 2026-10-20; secondary sources marked)
- MCP authorization spec 2026-07-28 security considerations (modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations): clients send the RFC 8707 `resource` parameter, servers must reject tokens whose audience is not them, servers must not pass the client token upstream, tokens must not be logged/cached insecurely.
- Secondary (NeuralTrust, Oct 2026; Zuplo "bind MCP tokens to one server"; cenrax substack): send tokens in the Authorization header, never the query string; short-lived access tokens with refresh rotation; bind tokens to one server.
- UNVERIFIED: that the Gemini app supports OAuth for custom MCP servers (the owner only confirmed URL-path tokens work).

## Upgrade plan (ordered, smallest first)
1. **Two token kinds**: `header` (long expiry allowed, read or propose) and `path` (read-only by default, max 7 days, low daily limit, labelled "appears in logs"). Enforce in `create_mcp_token` and `mcp_gate`.
2. **Rotation with overlap**: "Rotate" creates a new token and keeps the old one valid for N hours, then revokes it.
3. **Token prefix + checksum** (`gfk_live_...`) so GitHub secret scanning / gitleaks can detect leaks; show last 4 characters in the list.
4. **Anomaly alerts**: store `last_client`, first-seen client set, call spikes; show a warning chip and optionally auto-pause.
5. **Short-lived path tokens via one-click "Connect Gemini"**: owner creates a 24 h read token from the app, one tap.
6. **OAuth 2.1 for MCP** (Supabase Auth OAuth server was reported in beta by one source: UNVERIFIED) so clients that support it get short-lived audience-bound tokens; keep manual tokens as fallback.
7. Redact tokens from our own logs (we never log them; Supabase gateway does -> cannot fix, only mitigate with 1 and 5).
8. Turn on leaked-password protection; add TOTP MFA for the owner account; consider passkeys.
9. Revoke the two broad grants (item 5 above) after verifying `decide_drafts` and `revert_draft` still work (test with a pending draft in a rolled-back DO block).
10. Security tests to add: RLS matrix test (anon / non-member / viewer / editor / admin x every table) as a script that runs in CI.
