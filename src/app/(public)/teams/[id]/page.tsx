import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { publicSnapshot } from "@/lib/sanity";
import { standings, relevant } from "@/lib/statistics";
import { Badge, Avatar, Empty, MatchCard } from "@/components/shared";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data } = await publicSnapshot();
  const { id } = await params;
  return { title: data.teams.find((t) => t.id === id)?.name || "Team" };
}
export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    { data: d } = await publicSnapshot(),
    t = d.teams.find((t) => t.id === id);
  if (!t) notFound();
  return (
    <>
      <Link href="/teams" className="back-link">
        <ArrowLeft size={15} /> All teams
      </Link>
      <section className="profile-hero">
        <Badge team={t} size={120} priority />
        <div>
          <span className="eyebrow">
            GRADE {t.grade} {t.classCode} ·{" "}
            {t.active ? "TEAM PROFILE" : "ARCHIVED TEAM"}
          </span>
          <h1>{t.name}</h1>
          <p>
            {d.seasons.find((s) => s.id === t.seasonId)?.academicYear} · Yeneta
            Academy
          </p>
        </div>
      </section>
      {(["boys", "girls"] as const).map((division) => {
        const athletes = d.athletes.filter(
          (a) => a.teamId === t.id && a.division === division && a.active,
        );
        return (
          <section className="section-space" key={division}>
            <div className="section-heading">
              <h2>{division === "boys" ? "Boys" : "Girls"} division</h2>
              <span className="eyebrow">{athletes.length} ATHLETES</span>
            </div>
            <div className="awards-grid section-space">
              {(["football", "volleyball"] as const).map((s) => {
                const r = standings(d, s, division, t.seasonId).find(
                  (r) => r.team.id === id,
                );
                return (
                  <div className="panel" key={s}>
                    <div className="panel-heading">
                      <h3 className="capitalize">{s}</h3>
                    </div>
                    <div className="profile-stats px-6">
                      <div>
                        <strong>{r?.played || 0}</strong>
                        <small>Played</small>
                      </div>
                      <div>
                        <strong>{r?.won || 0}</strong>
                        <small>Wins</small>
                      </div>
                      <div>
                        <strong>{r?.points || 0}</strong>
                        <small>Points</small>
                      </div>
                      <div>
                        <strong>{r?.gf || 0}</strong>
                        <small>{s === "football" ? "Goals" : "Sets"} won</small>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="panel">
              {athletes.length ? (
                <div className="roster-grid">
                  {athletes.map((a) => (
                    <Link
                      className="athlete-card"
                      href={`/players/${a.id}`}
                      key={a.id}
                    >
                      <Avatar athlete={a} size={52} />
                      <div>
                        <b>{a.name}</b>
                        <small>
                          {a.jersey !== null ? `#${a.jersey} · ` : ""}Grade{" "}
                          {t.grade}
                        </small>
                        <p>{a.sports.join(" · ").replaceAll("-", " ")}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No players have been added to this team yet."
                  detail={`The ${division} roster will appear here once athletes are registered.`}
                />
              )}
            </div>
          </section>
        );
      })}
      <section className="section-space">
        <h2 className="mb-6">Recent results</h2>
        <div className="results-grid">
          {relevant(d, undefined, undefined, t.seasonId)
            .filter(
              (m) =>
                [m.homeId, m.awayId].includes(id) ||
                d.athletes.some(
                  (a) => a.teamId === id && [m.homeId, m.awayId].includes(a.id),
                ),
            )
            .slice(-6)
            .reverse()
            .map((m) => (
              <MatchCard key={m.id} match={m} data={d} />
            ))}
        </div>
        {!relevant(d, undefined, undefined, t.seasonId).some(
          (m) =>
            [m.homeId, m.awayId].includes(id) ||
            d.athletes.some(
              (a) => a.teamId === id && [m.homeId, m.awayId].includes(a.id),
            ),
        ) && <Empty title="No recorded results yet." />}
      </section>
    </>
  );
}
