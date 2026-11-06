import { defineField, defineType, type SchemaTypeDefinition } from "sanity";
import { validateState } from "../lib/validation";
import { formationIds } from "../lib/formations";
const text = (name: string, required = true) =>
  defineField({
    name,
    type: "string",
    validation: (r) => (required ? r.required() : r),
  });
const num = (name: string, min = 0, max = 9999) =>
  defineField({
    name,
    type: "number",
    validation: (r) => r.required().integer().min(min).max(max),
  });
const bool = (name: string) =>
  defineField({
    name,
    type: "boolean",
    initialValue: true,
    validation: (r) => r.required(),
  });
const list = (name: string, type: string) =>
  defineField({
    name,
    type: "array",
    of: [{ type }],
    validation: (r) => r.required(),
  });
const choice = (name: string, values: string[]) =>
  defineField({
    name,
    type: "string",
    options: { list: values },
    validation: (r) =>
      r
        .required()
        .custom((value) =>
          !value || values.includes(value)
            ? true
            : "Choose one of the allowed values.",
        ),
  });
const sportValues = ["football", "volleyball", "chess", "table-tennis"];
const seasonRecord = defineType({
  name: "seasonRecord",
  type: "object",
  title: "Season",
  fields: [
    text("id"),
    text("name"),
    text("academicYear"),
    defineField({
      name: "start",
      type: "date",
      validation: (r) => r.required(),
    }),
    defineField({ name: "end", type: "date", validation: (r) => r.required() }),
    bool("active"),
  ],
});
const teamRecord = defineType({
  name: "teamRecord",
  type: "object",
  title: "Team / class",
  fields: [
    text("id"),
    text("name"),
    num("grade", 1, 12),
    text("classCode", false),
    text("logo", false),
    text("seasonId"),
    bool("active"),
  ],
  preview: { select: { title: "name", subtitle: "classCode" } },
});
const athleteRecord = defineType({
  name: "athleteRecord",
  type: "object",
  title: "Athlete",
  fields: [
    text("id"),
    text("name"),
    text("teamId"),
    choice("division", ["boys", "girls"]),
    text("photo", false),
    defineField({
      name: "sports",
      type: "array",
      of: [{ type: "string", options: { list: sportValues } }],
      validation: (r) => r.required().min(1).unique(),
    }),
    defineField({
      name: "jersey",
      type: "number",
      validation: (r) => r.integer().min(0).max(999),
    }),
    bool("active"),
  ],
  preview: { select: { title: "name", subtitle: "division" } },
});
const goalEvent = defineType({
  name: "goalEvent",
  type: "object",
  fields: [
    text("id"),
    text("teamId"),
    text("scorerId"),
    text("assistId", false),
    num("minute", 0, 120),
    num("stoppage", 0, 30),
    choice("type", ["regular", "penalty", "own-goal"]),
  ],
});
const lineupPlayer = defineType({
  name: "lineupPlayer",
  type: "object",
  fields: [text("position"), text("athleteId")],
});
const lineupRecord = defineType({
  name: "lineupRecord",
  type: "object",
  fields: [
    choice("formation", [...formationIds]),
    list("players", "lineupPlayer"),
    defineField({
      name: "substitutions",
      type: "array",
      of: [{ type: "lineupSubstitution" }],
      validation: (r) => r.max(100),
    }),
    defineField({
      name: "substitutes",
      type: "array",
      of: [{ type: "string" }],
      validation: (r) => r.max(100).unique(),
    }),
  ],
});
const matchLineups = defineType({
  name: "matchLineups",
  type: "object",
  fields: [
    defineField({ name: "home", type: "lineupRecord" }),
    defineField({ name: "away", type: "lineupRecord" }),
  ],
});
const matchMediaRecord = defineType({
  name: "matchMediaRecord",
  type: "object",
  fields: [
    text("id"),
    choice("kind", ["image", "video"]),
    text("url"),
    text("caption", false),
  ],
});
const matchRecord = defineType({
  name: "matchRecord",
  type: "object",
  title: "Match result",
  fields: [
    text("id"),
    text("seasonId"),
    choice("sport", sportValues),
    choice("division", ["boys", "girls"]),
    text("homeId"),
    text("awayId"),
    defineField({
      name: "date",
      type: "datetime",
      validation: (r) => r.required(),
    }),
    num("homeScore", 0, 100),
    num("awayScore", 0, 100),
    list("goals", "goalEvent"),
    choice("outcome", ["home", "away", "draw"]),
    choice("status", ["scheduled", "completed", "void"]),
    defineField({
      name: "friendly",
      title: "Friendly match (no league points)",
      type: "boolean",
      initialValue: false,
    }),
    defineField({ name: "lineups", type: "matchLineups" }),
    defineField({
      name: "media",
      type: "array",
      of: [{ type: "matchMediaRecord" }],
      validation: (r) => r.max(20),
    }),
    defineField({
      name: "updatedAt",
      type: "datetime",
      validation: (r) => r.required(),
    }),
  ],
});
const auditEvent = defineType({
  name: "auditEvent",
  type: "object",
  fields: [text("id"), text("date"), text("message")],
});
const championship = defineType({
  name: "championship",
  type: "document",
  title: "Championship",
  readOnly: true,
  description:
    "Managed atomically through the custom /admin application. Read-only in Studio to preserve cross-record validation and concurrency guarantees.",
  fields: [
    defineField({
      name: "payload",
      type: "object",
      fields: [
        list("seasons", "seasonRecord"),
        list("teams", "teamRecord"),
        list("athletes", "athleteRecord"),
        list("matches", "matchRecord"),
        list("audit", "auditEvent"),
        defineField({
          name: "settings",
          type: "object",
          fields: [
            text("activeSeasonId"),
            num("footballWin", 0, 10),
            num("footballDraw", 0, 10),
            num("volleyballWin", 0, 10),
            defineField({
              name: "volleyballMaxSets",
              type: "number",
              validation: (r) => r.integer().min(1).max(99),
            }),
            list("enabledSports", "string"),
          ],
        }),
      ],
      validation: (r) =>
        r.required().custom((value) => {
          try {
            validateState(value);
            return true;
          } catch (e) {
            return e instanceof Error ? e.message : "Invalid championship data";
          }
        }),
    }),
  ],
});
const loginThrottle = defineType({
  name: "loginThrottle",
  type: "document",
  hidden: true,
  readOnly: true,
  fields: [num("attempts"), num("resetAt", 0, Number.MAX_SAFE_INTEGER)],
});
const adminSession = defineType({
  name: "adminSession",
  type: "document",
  hidden: true,
  readOnly: true,
  fields: [num("expires", 0, Number.MAX_SAFE_INTEGER)],
});
export const schemaTypes: SchemaTypeDefinition[] = [
  defineType({
    name: "lineupSubstitution",
    type: "object",
    fields: [text("id"), text("outgoingId"), text("incomingId")],
  }),
  defineType({
    name: "mediaUpload",
    type: "document",
    hidden: true,
    readOnly: true,
    fields: [
      num("size", 1, 50_000_000),
      text("mime"),
      bool("matchMedia"),
      num("expires", 0, Number.MAX_SAFE_INTEGER),
    ],
  }),
  defineType({
    name: "mediaUploadChunk",
    type: "document",
    hidden: true,
    readOnly: true,
    fields: [
      text("uploadId"),
      text("data"),
      num("expires", 0, Number.MAX_SAFE_INTEGER),
    ],
  }),
  championship,
  seasonRecord,
  teamRecord,
  athleteRecord,
  goalEvent,
  matchRecord,
  lineupPlayer,
  lineupRecord,
  matchLineups,
  matchMediaRecord,
  auditEvent,
  loginThrottle,
  adminSession,
];
