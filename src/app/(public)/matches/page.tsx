import { publicSnapshot } from "@/lib/sanity";
import { MatchCentre } from "@/components/match-centre";
export const metadata = { title: "Match centre" };
export default async function Matches() {
  const { data } = await publicSnapshot();
  return (
    <>
      <div className="page-title">
        <span className="eyebrow accent">THE MATCH CENTRE</span>
        <h1>Every result. All here.</h1>
        <p>The final whistle is just the beginning of the story.</p>
      </div>
      <MatchCentre data={data} />
    </>
  );
}
