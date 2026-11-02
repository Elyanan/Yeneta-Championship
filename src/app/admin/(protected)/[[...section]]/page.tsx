import { redirect, notFound } from "next/navigation";
import { session } from "@/lib/auth";
import { readSnapshot } from "@/lib/sanity";
import { Header, Footer } from "@/components/layout";
import { AdminDashboard } from "@/components/admin/dashboard";
export const metadata = {
  title: "Championship administration",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Admin({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  if (!(await session())) redirect("/admin/login");
  const { section } = await params;
  const page = section?.[0] || "overview";
  if (
    (section?.length || 0) > 1 ||
    ![
      "overview",
      "matches",
      "players",
      "teams",
      "standings",
      "media",
      "settings",
    ].includes(page)
  )
    notFound();
  const snapshot = await readSnapshot();
  return (
    <>
      <Header
        admin
        season={
          snapshot.data.seasons.find(
            (s) => s.id === snapshot.data.settings.activeSeasonId,
          )?.academicYear
        }
      />
      <main id="main" className="page-container">
        <AdminDashboard snapshot={snapshot} section={page} />
      </main>
      <Footer />
    </>
  );
}
