import type { Championship } from "@/types/championship";
// Sanity's Studio expects stable keys and object types on array items.
export function storageShape(d: Championship) {
  return {
    ...d,
    seasons: d.seasons.map((s) => ({
      ...s,
      _key: s.id,
      _type: "seasonRecord",
    })),
    teams: d.teams.map((t) => ({ ...t, _key: t.id, _type: "teamRecord" })),
    athletes: d.athletes.map((a) => ({
      ...a,
      _key: a.id,
      _type: "athleteRecord",
    })),
    matches: d.matches.map((m) => ({
      ...m,
      _key: m.id,
      _type: "matchRecord",
      goals: m.goals.map((g) => ({ ...g, _key: g.id, _type: "goalEvent" })),
    })),
    audit: d.audit.map((a) => ({ ...a, _key: a.id, _type: "auditEvent" })),
  };
}
