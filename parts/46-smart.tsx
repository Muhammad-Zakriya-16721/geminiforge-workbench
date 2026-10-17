// #region 5e. SMART MATCHING (optional, experimental): meaning-based passage search with a small local model.
// Off by default. When on, answers that are not exact are re-ranked by meaning. It still only quotes the document; it never writes new text.
// The model (Xenova/all-MiniLM-L6-v2, quantized, about 23 MB) and the library are downloaded from public CDNs on first use; no document text leaves the browser.
const TF_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1";
const TF_MODEL = "Xenova/all-MiniLM-L6-v2";
type Embedder = (t: string[], o: { pooling: "mean"; normalize: boolean }) => Promise<{ data: Float32Array; dims: number[] }>;
let embedder: Embedder | null = null;
let loading: Promise<void> | null = null;
let corpusVecs: { key: string; title: string; disp: string; v: Float32Array }[] | null = null;

const setSmart = (smartState: "off" | "loading" | "ready" | "failed", smartMsg = "") => useStore.setState({ smartState, smartMsg });

async function embedAll(texts: string[]): Promise<Float32Array[]> {
  const e = await embedder!(texts, { pooling: "mean", normalize: true });
  const d = e.dims[1];
  return texts.map((_, i) => e.data.slice(i * d, (i + 1) * d));
}

export function resetSmart() { corpusVecs = null; loading = null; }

export function loadSmart(): Promise<void> {
  if (embedder && corpusVecs) return Promise.resolve();
  if (loading) return loading;
  setSmart("loading", "Downloading the model (about 23 MB, once per session)…");
  loading = (async () => {
    try {
      if (!embedder) {
        const tf = await import(/* @vite-ignore */ TF_URL);
        embedder = (await tf.pipeline("feature-extraction", TF_MODEL, { dtype: "q8" })) as Embedder;
      }
      const ps = passages();
      const out: NonNullable<typeof corpusVecs> = [];
      for (let i = 0; i < ps.length; i += 24) {
        const batch = ps.slice(i, i + 24);
        const vs = await embedAll(batch.map((p) => `${p.title}. ${(p.disp ?? p.text)}`.slice(0, 700)));
        batch.forEach((p, j) => out.push({ key: p.key, title: p.title, disp: p.disp ?? p.text, v: vs[j] }));
        setSmart("loading", `Preparing the document for meaning search… ${Math.min(i + 24, ps.length)} of ${ps.length}`);
        await new Promise((r) => setTimeout(r, 0));
      }
      corpusVecs = out;
      setSmart("ready", `Ready (${ps.length} passages indexed)`);
    } catch (err) {
      corpusVecs = null; loading = null;
      setSmart("failed", err instanceof Error ? err.message.slice(0, 160) : "Could not load the model");
    }
  })();
  return loading;
}

// Returns a replacement answer, or null if smart matching is not ready or finds nothing convincing.
export async function smartAnswer(raw: string, min = 0.35): Promise<Answer | null> {
  if (!embedder || !corpusVecs) return null;
  const [qv] = await embedAll([raw]);
  const scored = corpusVecs.map((c) => { let s = 0; for (let i = 0; i < qv.length; i++) s += qv[i] * c.v[i]; return { c, s }; }).sort((a, b) => b.s - a.s);
  const top = scored[0];
  if (!top || top.s < min) return null;
  const seen = new Set<string>([top.c.key]);
  const more = scored.slice(1, 12).filter((x) => x.s >= min && (seen.has(x.c.key) ? false : (seen.add(x.c.key), true))).slice(0, 2);
  const hit = toks(raw);
  const last = top.c.title.split(" › ").pop() ?? "";
  let body = top.c.disp;
  if (last && body.startsWith(last)) body = body.slice(last.length).replace(/^[.\s]+/, "") || body;
  const blocks: AnsBlock[] = [P("This is a meaning-based match, not an exact answer. The closest part of the document says:"), P(`**${top.c.title}.** ${excerpt(body, hit)}`)];
  if (more.length) blocks.push(P("Also close:"), { t: "items", items: more.map((x) => ({ key: x.c.key, title: x.c.title, sub: snippet(x.c.disp, hit) })) });
  return finish(ans(blocks, [top.c.key, ...more.map((x) => x.c.key)]), `Smart match: compared the meaning of your question with every passage (local model, similarity ${top.s.toFixed(2)})`, "closest");
}
// #endregion
