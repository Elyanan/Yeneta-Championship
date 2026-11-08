import { describe, expect, it } from "vitest";
import { fixture, match, goal } from "./fixtures";
import { applyOperation } from "@/lib/operations";
import {
  completedMatches,
  relevant,
  standings,
  contributions,
} from "@/lib/statistics";
import { validateState } from "@/lib/validation";
import { storageShape } from "@/lib/storage-shape";

describe("football friendlies", () => {
  it("shows a friendly in result histories without affecting any official statistics", () => {
    const d = fixture();
    d.matches = [match()];
    const before = standings(d, "football", "boys");
    const scorers = contributions(d, "boys", "goals");
    const assists = contributions(d, "boys", "assists");
    const next = applyOperation(d, {
      kind: "match",
      value: match({
        id: "opening-friendly",
        friendly: true,
        homeScore: 2,
        goals: [goal({ id: "one" }), goal({ id: "two" })],
      }),
    });
    expect(standings(next, "football", "boys")).toEqual(before);
    expect(contributions(next, "boys", "goals")).toEqual(scorers);
    expect(contributions(next, "boys", "assists")).toEqual(assists);
    expect(completedMatches(next).map((m) => m.id)).toContain(
      "opening-friendly",
    );
    expect(relevant(next).map((m) => m.id)).toEqual(["match-1"]);
    expect(validateState(storageShape(next))).toEqual(next);
  });
  it("keeps a season with only an opening friendly on zero", () => {
    const d = fixture();
    d.matches = [match({ friendly: true })];
    expect(standings(d, "football", "boys")).toEqual(
      standings(fixture(), "football", "boys"),
    );
    expect(contributions(d, "boys", "goals")).toEqual([]);
    expect(contributions(d, "boys", "assists")).toEqual([]);
  });
  it("treats existing matches without the new option as competitive", () => {
    const d = fixture();
    d.matches = [match()];
    expect(standings(d, "football", "boys")[0].points).toBe(3);
  });
  it("recalculates when an existing result is changed to a friendly and back", () => {
    let d = applyOperation(fixture(), { kind: "match", value: match() });
    const played = d.matches[0];
    d = applyOperation(d, {
      kind: "match",
      value: { ...played, friendly: true },
    });
    expect(relevant(d)).toHaveLength(0);
    expect(d.matches[0].goals).toEqual(played.goals);
    d = applyOperation(d, {
      kind: "match",
      value: { ...d.matches[0], friendly: false },
    });
    expect(standings(d, "football", "boys")[0].points).toBe(3);
  });
  it("supports a future friendly without treating it as a completed result", () => {
    const d = applyOperation(fixture(), {
      kind: "match",
      value: match({
        friendly: true,
        status: "scheduled",
        date: new Date(Date.now() + 86_400_000).toISOString(),
        homeScore: 0,
        goals: [],
        outcome: "draw",
      }),
    });
    expect(completedMatches(d)).toEqual([]);
    expect(relevant(d)).toEqual([]);
    expect(d.matches[0].friendly).toBe(true);
  });
  it("keeps participant and score validation for friendlies", () => {
    expect(() =>
      applyOperation(fixture(), {
        kind: "match",
        value: match({ friendly: true, goals: [] }),
      }),
    ).toThrow("exactly match");
    expect(() =>
      applyOperation(fixture(), {
        kind: "match",
        value: match({
          friendly: true,
          sport: "chess",
          homeId: "a",
          awayId: "c",
          goals: [],
        }),
      }),
    ).toThrow("only available for football");
  });
});

describe("volleyball friendlies", () => {
  it.each(["boys", "girls"] as const)(
    "keeps %s friendly results in histories without changing league statistics",
    (division) => {
      const d = fixture();
      const competitive = match({
        sport: "volleyball",
        division,
        goals: [],
        homeScore: 3,
        awayScore: 1,
      });
      d.matches = [competitive];
      const before = standings(d, "volleyball", division);
      const saved = applyOperation(d, {
        kind: "match",
        value: {
          ...competitive,
          id: "volleyball-friendly",
          friendly: true,
          homeScore: 1,
          awayScore: 3,
          outcome: "away",
        },
      });
      expect(standings(saved, "volleyball", division)).toEqual(before);
      expect(
        completedMatches(saved, "volleyball", division).map((m) => m.id),
      ).toContain("volleyball-friendly");
      expect(relevant(saved, "volleyball", division).map((m) => m.id)).toEqual([
        competitive.id,
      ]);
      expect(validateState(storageShape(saved))).toEqual(saved);
    },
  );
  it("schedules a volleyball friendly, records its result and can change it to competitive", () => {
    let saved = applyOperation(fixture(), {
      kind: "match",
      value: match({
        sport: "volleyball",
        friendly: true,
        status: "scheduled",
        date: new Date(Date.now() + 86_400_000).toISOString(),
        homeScore: 0,
        awayScore: 0,
        goals: [],
        outcome: "draw",
      }),
    });
    expect(saved.matches[0].friendly).toBe(true);
    expect(completedMatches(saved)).toEqual([]);
    saved = applyOperation(saved, {
      kind: "match",
      value: {
        ...saved.matches[0],
        status: "completed",
        date: match().date,
        homeScore: 3,
        awayScore: 1,
        outcome: "home",
      },
    });
    expect(completedMatches(saved)).toHaveLength(1);
    expect(standings(saved, "volleyball", "boys")).toEqual(
      standings(fixture(), "volleyball", "boys"),
    );
    saved = applyOperation(saved, {
      kind: "match",
      value: { ...saved.matches[0], friendly: false },
    });
    expect(standings(saved, "volleyball", "boys")[0].points).toBe(
      saved.settings.volleyballWin,
    );
  });
  it("still rejects tied volleyball results and invalid set totals", () => {
    const d = fixture();
    d.settings.volleyballMaxSets = 3;
    for (const [homeScore, awayScore] of [
      [1, 1],
      [100, 0],
    ]) {
      expect(() =>
        applyOperation(d, {
          kind: "match",
          value: match({
            sport: "volleyball",
            friendly: true,
            goals: [],
            homeScore,
            awayScore,
            outcome: homeScore === awayScore ? "draw" : "home",
          }),
        }),
      ).toThrow();
    }
  });
});
