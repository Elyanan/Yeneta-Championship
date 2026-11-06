import { describe, expect, it } from "vitest";
import { fixture, match, athlete } from "./fixtures";
import { substitutionState, reconcileSubstitutions } from "@/lib/substitutions";
import type { Lineup } from "@/types/championship";
import { applyOperation } from "@/lib/operations";
import { validateState } from "@/lib/validation";
import { storageShape } from "@/lib/storage-shape";
const withBench = (substitutes = ["b"]) =>
  match({
    lineups: {
      home: {
        formation: "4-3-3",
        players: [{ position: "GK", athleteId: "a" }],
        substitutes,
      },
    },
  });
describe("football substitute lists", () => {
  const starting = (): Lineup => ({
    formation: "4-3-3",
    players: [
      { position: "GK", athleteId: "a" },
      { position: "LB", athleteId: "b" },
    ],
    substitutes: ["f", "g"],
  });
  it("records several replacements and removes used players from the available bench", () => {
    const lineup = {
      ...starting(),
      substitutions: [
        { id: "one", outgoingId: "a", incomingId: "f" },
        { id: "two", outgoingId: "b", incomingId: "g" },
      ],
    };
    expect(substitutionState(lineup)).toEqual({
      onField: ["f", "g"],
      remainingBench: [],
      error: undefined,
    });
    const d = fixture();
    d.athletes.push(athlete("f"), athlete("g"));
    const saved = applyOperation(d, {
      kind: "match",
      value: match({ lineups: { home: lineup } }),
    });
    expect(validateState(storageShape(saved))).toEqual(saved);
    expect(saved.matches[0].lineups?.home?.players).toEqual(starting().players);
  });
  it("can replace a player who came on in an earlier substitution", () => {
    const lineup = {
      ...starting(),
      substitutions: [
        { id: "one", outgoingId: "a", incomingId: "f" },
        { id: "two", outgoingId: "f", incomingId: "g" },
      ],
    };
    expect(substitutionState(lineup)).toEqual({
      onField: ["g", "b"],
      remainingBench: [],
      error: undefined,
    });
  });
  it.each([
    [
      { id: "one", outgoingId: "a", incomingId: "f" },
      { id: "two", outgoingId: "b", incomingId: "f" },
    ],
    [
      { id: "one", outgoingId: "a", incomingId: "f" },
      { id: "two", outgoingId: "a", incomingId: "g" },
    ],
    [{ id: "one", outgoingId: "a", incomingId: "b" }],
    [{ id: "one", outgoingId: "a", incomingId: "c" }],
    [
      { id: "one", outgoingId: "a", incomingId: "f" },
      { id: "one", outgoingId: "b", incomingId: "g" },
    ],
  ])(
    "rejects substitutions with unavailable players or duplicate identifiers",
    (...substitutions) => {
      const d = fixture();
      d.athletes.push(athlete("f"), athlete("g"));
      expect(() =>
        applyOperation(d, {
          kind: "match",
          value: match({ lineups: { home: { ...starting(), substitutions } } }),
        }),
      ).toThrow();
    },
  );
  it("clears dependent changes after an earlier substitution is removed", () => {
    const lineup = {
      ...starting(),
      substitutions: [{ id: "two", outgoingId: "f", incomingId: "g" }],
    };
    expect(reconcileSubstitutions(lineup).substitutions).toEqual([]);
  });
  it("preserves independent changes when a bench selection changes", () => {
    const lineup = {
      ...starting(),
      substitutes: ["g"],
      substitutions: [
        { id: "one", outgoingId: "a", incomingId: "f" },
        { id: "two", outgoingId: "b", incomingId: "g" },
      ],
    };
    expect(
      reconcileSubstitutions(lineup).substitutions?.map((s) => s.id),
    ).toEqual(["two"]);
  });
  it("persists a plain list with no timing or substitution events", () => {
    const d = applyOperation(fixture(), { kind: "match", value: withBench() });
    expect(d.matches[0].lineups?.home?.substitutes).toEqual(["b"]);
    expect(validateState(storageShape(d))).toEqual(d);
  });
  it.each([["b", "b"], ["a"], ["c"], ["e"], ["missing"]])(
    "rejects duplicate, starting, wrong-roster or unknown substitutes: %j",
    (...ids) => {
      expect(() =>
        applyOperation(fixture(), { kind: "match", value: withBench(ids) }),
      ).toThrow();
    },
  );
  it("rejects a substitute who does not play football", () => {
    const d = fixture();
    d.athletes.find((a) => a.id === "b")!.sports = ["chess"];
    expect(() =>
      applyOperation(d, { kind: "match", value: withBench() }),
    ).toThrow("correct football roster");
  });
  it("allows separate home and away benches on scheduled fixtures", () => {
    const value = withBench();
    value.status = "scheduled";
    value.homeScore = 0;
    value.goals = [];
    value.outcome = "draw";
    value.lineups!.away = {
      formation: "4-4-2",
      players: [{ position: "GK", athleteId: "c" }],
      substitutes: ["d"],
    };
    const d = applyOperation(fixture(), { kind: "match", value });
    expect(d.matches[0].lineups?.away?.substitutes).toEqual(["d"]);
  });
  it("protects substitute references when deleting athletes", () => {
    const d = fixture();
    const value = withBench();
    value.goals = [];
    value.homeScore = 0;
    value.outcome = "draw";
    d.matches = [value];
    expect(() =>
      applyOperation(d, { kind: "delete-athlete", id: "b" }),
    ).toThrow("saved lineup");
  });
  it("keeps older lineups without substitutes valid", () => {
    const value = withBench();
    delete value.lineups!.home!.substitutes;
    expect(() =>
      validateState({ ...fixture(), matches: [value] }),
    ).not.toThrow();
  });
});
