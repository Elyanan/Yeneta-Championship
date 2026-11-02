import type { Metadata } from "next";
import { publicSnapshot } from "@/lib/sanity";
import { TeamCard, Empty } from "@/components/shared";
export const metadata: Metadata = { title: "The teams" };
export default async function Teams() {
  const { data: d } = await publicSnapshot();
  const teams = d.teams.filter(
    (t) => t.active && t.seasonId === d.settings.activeSeasonId,
  );
  return (
    <>
      <div className="page-title">
        <span className="eyebrow accent">REPRESENT YOUR CLASS</span>
        <h1>The teams.</h1>
        <p>
          A badge to wear with pride. Meet the classes behind the competition.
        </p>
      </div>
      <div className="team-grid">
        {teams.map((t) => (
          <TeamCard key={t.id} team={t} data={d} />
        ))}
      </div>
      {!teams.length && <Empty title="No teams available." />}
    </>
  );
}
