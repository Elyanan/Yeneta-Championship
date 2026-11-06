import { initialData } from "@/lib/initial";
import type { Athlete, Championship, Goal, Match } from "@/types/championship";
export function athlete(
  id: string,
  teamId = "grade-12",
  division: "boys" | "girls" = "boys",
): Athlete {
  return {
    id,
    name: `Test athlete ${id}`,
    teamId,
    division,
    photo: "",
    sports: ["football", "volleyball", "chess", "table-tennis"],
    jersey: null,
    active: true,
  };
}
export function fixture(): Championship {
  const d = initialData();
  d.seasons[0].start = "2020-01-01";
  d.seasons[0].end = "2030-12-31";
  d.athletes = [
    athlete("a"),
    athlete("b"),
    athlete("c", "grade-11"),
    athlete("d", "grade-11"),
    athlete("e", "grade-12", "girls"),
  ];
  return d;
}
export function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    teamId: "grade-12",
    scorerId: "a",
    assistId: "b",
    minute: 24,
    stoppage: 0,
    type: "regular",
    ...overrides,
  };
}
export function match(overrides: Partial<Match> = {}): Match {
  return {
    id: "match-1",
    seasonId: "season-2026",
    sport: "football",
    division: "boys",
    homeId: "grade-12",
    awayId: "grade-11",
    date: "2026-10-01T12:00:00.000Z",
    homeScore: 1,
    awayScore: 0,
    goals: [goal()],
    outcome: "home",
    status: "completed",
    updatedAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}
