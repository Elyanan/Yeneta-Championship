import { describe, it, expect } from "vitest";
import { validateMatch, validateState, minuteValue } from "@/lib/validation";
import { applyOperation } from "@/lib/operations";
import { matchSchema } from "@/types/championship";
import { fixture, goal, match } from "./fixtures";
describe("server validation and archival integrity", () => {
  it("accepts a correctly attributed match", () =>
    expect(() =>
      validateState({ ...fixture(), matches: [match()] }),
    ).not.toThrow());
  it("rejects same participants", () =>
    expect(() =>
      validateMatch(match({ awayId: "grade-12" }), fixture()),
    ).toThrow("different"));
  it("rejects mismatched event totals", () =>
    expect(() => validateMatch(match({ homeScore: 2 }), fixture())).toThrow(
      "exactly match",
    ));
  it("rejects negative and fractional scores", () => {
    expect(matchSchema.safeParse(match({ homeScore: -1 })).success).toBe(false);
    expect(matchSchema.safeParse(match({ homeScore: 1.5 })).success).toBe(
      false,
    );
  });
  it("rejects wrong-team scorer", () =>
    expect(() =>
      validateMatch(match({ goals: [goal({ scorerId: "c" })] }), fixture()),
    ).toThrow("correct football roster"));
  it("rejects wrong-division scorer", () =>
    expect(() =>
      validateMatch(match({ goals: [goal({ scorerId: "e" })] }), fixture()),
    ).toThrow("division"));
  it("rejects self-assists and opposition assists", () => {
    expect(() =>
      validateMatch(match({ goals: [goal({ assistId: "a" })] }), fixture()),
    ).toThrow("own goal");
    expect(() =>
      validateMatch(match({ goals: [goal({ assistId: "c" })] }), fixture()),
    ).toThrow("Assister");
  });
  it("accepts own goal credited to the benefiting team", () =>
    expect(() =>
      validateMatch(
        match({
          goals: [goal({ type: "own-goal", scorerId: "c", assistId: "" })],
        }),
        fixture(),
      ),
    ).not.toThrow());
  it("rejects own goals with assists or a scorer from the benefiting team", () => {
    expect(() =>
      validateMatch(
        match({ goals: [goal({ type: "own-goal", scorerId: "c" })] }),
        fixture(),
      ),
    ).toThrow("cannot have assists");
    expect(() =>
      validateMatch(
        match({ goals: [goal({ type: "own-goal", assistId: "" })] }),
        fixture(),
      ),
    ).toThrow("correct football roster");
  });
  it("rejects duplicate events and inconsistent outcomes", () => {
    expect(() =>
      validateMatch(
        match({ homeScore: 2, goals: [goal(), goal()] }),
        fixture(),
      ),
    ).toThrow("Duplicate");
    expect(() => validateMatch(match({ outcome: "away" }), fixture())).toThrow(
      "disagree",
    );
  });
  it("validates structured ordinary and stoppage minutes", () => {
    expect(minuteValue("24'")).toEqual({ minute: 24, stoppage: 0 });
    expect(minuteValue("45+2")).toEqual({ minute: 45, stoppage: 2 });
    for (const v of ["-1", "121", "90+31", "abc", "2.5", "90++2"])
      expect(() => minuteValue(v)).toThrow();
  });
  it("rejects volleyball draws and configured excessive sets", () => {
    expect(() =>
      validateMatch(
        match({ sport: "volleyball", homeScore: 1, awayScore: 1, goals: [] }),
        fixture(),
      ),
    ).toThrow("draw");
    const d = fixture();
    d.settings.volleyballMaxSets = 3;
    expect(() =>
      validateMatch(match({ sport: "volleyball", homeScore: 4, goals: [] }), d),
    ).toThrow("maximum");
  });
  it("rejects individual participants from another division", () =>
    expect(() =>
      validateMatch(
        match({
          sport: "chess",
          homeId: "a",
          awayId: "e",
          homeScore: 0,
          awayScore: 0,
          goals: [],
        }),
        fixture(),
      ),
    ).toThrow("division"));
  it("blocks invalid dates and broken references", () => {
    expect(() =>
      validateMatch(match({ seasonId: "missing" }), fixture()),
    ).toThrow("Season");
    expect(() =>
      validateMatch(match({ date: "2040-01-01T00:00:00.000Z" }), fixture()),
    ).toThrow("season");
    expect(() =>
      validateState({
        ...fixture(),
        athletes: [{ ...fixture().athletes[0], teamId: "missing" }],
      }),
    ).toThrow("team");
  });
  it("preserves historical references when an athlete is archived", () => {
    let d = fixture();
    d.matches = [match()];
    d = applyOperation(d, { kind: "archive-athlete", id: "a" });
    expect(d.athletes.find((a) => a.id === "a")?.active).toBe(false);
    expect(d.matches[0].goals[0].scorerId).toBe("a");
    expect(() => validateState(d)).not.toThrow();
  });
  it("deletes an unreferenced athlete without changing other records", () => {
    const d = fixture();
    d.matches = [match()];
    const next = applyOperation(d, { kind: "delete-athlete", id: "d" });
    expect(next.athletes).toEqual(d.athletes.filter((a) => a.id !== "d"));
    expect(next.matches).toEqual(d.matches);
    expect(d.athletes.some((a) => a.id === "d")).toBe(true);
    expect(next.audit[0].message).toBe("Athlete deleted");
  });
  it("can delete an archived athlete without history", () => {
    const d = applyOperation(fixture(), { kind: "archive-athlete", id: "a" });
    expect(
      applyOperation(d, { kind: "delete-athlete", id: "a" }).athletes.some(
        (a) => a.id === "a",
      ),
    ).toBe(false);
  });
  it("rejects deletion of an unknown athlete", () => {
    expect(() =>
      applyOperation(fixture(), { kind: "delete-athlete", id: "missing" }),
    ).toThrow("Athlete not found");
  });
  it.each(["a", "b"])("preserves scorer and assister history for %s", (id) => {
    const d = fixture();
    d.matches = [match()];
    expect(() => applyOperation(d, { kind: "delete-athlete", id })).toThrow(
      "Archive the athlete",
    );
  });
  it.each(["chess", "table-tennis"] as const)(
    "preserves both participants in %s matches, including void matches",
    (sport) => {
      const d = fixture();
      d.matches = [
        match({
          sport,
          homeId: "a",
          awayId: "c",
          homeScore: 0,
          goals: [],
          status: "void",
        }),
      ];
      for (const id of ["a", "c"])
        expect(() => applyOperation(d, { kind: "delete-athlete", id })).toThrow(
          "Archive the athlete",
        );
    },
  );
  it("prevents moving a historical scorer to an incompatible class", () => {
    const d = fixture();
    d.matches = [match()];
    expect(() =>
      applyOperation(d, {
        kind: "athlete",
        value: { ...d.athletes[0], teamId: "grade-11" },
      }),
    ).toThrow("correct football roster");
  });
  it("archives a team and its athletes without deleting history", () => {
    const d = fixture();
    d.matches = [match()];
    const next = applyOperation(d, { kind: "archive-team", id: "grade-12" });
    expect(
      next.athletes
        .filter((a) => a.teamId === "grade-12")
        .every((a) => !a.active),
    ).toBe(true);
    expect(next.matches).toHaveLength(1);
  });
  it("rejects duplicate athletes, IDs, and repeated imports", () => {
    const d = fixture();
    expect(() =>
      validateState({ ...d, athletes: [...d.athletes, d.athletes[0]] }),
    ).toThrow("Duplicate IDs");
    expect(() =>
      applyOperation(d, { kind: "import", values: [d.athletes[0]] }),
    ).toThrow("already exist");
    expect(() =>
      validateState({
        ...d,
        athletes: [...d.athletes, { ...d.athletes[0], id: "new" }],
      }),
    ).toThrow("Duplicate athlete");
  });
});
