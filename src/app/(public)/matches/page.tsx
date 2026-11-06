import { publicSnapshot } from "@/lib/sanity";
import { MatchCentre } from "@/components/match-centre";
export const metadata = { title: "Match centre" };
export default async function Matches() {
  const { data } = await publicSnapshot();
  return (
    <>
      <div className="page-title">
        <span className="eyebrow accent">THE MATCH CENTRE</span>
        <h1>The next kickoff. The final whistle.</h1>
        <p>Upcoming fixtures, match results, and the moments in between.</p>
      </div>
      <MatchCentre data={data} />
    </>
  );
}
