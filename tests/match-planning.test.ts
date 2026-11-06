import { describe, expect, it } from "vitest";
import { fixture, match } from "./fixtures";
import { applyOperation } from "@/lib/operations";
import { validateState } from "@/lib/validation";
import { standings, rankings } from "@/lib/statistics";
import { matchSchema } from "@/types/championship";
import { storageShape } from "@/lib/storage-shape";
import { formationIds, formationSlots } from "@/lib/formations";

const scheduled = () =>
  match({
    status: "scheduled",
    date: new Date(Date.now() + 86_400_000).toISOString(),
    homeScore: 0,
    goals: [],
    outcome: "draw",
  });
describe("match scheduling, lineups and media", () => {
  it.each(["football", "volleyball", "chess", "table-tennis"] as const)(
    "allows a future %s fixture without a result",
    (sport) => {
      const d = fixture();
      d.matches = [
        {
          ...scheduled(),
          sport,
          ...(["chess", "table-tennis"].includes(sport)
            ? { homeId: "a", awayId: "c" }
            : {}),
        },
      ];
      expect(() => validateState(d)).not.toThrow();
      expect(
        standings(d, "football", "boys").every(
          (r) => r.played === 0 && r.points === 0,
        ),
      ).toBe(true);
      expect(
        rankings(d, "chess", "boys").every(
          (r) => r.played === 0 && r.wins === 0,
        ),
      ).toBe(true);
    },
  );
  it("rejects a completed result in the future and a scheduled result with scores", () => {
    const d = fixture();
    expect(() =>
      applyOperation(d, {
        kind: "match",
        value: { ...match(), date: scheduled().date },
      }),
    ).toThrow("future");
    for (const invalid of [
      { homeScore: 1 },
      { goals: match().goals },
      { outcome: "home" },
    ])
      expect(() =>
        applyOperation(d, {
          kind: "match",
          value: { ...scheduled(), ...invalid },
        }),
      ).toThrow("Scheduled matches cannot");
  });
  it("turns a fixture into a completed result without losing its lineup or gallery", () => {
    let d = fixture();
    const value = {
      ...scheduled(),
      lineups: {
        home: {
          formation: "4-3-3" as const,
          players: [{ position: "GK", athleteId: "a" }],
        },
      },
      media: [
        {
          id: "photo-1",
          kind: "image" as const,
          url: "/images/school-logo.webp",
          caption: "Team photo",
        },
      ],
    };
    d = applyOperation(d, { kind: "match", value });
    d = applyOperation(d, {
      kind: "match",
      value: {
        ...d.matches[0],
        ...match(),
        lineups: value.lineups,
        media: value.media,
        updatedAt: d.matches[0].updatedAt,
      },
    });
    expect(
      standings(d, "football", "boys").find((r) => r.team.id === "grade-12")
        ?.points,
    ).toBe(3);
    expect(d.matches[0].lineups).toEqual(value.lineups);
    expect(d.matches[0].media).toEqual(value.media);
    expect(validateState(storageShape(d))).toEqual(d);
  });
  it("keeps existing matches without optional lineup or media fields valid", () => {
    expect(() =>
      validateState({ ...fixture(), matches: [match()] }),
    ).not.toThrow();
  });
  it("supports unique positions for all available formation sizes", () => {
    for (const id of formationIds) {
      const slots = formationSlots(id);
      expect(new Set(slots.map((s) => s.position)).size).toBe(slots.length);
      expect(slots.some((s) => s.position === "GK")).toBe(true);
      expect(
        slots.every((s) => s.x > 0 && s.x < 100 && s.y > 0 && s.y < 100),
      ).toBe(true);
    }
    expect(formationSlots("2-3-1")).toHaveLength(7);
    expect(formationSlots("2-2")).toHaveLength(5);
  });
  it.each([
    [{ position: "GK", athleteId: "c" }],
    [{ position: "GK", athleteId: "e" }],
    [{ position: "INVALID", athleteId: "a" }],
    [
      { position: "GK", athleteId: "a" },
      { position: "GK", athleteId: "b" },
    ],
    [
      { position: "GK", athleteId: "a" },
      { position: "ST", athleteId: "a" },
    ],
  ])(
    "rejects incompatible or duplicated lineup assignments: %j",
    (...players) => {
      expect(() =>
        applyOperation(fixture(), {
          kind: "match",
          value: {
            ...scheduled(),
            lineups: { home: { formation: "4-3-3", players } },
          },
        }),
      ).toThrow();
    },
  );
  it("restricts formations to football and protects saved lineup references", () => {
    const value = {
      ...scheduled(),
      lineups: {
        home: {
          formation: "4-3-3",
          players: [{ position: "GK", athleteId: "a" }],
        },
      },
    };
    expect(() =>
      applyOperation(fixture(), {
        kind: "match",
        value: { ...value, sport: "volleyball" },
      }),
    ).toThrow("only available for football");
    const d = applyOperation(fixture(), { kind: "match", value });
    expect(() =>
      applyOperation(d, { kind: "delete-athlete", id: "a" }),
    ).toThrow("saved lineup");
  });
  it("only accepts supported media URLs and limits gallery size", () => {
    const video = {
      id: "clip",
      kind: "video",
      url: "https://cdn.sanity.io/files/testproject/production/abc123.mp4",
      caption: "Highlights",
    };
    expect(
      matchSchema.safeParse({ ...scheduled(), media: [video] }).success,
    ).toBe(true);
    for (const url of [
      "javascript:alert(1)",
      "https://example.com/clip.mp4",
      "https://cdn.sanity.io/files/testproject/production/file.html",
    ])
      expect(
        matchSchema.safeParse({ ...scheduled(), media: [{ ...video, url }] })
          .success,
      ).toBe(false);
    expect(
      matchSchema.safeParse({
        ...scheduled(),
        media: Array.from({ length: 21 }, (_, i) => ({
          ...video,
          id: `clip-${i}`,
        })),
      }).success,
    ).toBe(false);
  });
});
