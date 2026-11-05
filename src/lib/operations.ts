import { z } from "zod";
import {
  athleteSchema,
  matchSchema,
  seasonSchema,
  settingsSchema,
  teamSchema,
  type Championship,
} from "@/types/championship";
import { DomainError, validateState } from "./validation";
export const operationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("team"), value: teamSchema }),
  z.object({ kind: z.literal("athlete"), value: athleteSchema }),
  z.object({ kind: z.literal("match"), value: matchSchema }),
  z.object({ kind: z.literal("delete-match"), id: z.string() }),
  z.object({ kind: z.literal("delete-athlete"), id: z.string() }),
  z.object({ kind: z.literal("archive-athlete"), id: z.string() }),
  z.object({ kind: z.literal("archive-team"), id: z.string() }),
  z.object({
    kind: z.literal("import"),
    values: z.array(athleteSchema).min(1).max(500),
  }),
  z.object({
    kind: z.literal("settings"),
    value: settingsSchema,
    seasons: z.array(seasonSchema).min(1).max(100),
  }),
]);
export type Operation = z.infer<typeof operationSchema>;
export function applyOperation(
  source: Championship,
  input: unknown,
): Championship {
  const op = operationSchema.parse(input),
    d = structuredClone(source);
  const upsert = <T extends { id: string }>(list: T[], value: T) => {
    const i = list.findIndex((v) => v.id === value.id);
    if (i < 0) list.push(value);
    else list[i] = value;
  };
  if (op.kind === "team") upsert(d.teams, op.value);
  if (op.kind === "athlete") upsert(d.athletes, op.value);
  if (op.kind === "match") {
    const prior = d.matches.find((m) => m.id === op.value.id);
    if (prior && prior.updatedAt !== op.value.updatedAt)
      throw new DomainError("This match has changed. Reload before editing.");
    for (const id of [op.value.homeId, op.value.awayId]) {
      const entity = ["football", "volleyball"].includes(op.value.sport)
        ? d.teams.find((t) => t.id === id)
        : d.athletes.find((a) => a.id === id);
      if (!entity?.active && !prior)
        throw new DomainError("New matches require active participants.");
    }
    upsert(d.matches, { ...op.value, updatedAt: new Date().toISOString() });
  }
  if (op.kind === "delete-match") {
    if (!d.matches.some((m) => m.id === op.id))
      throw new DomainError("Match not found.");
    d.matches = d.matches.filter((m) => m.id !== op.id);
  }
  if (op.kind === "delete-athlete") {
    if (!d.athletes.some((a) => a.id === op.id))
      throw new DomainError("Athlete not found.");
    if (
      d.matches.some(
        (m) =>
          ((m.sport === "chess" || m.sport === "table-tennis") &&
            (m.homeId === op.id || m.awayId === op.id)) ||
          m.goals.some((g) => g.scorerId === op.id || g.assistId === op.id),
      )
    )
      throw new DomainError(
        "This athlete has recorded match history. Archive the athlete to preserve those results.",
      );
    d.athletes = d.athletes.filter((a) => a.id !== op.id);
  }
  if (op.kind === "archive-athlete") {
    const a = d.athletes.find((a) => a.id === op.id);
    if (!a) throw new DomainError("Athlete not found.");
    a.active = false;
  }
  if (op.kind === "archive-team") {
    const t = d.teams.find((t) => t.id === op.id);
    if (!t) throw new DomainError("Team not found.");
    t.active = false;
    for (const a of d.athletes.filter((a) => a.teamId === t.id))
      a.active = false;
  }
  if (op.kind === "import")
    for (const a of op.values) {
      if (d.athletes.some((v) => v.id === a.id))
        throw new DomainError(
          "Import IDs already exist. Reload before importing again.",
        );
      d.athletes.push(a);
    }
  if (op.kind === "settings") {
    d.settings = op.value;
    d.seasons = op.seasons;
  }
  d.audit = [
    {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      message:
        op.kind === "delete-match"
          ? "Match deleted"
          : op.kind === "delete-athlete"
            ? "Athlete deleted"
            : `${op.kind.replaceAll("-", " ")} saved`,
    },
    ...d.audit,
  ].slice(0, 100);
  return validateState(d);
}
