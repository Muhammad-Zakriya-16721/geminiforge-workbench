// Writes public/email/invite-preview.html: the invitation email with sample data, to look at in a browser. Run: node scripts/make-invite-preview.mjs
import fs from "node:fs";
import { renderInviteEmail } from "../api/_lib/inviteEmail.ts";
const m = renderInviteEmail({ inviter: "Muhammad", orgName: "Personal", projectName: "GeminiForge", role: "Editor", link: "https://geminiforge-workbench.vercel.app/#/join/iv_" + "0123456789abcdef".repeat(4), days: 7, appUrl: "https://geminiforge-workbench.vercel.app", recipient: "name@example.com" });
fs.writeFileSync("public/email/invite-preview.html", m.html);
console.log("subject:", m.subject, "| html", Buffer.byteLength(m.html), "bytes");
