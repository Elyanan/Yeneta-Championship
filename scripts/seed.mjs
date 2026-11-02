import { createClient } from "@sanity/client";
import fs from "node:fs/promises";
import { initialData } from "../src/lib/initial.ts";
import { storageShape } from "../src/lib/storage-shape.ts";
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: process.env.SANITY_API_VERSION || "2026-11-01",
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});
const payload = initialData();
const assets = JSON.parse(
  await fs.readFile(
    new URL("../public/images/asset-manifest.json", import.meta.url),
    "utf8",
  ),
);
for (const team of payload.teams) team.logo = assets.teams[team.id] || "";
const existing = await client.getDocument("championship.current");
if (existing) {
  console.log("Championship already exists. Nothing was changed.");
  process.exit(0);
}
await client.createIfNotExists({
  _id: "championship.current",
  _type: "championship",
  payload: storageShape(payload),
});
console.log(
  "Initialized classes and season. Zero athletes and zero matches. Existing data is never overwritten.",
);
