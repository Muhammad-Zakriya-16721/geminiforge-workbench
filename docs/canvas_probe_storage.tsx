// Gemini Canvas storage probe. Paste into a NEW canvas, run it, press "Write marker", then RELOAD the page (browser reload, and also close/reopen the canvas) and send me a screenshot or the text.
import React, { useEffect, useState } from "react";

declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;

const g = (f: () => unknown) => { try { const v = f(); return v === undefined ? "undefined" : String(v); } catch (e) { return "ERROR " + (e instanceof Error ? e.message : String(e)); } };

export default function Probe() {
  const [rows, setRows] = useState<[string, string][]>([]);
  const read = async () => {
    const r: [string, string][] = [];
    r.push(["origin", g(() => window.location.origin)]);
    r.push(["href", g(() => window.location.href.slice(0, 120))]);
    r.push(["localStorage marker", g(() => window.localStorage.getItem("gf_probe"))]);
    r.push(["sessionStorage marker", g(() => window.sessionStorage.getItem("gf_probe"))]);
    r.push(["window.name marker", g(() => window.name)]);
    r.push(["cookie", g(() => document.cookie || "(empty)")]);
    r.push(["loads counted in localStorage", g(() => { const n = Number(window.localStorage.getItem("gf_loads") ?? "0") + 1; window.localStorage.setItem("gf_loads", String(n)); return n; })]);
    try {
      const v = await new Promise<string>((res, rej) => { const q = indexedDB.open("gf_probe", 1); q.onupgradeneeded = () => q.result.createObjectStore("s"); q.onerror = () => rej(q.error); q.onsuccess = () => { const tx = q.result.transaction("s"); const get = tx.objectStore("s").get("m"); get.onsuccess = () => res(String(get.result ?? "undefined")); get.onerror = () => rej(get.error); }; });
      r.push(["IndexedDB marker", v]);
    } catch (e) { r.push(["IndexedDB marker", "ERROR " + (e instanceof Error ? e.message : String(e))]); }
    r.push(["__firebase_config", g(() => (typeof __firebase_config === "undefined" ? "NOT DEFINED" : "defined, " + String(__firebase_config).length + " chars, keys: " + Object.keys(JSON.parse(__firebase_config)).join(",")))]);
    r.push(["__app_id", g(() => (typeof __app_id === "undefined" ? "NOT DEFINED" : __app_id))]);
    r.push(["__initial_auth_token", g(() => (typeof __initial_auth_token === "undefined" ? "NOT DEFINED" : "defined, " + String(__initial_auth_token).length + " chars"))]);
    r.push(["navigator.storage.persisted", g(() => "see next")]);
    try { r[r.length - 1][1] = String(await navigator.storage.persisted()); } catch (e) { r[r.length - 1][1] = "ERROR " + (e instanceof Error ? e.message : String(e)); }
    setRows(r);
  };
  useEffect(() => { void read(); }, []);
  const write = async () => {
    const stamp = new Date().toISOString();
    g(() => window.localStorage.setItem("gf_probe", stamp)); g(() => window.sessionStorage.setItem("gf_probe", stamp)); g(() => { window.name = stamp; });
    await new Promise<void>((res) => { const q = indexedDB.open("gf_probe", 1); q.onupgradeneeded = () => q.result.createObjectStore("s"); q.onsuccess = () => { const tx = q.result.transaction("s", "readwrite"); tx.objectStore("s").put(stamp, "m"); tx.oncomplete = () => res(); tx.onerror = () => res(); }; q.onerror = () => res(); });
    await read();
  };
  return (
    <div style={{ font: "14px system-ui", padding: 20, background: "#141413", color: "#eee", minHeight: "100vh" }}>
      <h2>Canvas storage probe</h2>
      <p>1) Press Write marker. 2) Reload the page. 3) Close and reopen the canvas. After each, send the table below.</p>
      <button onClick={() => void write()} style={{ padding: "8px 14px", marginRight: 8 }}>Write marker</button>
      <button onClick={() => void read()} style={{ padding: "8px 14px" }}>Read again</button>
      <table style={{ marginTop: 16, borderCollapse: "collapse" }}><tbody>{rows.map(([k, v]) => <tr key={k}><td style={{ padding: "4px 12px 4px 0", color: "#aaa" }}>{k}</td><td style={{ fontFamily: "monospace" }}>{v}</td></tr>)}</tbody></table>
    </div>
  );
}
