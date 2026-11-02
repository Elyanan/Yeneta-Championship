import type { MetadataRoute } from "next";
import { publicSnapshot } from "@/lib/sanity";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_ORIGIN;
  if (!base) return [];
  const { data } = await publicSnapshot();
  return [
    "",
    "/teams",
    "/matches",
    ...data.teams.filter((t) => t.active).map((t) => `/teams/${t.id}`),
  ].map((path) => ({ url: base + path, changeFrequency: "daily" }));
}
