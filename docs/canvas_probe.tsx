import React, { useEffect, useRef, useState } from "react";

type Row = { name: string; ok: boolean | null; info: string };

export default function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const dlg = useRef<HTMLDialogElement>(null);
  const add = (name: string, ok: boolean | null, info = "") =>
    setRows((r) => [...r.filter((x) => x.name !== name), { name, ok, info }]);

  useEffect(() => {
    try {
      localStorage.setItem("gf_probe", "1");
      add("localStorage read/write", localStorage.getItem("gf_probe") === "1");
    } catch (e) {
      add("localStorage read/write", false, String(e));
    }
    const cs = (p: string, v: string) => !!(window.CSS && CSS.supports(p, v));
    add("document.startViewTransition", typeof (document as any).startViewTransition === "function");
    add("CSS scroll-driven animations", cs("animation-timeline", "scroll()"));
    add("CSS content-visibility", cs("content-visibility", "auto"));
    add("CSS interpolate-size", cs("interpolate-size", "allow-keywords"));
    add("CSS color-mix()", cs("color", "color-mix(in srgb, red, blue)"));
    add("CSS 100dvh", cs("height", "100dvh"));
    add("<dialog>.showModal", typeof HTMLDialogElement !== "undefined" && typeof HTMLDialogElement.prototype.showModal === "function");
    add("inert attribute", "inert" in HTMLElement.prototype);
    const sp = getComputedStyle(document.documentElement).getPropertyValue("--spacing").trim();
    add("Tailwind v4 (heuristic: --spacing)", !!sp, sp || "not found");
    const t = document.createElement("div");
    t.className = "flex";
    document.body.appendChild(t);
    add("Tailwind-like utilities (.flex)", getComputedStyle(t).display === "flex");
    t.remove();
    let framed: boolean | string = "unknown";
    try { framed = window.self !== window.top; } catch { framed = true; }
    add("runs inside iframe", null, String(framed));
    add("viewport", null, `${innerWidth}x${innerHeight} dpr ${devicePixelRatio}`);
    add("OS prefers-reduced-motion", null, String(matchMedia("(prefers-reduced-motion: reduce)").matches));
    add("OS prefers dark", null, String(matchMedia("(prefers-color-scheme: dark)").matches));

    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Fraunces:wght@500&display=swap";
    l.onload = () =>
      document.fonts.load("500 16px Fraunces").then((f) => add("Google Fonts (Fraunces)", f.length > 0));
    l.onerror = () => add("Google Fonts (Fraunces)", false, "blocked or offline");
    document.head.appendChild(l);

    let n = 0;
    const t0 = performance.now();
    const tick = () => {
      n++;
      if (performance.now() - t0 < 1000) requestAnimationFrame(tick);
      else add("rAF frames in 1s (idle)", null, String(n));
    };
    requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey || e.altKey)) return;
      if (["c", "v", "x", "a", "z"].includes(e.key.toLowerCase()) && !e.shiftKey) return;
      e.preventDefault();
      const combo = [e.ctrlKey && "Ctrl", e.shiftKey && "Shift", e.altKey && "Alt", e.metaKey && "Meta", e.key].filter(Boolean).join("+");
      setKeys((k) => [combo, ...k].slice(0, 12));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const testClipboard = async () => {
    try {
      await navigator.clipboard.writeText("gf probe");
      add("clipboard.writeText", true);
    } catch (e) {
      add("clipboard.writeText", false, String(e));
    }
  };
  const testDownload = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["gf probe"], { type: "text/plain" }));
    a.download = "gf_probe.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    add("Blob download", null, "check: did gf_probe.txt download? (yes/no)");
  };

  const report = rows.map((r) => `${r.ok === null ? "INFO" : r.ok ? "PASS" : "FAIL"} | ${r.name} | ${r.info}`).join("\n") + `\nKEYS RECEIVED: ${keys.join(", ")}`;

  return (
    <div style={{ font: "14px system-ui", padding: 16, background: "#141413", color: "#faf9f5", minHeight: "100vh" }}>
      <h2 style={{ margin: "0 0 8px" }}>GeminiForge Canvas probe</h2>
      <p style={{ margin: "0 0 12px", color: "#b0aea5" }}>
        1) Click the 3 buttons. 2) Press: Ctrl+B, Ctrl+Shift+D, Ctrl+Shift+Z, Ctrl+K, Ctrl+3, Alt+Escape, Ctrl+Escape, Ctrl+/ (they appear below if the page receives them). 3) Copy the report box and send it to me.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={testClipboard}>Test clipboard</button>
        <button onClick={testDownload}>Test download</button>
        <button onClick={() => dlg.current?.showModal()}>Test modal dialog</button>
      </div>
      <dialog ref={dlg} style={{ padding: 16 }}>
        <p>Modal test: press Tab several times (focus should stay inside), then Esc (should close).</p>
        <button onClick={() => dlg.current?.close()}>Close</button> <button>Other</button>
      </dialog>
      <div style={{ marginBottom: 12, color: "#b0aea5" }}>Keys received: {keys.join("  ·  ") || "none yet"}</div>
      <textarea readOnly value={report} style={{ width: "100%", height: 320, background: "#21201d", color: "#faf9f5", border: "1px solid #363532", padding: 8, font: "12px ui-monospace, monospace" }} />
    </div>
  );
}
