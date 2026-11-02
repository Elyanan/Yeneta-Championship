import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { identifyAsset, matchAsset } from "../src/lib/assets.ts";
import { initialData } from "../src/lib/initial.ts";
const root = process.cwd(),
  out = path.join(root, "public", "images");
await fs.mkdir(out, { recursive: true });
const files = (await fs.readdir(root))
  .filter((v) => /\.(png|jpe?g|webp|avif)$/i.test(v))
  .sort();
const manifest = { school: null, teams: {}, unresolved: [], files: [] },
  teams = initialData().teams;
const identified = files.map(identifyAsset),
  school = identified.filter((a) => a.school);
if (school.length !== 1)
  manifest.unresolved.push({
    file: school.map((s) => s.filename).join(", "),
    reason: "Expected exactly one school logo.",
  });
const groups = new Map();
for (const asset of identified.filter((a) => !a.school)) {
  const match = matchAsset(asset, teams);
  if (!match.teamId) {
    manifest.unresolved.push({ file: asset.filename, reason: match.reason });
    continue;
  }
  const group = groups.get(match.teamId) || [];
  group.push(asset);
  groups.set(match.teamId, group);
}
for (const [id, list] of groups)
  if (list.length > 1)
    manifest.unresolved.push({
      file: list.map((a) => a.filename).join(", "),
      reason: `Multiple images match ${id}; association skipped.`,
    });
const toOptimize = [
  ...(school.length === 1
    ? [{ asset: school[0], slug: "school-logo", id: null }]
    : []),
  ...[...groups]
    .filter(([, list]) => list.length === 1)
    .map(([id, list]) => ({
      asset: list[0],
      slug: list[0].name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      id,
    })),
];
for (const { asset, slug, id } of toOptimize) {
  const input = path.join(root, asset.filename);
  const filename = `${slug}.webp`;
  for (const [pixels, suffix] of [
    [512, ""],
    [128, ".thumb"],
  ]) {
    await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(pixels, pixels, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(out, `${slug}${suffix}.webp`));
  }
  const bytes = (await fs.stat(path.join(out, filename))).size;
  manifest.files.push({
    ...asset,
    url: `/images/${filename}`,
    thumbnail: `/images/${slug}.thumb.webp`,
    bytes,
  });
  if (id) manifest.teams[id] = `/images/${filename}`;
  else {
    manifest.school = `/images/${filename}`;
    await sharp(input)
      .resize(64, 64, { fit: "contain", background: "#ffffff" })
      .png()
      .toFile(path.join(out, "favicon.png"));
  }
}
for (const t of teams)
  if (!manifest.teams[t.id])
    manifest.unresolved.push({
      team: t.id,
      reason: "No unambiguous image; fallback emblem will be used.",
    });
await fs.writeFile(
  path.join(out, "asset-manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(
  `Optimized ${manifest.files.length} original images. Originals preserved.`,
);
for (const item of manifest.unresolved)
  console.log(`Unresolved ${item.file || item.team}: ${item.reason}`);
