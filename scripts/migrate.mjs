import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error(
    "Usage: npm run migrate -- <legacy-json-file> <new-output-csv>\nRead-only conversion. Review all identities before importing.",
  );
  process.exit(1);
}
const legacy = JSON.parse(await fs.readFile(input, "utf8"));
const players = Array.isArray(legacy.players) ? legacy.players : [];
const rows = [["name", "team", "division", "sports", "jersey", "photo"]];
for (const p of players) {
  if (
    !["chess", "table-tennis"].includes(p.sport) ||
    !["boys", "girls"].includes(p.gender) ||
    ![9, 10, 11, 12].includes(Number(p.grade)) ||
    typeof p.name !== "string"
  )
    continue;
  rows.push([p.name, `grade-${p.grade}`, p.gender, p.sport, "", ""]);
}
const csv =
  "\uFEFF" +
  rows
    .map((row) =>
      row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
    )
    .join("\r\n");
await fs.writeFile(output, csv, { flag: "wx" });
await fs.writeFile(
  `${output}.report.json`,
  JSON.stringify(
    {
      id: randomUUID(),
      source: input,
      proposedAthletes: rows.length - 1,
      warnings: [
        "Names are unverified. Remove all demonstration identities before importing.",
        "Legacy aggregate statistics are not match history and are not imported.",
        "No team-sport results are migrated. No data was published.",
      ],
    },
    null,
    2,
  ),
  { flag: "wx" },
);
console.log(
  `Wrote ${rows.length - 1} unverified roster proposals and a review report. No database writes.`,
);
