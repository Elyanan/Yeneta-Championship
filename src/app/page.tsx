import { publicSnapshot } from '@/lib/sanity';
import { ChampionshipView } from '@/components/championship';
import { Header,Footer } from '@/components/layout';
export const dynamic='force-dynamic';
export default async function Home(){const s=await publicSnapshot();return <><Header season={s.data.seasons.find(v=>v.id===s.data.settings.activeSeasonId)?.academicYear}/><main id="main" className="page-container"><ChampionshipView data={s.data} error={s.error}/></main><Footer/></>;}
