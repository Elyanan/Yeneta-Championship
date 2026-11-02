import Link from "next/link";
import { notFound } from "next/navigation";
import { publicSnapshot } from "@/lib/sanity";
import { MatchCard, Empty } from "@/components/shared";
export const metadata = { title: "Match result" };
export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    { data: d } = await publicSnapshot(),
    m = d.matches.find((m) => m.id === id && m.status === "completed");
  if (!m) notFound();
  const name = (id: string) =>
    d.athletes.find((a) => a.id === id)?.name || "Unknown athlete";
  return (
    <>
      <Link className="back-link" href="/matches">
        ← All results
      </Link>
      <div className="page-title">
        <span className="eyebrow accent">MATCH REPORT</span>
        <h1>The final score.</h1>
      </div>
      <div className="max-w-2xl mx-auto">
        <MatchCard match={m} data={d} />
        {m.sport === "football" && (
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
      </div>
    </>
  );
}
