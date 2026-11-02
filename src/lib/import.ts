import Papa from "papaparse";
import {
  athleteSchema,
  type Athlete,
  type Championship,
} from "@/types/championship";
export const rosterTemplate = "name,team,division,sports,jersey,photo\r\n";
export type ImportRow = {
  row: number;
  athlete: Athlete | null;
  errors: string[];
  name: string;
};
export function previewRoster(
  rows: Record<string, unknown>[],
  d: Championship,
): ImportRow[] {
  const seen = new Set(
    d.athletes.map((a) => `${a.name.toLowerCase()}|${a.teamId}|${a.division}`),
  );
  return rows.map((raw, i) => {
    const r = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [
        k.trim().toLowerCase(),
        String(v ?? "").trim(),
      ]),
    );
    const errors: string[] = [];
    const candidates = d.teams.filter(
      (t) =>
        t.active &&
        t.seasonId === d.settings.activeSeasonId &&
        (t.id === r.team ||
          t.name.toLowerCase() === r.team?.toLowerCase() ||
          (t.classCode && t.classCode.toLowerCase() === r.team?.toLowerCase())),
    );
    if (candidates.length !== 1)
      errors.push("Team is missing, invalid, or ambiguous. Use its exact ID.");
    const a = {
      id: crypto.randomUUID(),
      name: r.name || "",
      teamId: candidates[0]?.id || "",
      division: r.division?.toLowerCase(),
      sports: (r.sports || "")
        .toLowerCase()
        .split(/[;|]/)
        .map((s) => s.trim()),
      jersey: r.jersey ? Number(r.jersey) : null,
      photo: r.photo || "",
      active: true,
      startingRating: 1200,
    };
    const parsed = athleteSchema.safeParse(a);
    if (!parsed.success)
      errors.push(
        ...parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`),
      );
    const key = `${a.name.toLowerCase()}|${a.teamId}|${a.division}`;
    if (seen.has(key))
      errors.push("Duplicate athlete in this file or the existing roster.");
    seen.add(key);
    return {
      row: i + 2,
      name: a.name,
      athlete: parsed.success ? parsed.data : null,
      errors,
    };
  });
}
export function parseRosterCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length)
    throw new Error(parsed.errors.map((e) => e.message).join("; "));
  return parsed.data;
}
