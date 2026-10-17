// Produces the single hand-off file: parts concatenated, named exports stripped (Canvas wants one default export).
import fs from "node:fs";
const dir = new URL("./parts/", import.meta.url);
// Files in canvas/ replace the same-named file in parts/ (the cloud sync part needs libraries Canvas does not have).
const over = new URL("./canvas/", import.meta.url);
let out = fs.readdirSync(dir).filter((f) => f.endsWith(".tsx")).sort().map((f) => fs.readFileSync(new URL(fs.existsSync(new URL(f, over)) ? "./canvas/" + f : "./parts/" + f, import.meta.url), "utf8").trimEnd()).join("\n\n") + "\n";
out = out.replace(/^export (?!default)(?=(const|function|interface|type|class|async function)\b)/gm, "").replace(/^export \{ [^}]* \};\n/gm, "");
fs.mkdirSync(new URL("./final/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./final/geminiforge_v20_workbench.tsx", import.meta.url), out);
console.log(`final file: ${out.split("\n").length} lines, ${Math.round(out.length / 1024)} KB, default exports: ${(out.match(/^export default/gm) || []).length}, other exports: ${(out.match(/^export /gm) || []).length - 1}`);
