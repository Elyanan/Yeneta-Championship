import { z } from "zod";
import { formationIds } from "@/lib/formations";

export const sports = [
  "football",
  "volleyball",
  "chess",
  "table-tennis",
] as const;
export const sportNames = {
  football: "Football",
  volleyball: "Volleyball",
  chess: "Chess",
  "table-tennis": "Table Tennis",
};
export const sportSchema = z.enum(sports);
export const divisionSchema = z.enum(["boys", "girls"]);
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const image = z
  .string()
  .max(500)
  .refine(
    (v) =>
      !v ||
      /^\/images\/[a-zA-Z0-9._-]+$/.test(v) ||
      /^https:\/\/cdn\.sanity\.io\/images\/[a-zA-Z0-9/_.,%=-]+$/.test(v),
    "Use an imported image or Sanity image URL",
  );
export const teamSchema = z.object({
  id,
  name: z.string().trim().min(2).max(80),
  grade: z.number().int().min(1).max(12),
  classCode: z.string().max(30),
  logo: image,
  seasonId: id,
  active: z.boolean(),
});
export const athleteSchema = z.object({
  id,
  name: z.string().trim().min(2).max(100),
  teamId: id,
  division: divisionSchema,
  photo: image,
  sports: z
    .array(sportSchema)
    .min(1)
    .max(4)
    .refine((v) => new Set(v).size === v.length),
  jersey: z.number().int().min(0).max(999).nullable(),
  active: z.boolean(),
});
export const goalSchema = z.object({
  id,
  teamId: id,
  scorerId: z.string().max(100),
  assistId: z.string().max(100),
  minute: z.number().int().min(0).max(120),
  stoppage: z.number().int().min(0).max(30),
  type: z.enum(["regular", "penalty", "own-goal"]),
});
export const lineupSchema = z.object({
  formation: z.enum(formationIds),
  captainId: id.optional(),
  substitutes: z.array(id).max(100).optional(),
  substitutions: z
    .array(z.object({ id, outgoingId: id, incomingId: id }))
    .max(100)
    .optional(),
  players: z
    .array(z.object({ position: z.string().min(1).max(10), athleteId: id }))
    .max(11),
});
export const matchMediaSchema = z.discriminatedUnion("kind", [
  z.object({
    id,
    kind: z.literal("image"),
    url: image.refine(Boolean, "Image URL is required"),
    caption: z.string().trim().max(200),
  }),
  z.object({
    id,
    kind: z.literal("video"),
    url: z
      .string()
      .max(500)
      .regex(
        /^https:\/\/cdn\.sanity\.io\/files\/[a-zA-Z0-9/_.,%=-]+\.(mp4|webm)$/,
      ),
    caption: z.string().trim().max(200),
  }),
]);
export const matchSchema = z.object({
  id,
  seasonId: id,
  sport: sportSchema,
  division: divisionSchema,
  homeId: id,
  awayId: id,
  date: z.iso.datetime(),
  homeScore: z.number().int().min(0).max(100),
  awayScore: z.number().int().min(0).max(100),
  goals: z.array(goalSchema).max(200),
  outcome: z.enum(["home", "away", "draw"]),
  status: z.enum(["scheduled", "completed", "void"]),
  friendly: z.boolean().optional(),
  lineups: z
    .object({ home: lineupSchema.optional(), away: lineupSchema.optional() })
    .optional(),
  media: z.array(matchMediaSchema).max(20).optional(),
  updatedAt: z.iso.datetime(),
});
export const seasonSchema = z
  .object({
    id,
    name: z.string().trim().min(2).max(80),
    academicYear: z.string().min(4).max(30),
    start: z.iso.date(),
    end: z.iso.date(),
    active: z.boolean(),
  })
  .refine((s) => s.end >= s.start, "Season end must follow start");
export const settingsSchema = z.object({
  activeSeasonId: id,
  footballWin: z.number().int().min(0).max(10),
  footballDraw: z.number().int().min(0).max(10),
  volleyballWin: z.number().int().min(0).max(10),
  volleyballMaxSets: z.number().int().min(1).max(99).nullable(),
  enabledSports: z.array(sportSchema).min(1).max(4),
});
export const stateSchema = z.object({
  seasons: z.array(seasonSchema).max(100),
  teams: z.array(teamSchema).max(500),
  athletes: z.array(athleteSchema).max(5000),
  matches: z.array(matchSchema).max(10000),
  settings: settingsSchema,
  audit: z
    .array(z.object({ id, date: z.string(), message: z.string() }))
    .max(100),
});
export type Sport = z.infer<typeof sportSchema>;
export type Division = z.infer<typeof divisionSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Athlete = z.infer<typeof athleteSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Match = z.infer<typeof matchSchema>;
export type Lineup = z.infer<typeof lineupSchema>;
export type MatchMedia = z.infer<typeof matchMediaSchema>;
export type Championship = z.infer<typeof stateSchema>;
export type Snapshot = {
  data: Championship;
  revision: string;
  configured: boolean;
  error?: string;
};
