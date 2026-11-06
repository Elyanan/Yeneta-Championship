import {
  stateSchema,
  type Championship,
  type Match,
} from "../types/championship";
import { formationSlots } from "./formations";
export class DomainError extends Error {}
function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DomainError(message);
}
export function validateMatch(m: Match, d: Championship) {
  requireThat(
    !m.friendly || m.sport === "football",
    "Friendly matches are only available for football.",
  );
  requireThat(m.homeId !== m.awayId, "Choose two different participants.");
  const season = d.seasons.find((s) => s.id === m.seasonId);
  requireThat(season, "Season does not exist.");
  requireThat(
    m.date.slice(0, 10) >= season.start && m.date.slice(0, 10) <= season.end,
    "Match date must be within the season.",
  );
  requireThat(
    m.status === "scheduled" ||
      new Date(m.date).getTime() <= Date.now() + 60000,
    "Completed matches cannot be in the future.",
  );
  const teamSport = m.sport === "football" || m.sport === "volleyball";
  if (teamSport)
    for (const id of [m.homeId, m.awayId])
      requireThat(
        d.teams.some((t) => t.id === id && t.seasonId === m.seasonId),
        "Participant team is outside this season.",
      );
  else
    for (const id of [m.homeId, m.awayId])
      requireThat(
        d.athletes.some(
          (a) =>
            a.id === id &&
            a.division === m.division &&
            a.sports.includes(m.sport) &&
            d.teams.some((t) => t.id === a.teamId && t.seasonId === m.seasonId),
        ),
        "Athletes must match the sport, season and division.",
      );
  if (m.lineups && Object.values(m.lineups).some(Boolean)) {
    requireThat(
      m.sport === "football",
      "Formations are only available for football.",
    );
    for (const side of ["home", "away"] as const) {
      const lineup = m.lineups[side];
      if (!lineup) continue;
      const substitutes = lineup.substitutes || [];
      requireThat(
        new Set(substitutes).size === substitutes.length,
        "Substitutes can only be listed once.",
      );
      requireThat(
        !substitutes.some((id) =>
          lineup.players.some((p) => p.athleteId === id),
        ),
        "A starting player cannot also be listed as a substitute.",
      );
      const slots = formationSlots(lineup.formation).map((s) => s.position);
      requireThat(
        new Set(lineup.players.map((p) => p.position)).size ===
          lineup.players.length,
        "Each position can only have one player.",
      );
      requireThat(
        new Set(lineup.players.map((p) => p.athleteId)).size ===
          lineup.players.length,
        "A player can only occupy one position per team.",
      );
      for (const p of lineup.players) {
        requireThat(
          slots.includes(p.position),
          "Choose a position in the selected formation.",
        );
      }
      for (const athleteId of [
        ...lineup.players.map((p) => p.athleteId),
        ...substitutes,
      ]) {
        requireThat(
          d.athletes.some(
            (a) =>
              a.id === athleteId &&
              a.teamId === (side === "home" ? m.homeId : m.awayId) &&
              a.division === m.division &&
              a.sports.includes("football"),
          ),
          "Lineup players and substitutes must belong to the correct football roster and division.",
        );
      }
    }
  }
  if (m.status === "scheduled") {
    requireThat(
      m.homeScore === 0 &&
        m.awayScore === 0 &&
        m.goals.length === 0 &&
        m.outcome === "draw",
      "Scheduled matches cannot have scores, goal events or a result.",
    );
    return;
  }
  if (m.sport === "football") {
    const ids = new Set<string>();
    for (const g of m.goals) {
      requireThat(!ids.has(g.id), "Duplicate goal event.");
      ids.add(g.id);
      requireThat(
        [m.homeId, m.awayId].includes(g.teamId),
        "Goal team must be a match participant.",
      );
      requireThat(
        g.scorerId,
        "Every goal needs a scorer, including own goals.",
      );
      const playerTeam =
        g.type === "own-goal"
          ? g.teamId === m.homeId
            ? m.awayId
            : m.homeId
          : g.teamId;
      requireThat(
        d.athletes.some(
          (a) =>
            a.id === g.scorerId &&
            a.teamId === playerTeam &&
            a.division === m.division &&
            a.sports.includes("football"),
        ),
        "Scorer must belong to the correct football roster and division.",
      );
      requireThat(
        !g.assistId || g.type !== "own-goal",
        "Own goals cannot have assists.",
      );
      requireThat(
        !g.assistId || g.assistId !== g.scorerId,
        "A scorer cannot assist their own goal.",
      );
      if (g.assistId)
        requireThat(
          d.athletes.some(
            (a) =>
              a.id === g.assistId &&
              a.teamId === g.teamId &&
              a.division === m.division &&
              a.sports.includes("football"),
          ),
          "Assister must belong to the scoring roster and division.",
        );
    }
    requireThat(
      m.goals.filter((g) => g.teamId === m.homeId).length === m.homeScore &&
        m.goals.filter((g) => g.teamId === m.awayId).length === m.awayScore,
      "Goal events must exactly match the final score.",
    );
  } else
    requireThat(
      m.goals.length === 0,
      "Goal events are only valid in football.",
    );
  if (m.sport === "volleyball") {
    requireThat(
      m.homeScore !== m.awayScore,
      "Volleyball cannot end in a draw.",
    );
    if (d.settings.volleyballMaxSets)
      requireThat(
        Math.max(m.homeScore, m.awayScore) <= d.settings.volleyballMaxSets,
        "Sets exceed the configured maximum.",
      );
  }
  if (teamSport)
    requireThat(
      m.outcome ===
        (m.homeScore > m.awayScore
          ? "home"
          : m.homeScore < m.awayScore
            ? "away"
            : "draw"),
      "Outcome and score disagree.",
    );
  else
    requireThat(
      m.homeScore === 0 && m.awayScore === 0,
      "Individual matches use the outcome field.",
    );
}
export function validateState(input: unknown): Championship {
  const d = stateSchema.parse(input);
  for (const list of [d.seasons, d.teams, d.athletes, d.matches])
    requireThat(
      new Set(list.map((x) => x.id)).size === list.length,
      "Duplicate IDs are not allowed.",
    );
  requireThat(
    d.seasons.some((s) => s.id === d.settings.activeSeasonId),
    "Active season is missing.",
  );
  for (const t of d.teams)
    requireThat(
      d.seasons.some((s) => s.id === t.seasonId),
      "Team season is missing.",
    );
  const names = new Set<string>();
  for (const a of d.athletes) {
    requireThat(
      d.teams.some((t) => t.id === a.teamId),
      "Athlete team is missing.",
    );
    const key = `${a.name.toLocaleLowerCase()}|${a.teamId}|${a.division}`;
    requireThat(
      !names.has(key),
      "Duplicate athlete name in the same class and division.",
    );
    names.add(key);
  }
  for (const m of d.matches) validateMatch(m, d);
  return d;
}
export function minuteValue(value: string) {
  const m = /^(\d{1,3})(?:\+(\d{1,2}))?'?$/.exec(value.trim());
  if (!m || Number(m[1]) > 120 || Number(m[2] || 0) > 30)
    throw new DomainError("Use a minute such as 24 or 45+2.");
  return { minute: Number(m[1]), stoppage: Number(m[2] || 0) };
}
