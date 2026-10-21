// #region 6b. UI KIT: popover, custom Select (select-only combobox), action menu, search field, empty state
// Every dropdown in the app uses these, so the look, the keyboard behaviour and the animation are the same everywhere.
export interface Opt { value: string; label: string; hint?: string; disabled?: boolean }

// The popup is drawn in the nearest open <dialog> (a modal dialog sits in the top layer and would hide anything outside it), otherwise in the app root.
function popHost(el: HTMLElement | null): HTMLElement {
  return (el?.closest("dialog") as HTMLElement | null) ?? (el?.closest(".gf") as HTMLElement | null) ?? document.body;
}

export function Pop({ anchor, onClose, est = 200, minW = 0, align = "start", role, label, className = "", children }: { anchor: React.RefObject<HTMLElement | null>; onClose: () => void; est?: number; minW?: number; align?: "start" | "end"; role?: string; label?: string; className?: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; w: number; up: boolean; max: number } | null>(null);
  const host = popHost(anchor.current);
  useLayoutEffect(() => {
    const a = anchor.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 10;
    const above = r.top - 10;
    const up = below < Math.min(est, 240) && above > below;
    const w = Math.max(r.width, minW);
    const left = Math.min(Math.max(8, align === "end" ? r.right - w : r.left), Math.max(8, window.innerWidth - w - 8));
    setPos({ left, top: up ? r.top - 4 : r.bottom + 4, w, up, max: Math.max(120, Math.min(320, (up ? above : below) - 4)) });
  }, [anchor, est, minW, align]);
  useEffect(() => {
    const down = (e: PointerEvent) => { const t = e.target as Node; if (box.current?.contains(t) || anchor.current?.contains(t)) return; onClose(); };
    const scroll = (e: Event) => { if (box.current?.contains(e.target as Node)) return; onClose(); };
    document.addEventListener("pointerdown", down);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", onClose);
    return () => { document.removeEventListener("pointerdown", down); window.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", onClose); };
  }, [anchor, onClose]);
  return createPortal(
    <div ref={box} className="pop-w" style={{ position: "fixed", left: pos?.left ?? 0, top: pos?.top ?? 0, width: pos?.w, visibility: pos ? "visible" : "hidden", transform: pos?.up ? "translateY(-100%)" : undefined }}>
      <div className={`pop ${pos?.up ? "up" : ""} ${className}`} role={role} aria-label={label} style={{ maxHeight: pos?.max }}>{children}</div>
    </div>,
    host
  );
}

export function Select({ value, onChange, options, label, placeholder = "Choose…", width, disabled, className = "", id }: { value: string; onChange: (v: string) => void; options: Opt[]; label: string; placeholder?: string; width?: number | string; disabled?: boolean; className?: string; id?: string }) {
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const btn = useRef<HTMLButtonElement | null>(null);
  const type = useRef({ s: "", t: 0 });
  const uid0 = useRef(`sel-${Math.random().toString(36).slice(2, 8)}`).current;
  const cur = options.find((o) => o.value === value);
  const close = useCallback(() => setOpen(false), []);
  const enabled = (i: number) => options[i] && !options[i].disabled;
  const step = (from: number, d: 1 | -1) => { let i = from; for (let n = 0; n < options.length; n++) { i = (i + d + options.length) % options.length; if (enabled(i)) return i; } return from; };
  const openAt = (i?: number) => { const idx = options.findIndex((o) => o.value === value); setAct(i ?? (idx >= 0 ? idx : step(-1, 1))); setOpen(true); };
  const choose = (i: number) => { if (!enabled(i)) return; setOpen(false); btn.current?.focus(); if (options[i].value !== value) onChange(options[i].value); };
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") { e.preventDefault(); openAt(); }
      return;
    }
    if (k === "ArrowDown") { e.preventDefault(); setAct((i) => step(i, 1)); }
    else if (k === "ArrowUp") { e.preventDefault(); setAct((i) => step(i, -1)); }
    else if (k === "Home") { e.preventDefault(); setAct(step(-1, 1)); }
    else if (k === "End") { e.preventDefault(); setAct(step(0, -1)); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); choose(act); }
    else if (k === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (k === "Tab") { setOpen(false); }
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      type.current = { s: now - type.current.t > 700 ? k.toLowerCase() : type.current.s + k.toLowerCase(), t: now };
      const hit = options.findIndex((o, i) => enabled(i) && o.label.toLowerCase().startsWith(type.current.s));
      if (hit >= 0) setAct(hit);
    }
  };
  useEffect(() => { if (open) document.getElementById(`${uid0}-${act}`)?.scrollIntoView({ block: "nearest" }); }, [open, act, uid0]);
  return (
    <>
      <button ref={btn} id={id} type="button" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${uid0}-l` : undefined} aria-activedescendant={open ? `${uid0}-${act}` : undefined} disabled={disabled} className={`sel ${className}`} data-ph={!cur} style={{ width }} onClick={() => (open ? setOpen(false) : openAt())} onKeyDown={onKey}>
        <span className="sel-v">{cur ? cur.label : placeholder}</span>
        <ChevronDown size={14} aria-hidden className="sel-c" />
      </button>
      {open && (
        <Pop anchor={btn} onClose={close} est={options.length * 30 + 10} minW={150} role="listbox" label={label} className="sel-pop">
          <div id={`${uid0}-l`}>
            {options.map((o, i) => (
              <div key={o.value} id={`${uid0}-${i}`} role="option" aria-selected={o.value === value} aria-disabled={o.disabled || undefined} data-act={i === act} className="opt" onPointerDown={(e) => e.preventDefault()} onMouseMove={() => { if (!o.disabled) setAct(i); }} onClick={() => choose(i)}>
                <span className="opt-t">{o.label}{o.hint && <small>{o.hint}</small>}</span>
                {o.value === value && <Check size={14} aria-hidden className="opt-ck" />}
              </div>
            ))}
          </div>
        </Pop>
      )}
    </>
  );
}

export interface MenuEntry { label: string; run: () => void; icon?: React.ElementType; danger?: boolean; kbd?: string; hint?: string; sep?: boolean; current?: boolean; heading?: boolean }

// A "···" or custom button that opens a menu of actions. Items are real buttons (role menuitem) with arrow-key navigation.
export function MenuList({ items, onClose }: { items: MenuEntry[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useMenuNav(ref);
  return (
    <div ref={ref}>
      {items.map((it, i) => it.sep ? <div key={i} className="menu-sep" /> : it.heading ? <div key={i} className="menu-h">{it.label}</div> : (
        <button key={i} type="button" role="menuitem" className={`menu-i ${it.danger ? "del" : ""}`} aria-current={it.current ? "true" : undefined} onClick={() => { onClose(); it.run(); }}>
          <span className="mi-l">{it.icon && <it.icon size={15} aria-hidden />}<span>{it.label}{it.hint && <small>{it.hint}</small>}</span></span>
          {it.current ? <Check size={14} aria-hidden /> : it.kbd ? <kbd>{it.kbd}</kbd> : null}
        </button>
      ))}
    </div>
  );
}

export function ActionMenu({ items, label, icon: Icon = Ellipsis, className = "icon-btn", children, minW = 200, align = "end" }: { items: MenuEntry[]; label: string; icon?: React.ElementType; className?: string; children?: React.ReactNode; minW?: number; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button ref={btn} type="button" className={className} aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} onKeyDown={(e) => { if (open && e.key === "Escape") { e.stopPropagation(); setOpen(false); } }}>
        {children ?? <Icon size={16} aria-hidden />}
      </button>
      {open && <Pop anchor={btn} onClose={close} est={items.length * 30 + 12} minW={minW} align={align} role="menu" label={label} className="menu-pop" ><MenuList items={items} onClose={close} /></Pop>}
    </>
  );
}

export function SearchField({ value, onChange, placeholder = "Search", label, width }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string; width?: number | string }) {
  return (
    <div className="sfield" style={{ width }}>
      <Search size={14} aria-hidden />
      <input type="search" aria-label={label ?? placeholder} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape" && value) { e.stopPropagation(); onChange(""); } }} />
      {value && <button type="button" className="sf-x" aria-label="Clear search" onClick={() => onChange("")}><X size={13} aria-hidden /></button>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: React.ElementType; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-i"><Icon size={22} aria-hidden /></span>
      <b>{title}</b>
      {text && <p>{text}</p>}
      {children && <div className="actions" style={{ justifyContent: "center" }}>{children}</div>}
    </div>
  );
}

// A centered dialog for forms. Escape and a click on the backdrop close it; focus starts on the first field.
export function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  const dlg = useRef<HTMLDialogElement | null>(null);
  useEffect(() => { const d = dlg.current; if (d && !d.open) d.showModal(); d?.querySelector<HTMLElement>("input,button.sel,textarea")?.focus(); }, []);
  return (
    <dialog ref={dlg} className="pal imp cf mod" aria-labelledby="mod-t" style={{ width: `min(${width}px, calc(100vw - 32px))` }} onClose={onClose} onClick={(e) => { if (e.target === dlg.current) onClose(); }}>
      <div className="imp-in">
        <div className="mod-h"><h2 id="mod-t" className="h4" style={{ margin: 0 }}>{title}</h2><button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} aria-hidden /></button></div>
        {children}
      </div>
    </dialog>
  );
}

export const fmtDay = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");

const UI_CSS = `
/* density: one rule set for every row the pointer can hit, so hover and click areas are small and the same everywhere */
.gf{--rh:30px;--rr:7px}
.side-in{width:272px;padding:8px 8px 6px}
.side-top{height:34px;padding:0 2px 0 8px;margin-bottom:4px}
.side-scroll{margin:0;padding:0}
.nav,.menu-i,.pal-i,.slash-i,.psw-i,.set-tab,.rail-i,.opt,.srcs-l button,.foot-btn,.hist-t{min-height:var(--rh);padding:4px 8px;border-radius:var(--rr);font-size:13.5px;line-height:1.35}
.nav{gap:9px}.nav svg{width:15px;height:15px}
.icon-btn{width:28px;height:28px;border-radius:var(--rr)}
.btn{height:30px;border-radius:8px;padding:0 11px}
.field,.set-in{height:32px;border-radius:8px}
.seg{border-radius:9px;padding:2px;gap:2px}.seg button{padding:4px 10px;border-radius:7px}
.menu{padding:4px;border-radius:10px;min-width:200px}
.pal-i{padding:6px 8px}.pal-i small{font-size:12px}
.side-sec{padding:12px 8px 4px}
/* popups: custom select + action menus */
.pop-w{z-index:80}
.pop{background:#1f1e1c;border:1px solid var(--line2);border-radius:10px;padding:4px;box-shadow:0 10px 30px rgba(0,0,0,.5);overflow:auto;transform-origin:top;animation:gf-pop .14s var(--ease) both}
.pop.up{transform-origin:bottom;animation-name:gf-popup}
@keyframes gf-pop{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
@keyframes gf-popup{from{opacity:0;transform:translateY(4px) scale(.98)}to{opacity:1;transform:none}}
.gf[data-motion=reduced] .pop{animation:none}
.sel{display:inline-flex;align-items:center;justify-content:space-between;gap:8px;height:32px;padding:0 8px 0 10px;border:1px solid var(--line2);border-radius:8px;background:#181715;color:var(--tx);font:400 13.5px var(--sans);text-align:left;max-width:100%;min-width:0;transition:border-color .12s,background .12s}
.sel:hover:not(:disabled){background:#1d1c1a;border-color:#4a4943}
.sel[aria-expanded=true]{border-color:#6a685f;background:#1d1c1a}
.sel[data-ph=true] .sel-v{color:var(--tx4)}
.sel-v{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sel-c{flex:none;color:var(--tx3);transition:transform .16s var(--ease)}
.sel[aria-expanded=true] .sel-c{transform:rotate(180deg)}
.sel:disabled{opacity:.5;cursor:not-allowed}
.ai-form .sel,.ai-form .sfield{width:100%}
.opt{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;color:var(--tx2)}
.opt[data-act=true]{background:var(--hover);color:var(--tx)}
.opt[aria-selected=true]{color:var(--tx)}
.opt[aria-disabled=true]{opacity:.45;cursor:not-allowed}
.opt-t small{display:block;color:var(--tx4);font-size:12px}
.opt-ck{color:var(--acc);flex:none}
.mi-l{display:flex;align-items:center;gap:10px;min-width:0}.mi-l svg{color:var(--tx3);flex:none}.mi-l small{display:block;color:var(--tx4);font-size:12px}
.menu-i[aria-current=true]{color:var(--tx)}
.sfield{display:flex;align-items:center;gap:8px;height:32px;padding:0 6px 0 10px;border:1px solid var(--line2);border-radius:8px;background:#181715;color:var(--tx3);min-width:190px;flex:1 1 220px;max-width:340px}
.sfield:focus-within{border-color:#6a685f}
.sfield input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--tx);font:400 13.5px var(--sans)}
.sfield input::-webkit-search-cancel-button{display:none}
.sf-x{width:20px;height:20px;border:0;border-radius:5px;background:transparent;display:grid;place-items:center;color:var(--tx3)}.sf-x:hover{background:var(--hover);color:var(--tx)}
.empty{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:34px 16px;border:1px dashed var(--line2);border-radius:14px;color:var(--tx3);font:400 13.5px var(--sans)}
.empty-i{width:44px;height:44px;border-radius:12px;background:#201f1c;display:grid;place-items:center;color:var(--acc);margin-bottom:4px}
.empty b{color:var(--tx);font-weight:500;font-size:14.5px}.empty p{margin:0;max-width:420px}
.mod-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:2px}
dialog.mod{overflow:visible}
/* page header, tabs, toolbars */
.ph{display:flex;align-items:flex-start;justify-content:space-between;gap:12px 16px;flex-wrap:wrap;margin:4px 0 14px}
.ph-l{display:flex;align-items:center;gap:14px;min-width:0}.ph-l h1{font:500 28px/1.15 var(--serif);color:var(--tx);letter-spacing:-.012em;overflow-wrap:anywhere}
.ph-l .meta{margin:3px 0 0}
.ph-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);margin:0 0 16px;overflow-x:auto}
.tabs button{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;padding:8px 10px;color:var(--tx3);border-bottom:2px solid transparent;margin-bottom:-1px;font:500 13.5px var(--sans);white-space:nowrap;border-radius:6px 6px 0 0}
.tabs button:hover{color:var(--tx);background:var(--hover)}
.tabs button[aria-selected=true]{color:var(--tx);border-bottom-color:var(--acc)}
.tabs .chip{padding:2px 6px;font-size:11px}
.tb{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 14px}.tb .sp{flex:1}
.otile{flex:none;display:grid;place-items:center;font:600 15px var(--sans);border-radius:10px}
.ocards{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.ocard{position:relative;display:flex;flex-direction:column;gap:8px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--raise);transition:border-color .14s,transform .14s var(--ease),background .14s}
.ocard:hover{border-color:var(--line2);background:#211f1d;transform:translateY(-1px)}
.gf[data-motion=reduced] .ocard:hover{transform:none}
.oc-top{display:flex;align-items:center;gap:10px}
.oc-main{border:0;background:transparent;padding:0;text-align:left;font:500 15.5px/1.3 var(--sans);color:var(--tx);min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.oc-main::after{content:"";position:absolute;inset:0;border-radius:14px}
.oc-main:focus-visible{outline:0}.ocard:has(.oc-main:focus-visible){outline:2px solid var(--focus);outline-offset:2px}
.ocard .icon-btn{position:relative;z-index:2}
.oc-d{margin:0;font:400 13px/1.45 var(--sans);color:var(--tx3);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.9em}
.oc-f{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font:400 12px var(--sans);color:var(--tx4)}
.oc-slug{font:400 12px var(--mono);color:var(--tx4)}
.ocards[data-v=list]{grid-template-columns:1fr;gap:6px}
.ocards[data-v=list] .ocard{flex-direction:row;align-items:center;gap:14px;padding:8px 12px}
.ocards[data-v=list] .oc-top{flex:1;min-width:0}.ocards[data-v=list] .oc-d{display:none}
.ocards[data-v=list] .oc-main::after{border-radius:14px}
.ocards[data-v=list] .ocard>.icon-btn{margin-left:auto}
.ocard[data-dim=true]{opacity:.7}
.ocard[data-new=true]{border-style:dashed;align-items:center;justify-content:center;min-height:140px;color:var(--tx3);cursor:pointer;background:transparent}
.ocard[data-new=true]:hover{color:var(--tx);border-color:#4a4943}
/* sidebar groups, profile row */
.nav-g{display:flex;align-items:center;gap:4px;width:100%;border:0;background:transparent;color:var(--tx4);font:500 12px var(--sans);padding:12px 8px 4px;text-align:left;border-radius:6px;letter-spacing:.01em}
.nav-g:hover{color:var(--tx2)}.nav-g svg{transition:transform .16s var(--ease);flex:none}.nav-g[aria-expanded=false] svg{transform:rotate(-90deg)}
.nav-g .n{margin-left:auto;font:400 11px var(--mono);color:var(--tx4)}
.nav-c{padding-left:8px}
.foot-btn{height:38px;gap:9px}
.foot-btn .avatar{width:24px;height:24px;font-size:10.5px}
.fb-n{flex:1;min-width:0;font:500 13.5px var(--sans);color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fb-p{font:500 11px var(--sans);color:var(--tx3);border:1px solid var(--line2);border-radius:5px;padding:0 6px;line-height:17px}
.foot-btn .chev{color:var(--tx4);opacity:0;transition:opacity .12s}.foot-btn:hover .chev,.foot-btn[aria-expanded=true] .chev{opacity:1}
.menu.up.pm{width:232px;min-width:0;left:6px;bottom:calc(100% + 4px)}
.pm .menu-e{padding:6px 8px 4px;font:400 12.5px var(--sans);color:var(--tx4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.psw-b{height:36px;padding:4px 8px;border-radius:8px}
/* header: breadcrumbs, search pill */
.top{height:44px;padding:0 12px 0 10px;gap:6px}
.crumbs{display:flex;align-items:center;gap:1px;min-width:0;list-style:none;margin:0;padding:0;font:400 13.5px var(--sans)}
.crumbs li{display:flex;align-items:center;min-width:0}
.crumb-b,.crumb-cur{padding:3px 7px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;border:0;background:transparent}
.crumb-b{color:var(--tx3)}.crumb-b:hover{background:var(--hover);color:var(--tx)}
.crumb-cur{color:var(--tx);font-weight:500}
.crumb-sep{color:var(--tx4);display:flex;margin:0 1px}
.crumb-sw{width:18px;height:22px;border:0;border-radius:5px;background:transparent;color:var(--tx4);display:inline-grid;place-items:center;margin-left:-3px}.crumb-sw:hover{background:var(--hover);color:var(--tx)}
.tsearch{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 6px 0 10px;border:1px solid var(--line2);border-radius:8px;background:#181715;color:var(--tx3);font:400 13px var(--sans);width:clamp(150px,22vw,260px)}
.tsearch:hover{background:#1d1c1a;color:var(--tx2)}.tsearch span{flex:1;text-align:left}
.bell{position:relative}.bell .bd{position:absolute;top:1px;right:0;min-width:15px;height:15px;border-radius:8px;background:var(--accb);color:#141413;font:700 10px/15px var(--sans);text-align:center;padding:0 4px}
/* palette */
.pal-tabs{flex:none;display:flex;gap:2px;padding:6px 10px 0;overflow-x:auto}
.pal-tabs button{border:0;background:transparent;color:var(--tx3);font:500 12px var(--sans);padding:4px 9px;border-radius:6px;white-space:nowrap}
.pal-tabs button:hover{color:var(--tx);background:var(--hover)}.pal-tabs button[aria-pressed=true]{background:var(--active);color:var(--tx)}
.sec-h{display:flex;align-items:center;gap:8px;font:500 12px var(--sans);letter-spacing:.04em;text-transform:uppercase;color:var(--tx4);margin:22px 0 8px}
.doccards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px}
.dcard{display:flex;flex-direction:column;gap:4px;text-align:left;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--raise);color:var(--tx2);transition:border-color .14s,background .14s}
.dcard:hover{border-color:var(--line2);background:#211f1d}.dcard b{font:500 14px/1.3 var(--sans);color:var(--tx)}.dcard span{font:400 12.5px/1.4 var(--sans);color:var(--tx3)}
.dcard .dn{font:500 11px var(--mono);color:var(--acc)}
.home{padding-top:7vh}
.pal-gh{font:500 11.5px var(--sans);color:var(--tx4);padding:8px 8px 3px}
@media (max-width:900px){.side{width:272px}.crumbs li:not(:nth-last-child(-n+3)){display:none}.crumb-b,.crumb-cur{max-width:130px}.tsearch{width:30px;padding:0;justify-content:center}.tsearch span,.tsearch kbd{display:none}}
@media (max-width:600px){.ph-l h1{font-size:24px}.ocards{grid-template-columns:1fr}.sfield{max-width:none}}
`;
// #endregion
