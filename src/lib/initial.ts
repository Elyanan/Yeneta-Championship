import type { Championship } from "@/types/championship";
export function initialData(): Championship {
  return {
    seasons: [
      {
        id: "season-2026",
        name: "School Championship",
        academicYear: "2026–27",
        start: "2026-09-01",
        end: "2027-08-31",
        active: true,
      },
    ],
    teams: [
      {
        id: "grade-12",
        name: "Invitus",
        grade: 12,
        classCode: "",
        logo: "/images/invitus.webp",
        seasonId: "season-2026",
        active: true,
      },
      {
        id: "grade-11",
        name: "Panthers",
        grade: 11,
        classCode: "",
        logo: "/images/panthers.webp",
        seasonId: "season-2026",
        active: true,
      },
      {
        id: "grade-10",
        name: "Rising Stars",
        grade: 10,
        classCode: "",
        logo: "/images/rising-stars.webp",
        seasonId: "season-2026",
        active: true,
      },
      {
        id: "grade-9",
        name: "Grade 9",
        grade: 9,
        classCode: "",
        logo: "",
        seasonId: "season-2026",
        active: true,
      },
    ],
    athletes: [],
    matches: [],
    settings: {
      activeSeasonId: "season-2026",
      footballWin: 3,
      footballDraw: 1,
      volleyballWin: 2,
      volleyballMaxSets: null,
      enabledSports: ["football", "volleyball", "chess", "table-tennis"],
    },
    audit: [],
  };
}
