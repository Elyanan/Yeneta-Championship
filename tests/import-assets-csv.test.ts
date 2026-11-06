import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseRosterCsv, previewRoster } from "@/lib/import";
import { csv } from "@/lib/csv";
import { identifyAsset, matchAsset } from "@/lib/assets";
import { fixture } from "./fixtures";
describe("rosters, exports and supplied asset mappings", () => {
  it("previews CSV with quoted commas and multi-sport entries", () => {
    const rows = parseRosterCsv(
      'name,team,division,sports,jersey\r\n"Test, Athlete",grade-12,boys,football;chess,9',
    );
    const preview = previewRoster(rows, fixture());
    expect(preview[0].errors).toEqual([]);
    expect(preview[0].athlete).toMatchObject({
      name: "Test, Athlete",
      sports: ["football", "chess"],
      jersey: 9,
    });
  });
  it("reports missing data, duplicate identities and invalid image references", () => {
    const d = fixture();
    const rows = previewRoster(
      [
        {
          name: d.athletes[0].name,
          team: "grade-12",
          division: "boys",
          sports: "football",
        },
        {
          name: "New athlete",
          team: "missing",
          division: "x",
          sports: "football",
          photo: "javascript:alert(1)",
        },
      ],
      d,
    );
    expect(rows[0].errors.join(" ")).toContain("Duplicate");
    expect(rows[1].errors.length).toBeGreaterThan(2);
  });
  it("reports duplicate rows inside an upload", () => {
    const r = {
      name: "Test new",
      team: "grade-11",
      division: "boys",
      sports: "chess",
    };
    expect(previewRoster([r, r], fixture())[1].errors.join(" ")).toContain(
      "Duplicate",
    );
  });
  it("rejects ambiguous class names rather than guessing", () => {
    const d = fixture();
    d.teams.push({ ...d.teams[0], id: "second" });
    expect(
      previewRoster(
        [
          {
            name: "New student",
            team: "Invitus",
            division: "boys",
            sports: "chess",
          },
        ],
        d,
      )[0].errors.join(" "),
    ).toContain("ambiguous");
  });
  it("escapes quotes, newlines, commas, Unicode and spreadsheet formulas", () => {
    const result = csv([
      ["a,b", 'a"b', "line\nnext", "አበበ", "=1+1", "\t@SUM(A1)", "-1"],
    ]);
    expect(result.startsWith("\uFEFF")).toBe(true);
    expect(result).toContain('"a""b"');
    expect(result).toContain('"\'=1+1"');
    expect(result).toContain("አበበ");
    expect(result).toContain('"\'\t@SUM(A1)"');
  });
  it("extracts exact batch identity and class suffix", () => {
    expect(identifyAsset("Invictus (12A).png")).toMatchObject({
      name: "Invictus",
      grade: 12,
      classCode: "12A",
    });
    expect(identifyAsset("Invitus (Seniors).png")).toMatchObject({
      name: "Invitus",
      grade: 12,
      classCode: "",
    });
    expect(identifyAsset("school_logo.jpg").school).toBe(true);
  });
  it("only maps one exact team identity", () => {
    const d = fixture(),
      a = identifyAsset("Panthers (Grade 11).png");
    expect(matchAsset(a, d.teams).teamId).toBe("grade-11");
    expect(
      matchAsset(a, [...d.teams, { ...d.teams[1], id: "second" }]).teamId,
    ).toBeNull();
    expect(matchAsset(identifyAsset("Unknown.png"), d.teams).teamId).toBeNull();
  });
  it("generated assets stay below 100KB and include all class logos", () => {
    const manifest = JSON.parse(
      fs.readFileSync("public/images/asset-manifest.json", "utf8"),
    );
    expect(manifest.files).toHaveLength(5);
    expect(
      manifest.files.every((f: { bytes: number }) => f.bytes < 100_000),
    ).toBe(true);
    expect(manifest.unresolved).toEqual([]);
    expect(manifest.teams["grade-9"]).toBe("/images/fantasy.webp");
    expect(fs.existsSync("public/images/fantasy.thumb.webp")).toBe(true);
    expect(fs.existsSync("Fantasy (Grade 9).png")).toBe(true);
    expect(fs.existsSync("Invitus (Seniors).png")).toBe(true);
  });
});
