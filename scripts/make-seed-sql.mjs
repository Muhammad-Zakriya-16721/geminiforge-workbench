// Turns supabase/seed/content.json into one SQL file per table (run them in order in the SQL editor or through any SQL tool).
import fs from "node:fs";
import { TABLES } from "./content-map.mjs";
const bundle = JSON.parse(fs.readFileSync("supabase/seed/content.json", "utf8"));
fs.mkdirSync("supabase/seed/sql", { recursive: true });
TABLES.forEach(([table, , rows], i) => {
  const data = rows(bundle);
  const cols = Object.keys(data[0]);
  const json = JSON.stringify(data);
  if (json.includes("$j$")) throw new Error(`${table}: text contains the quoting tag`);
  const sql = `insert into public.${table} (${cols.join(", ")})\nselect ${cols.join(", ")} from jsonb_populate_recordset(null::public.${table}, $j$${json}$j$::jsonb);\n`;
  fs.writeFileSync(`supabase/seed/sql/${String(i + 1).padStart(2, "0")}_${table}.sql`, sql);
  console.log(String(i + 1).padStart(2, "0"), table.padEnd(16), data.length, "rows", sql.length, "chars");
});
