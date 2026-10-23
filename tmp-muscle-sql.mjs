import { readFileSync } from "node:fs";

const src = readFileSync("evo-lift/lib/muscle-areas.ts", "utf8");
const start = src.indexOf("export const EXERCISE_MUSCLE_AREA_ROWS");
const slice = src.slice(start);
const body = slice.slice(slice.indexOf("["), slice.indexOf("];") + 1);
const rows = [...body.matchAll(/\["([a-z0-9-]+)", "([a-z]+)", (null|"([a-z]+)")\]/g)];
if (rows.length === 0) {
  console.error("no rows");
  process.exit(1);
}
const lines = rows.map((match) => {
  const secondary = match[4] == null ? "null" : `'${match[4]}'`;
  return `  ('${match[1]}', '${match[2]}', ${secondary})`;
});
process.stdout.write(`${lines.join(",\n")}\n`);
console.error(`count=${rows.length}`);
