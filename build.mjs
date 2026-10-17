import fs from "node:fs";
const dir = new URL("./parts/", import.meta.url);
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".tsx")).sort();
const out = files.map((f) => fs.readFileSync(new URL(f, dir), "utf8").trimEnd()).join("\n\n") + "\n";
fs.writeFileSync(new URL("./App.tsx", import.meta.url), out);
console.log(`App.tsx: ${out.split("\n").length} lines from ${files.length} parts`);
