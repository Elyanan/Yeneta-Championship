import { describe, it, expect } from "vitest";
import { standings, contributions, rankings } from "@/lib/statistics";
import { initialData } from "@/lib/initial";
import { applyOperation } from "@/lib/operations";
import { fixture, match, goal } from "./fixtures";
describe("match-derived statistics", () => {
  it("starts with honest zero standings and no demo players", () => {
    const d = initialData();
    expect(d.athletes).toEqual([]);
    expect(d.matches).toEqual([]);
    for (const s of ["football", "volleyball"] as const)
      for (const v of ["boys", "girls"] as const)
        expect(
          standings(d, s, v).every(
            (r) => r.played === 0 && r.points === 0 && r.gf === 0,
          ),
        ).toBe(true);
  });
  it("calculates football wins, goals, losses, points and form", () => {
    const d = fixture();
    d.matches = [match()];
    const r = standings(d, "football", "boys");
    expect(r[0]).toMatchObject({
      played: 1,
      won: 1,
      gf: 1,
      ga: 0,
      gd: 1,
      points: 3,
      form: ["W"],
    });
    expect(r.find((r) => r.team.id === "grade-11")).toMatchObject({
      lost: 1,
      ga: 1,
      gd: -1,
      points: 0,
      form: ["L"],
    });
  });
  it("awards a draw one point to each team", () => {
    const d = fixture();
    d.matches = [match({ homeScore: 0, goals: [], outcome: "draw" })];
    expect(
      standings(d, "football", "boys")
        .filter((r) => r.played)
        .every((r) => r.points === 1 && r.drawn === 1),
    ).toBe(true);
  });
  it("sorts football by points then GD then goals scored", () => {
    const d = fixture();
    d.matches = [
      match({ id: "1", homeScore: 3, awayScore: 1 }),
      match({
        id: "2",
        homeId: "grade-10",
        awayId: "grade-9",
        homeScore: 4,
        awayScore: 2,
      }),
    ];
    expect(
      standings(d, "football", "boys")
        .slice(0, 2)
        .map((r) => r.team.id),
    ).toEqual(["grade-10", "grade-12"]);
  });
  it("keeps tied zero teams in deterministic name order", () => {
    expect(
      standings(initialData(), "football", "boys").map((r) => r.team.name),
    ).toEqual(["Fantasy", "Invitus", "Panthers", "Rising Stars"]);
  });
  it("separates seasons, divisions and void results", () => {
    const d = fixture();
    d.matches = [
      match({ division: "girls" }),
      match({ id: "old", seasonId: "old" }),
      match({ id: "void", status: "void" }),
    ];
    expect(standings(d, "football", "boys").every((r) => r.played === 0)).toBe(
      true,
    );
    expect(contributions(d, "boys", "goals")).toEqual([]);
  });
  it("counts scorer and assists but excludes own goals", () => {
    const d = fixture();
    d.matches = [
      match({
        homeScore: 2,
        goals: [
          goal(),
          goal({ id: "own", scorerId: "c", assistId: "", type: "own-goal" }),
        ],
      }),
    ];
    expect(
      contributions(d, "boys", "goals").map((r) => [r.athlete.id, r.total]),
    ).toEqual([["a", 1]]);
    expect(
      contributions(d, "boys", "assists").map((r) => [r.athlete.id, r.total]),
    ).toEqual([["b", 1]]);
    expect(standings(d, "football", "boys")[0].gf).toBe(2);
  });
  it("rebuilds every projection on match edit and delete", () => {
    let d = fixture();
    d = applyOperation(d, { kind: "match", value: match() });
    const edited = {
      ...d.matches[0],
      homeScore: 0,
      awayScore: 1,
      outcome: "away",
      goals: [goal({ teamId: "grade-11", scorerId: "c", assistId: "d" })],
    };
    d = applyOperation(d, { kind: "match", value: edited });
    expect(contributions(d, "boys", "goals")[0].athlete.id).toBe("c");
    expect(contributions(d, "boys", "assists")[0].athlete.id).toBe("d");
    expect(standings(d, "football", "boys")[0].team.id).toBe("grade-11");
    d = applyOperation(d, { kind: "delete-match", id: edited.id });
    expect(contributions(d, "boys", "goals")).toEqual([]);
    expect(contributions(d, "boys", "assists")).toEqual([]);
    expect(
      standings(d, "football", "boys").every(
        (r) => r.points === 0 && r.played === 0,
      ),
    ).toBe(true);
  });
  it("awards volleyball two points and tracks sets", () => {
    const d = fixture();
    d.matches = [
      match({ sport: "volleyball", homeScore: 3, awayScore: 2, goals: [] }),
    ];
    expect(standings(d, "volleyball", "boys")[0]).toMatchObject({
      gf: 3,
      ga: 2,
      points: 2,
      won: 1,
    });
  });
  it("replays last-five form chronologically independent of storage order", () => {
    const d = fixture();
    d.matches = Array.from({ length: 7 }, (_, i) =>
      match({
        id: `m${i}`,
        date: `2026-10-0${i + 1}T12:00:00.000Z`,
        homeScore: i % 2,
        awayScore: 0,
      }),
    ).reverse();
    expect(
      standings(d, "football", "boys").find((r) => r.team.id === "grade-12")
        ?.form,
    ).toEqual(["D", "W", "D", "W", "D"]);
  });
  it("recalculates individual records after deleting earlier matches", () => {
    let d = fixture();
    d = applyOperation(d, {
      kind: "match",
      value: match({
        id: "chess1",
        sport: "chess",
        homeId: "a",
        awayId: "c",
        homeScore: 0,
        awayScore: 0,
        goals: [],
      }),
    });
    d = applyOperation(d, {
      kind: "match",
      value: match({
        id: "chess2",
        sport: "chess",
        homeId: "a",
        awayId: "c",
        homeScore: 0,
        awayScore: 0,
        goals: [],
        date: "2026-10-02T12:00:00.000Z",
        outcome: "draw",
      }),
    });
    expect(
      rankings(d, "chess", "boys").find((r) => r.athlete.id === "a"),
    ).toMatchObject({
      played: 2,
      wins: 1,
      draws: 1,
      winRate: 50,
    });
    d = applyOperation(d, { kind: "delete-match", id: "chess1" });
    expect(
      rankings(d, "chess", "boys").find((r) => r.athlete.id === "a"),
    ).toMatchObject({ played: 1, wins: 0, draws: 1, winRate: 0 });
  });
  it.each(["chess", "table-tennis"] as const)(
    "ranks %s by wins and win percentage using results only",
    (sport) => {
      const d = fixture();
      d.matches = [
        match({
          id: "one",
          sport,
          homeId: "a",
          awayId: "c",
          homeScore: 0,
          goals: [],
        }),
        match({
          id: "two",
          sport,
          homeId: "a",
          awayId: "d",
          homeScore: 0,
          goals: [],
          outcome: "away",
        }),
        match({
          id: "three",
          sport,
          homeId: "b",
          awayId: "c",
          homeScore: 0,
          goals: [],
        }),
      ];
      const rows = rankings(d, sport, "boys");
      expect(rows[0].athlete.id).toBe("b");
      expect(rows.findIndex((r) => r.athlete.id === "b")).toBeLessThan(
        rows.findIndex((r) => r.athlete.id === "a"),
      );
      expect(rows.find((r) => r.athlete.id === "a")).toMatchObject({
        played: 2,
        wins: 1,
        losses: 1,
        winRate: 50,
      });
      for (const row of rows) expect(row).not.toHaveProperty("rating");
    },
  );
  it("does not mutate the source arrays when computing rankings", () => {
    const d = fixture(),
      before = structuredClone(d);
    standings(d, "football", "boys");
    rankings(d, "chess", "boys");
    contributions(d, "boys", "goals");
    expect(d).toEqual(before);
  });
});
