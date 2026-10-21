// @ts-nocheck  (a Vercel Node function; the app's own tsconfig does not cover this folder)
// POST /api/invite  { org, project?, email, orgRole, projectRole?, days }  with  Authorization: Bearer <the signed-in user's Supabase token>
// Creates the invitation with the caller's own rights (the database decides who may invite), then emails the link through Gmail SMTP when GMAIL_USER and
// GMAIL_APP_PASSWORD are set in the Vercel environment. Without them the invitation is still created and the link is returned to copy.
// GET /api/invite  ->  { configured }  (no secrets) so the dialog can say whether email is ready.
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { renderInviteEmail } from "./_lib/inviteEmail";

const URL_ = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const APP = (process.env.PUBLIC_APP_URL || "https://geminiforge-workbench.vercel.app").replace(/\/+$/, ""); // never taken from the request: a forged origin could point the email at a look-alike site
const configured = () => !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ROLE = { owner: "Manager", editor: "Editor", viewer: "Viewer", admin: "Admin", member: "Member" };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ configured: configured() });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const auth = String(req.headers.authorization || "");
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt || !URL_ || !KEY) return res.status(401).json({ error: "Sign in first." });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const email = String(b.email || "").trim();
  const days = Number(b.days);
  if (!UUID.test(String(b.org)) || (b.project && !UUID.test(String(b.project))) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254 || !(days >= 1 && days <= 30)) return res.status(400).json({ error: "Check the email address and the choices." });
  const sb = createClient(URL_, KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: u, error: ue } = await sb.auth.getUser(jwt);
  if (ue || !u?.user) return res.status(401).json({ error: "Your session expired. Sign in again." });
  const { data: token, error } = await sb.rpc("create_invite", { p_org: b.org, p_project: b.project || null, p_email: email, p_org_role: b.orgRole === "admin" ? "admin" : "member", p_project_role: b.project ? b.projectRole : null, p_days: days });
  if (error) return res.status(400).json({ error: error.message });
  const link = `${APP}/#/join/${token}`;
  if (!configured()) return res.status(200).json({ link, mailed: false, reason: "not_configured" });
  const gate = await sb.rpc("invite_mail_gate", { p_org: b.org });
  if (gate.error) return res.status(200).json({ link, mailed: false, reason: "limit", detail: gate.error.message });
  try {
    const [{ data: o }, { data: p }] = await Promise.all([sb.from("organizations").select("name").eq("id", b.org).maybeSingle(), b.project ? sb.from("projects").select("name").eq("id", b.project).maybeSingle() : Promise.resolve({ data: null })]);
    const inviter = (u.user.user_metadata?.name || u.user.email || "Someone").toString();
    const mail = renderInviteEmail({ inviter, orgName: o?.name || "the organization", projectName: p?.name || null, role: ROLE[b.project ? b.projectRole : b.orgRole === "admin" ? "admin" : "member"] || "Member", link, days, appUrl: APP, recipient: email });
    const tr = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
    const shown = inviter.replace(/["\r\n<>]/g, "").slice(0, 60);
    await tr.sendMail({ from: `"${shown} via GeminiForge" <${process.env.GMAIL_USER}>`, to: email, replyTo: u.user.email || undefined, subject: mail.subject, html: mail.html, text: mail.text });
    return res.status(200).json({ link, mailed: true });
  } catch (e) {
    return res.status(200).json({ link, mailed: false, reason: "send_failed", detail: String(e?.message || e).slice(0, 200) });
  }
}
