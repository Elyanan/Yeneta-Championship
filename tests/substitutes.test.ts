import { describe, expect, it } from "vitest";
import { fixture, match } from "./fixtures";
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
