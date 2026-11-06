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
        value: match({ friendly: true, sport: "volleyball", goals: [] }),
      }),
    ).toThrow("only available for football");
  });
});
