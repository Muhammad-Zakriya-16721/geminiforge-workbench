// Checks of the invitation email: escaping, no token in the preview text, size under the Gmail clipping limit, text part. Run: node tests/invite-email.test.mjs
import { renderInviteEmail } from "../api/_lib/inviteEmail.ts";
let bad = 0;
const ok = (n, c) => { if (!c) bad++; console.log(`${c ? "PASS" : "FAIL"} | ${n}`); };
const token = "iv_" + "ab".repeat(32);
const base = { inviter: 'Eve <script>alert(1)</script>\r\nBcc: x@y.z', orgName: 'Org "&" Co', projectName: "P'1", role: "Editor", link: `https://app.test/#/join/${token}`, days: 1, appUrl: "https://app.test", recipient: "a@b.test" };
const m = renderInviteEmail(base);
ok("subject is one line", !/[\r\n]/.test(m.subject));
ok("html escapes the inviter and organization names", !m.html.includes("<script>") && m.html.includes("&lt;script&gt;") && m.html.includes("Org &quot;&amp;&quot; Co"));
const pre = m.html.match(/<div style="display:none[^>]*>([^<]*)</)?.[1] ?? "";
ok("the preview text does not contain the token", pre.length > 10 && !pre.includes("iv_"));
ok("under 90 KB (Gmail clips near 102 KB)", Buffer.byteLength(m.html) < 90_000);
ok("button and visible link carry the invitation link", (m.html.match(new RegExp(token, "g")) ?? []).length >= 3);
ok("plain-text part has the link and the safety line", m.text.includes(token) && /weren't expecting/.test(m.text));
ok("singular day wording", /1 day[^s]/.test(m.html));
ok("hero image has alt text and an absolute https address", /<img src="https:\/\/app\.test\/email\/invite-hero\.gif"[^>]* alt="[^"]+"/.test(m.html));
ok("base styles show the finished state (animations only enhance)", !/opacity:\s*0[^.]/.test(m.html.replace(/<style>[\s\S]*?<\/style>/, "").replace(/display:none;max-height:0;overflow:hidden;opacity:0/, "")));
process.exit(bad ? 1 : 0);
