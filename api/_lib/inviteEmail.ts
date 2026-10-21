// The invitation email: one table layout that works in every client, an animated header image (a GIF, the only motion Gmail and Outlook.com play)
// and optional CSS animation for Apple Mail, iOS Mail and Samsung Mail (caniemail.com: keyframes are not supported in Gmail or any Outlook).
// Every base style is the finished state, so a client that drops the animation still shows the complete design. The link is never put into the preview text.

export interface InviteMail {
  inviter: string;      // display name or email of the person inviting
  orgName: string;
  projectName?: string | null;
  role: string;         // plain words, e.g. "Editor"
  link: string;         // https://…/#/join/<token>
  days: number;
  appUrl: string;       // https://geminiforge-workbench.vercel.app (no trailing slash)
  recipient: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").trim();

export function renderInviteEmail(m: InviteMail): { subject: string; html: string; text: string } {
  const inviter = oneLine(m.inviter).slice(0, 80) || "Someone";
  const org = oneLine(m.orgName).slice(0, 80);
  const proj = m.projectName ? oneLine(m.projectName).slice(0, 120) : "";
  const target = proj || org;
  const subject = `${inviter} invited you to ${target} on GeminiForge`;
  const hero = `${m.appUrl}/email/invite-hero.gif`;
  const expires = `${m.days} day${m.days === 1 ? "" : "s"}`;
  const pre = `Open the invitation and press Accept. It is valid for ${expires}.`;
  const rows: [string, string][] = [["Organization", org], ...(proj ? [["Project", proj] as [string, string]] : []), ["Your role", m.role], ["Valid for", expires]];

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@keyframes gfUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes gfFade{from{opacity:0}to{opacity:1}}
@keyframes gfPulse{0%,100%{box-shadow:0 0 0 0 rgba(217,119,87,.55)}60%{box-shadow:0 0 0 12px rgba(217,119,87,0)}}
@keyframes gfSheen{0%{background-position:-220px 0}100%{background-position:420px 0}}
.a1{animation:gfUp .7s cubic-bezier(.22,1,.36,1) .15s both}
.a2{animation:gfUp .7s cubic-bezier(.22,1,.36,1) .3s both}
.a3{animation:gfUp .7s cubic-bezier(.22,1,.36,1) .45s both}
.a4{animation:gfUp .7s cubic-bezier(.22,1,.36,1) .6s both}
.a5{animation:gfFade 1s ease .9s both}
.cta{animation:gfPulse 2.6s ease-out 1.4s infinite;transition:background-color .15s ease,transform .15s ease}
.cta:hover{background-color:#c96442!important;transform:translateY(-1px)}
@media (max-width:620px){.wrap{width:100%!important}.pad{padding-left:22px!important;padding-right:22px!important}.h1{font-size:26px!important}}
@media (prefers-color-scheme:dark){
 .page{background-color:#0e0e0d!important}
 .card{background-color:#1d1c1a!important;border-color:#2a2926!important}
 .t1{color:#faf9f5!important}.t2{color:#d8d6ce!important}.t3{color:#aeaca3!important}
 .kv td{border-color:#2a2926!important}.lnk{color:#e8a58c!important}
}
@media (prefers-reduced-motion:reduce){.a1,.a2,.a3,.a4,.a5,.cta{animation:none!important}}
</style>
</head>
<body class="page" style="margin:0;padding:0;background-color:#f1efe8;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(pre)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1efe8" style="background-color:#f1efe8;">
<tr><td align="center" style="padding:28px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="wrap card" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background-color:#ffffff;border:1px solid #e4e1d8;border-radius:16px;overflow:hidden;">
<tr><td bgcolor="#141413" style="background-color:#141413;line-height:0;font-size:0;">
<img src="${esc(hero)}" width="600" height="220" alt="GeminiForge: you are invited" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;background-color:#141413;color:#faf9f5;font:500 20px Georgia,serif;">
</td></tr>
<tr><td class="pad" style="padding:30px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;">
<h1 class="h1 t1 a1" style="margin:0 0 12px 0;font-weight:400;font-size:30px;line-height:1.2;color:#1b1a18;letter-spacing:-.01em;">You&rsquo;re invited to ${esc(target)}</h1>
<p class="t2 a2" style="margin:0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#3a3935;"><strong class="t1" style="color:#1b1a18;">${esc(inviter)}</strong> invited you to join ${proj ? `the project <strong class="t1" style="color:#1b1a18;">${esc(proj)}</strong> in ` : ""}<strong class="t1" style="color:#1b1a18;">${esc(org)}</strong> as <strong class="t1" style="color:#1b1a18;">${esc(m.role)}</strong>.</p>
</td></tr>
<tr><td class="pad a3" align="left" style="padding:22px 40px 6px 40px;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(m.link)}" style="height:48px;v-text-anchor:middle;width:230px;" arcsize="22%" stroke="f" fillcolor="#d97757"><w:anchorlock/><center style="color:#141413;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Accept invitation</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- --><a class="cta" href="${esc(m.link)}" target="_blank" style="display:inline-block;background-color:#d97757;color:#141413;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:48px;height:48px;padding:0 30px;border-radius:10px;text-decoration:none;mso-hide:all;">Accept invitation&nbsp;&rarr;</a><!--<![endif]-->
</td></tr>
<tr><td class="pad a4" style="padding:18px 40px 4px 40px;">
<table role="presentation" class="kv" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;">
${rows.map(([k, v]) => `<tr><td class="t3" style="padding:9px 0;border-top:1px solid #ece9e0;color:#7a786f;width:130px;">${esc(k)}</td><td class="t1" style="padding:9px 0;border-top:1px solid #ece9e0;color:#1b1a18;font-weight:600;">${esc(v)}</td></tr>`).join("\n")}
</table>
</td></tr>
<tr><td class="pad a5" style="padding:14px 40px 8px 40px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#3a3935;">
<p class="t2" style="margin:0 0 6px 0;"><strong class="t1" style="color:#1b1a18;">How it works</strong></p>
<p class="t2" style="margin:0;">1. Open the link and sign in with <strong class="t1" style="color:#1b1a18;">${esc(m.recipient)}</strong>.<br>2. Press <em>Accept invitation</em>. Nothing happens until you do.</p>
<p class="t3" style="margin:16px 0 0 0;font-size:13px;color:#7a786f;">Button not working? Copy this link into your browser:<br><a class="lnk" href="${esc(m.link)}" target="_blank" style="color:#b4543a;word-break:break-all;">${esc(m.link)}</a></p>
</td></tr>
<tr><td class="pad" style="padding:20px 40px 30px 40px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.55;color:#7a786f;">
<p class="t3" style="margin:0;border-top:1px solid #ece9e0;padding-top:16px;color:#7a786f;">If you weren&rsquo;t expecting this, you can ignore this email and nothing will happen. The link works once and expires in ${esc(expires)}. Reply to this email to reach ${esc(inviter)}.</p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
<p style="margin:14px 0 0 0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#9b9991;">Sent by GeminiForge V20</p>
</td></tr>
</table>
</body>
</html>`;

  const text = `${inviter} invited you to ${target} on GeminiForge

${inviter} invited you to join ${proj ? `the project ${proj} in ` : ""}${org} as ${m.role}.

Accept the invitation:
${m.link}

How it works:
1. Open the link and sign in with ${m.recipient}.
2. Press "Accept invitation". Nothing happens until you do.

The link works once and expires in ${expires}.
If you weren't expecting this, ignore this email. Reply to reach ${inviter}.
`;
  return { subject, html, text };
}
