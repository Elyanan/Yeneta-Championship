import type {
  Athlete,
  Championship,
  Division,
  Match,
  Sport,
  Team,
} from "@/types/championship";
export const chronological = (a: Match, b: Match) =>
  a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
export function completedMatches(
  data: Championship,
  sport?: Sport,
  division?: Division,
  season = data.settings.activeSeasonId,
) {
  return data.matches
    .filter(
      (m) =>
        m.status === "completed" &&
        m.seasonId === season &&
        (!sport || m.sport === sport) &&
        (!division || m.division === division),
    )
    .sort(chronological);
}
// Official competition statistics exclude friendlies, but result histories do not.
export function relevant(
  data: Championship,
  sport?: Sport,
  division?: Division,
  season = data.settings.activeSeasonId,
) {
  return completedMatches(data, sport, division, season).filter(
    (m) => !m.friendly,
  );
}
export type Standing = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: string[];
};
export function standings(
  data: Championship,
  sport: Sport,
  division: Division,
  season = data.settings.activeSeasonId,
): Standing[] {
  const rows = new Map(
    data.teams
      .filter((t) => t.seasonId === season)
      .map((team) => [
        team.id,
        {
          team,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0,
          form: [] as string[],
        },
      ]),
  );
  for (const m of relevant(data, sport, division, season)) {
    for (const [who, other, score, conceded] of [
      [m.homeId, m.awayId, m.homeScore, m.awayScore],
      [m.awayId, m.homeId, m.awayScore, m.homeScore],
    ] as const) {
      const r = rows.get(who);
      if (!r || !rows.has(other)) continue;
      const win = score > conceded,
        draw = score === conceded;
      r.played++;
      r.gf += score;
      r.ga += conceded;
      r.gd = r.gf - r.ga;
      if (win) r.won++;
      else if (draw) r.drawn++;
      else r.lost++;
      r.points += win
        ? sport === "football"
          ? data.settings.footballWin
          : data.settings.volleyballWin
        : draw && sport === "football"
          ? data.settings.footballDraw
          : 0;
      r.form = [...r.form, win ? "W" : draw ? "D" : "L"].slice(-5);
    }
  }
  return [...rows.values()]
    .filter((r) => r.team.active || r.played)
    .sort(
      (a, b) =>
        b.points - a.points ||
        (sport === "football" ? b.gd - a.gd : 0) ||
        b.gf - a.gf ||
        a.team.name.localeCompare(b.team.name) ||
        a.team.id.localeCompare(b.team.id),
    );
}
export type Ranking = {
  athlete: Athlete;
  wins: number;
  losses: number;
  draws: number;
  played: number;
  winRate: number;
  form: string[];
};
export function rankings(
  data: Championship,
  sport: Sport,
  division: Division,
  season = data.settings.activeSeasonId,
): Ranking[] {
  const teamIds = new Set(
    data.teams.filter((t) => t.seasonId === season).map((t) => t.id),
  );
  const rows = new Map(
    data.athletes
      .filter(
        (a) =>
          a.division === division &&
          a.sports.includes(sport) &&
          teamIds.has(a.teamId),
      )
      .map((athlete) => [
        athlete.id,
        {
          athlete,
          wins: 0,
          losses: 0,
          draws: 0,
          played: 0,
          winRate: 0,
          form: [] as string[],
        },
      ]),
  );
  for (const m of relevant(data, sport, division, season)) {
    const a = rows.get(m.homeId),
      b = rows.get(m.awayId);
    if (!a || !b) continue;
    const result = m.outcome === "home" ? 1 : m.outcome === "away" ? 0 : 0.5;
    for (const [r, score] of [
      [a, result],
      [b, 1 - result],
    ] as const) {
      r.played++;
      if (score === 1) r.wins++;
      else if (score === 0) r.losses++;
      else r.draws++;
      r.winRate = Math.round((100 * r.wins) / r.played);
      r.form = [...r.form, score === 1 ? "W" : score === 0 ? "L" : "D"].slice(
        -5,
      );
    }
  }
  return [...rows.values()]
    .filter((r) => r.athlete.active || r.played)
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.winRate - a.winRate ||
        b.draws - a.draws ||
        a.losses - b.losses ||
        a.athlete.name.localeCompare(b.athlete.name) ||
        a.athlete.id.localeCompare(b.athlete.id),
    );
}
export function contributions(
  data: Championship,
  division: Division,
  kind: "goals" | "assists",
  season = data.settings.activeSeasonId,
) {
  const totals = new Map<string, number>();
  for (const m of relevant(data, "football", division, season))
    for (const g of m.goals) {
      if (g.type === "own-goal") continue;
      const id = kind === "goals" ? g.scorerId : g.assistId;
      if (id) totals.set(id, (totals.get(id) || 0) + 1);
    }
  return [...totals]
    .map(([id, total]) => ({
      athlete: data.athletes.find((a) => a.id === id)!,
      total,
    }))
    .filter((x) => x.athlete)
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.athlete.name.localeCompare(b.athlete.name) ||
        a.athlete.id.localeCompare(b.athlete.id),
    );
}
