import { Header, Footer } from "@/components/layout";
import { publicSnapshot } from "@/lib/sanity";
export const dynamic = "force-dynamic";
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await publicSnapshot();
  return (
    <>
      <Header
        season={
          s.data.seasons.find((v) => v.id === s.data.settings.activeSeasonId)
            ?.academicYear
        }
      />
      <main id="main" className="page-container">
        {s.error && (
          <div className="notice error" role="alert">
            {s.error}
          </div>
        )}
        {children}
      </main>
      <Footer />
    </>
  );
}
