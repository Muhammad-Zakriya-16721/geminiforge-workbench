// #region 9. STYLES (own CSS, dark only, no Tailwind)
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,400..600&display=swap";

const CSS = `
.gf{--bg:#141413;--side:#171716;--raise:#1d1c1a;--bubble:#272622;--hover:#252421;--active:#2d2c28;--line:#2a2926;--line2:#3b3a35;
--tx:#faf9f5;--tx2:#d8d6ce;--tx3:#aeaca3;--tx4:#9b9991;--acc:#d97757;--accb:#c96442;--accbh:#d97757;--blue:#7c9cf0;--ok:#7dd3a0;--bad:#f08a8a;--warn:#e6b450;
--codebg:#0f0f0e;--icode:#ef9a9a;--focus:#6da8ff;
--serif:"Newsreader",Georgia,"Times New Roman",serif;--sans:"Inter",system-ui,"Segoe UI",Roboto,sans-serif;--mono:"JetBrains Mono",ui-monospace,Consolas,monospace;
--ease:cubic-bezier(.22,1,.36,1);--t-fade:.14s;--t-move:.22s;--sbw:300px;--panew:0px;--ps:17px;--cw:780px;--pf:var(--serif);
color-scheme:dark;position:fixed;inset:0;display:grid;grid-template-columns:var(--sbw) minmax(0,1fr) var(--panew);
background:var(--bg);color:var(--tx);font:400 14.5px/1.5 var(--sans);overflow:hidden;
transition:grid-template-columns var(--t-move) var(--ease);-webkit-font-smoothing:antialiased}
.gf[data-motion=reduced]{--t-move:0s}
.gf *,.gf *::before,.gf *::after{box-sizing:border-box}
.gf :where(button){font:inherit;color:inherit;cursor:pointer}
.gf :where(:focus-visible){outline:2px solid var(--focus);outline-offset:2px}
.gf ::selection{background:rgba(217,119,87,.32)}
.gf *{scrollbar-width:thin;scrollbar-color:#3b3a35 transparent}
.gf :where(h1,h2,h3,h4,p,ul,dl){margin:0}
.gf a{color:var(--blue);text-underline-offset:2px}
.mono{font-family:var(--mono);letter-spacing:-.01em}.acc{color:var(--acc)}.dim{color:var(--tx4)}.small{font-size:12px}.muted{color:var(--tx3)}
.ic{font:400 .86em var(--mono);color:var(--icode);background:#211f1d;border:1px solid #2c2a27;border-radius:5px;padding:.08em .38em}

/* sidebar */
.side{background:var(--side);border-right:1px solid var(--line);overflow:hidden;min-width:0}
.side-in{width:300px;height:100%;display:flex;flex-direction:column;padding:10px 8px 8px}
.side-top{display:flex;align-items:center;justify-content:space-between;height:36px;padding:0 4px 0 6px;margin-bottom:6px}
.brand{font:500 17px var(--serif);display:flex;align-items:center;gap:8px;letter-spacing:-.01em}
.brand i{width:20px;height:20px;border-radius:50%;background:var(--accb);display:grid;place-items:center;color:#fff;font-style:normal;font-size:12px}
.icon-btn{width:30px;height:30px;border-radius:8px;border:0;background:transparent;display:inline-grid;place-items:center;color:var(--tx3)}
.icon-btn:hover{background:var(--hover);color:var(--tx)}
.icon-btn[aria-pressed=true]{color:var(--acc)}
.side-search{display:flex;align-items:center;gap:8px;width:100%;height:34px;margin-bottom:8px;padding:0 10px;border-radius:9px;border:1px solid var(--line);background:transparent;color:var(--tx3);text-align:left}
.side-search:hover{background:var(--hover)}
.side-search span{flex:1}
kbd{font:500 11px var(--mono);color:var(--tx3);border:1px solid var(--line2);border-radius:5px;padding:1px 5px;background:#1f1e1c}
.side-scroll{flex:1;overflow:auto;min-height:0;margin:0 -4px;padding:0 4px}
.nav{display:flex;align-items:center;gap:10px;width:100%;min-height:34px;padding:5px 10px;border:0;border-radius:9px;background:transparent;text-align:left;color:var(--tx2);position:relative}
.nav:hover{background:var(--hover);color:var(--tx)}
.nav[aria-current=page]{background:var(--active);color:var(--tx)}
.nav-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nav-n{width:20px;height:20px;border-radius:6px;display:inline-grid;place-items:center;font:500 11px var(--mono);color:var(--tx3);background:#201f1c;flex:none}
.nav[aria-current=page] .nav-n{background:#34332e;color:var(--tx)}
.nav svg{flex:none;color:var(--tx3)}
.nav-dot{width:7px;height:7px;border-radius:50%;background:var(--blue);flex:none}
.side-sec{font:500 12px var(--sans);color:var(--tx4);padding:14px 10px 6px;letter-spacing:.01em}
.side-empty{color:var(--tx4);font-size:13px;padding:2px 10px 6px}
.nav-more{position:absolute;right:4px;top:50%;transform:translateY(-50%);opacity:.9;color:var(--tx3)}
.nav:hover .nav-more,.nav:focus-within .nav-more,.nav-more[aria-expanded=true]{opacity:1}
.side-foot{border-top:1px solid var(--line);padding-top:8px;margin-top:6px;position:relative}
.foot-btn{display:flex;align-items:center;gap:10px;width:100%;padding:6px 8px;border:0;border-radius:9px;background:transparent;text-align:left}
.foot-btn:hover{background:var(--hover)}
.avatar{width:26px;height:26px;border-radius:50%;background:#2c2b27;display:grid;place-items:center;font:600 11px var(--sans);color:var(--tx2)}

/* menus */
.menu{position:absolute;z-index:30;min-width:220px;background:#1f1e1c;border:1px solid var(--line2);border-radius:12px;padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.45);animation:gf-in var(--t-move) var(--ease)}
.menu.up{bottom:calc(100% + 6px);left:4px}
.menu-i{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:7px 10px;border:0;border-radius:8px;background:transparent;text-align:left;color:var(--tx2)}
.menu-i:hover,.menu-i:focus-visible{background:var(--hover);color:var(--tx)}
.menu-i[aria-checked=true]{color:var(--tx)}
.menu-i.del{color:var(--bad)}
.menu-i kbd{border:0;background:transparent}
.menu-sep{height:1px;background:var(--line);margin:5px 4px}
.menu-h{font:500 12px var(--sans);color:var(--tx4);padding:6px 10px 4px}

/* main */
.main{display:flex;flex-direction:column;min-width:0;min-height:0;position:relative}
.top{display:flex;align-items:center;gap:8px;height:48px;padding:0 14px;flex:none}
.crumb{display:flex;align-items:center;gap:8px;min-width:0;font-size:14px}
.crumb-p{color:var(--tx3);white-space:nowrap}.crumb-s{color:var(--tx4)}
.crumb-t{color:var(--tx);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top-sp{flex:1}
.chipbtn{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:10px;border:1px solid var(--line2);background:var(--raise);color:var(--tx2)}
.chipbtn:hover{background:var(--hover);color:var(--tx)}
.mainbody{position:relative;flex:1;min-height:0;display:flex;flex-direction:column}
.thread{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scroll-behavior:auto}
.col{width:min(var(--cw),100%);margin:0 auto;padding:18px 28px 40px}
.enter{animation:gf-in var(--t-move) var(--ease) both}
.gf[data-motion=reduced] .enter{animation-name:gf-fade}
@keyframes gf-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes gf-fade{from{opacity:0}to{opacity:1}}

/* document (assistant message) */
.doc{font:400 var(--ps)/1.62 var(--pf);color:var(--tx2)}
.kicker{display:inline-block;font:500 11.5px var(--mono);letter-spacing:.04em;color:var(--acc);background:rgba(217,119,87,.1);border:1px solid rgba(217,119,87,.22);border-radius:999px;padding:4px 12px;margin-bottom:14px}
.h1{font:400 40px/1.12 var(--serif);letter-spacing:-.02em;color:var(--tx);margin:4px 0 16px}
.h2{font:450 26px/1.2 var(--serif);letter-spacing:-.012em;color:var(--tx);margin:38px 0 12px;scroll-margin-top:12px}
.h4{font:500 18px var(--serif);color:var(--tx);margin:18px 0 8px}
.p{margin:0 0 14px}
.doc strong{color:var(--tx);font-weight:600}
.lead{color:var(--tx);margin:0 0 10px}
.meta{font:400 13px/1.5 var(--sans);color:var(--tx3);margin:0 0 8px}
.doc .ic{font-size:.8em}.h1 .ic,.h2 .ic{font-size:.62em;padding:.05em .3em}
.blk{margin:6px 0 14px}.stack{display:flex;flex-direction:column;gap:10px}
.grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 14px}
.chip{display:inline-flex;align-items:center;font:500 11.5px/1 var(--sans);color:var(--tx3);background:#232220;border:1px solid var(--line);border-radius:999px;padding:5px 9px;white-space:nowrap}
.chip.ok{color:var(--ok);border-color:rgba(125,211,160,.25);background:rgba(125,211,160,.08)}
.chip.bad{color:var(--bad);border-color:rgba(240,138,138,.28);background:rgba(240,138,138,.08)}
.st-completed{color:var(--ok)}.st-running{color:var(--blue)}.st-in_review{color:var(--warn)}.st-pending{color:var(--tx3)}

/* rows (collapsible) */
.row{border:1px solid var(--line);border-radius:14px;background:var(--raise);margin-bottom:8px;overflow:hidden}
.row-h{font:inherit}
.row-h button{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border:0;background:transparent;text-align:left;font:500 15px/1.35 var(--sans);color:var(--tx)}
.row-h button:hover{background:var(--hover)}
.row-t{flex:1;min-width:0}
.row-chev{flex:none;color:var(--tx3);transition:transform var(--t-move) var(--ease)}
.row[data-open=true] .row-chev{transform:rotate(180deg)}
.row-sum{font:400 13.5px/1.45 var(--sans);color:var(--tx3);padding:0 14px 12px;margin-top:-4px}
.row-p{display:grid;grid-template-rows:0fr;transition:grid-template-rows var(--t-move) var(--ease)}
.row[data-open=true] .row-p{grid-template-rows:1fr}
.row-in{overflow:hidden;min-height:0;padding:0 14px;font:400 calc(var(--ps) - 1px)/1.6 var(--pf)}
.row[data-open=true] .row-in{padding-bottom:12px;border-top:1px solid var(--line);padding-top:12px}

/* cards + controls */
.card{display:flex;flex-direction:column;gap:6px;text-align:left;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--raise);color:var(--tx2);font:400 14px/1.45 var(--sans)}
.card-btn{cursor:pointer;width:100%}
.card-btn:hover{border-color:var(--line2);background:#211f1d}
.card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px}
.card-t{font:500 15.5px/1.35 var(--sans);color:var(--tx)}
.card-x{font:400 13.5px/1.5 var(--sans);color:var(--tx3);margin:0}
.btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:9px;border:1px solid var(--line2);background:var(--raise);color:var(--tx2);font:500 13px var(--sans)}
.btn:hover:not(:disabled){background:var(--hover);color:var(--tx)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-ghost{border-color:transparent;background:transparent;color:var(--tx3)}
.btn-primary{background:var(--accb);border-color:var(--accb);color:#141413}
.btn-primary:hover:not(:disabled){background:var(--accbh);color:#141413}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 2px}
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px}
.field{height:34px;border-radius:9px;border:1px solid var(--line2);background:#181715;color:var(--tx);padding:0 10px;font:400 14px var(--sans);min-width:0}
.toolbar .field{flex:1;min-width:200px}
.field::placeholder{color:var(--tx4)}
select.field{padding-right:6px}
.seg{display:inline-flex;flex-wrap:wrap;gap:4px;padding:3px;border-radius:11px;background:#191817;border:1px solid var(--line)}
.seg button{border:0;border-radius:8px;background:transparent;color:var(--tx3);padding:5px 10px;font:500 12.5px var(--sans)}
.seg button:hover{color:var(--tx)}
.seg button[aria-pressed=true]{background:var(--active);color:var(--tx)}
.meter{height:6px;border-radius:99px;background:#2a2926;overflow:hidden}
.meter i{display:block;height:100%;background:var(--acc);border-radius:99px;transition:width var(--t-move) var(--ease)}
.meter[data-over=true] i{background:var(--bad)}
.tbl{overflow-x:auto;border:1px solid var(--line);border-radius:12px;margin:6px 0 14px}
.tbl table{width:100%;border-collapse:collapse;font:400 13px/1.45 var(--sans);min-width:560px}
.tbl th{font:500 12px var(--sans);color:var(--tx3);text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);background:#191817}
.tbl td{padding:9px 12px;border-bottom:1px solid var(--line);color:var(--tx2);vertical-align:top}
.tbl tr:last-child td{border-bottom:0}
.dl{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:12.5px}.dl dt{color:var(--tx3)}.dl dd{margin:0;color:var(--tx2)}

/* code */
.code{margin:10px 0;border:1px solid var(--line);border-radius:12px;background:var(--codebg);overflow:hidden}
.code figcaption{display:flex;align-items:center;justify-content:space-between;padding:4px 6px 4px 14px;border-bottom:1px solid var(--line);font:500 12px var(--mono);color:var(--tx3)}
.code pre{margin:0;padding:12px 14px;overflow:auto;max-height:340px;font:400 12.5px/1.6 var(--mono);color:#e9e7df;white-space:pre}
.tk-c{color:#7d7b73}.tk-s{color:#8fd694}.tk-n{color:#e6b450}.tk-k{color:#e58bd6}

/* charts */
.chart{margin:8px 0 16px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--raise);font-family:var(--sans)}
.chart figcaption{font:500 13px var(--sans);color:var(--tx);margin-bottom:10px}
.chart-row{display:grid;grid-template-columns:minmax(110px,150px) 1fr;gap:12px;padding:8px 0;border-top:1px solid var(--line);align-items:center}
.chart-row[data-hl=true] .chart-l{color:var(--acc)}
.chart-l{font:500 13px var(--sans);color:var(--tx2)}
.chart-bars{display:flex;flex-direction:column;gap:6px;min-width:0}
.chart-line{display:flex;align-items:center;gap:10px;font:400 12px var(--sans);color:var(--tx3);min-height:16px}
.chart-line i{display:block;height:8px;border-radius:99px;flex:none;min-width:0}
.chart-line .b1{background:#8f8d86}.chart-line .b2{background:var(--acc)}

/* dock + composer */
.dock{flex:none;position:relative;padding:0 20px 12px}
.cmp-wrap{width:min(var(--cw),100%);margin:0 auto}
.cmp{position:relative;border:1px solid var(--line2);border-radius:18px;background:var(--raise);padding:12px 14px 10px;box-shadow:0 2px 14px rgba(0,0,0,.28);transition:border-color var(--t-fade)}
.cmp:focus-within{border-color:#555349}
.cmp textarea{display:block;width:100%;resize:none;border:0;outline:0;background:transparent;color:var(--tx);font:400 16px/1.5 var(--sans);padding:2px 0;min-height:26px}
.cmp textarea::placeholder{color:var(--tx4)}
.cmp textarea:focus-visible{outline:0}
.cmp-bar{display:flex;align-items:center;gap:8px;margin-top:6px;min-height:34px}
.cmp-sp{flex:1}
.send{width:34px;height:34px;border-radius:10px;border:0;background:var(--accb);color:#fff;display:grid;place-items:center}
.send:disabled{background:#2a2926;color:var(--tx4);cursor:not-allowed}
.send:hover:not(:disabled){background:var(--accbh)}
.cmp-note{font:400 12.5px var(--sans);color:var(--tx4);text-align:center;margin-top:10px}
.cmp-collapsed{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;text-align:left;padding:4px 0;color:var(--tx3)}
.cmp-collapsed span:first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pastes{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.paste{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line2);background:#232220;border-radius:9px;padding:4px 6px 4px 10px;font:500 12.5px var(--sans);color:var(--tx2)}
.paste button{border:0;background:transparent;display:grid;place-items:center;color:var(--tx3);border-radius:6px;width:20px;height:20px}
.slash{position:absolute;left:0;right:0;bottom:calc(100% + 8px);max-height:320px;overflow:auto;background:#1f1e1c;border:1px solid var(--line2);border-radius:14px;padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.45);z-index:20}
.slash-i{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:9px;cursor:pointer;color:var(--tx2)}
.slash-i[aria-selected=true]{background:var(--active);color:var(--tx)}
.slash-i small{color:var(--tx3);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%}
.stb{position:absolute;left:50%;top:-46px;transform:translateX(-50%);width:34px;height:34px;border-radius:50%;border:1px solid var(--line2);background:#1f1e1c;color:var(--tx2);display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.4);animation:gf-fade var(--t-fade) both}
.stb:hover{background:var(--active)}

/* turns */
.turn-u{display:flex;justify-content:flex-end;margin:22px 0 10px}
.turn-u div{max-width:78%;background:var(--bubble);border-radius:16px;padding:10px 14px;font:400 15px/1.5 var(--sans);color:var(--tx);white-space:pre-wrap;overflow-wrap:anywhere}
.turn-a{font:400 var(--ps)/1.62 var(--pf);color:var(--tx2);margin:10px 0 18px;white-space:pre-wrap;overflow-wrap:anywhere}
.turn-ac{display:flex;gap:2px;margin-top:6px}

/* hud lab */
.hud{border:1px solid var(--line2);border-radius:14px;padding:14px;background:var(--raise);display:flex;flex-direction:column;gap:12px}
.hud[data-s=armed]{border-color:rgba(240,138,138,.4)}.hud[data-s=reaped]{border-color:rgba(125,211,160,.4)}
.hud-bar{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--tx2)}
.hud-led{width:10px;height:10px;border-radius:50%;background:var(--bad)}.hud[data-s=reaped] .hud-led{background:var(--ok)}

/* notes + import */
.notes{margin:44px 0 10px;padding-top:18px;border-top:1px solid var(--line);font-family:var(--sans)}
.notes-h{font:500 15px var(--sans);color:var(--tx);margin-bottom:8px}
.notes textarea,.imp textarea{width:100%;min-height:72px;resize:vertical;border:1px solid var(--line2);background:#181715;border-radius:10px;color:var(--tx);padding:9px 12px;font:400 14px/1.5 var(--sans)}
.notes-l{list-style:none;padding:0;margin:12px 0 0;display:flex;flex-direction:column;gap:8px}
.notes-l li{border:1px solid var(--line);border-radius:12px;background:var(--raise);padding:10px 14px}
.notes-l p{margin:0 0 6px;font:400 14.5px/1.5 var(--sans);color:var(--tx2);white-space:pre-wrap;overflow-wrap:anywhere}
.notes-f{display:flex;align-items:center;gap:8px;font:400 12.5px var(--sans);color:var(--tx3)}
.notes-f .btn{height:26px;padding:0 8px}.notes-f .btn:last-child{margin-left:auto}
dialog.imp{width:min(560px,calc(100vw - 32px))}
.imp-in{padding:18px;display:flex;flex-direction:column;gap:10px;font-family:var(--sans)}
.imp-in input[type=file]{font:400 13px var(--sans);color:var(--tx2)}

/* answers */
.ans-u{font:400 12.5px var(--sans);color:var(--tx4);margin:0 0 6px}.ans-u span{color:var(--tx3);font-weight:500}
.ans[data-status=closest],.ans[data-status=none]{border-left:2px solid var(--line2);padding-left:12px}
.ans{font:400 var(--ps)/1.62 var(--pf);color:var(--tx2);margin:10px 0 18px}
.ans-p{margin:0 0 12px;overflow-wrap:anywhere}.ans strong{color:var(--tx);font-weight:600}
.ans-kv{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0 0 12px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--raise);font:400 14px/1.45 var(--sans)}
.ans-kv dt{color:var(--tx3)}.ans-kv dd{margin:0;color:var(--tx2);overflow-wrap:anywhere}
.ans-items{display:flex;flex-direction:column;gap:6px;margin:0 0 12px}
.ans-item{display:flex;flex-direction:column;gap:2px;text-align:left;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--raise);font-family:var(--sans)}
.ans-item:hover{border-color:var(--line2);background:#211f1d}
.ans-t{font:500 14.5px/1.35 var(--sans);color:var(--tx)}.ans-s{font:400 13px/1.45 var(--sans);color:var(--tx3)}
.srcs{font-family:var(--sans)}
.srcs-b{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:var(--tx3);font:500 13px var(--sans);padding:4px 0}
.srcs-b:hover{color:var(--tx)}
.srcs-l{list-style:none;padding:0;margin:6px 0 0;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.srcs-l li+li{border-top:1px solid var(--line)}
.srcs-l button{width:100%;text-align:left;border:0;background:transparent;padding:8px 14px;color:var(--tx2);font:400 13.5px var(--sans)}
.srcs-l button:hover{background:var(--hover);color:var(--tx)}
.try{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:14px}
.try .chipbtn{font:400 13px var(--sans);padding:6px 12px}

/* home */
.home{width:min(var(--cw),100%);margin:0 auto;padding:14vh 24px 40px}
.home .cmp textarea{min-height:56px}.home .cmp{padding-top:16px}
.greet{display:flex;align-items:center;justify-content:center;gap:14px;font:400 40px/1.1 var(--serif);color:var(--tx);letter-spacing:-.015em;margin-bottom:34px}
.greet svg{color:var(--acc);flex:none}
.jb-h{font:500 13px var(--sans);color:var(--tx3);margin:30px 0 8px;padding:0 4px}
.jb{display:flex;align-items:center;gap:12px;width:100%;padding:10px 8px;border:0;border-radius:12px;background:transparent;text-align:left}
.jb:hover{background:var(--hover)}
.jb-i{width:38px;height:38px;border-radius:10px;background:#1b2447;color:var(--blue);display:grid;place-items:center;flex:none}
.jb-t{font:500 15px var(--sans);color:var(--tx)}
.jb-s{font:400 13px var(--sans);color:var(--tx3)}

/* library + tracker */
.view-h{font:500 32px/1.15 var(--serif);color:var(--tx);margin:6px 0 6px;letter-spacing:-.015em}
.lib-g{margin-top:26px}
.lib-g h2{font:500 14px var(--sans);color:var(--tx3);margin-bottom:8px;display:flex;gap:8px;align-items:center}
.trk{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--raise);margin-bottom:8px;font-family:var(--sans)}
.trk[data-next=true]{border-color:rgba(217,119,87,.45)}
.trk-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.trk-t{font:500 14.5px/1.35 var(--sans);color:var(--tx);flex:1;min-width:220px}
.trk textarea{width:100%;min-height:36px;resize:vertical;border:1px solid var(--line2);background:#181715;border-radius:9px;color:var(--tx);padding:7px 10px;font:400 13.5px/1.45 var(--sans)}

/* outline rail */
.rail{position:absolute;left:14px;top:50%;transform:translateY(-50%);z-index:5}
.rail-dash{display:flex;flex-direction:column;gap:7px;padding:10px 8px;border:0;background:transparent;cursor:pointer}
.rail-dash i{display:block;height:2px;width:14px;border-radius:2px;background:#4a4943;transition:width var(--t-fade),background var(--t-fade)}
.rail-dash i[data-a=true]{width:20px;background:var(--tx)}
.rail-pop{display:none;position:absolute;left:0;top:50%;transform:translateY(-50%);min-width:250px;max-width:300px;background:#1f1e1c;border:1px solid var(--line2);border-radius:12px;padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.rail:hover .rail-pop,.rail:focus-within .rail-pop{display:block}
.rail:hover .rail-dash,.rail:focus-within .rail-dash{visibility:hidden}
.rail-i{display:flex;align-items:center;gap:10px;width:100%;padding:7px 10px;border:0;border-radius:8px;background:transparent;text-align:left;color:var(--tx3);font:400 13.5px var(--sans)}
.rail-i:hover{background:var(--hover);color:var(--tx)}
.rail-i b{display:block;height:2px;width:14px;border-radius:2px;background:#4a4943;flex:none}
.rail-i[aria-current=true]{color:var(--tx)}.rail-i[aria-current=true] b{background:#7da6ff;width:20px}
@media (max-width:1180px){.rail{display:none}}

/* side panel */
.scrim{display:none}
.pane-col{min-width:0;overflow:hidden;background:var(--bg)}
.pane{position:relative;height:100%;display:flex;flex-direction:column;border-left:1px solid var(--line);background:var(--side);animation:gf-in var(--t-move) var(--ease) both}
.gf[data-motion=reduced] .pane{animation-name:gf-fade}
.pane-grip{position:absolute;left:-3px;top:0;bottom:0;width:7px;cursor:col-resize;z-index:6}
.pane-grip:hover,.pane-grip:focus-visible{background:rgba(125,166,255,.35)}
.pane-h{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 14px 10px;border-bottom:1px solid var(--line)}
.pane-hd{min-width:0;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.pane-t{font:500 20px/1.25 var(--serif);color:var(--tx);overflow-wrap:anywhere}
.pane-ac{display:flex;gap:2px;flex:none}
.pane-b{flex:1;min-height:0;overflow:auto;padding:14px;font:400 calc(var(--ps) - 1px)/1.6 var(--pf);color:var(--tx2)}
.pane-b>.chip{margin-bottom:10px}
.lab{display:flex;flex-direction:column;gap:12px;font-family:var(--sans)}
.lab-l{display:flex;flex-direction:column;gap:6px;font:400 13px var(--sans);color:var(--tx2)}
.lab-l>span{display:flex;justify-content:space-between;gap:8px}
.lab input[type=range]{width:100%;accent-color:var(--acc)}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tile{display:flex;flex-direction:column;gap:6px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--raise)}
.tile-k{font:500 11.5px var(--sans);color:var(--tx3)}.tile-v{font:500 14px/1.35 var(--sans);color:var(--tx)}.tile-s{font:400 12px var(--sans);color:var(--tx3)}
.tile[data-v=nofit],.tile[data-v=tierE]{border-color:rgba(240,138,138,.4)}.tile[data-v=gate]{border-color:rgba(230,180,80,.5)}.tile[data-v=tight]{border-color:rgba(230,180,80,.3)}.tile[data-v=ok]{border-color:rgba(125,211,160,.35)}
.banner{padding:10px 12px;border-radius:10px;font:500 13px var(--sans)}
.banner[data-k=info]{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between;background:#201f1c;border:1px solid var(--line2);color:var(--tx2);font-weight:400;margin:14px 0}.banner[data-k=ok]{background:rgba(125,211,160,.1);color:var(--ok)}.banner[data-k=conflict]{background:rgba(240,138,138,.1);color:var(--bad)}
.log{list-style:none;padding:0;display:flex;flex-direction:column;gap:3px;font:400 12.5px var(--mono);color:var(--tx3)}.log li[data-h=true]{color:var(--tx);margin-top:6px}

/* palette */
dialog.pal{padding:0;border:1px solid var(--line2);border-radius:16px;background:#1d1c1a;color:var(--tx);width:min(680px,calc(100vw - 32px));max-height:min(520px,calc(100dvh - 120px));margin:12vh auto auto;box-shadow:0 24px 70px rgba(0,0,0,.6)}
dialog.pal[open]{display:flex;flex-direction:column;animation:gf-in var(--t-move) var(--ease)}
dialog.pal::backdrop{background:rgba(0,0,0,.5)}
dialog.cf{margin:auto;width:min(480px,calc(100vw - 32px));max-height:calc(100dvh - 48px)}
.pal-in{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}
.pal-in input{flex:1;border:0;background:transparent;color:var(--tx);font:400 16px var(--sans);outline:0}
.pal-in:focus-within{box-shadow:inset 0 -2px 0 var(--acc)}
.pal-list{overflow:auto;padding:6px;flex:1;min-height:0}
.pal-i{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:10px;cursor:pointer;color:var(--tx2)}
.pal-i[aria-selected=true]{background:var(--active);color:var(--tx)}
.pal-i small{display:block;color:var(--tx3);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:460px}
.pal-t{min-width:0}.pal-g{font:500 11px var(--mono);color:var(--tx4);flex:none}
.pal-ft{display:flex;gap:14px;padding:8px 14px;border-top:1px solid var(--line);font:400 12px var(--sans);color:var(--tx3)}

.toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#262522;border:1px solid var(--line2);color:var(--tx);padding:9px 14px;border-radius:10px;font:500 13px var(--sans);z-index:60;animation:gf-in var(--t-move) var(--ease);display:flex;align-items:center;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,.4)}.toast-undo{border:0;background:transparent;color:var(--acc);font:600 13px var(--sans);padding:2px 4px;text-decoration:underline}
.boundary{border:1px solid rgba(240,138,138,.4);background:rgba(240,138,138,.07);border-radius:12px;padding:14px;margin:12px 0;font-family:var(--sans)}
.boundary p{margin:6px 0 10px;color:var(--tx2)}.boundary .btn{margin-right:8px}
/* settings / app docs */
dialog.set{padding:0;border:1px solid var(--line2);border-radius:18px;background:#1a1917;color:var(--tx);width:min(980px,calc(100vw - 32px));height:min(680px,calc(100dvh - 48px));max-width:none;max-height:none;margin:auto;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden;font-family:var(--sans)}
dialog.set[open]{display:block;animation:gf-in var(--t-move) var(--ease)}
dialog.set::backdrop{background:rgba(0,0,0,.55)}
.set-wrap{display:grid;grid-template-columns:230px minmax(0,1fr);height:100%}
.set-nav{display:flex;flex-direction:column;gap:2px;padding:16px 10px;border-right:1px solid var(--line);background:#171716;overflow:auto}
.set-search{width:100%;height:34px;margin-bottom:10px;padding:0 10px;border-radius:9px;border:1px solid var(--line2);background:#1d1c1a;color:var(--tx);font:400 13.5px var(--sans)}
.set-search::placeholder{color:var(--tx4)}
.set-tab{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:0;border-radius:9px;background:transparent;color:var(--tx2);text-align:left}
.set-tab:hover{background:var(--hover);color:var(--tx)}
.set-tab[aria-current=page]{background:var(--active);color:var(--tx)}
.set-main{display:flex;flex-direction:column;min-width:0;min-height:0}
.set-top{display:flex;align-items:center;justify-content:space-between;padding:16px 22px 10px}
.set-top h2{font:500 22px var(--serif);color:var(--tx)}
.set-body{flex:1;min-height:0;overflow:auto;padding:0 22px 28px}
.set-h{display:flex;align-items:center;justify-content:space-between;font:500 12px var(--sans);letter-spacing:.04em;text-transform:uppercase;color:var(--tx4);margin:22px 0 8px}
.set-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 0;border-bottom:1px solid var(--line)}
.set-l{min-width:0;flex:1}.set-t{font:500 14.5px var(--sans);color:var(--tx)}.set-d{font:400 13px/1.45 var(--sans);color:var(--tx3);margin-top:2px}
.set-c{flex:none;max-width:55%}
.set-in{height:34px;width:220px;max-width:100%;padding:0 10px;border-radius:9px;border:1px solid var(--line2);background:#1d1c1a;color:var(--tx);font:400 14px var(--sans)}
.set-prev{font:400 var(--ps)/1.6 var(--pf);color:var(--tx2);margin:10px 0 4px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--raise)}
.feat{padding:12px 0;border-bottom:1px solid var(--line)}
.feat-t{display:flex;align-items:center;justify-content:space-between;gap:12px;font:500 14.5px var(--sans);color:var(--tx)}
.feat-d{font:400 13.5px/1.5 var(--sans);color:var(--tx2);margin:3px 0 0}.feat-h{font:400 13px/1.5 var(--sans);color:var(--tx3);margin:3px 0 0}.feat-h b{font-weight:500;color:var(--tx3)}
.sc{width:100%;border-collapse:collapse;font:400 13.5px/1.4 var(--sans)}
.sc th{text-align:left;font:500 12px var(--sans);color:var(--tx4);padding:6px 8px;border-bottom:1px solid var(--line)}
.sc td{padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top;color:var(--tx2)}
.keys i{font-style:normal;color:var(--tx4);margin:0 3px;font-size:12px}
.ex{margin:0 0 10px}.ex-t{font:500 13px var(--sans);color:var(--tx3);margin-bottom:6px}
.miss{list-style:none;margin:0;padding:0}.miss li{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}.miss li span:first-child{flex:1;min-width:0;overflow-wrap:anywhere;color:var(--tx2)}
.stats{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}.stats li{padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--raise);color:var(--tx3)}.stats b{color:var(--tx);font-weight:600}
.rn{margin:6px 0 0;padding-left:18px;color:var(--tx2);font:400 13.5px/1.55 var(--sans)}
.btn-danger{color:var(--bad);border-color:rgba(240,138,138,.35)}.btn-danger:hover:not(:disabled){background:rgba(240,138,138,.1);color:var(--bad)}
.menu-id{display:flex;align-items:center;gap:10px;padding:8px 10px 10px}.menu-id .avatar{width:32px;height:32px}.menu-id b{display:block;font-weight:500;color:var(--tx)}
@media (max-width:760px){.set-wrap{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.set-nav{flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid var(--line);padding:10px}.set-search{flex:1 0 100%}.set-tab{width:auto;padding:6px 9px}.set-tab span{display:inline}.set-row{flex-direction:column;align-items:flex-start;gap:8px}.set-c{max-width:100%}}
.hist-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:10px 0}.hist-all{display:flex;align-items:center;gap:8px;color:var(--tx2);font:400 13.5px var(--sans)}
.hist{list-style:none;margin:6px 0 0;padding:0}.hist-i{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)}
.hist-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left;border:0;background:transparent;padding:4px 6px;border-radius:8px;color:var(--tx)}.hist-t:hover{background:var(--hover)}
.hist-t span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hist-t small{color:var(--tx3);font-size:12.5px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:900px){
.gf{--sbw:0px!important;--panew:0px!important;grid-template-columns:minmax(0,1fr)}
.side{position:fixed;inset:0 auto 0 0;width:300px;z-index:40;transform:translateX(-100%);transition:transform var(--t-move) var(--ease);box-shadow:0 0 40px rgba(0,0,0,.5)}
.gf[data-sb=open] .side{transform:none}
.scrim{display:none}
.gf[data-sb=open] .scrim{display:block;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:39}
.pane-col{position:fixed;inset:0;z-index:35;width:100%!important}
.pane-col[data-open=false]{display:none}
.pane{width:100%!important}.pane-grip{display:none}
.col{padding:14px 16px 36px}.h1{font-size:32px}.h2{font-size:23px}.greet{font-size:32px}.home{padding:9vh 16px 32px}
.dock{padding:0 12px 8px}.tiles{grid-template-columns:1fr}
}
@media (max-width:600px){.crumb-p,.crumb-s{display:none}.chart-row{grid-template-columns:1fr}.cmp{padding:10px 12px 8px}}
@media print{.row-p{grid-template-rows:1fr!important}.row-in{padding:12px 14px!important;border-top:1px solid #ccc}.row{break-inside:avoid}.gf{position:static;display:block;overflow:visible}.side,.top,.dock,.rail,.pane-col{display:none!important}.thread{overflow:visible}.doc{color:#111}.h1,.h2,.doc strong{color:#000}}
`;
// #endregion
