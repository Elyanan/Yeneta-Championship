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
      ...(m.media
        ? {
            media: m.media.map((item) => ({
              ...item,
              _key: item.id,
              _type: "matchMediaRecord",
            })),
          }
        : {}),
      ...(m.lineups
        ? {
            lineups: {
              _type: "matchLineups",
              ...Object.fromEntries(
                Object.entries(m.lineups)
                  .filter(([, value]) => value)
                  .map(([side, value]) => [
                    side,
                    {
                      ...value,
                      _type: "lineupRecord",
                      players: value!.players.map((p) => ({
                        ...p,
                        _key: p.position,
                        _type: "lineupPlayer",
                      })),
                      ...(value!.substitutions
                        ? {
                            substitutions: value!.substitutions.map((s) => ({
                              ...s,
                              _key: s.id,
                              _type: "lineupSubstitution",
                            })),
                          }
                        : {}),
                    },
                  ]),
              ),
            },
          }
        : {}),
    })),
    audit: d.audit.map((a) => ({ ...a, _key: a.id, _type: "auditEvent" })),
  };
}
