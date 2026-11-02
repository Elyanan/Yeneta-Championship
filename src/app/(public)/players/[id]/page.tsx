import Link from "next/link";
import { notFound } from "next/navigation";
import { publicSnapshot } from "@/lib/sanity";
import { Avatar, Badge, MatchCard, Empty } from "@/components/shared";
import { contributions, rankings, relevant } from "@/lib/statistics";
import { sportNames } from "@/types/championship";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    { data } = await publicSnapshot();
  return { title: data.athletes.find((a) => a.id === id)?.name || "Athlete" };
}
export default async function AthletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    { data: d } = await publicSnapshot(),
    a = d.athletes.find((a) => a.id === id);
  if (!a) notFound();
  const t = d.teams.find((t) => t.id === a.teamId)!,
    matches = relevant(d, undefined, a.division, t.seasonId).filter(
      (m) =>
        [m.homeId, m.awayId].includes(id) ||
        m.goals.some((g) => g.scorerId === id || g.assistId === id),
    );
  return (
    <>
      <Link href={`/teams/${t.id}`} className="back-link">
        ← {t.name}
      </Link>
      <div className="profile-hero">
        <Avatar athlete={a} size={110} />
        <div>
          <span className="eyebrow">
            {a.division} DIVISION ·{" "}
            {a.active ? "ATHLETE PROFILE" : "ARCHIVED ATHLETE"}
          </span>
          <h1>{a.name}</h1>
          <p>
            Grade {t.grade} {t.classCode} ·{" "}
            {a.jersey !== null ? `#${a.jersey} · ` : ""}
            {t.name}
          </p>
        </div>
        <Badge team={t} size={55} />
      </div>
      <div className="awards-grid">
        {a.sports.map((s) => {
          const r = rankings(d, s, a.division, t.seasonId).find(
            (r) => r.athlete.id === a.id,
          );
          return (
            <section className="panel" key={s}>
              <div className="panel-heading">
                <h3>{sportNames[s]}</h3>
              </div>
              <div className="profile-stats px-6">
                {s === "football" ? (
                  <>
                    <div>
                      <strong>
                        {contributions(d, a.division, "goals", t.seasonId).find(
                          (x) => x.athlete.id === id,
                        )?.total || 0}
                      </strong>
                      <small>Goals</small>
                    </div>
                    <div>
                      <strong>
                        {contributions(
                          d,
                          a.division,
                          "assists",
                          t.seasonId,
                        ).find((x) => x.athlete.id === id)?.total || 0}
                      </strong>
                      <small>Assists</small>
                    </div>
                  </>
                ) : s === "volleyball" ? (
                  <p className="inline-help">
                    Team sets and results are available on the class profile.
                  </p>
                ) : (
                  <>
                    <div>
                      <strong>{r?.rating || a.startingRating}</strong>
                      <small>Elo rating</small>
                    </div>
                    <div>
                      <strong>{r?.wins || 0}</strong>
                      <small>Wins</small>
                    </div>
                    <div>
                      <strong>{r?.draws || 0}</strong>
                      <small>Draws</small>
                    </div>
                    <div>
                      <strong>{r?.winRate || 0}%</strong>
                      <small>Win rate</small>
                    </div>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <h2 className="section-space">Match appearances & contributions</h2>
      <div className="results-grid">
        {matches.reverse().map((m) => (
          <MatchCard key={m.id} match={m} data={d} />
        ))}
      </div>
      {!matches.length && <Empty title="No match appearances recorded yet." />}
    </>
  );
}
