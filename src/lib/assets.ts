export type AssetIdentity = {
  filename: string;
  name: string;
  classCode: string;
  grade: number | null;
  school: boolean;
};
export function identifyAsset(filename: string): AssetIdentity {
  const stem = filename.replace(/\.(png|jpe?g|webp|avif)$/i, "");
  const context = /\(([^)]+)\)/.exec(stem)?.[1]?.trim() || "";
  const gradeMatch = /^(?:grade\s*)?(9|10|11|12)(?:\s*[a-z])?$/i.exec(context);
  const classMatch = /^(9|10|11|12)\s*([a-z])$/i.exec(context);
  return {
    filename,
    name: stem.replace(/\s*\([^)]+\)/g, "").trim(),
    classCode: classMatch
      ? `${classMatch[1]}${classMatch[2].toUpperCase()}`
      : "",
    grade: gradeMatch
      ? Number(gradeMatch[1])
      : /^seniors$/i.test(context)
        ? 12
        : null,
    school:
      /^(school[_ -]?logo|yeneta(?:[_ -]?academy)?(?:[_ -]?logo)?)$/i.test(
        stem,
      ),
  };
}
export function matchAsset(
  asset: AssetIdentity,
  teams: { id: string; name: string; grade: number; classCode: string }[],
) {
  const normalized = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const candidates = teams.filter(
    (t) =>
      normalized(t.name) === normalized(asset.name) &&
      (asset.grade === null || t.grade === asset.grade) &&
      (!asset.classCode ||
        normalized(t.classCode) === normalized(asset.classCode)),
  );
  return candidates.length === 1
    ? { teamId: candidates[0].id, reason: "" }
    : {
        teamId: null,
        reason: candidates.length
          ? "Ambiguous team name: multiple matches."
          : "No exact team identity matches this filename.",
      };
}
