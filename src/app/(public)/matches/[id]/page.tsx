import Link from "next/link";
import { notFound } from "next/navigation";
import { publicSnapshot } from "@/lib/sanity";
import { MatchCard, Empty } from "@/components/shared";
import { MatchLineups } from "@/components/football-lineup";
import { MatchGallery } from "@/components/match-gallery";
export const metadata = { title: "Match centre" };
export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    { data: d } = await publicSnapshot(),
    m = d.matches.find((m) => m.id === id && m.status !== "void");
  if (!m) notFound();
  const name = (id: string) =>
    d.athletes.find((a) => a.id === id)?.name || "Unknown athlete";
  return (
    <>
      <Link className="back-link" href="/matches">
        ← All matches
      </Link>
      <div className="page-title">
        <span className="eyebrow accent">
          {m.status === "scheduled" ? "MATCH PREVIEW" : "MATCH REPORT"}
        </span>
        <h1>
          {m.status === "scheduled" ? "The stage is set." : "The final score."}
        </h1>
      </div>
      <div className="max-w-2xl mx-auto">
        <MatchCard match={m} data={d} />
        {m.friendly && (
          <p className="notice">
            Friendly match. This result does not count toward league standings,
            points, form or player goal and assist rankings.
          </p>
        )}
        {m.status === "scheduled" && (
          <p className="notice">
            Kickoff:{" "}
            {new Intl.DateTimeFormat("en", {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: "Africa/Nairobi",
            }).format(new Date(m.date))}{" "}
            (EAT). The result will appear here after the match.
          </p>
        )}
        {m.sport === "football" && (m.lineups?.home || m.lineups?.away) && (
          <MatchLineups match={m} data={d} />
        )}
        {m.sport === "football" && m.status === "completed" && (
          <section className="panel section-space">
            <div className="panel-heading">
              <h2 className="text-xl">Goal timeline</h2>
            </div>
            {m.goals.length ? (
              <div className="goal-timeline">
                {[...m.goals]
                  .sort(
                    (a, b) =>
                      a.minute - b.minute ||
                      a.stoppage - b.stoppage ||
                      a.id.localeCompare(b.id),
                  )
                  .map((g) => (
                    <div className="goal-row" key={g.id}>
                      <strong>
                        {g.minute}
                        {g.stoppage ? `+${g.stoppage}` : ""}′
                      </strong>
                      <div>
                        <Link href={`/players/${g.scorerId}`}>
                          <b>{name(g.scorerId)}</b>
                        </Link>
                        <small>
                          {d.teams.find((t) => t.id === g.teamId)?.name} ·{" "}
                          {g.type === "own-goal"
                            ? "Own goal"
                            : g.type === "penalty"
                              ? "Penalty"
                              : "Goal"}
                          {g.assistId
                            ? ` · Assisted by ${name(g.assistId)}`
                            : ""}
                        </small>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <Empty title="A goalless result." />
            )}
          </section>
        )}
        {!!m.media?.length && <MatchGallery media={m.media} />}
      </div>
    </>
  );
}
