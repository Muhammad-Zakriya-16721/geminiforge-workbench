// Draws the animated header of the invitation email (public/email/invite-hero.gif). Frame 0 is the complete picture, so a client that only shows the first frame still looks finished.
// Run: node scripts/make-invite-gif.mjs   (needs the Chromium that Playwright uses; gifenc and pngjs are dev dependencies)
import { chromium } from "playwright-core";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { PNG } from "pngjs";
import fs from "node:fs";
const exe = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const W = 600, H = 220, S = Number(process.env.SCALE || 2), FRAMES = Number(process.env.FRAMES || 36), DELAY = 60;
const html = `<canvas id=c width=${W * S} height=${H * S}></canvas><script>
const c=document.getElementById("c"),x=c.getContext("2d");x.scale(${S},${S});
const ACC="#d97757",rr=(a,b,w,h,r)=>{x.beginPath();x.roundRect(a,b,w,h,r)};
const cards=[{cx:140,l:"Organization"},{cx:300,l:"Project"},{cx:460,l:"Documents"}],Y=112,CS=92;
function icon(i,cx,glow){x.save();x.translate(cx,Y);x.lineWidth=2.2;x.lineCap="round";x.lineJoin="round";x.strokeStyle=glow>0.05?"#f0b49d":"#d8d6ce";
 if(i===0){rr(-17,-20,34,40,3);x.stroke();for(const [a,b] of [[-9,-12],[3,-12],[-9,-2],[3,-2]]){x.strokeRect(a,b,6,6)};x.beginPath();x.moveTo(-5,20);x.lineTo(-5,10);x.lineTo(5,10);x.lineTo(5,20);x.stroke()}
 if(i===1){x.beginPath();x.moveTo(-22,-12);x.lineTo(-8,-12);x.lineTo(-3,-6);x.lineTo(22,-6);x.lineTo(22,16);x.lineTo(-22,16);x.closePath();x.stroke();x.beginPath();x.moveTo(-22,-2);x.lineTo(22,-2);x.stroke()}
 if(i===2){rr(-16,-22,32,44,4);x.stroke();for(const yy of [-10,-2,6]){x.beginPath();x.moveTo(-8,yy);x.lineTo(i===2&&yy===6?2:8,yy);x.stroke()}}
 x.restore()}
function draw(t){
 x.clearRect(0,0,${W},${H});x.fillStyle="#141413";x.fillRect(0,0,${W},${H});
 const g=x.createRadialGradient(300,110,10,300,110,330);g.addColorStop(0,"rgba(217,119,87,"+(0.16+0.05*Math.sin(t*Math.PI*2))+")");g.addColorStop(1,"rgba(217,119,87,0)");x.fillStyle=g;x.fillRect(0,0,${W},${H});
 x.fillStyle=ACC;x.beginPath();x.arc(36,34,11,0,7);x.fill();x.fillStyle="#fff";x.font="600 13px Georgia,serif";x.textAlign="center";x.textBaseline="middle";x.fillText("\\u2726",36,35);
 x.textAlign="left";x.fillStyle="#faf9f5";x.font="500 17px Georgia,serif";x.fillText("GeminiForge",56,34);x.fillStyle="#9b9991";x.font="500 12px ui-monospace,Menlo,monospace";x.fillText("V20",150,35);
 const total=320, p=t*total*1.0, px=140+p;
 // connectors
 for(const [a,b] of [[188,252],[348,412]]){x.strokeStyle="#3b3a35";x.lineWidth=2;x.setLineDash([5,5]);x.beginPath();x.moveTo(a,Y);x.lineTo(b,Y);x.stroke();x.setLineDash([]);x.beginPath();x.moveTo(b-7,Y-5);x.lineTo(b,Y);x.lineTo(b-7,Y+5);x.stroke()}
 cards.forEach((k,i)=>{const d=Math.abs(px-k.cx),glow=Math.max(0,1-d/70);
  x.save();x.shadowColor="rgba(217,119,87,"+(0.55*glow)+")";x.shadowBlur=26*glow;rr(k.cx-CS/2,Y-CS/2,CS,CS,18);x.fillStyle="#1d1c1a";x.fill();x.restore();
  rr(k.cx-CS/2,Y-CS/2,CS,CS,18);x.lineWidth=1.5+glow;x.strokeStyle=glow>0.02?"rgba(217,119,87,"+(0.35+0.65*glow)+")":"#3b3a35";x.stroke();
  icon(i,k.cx,glow);
  x.fillStyle=glow>0.3?"#f4d9cd":"#aeaca3";x.font="500 12.5px -apple-system,Segoe UI,Roboto,sans-serif";x.textAlign="center";x.fillText(k.l,k.cx,Y+CS/2+18);x.textAlign="left"});
 // travelling pulse with a short trail
 for(let j=0;j<6;j++){const q=px-j*7;if(q<140||q>460)continue;x.fillStyle="rgba(217,119,87,"+(0.5-j*0.08)+")";x.beginPath();x.arc(q,Y,6-j*0.7,0,7);x.fill()}
 // the small check on the last card appears as the pulse arrives
 const arrive=Math.max(0,Math.min(1,(px-430)/30));x.fillStyle="rgba(125,211,160,"+arrive+")";x.beginPath();x.arc(460+CS/2-6,Y-CS/2+6,10,0,7);x.fill();
 x.strokeStyle="rgba(20,20,19,"+arrive+")";x.lineWidth=2.2;x.beginPath();x.moveTo(460+CS/2-11,Y-CS/2+6);x.lineTo(460+CS/2-7,Y-CS/2+10);x.lineTo(460+CS/2-1,Y-CS/2+2);x.stroke();
 return c.toDataURL("image/png")}
</script>`;
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(html);
const gif = GIFEncoder();
for (let f = 0; f < FRAMES; f++) {
  // frame 0 shows the finished state: the pulse at the end with the check visible
  const t = f === 0 ? 0.999 : (f - 1) / (FRAMES - 1);
  const url = await page.evaluate((tt) => draw(tt), t);
  const png = PNG.sync.read(Buffer.from(url.split(",")[1], "base64"));
  const rgba = new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.length);
  const palette = quantize(rgba, Number(process.env.COLORS || 48), { format: "rgb565" });
  gif.writeFrame(applyPalette(rgba, palette, "rgb565"), png.width, png.height, { palette, delay: f === 0 ? 400 : DELAY, repeat: 0 });
}
gif.finish();
fs.mkdirSync("public/email", { recursive: true });
fs.writeFileSync("public/email/invite-hero.gif", gif.bytes());
console.log("invite-hero.gif", Math.round(gif.bytes().length / 1024) + " KB", `${W * S}x${H * S}`);
await browser.close();
