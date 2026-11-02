import { publicSnapshot } from "@/lib/sanity";
import { standings, rankings, contributions, relevant } from "@/lib/statistics";
import { csv } from "@/lib/csv";
import { divisionSchema, sportSchema } from "@/types/championship";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams,
    sport = sportSchema.safeParse(p.get("sport") || "football"),
    division = divisionSchema.safeParse(p.get("division") || "boys");
  if (!sport.success || !division.success)
    return Response.json(
      { error: "Invalid sport or division." },
      { status: 400 },
    );
  const snap = await publicSnapshot();
  if (snap.error) return Response.json({ error: snap.error }, { status: 503 });
  const d = snap.data,
    kind = p.get("kind") || "standings",
    team = (id: string) => d.teams.find((t) => t.id === id)?.name || "",
    athlete = (id: string) => d.athletes.find((a) => a.id === id)?.name || "";
  let rows: unknown[][];
  if (kind === "roster")
    rows = [
      ["name", "team", "division", "sports", "jersey", "photo"],
      ...d.athletes
        .filter(
          (a) =>
            a.active &&
            d.teams.some(
              (t) =>
                t.id === a.teamId && t.seasonId === d.settings.activeSeasonId,
            ),
        )
        .map((a) => [
          a.name,
          a.teamId,
          a.division,
          a.sports.join(";"),
          a.jersey,
          a.photo,
        ]),
    ];
  else if (kind === "matches")
    rows = [
      [
        "ID",
        "Date",
        "Sport",
        "Division",
        "Home",
        "Away",
        "Home score",
        "Away score",
        "Outcome",
      ],
      ...relevant(d).map((m) => [
        m.id,
        m.date,
        m.sport,
        m.division,
        team(m.homeId) || athlete(m.homeId),
        team(m.awayId) || athlete(m.awayId),
        m.homeScore,
        m.awayScore,
        m.outcome,
      ]),
    ];
  else if (kind === "goals" || kind === "assists")
    rows = [
      ["Rank", "Athlete", "Team", kind],
      ...contributions(d, division.data, kind).map((r, i) => [
        i + 1,
        r.athlete.name,
        team(r.athlete.teamId),
        r.total,
      ]),
    ];
  else if (kind === "standings")
    rows = ["football", "volleyball"].includes(sport.data)
      ? [
          [
            "Rank",
            "Team",
            "Played",
            "Won",
            "Drawn",
            "Lost",
            sport.data === "football" ? "Goals for" : "Sets won",
            sport.data === "football" ? "Goals against" : "Sets lost",
            "Difference",
            "Points",
            "Form",
          ],
          ...standings(d, sport.data, division.data).map((r, i) => [
            i + 1,
            r.team.name,
            r.played,
            r.won,
            r.drawn,
            r.lost,
            r.gf,
            r.ga,
            r.gd,
            r.points,
            r.form.join(""),
          ]),
        ]
      : [
          [
            "Rank",
            "Athlete",
            "Team",
            "Rating",
            "Wins",
            "Draws",
            "Losses",
            "Win rate",
            "Form",
          ],
          ...rankings(d, sport.data, division.data).map((r, i) => [
            i + 1,
            r.athlete.name,
            team(r.athlete.teamId),
            r.rating,
            r.wins,
            r.draws,
            r.losses,
            r.winRate,
            r.form.join(""),
          ]),
        ];
  else return Response.json({ error: "Unknown export." }, { status: 400 });
  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="yeneta-${kind}-${sport.data}-${division.data}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
