"use client";
import { useState } from "react";
import {
  sports,
  sportNames,
  type Championship,
  type Match,
} from "@/types/championship";
import { MatchCard, Empty } from "./shared";
import { chronological } from "@/lib/statistics";
export function MatchCentre({ data: d }: { data: Championship }) {
  const [sport, setSport] = useState("all"),
    [division, setDivision] = useState("all"),
    [search, setSearch] = useState(""),
    [view, setView] = useState("all");
  const name = (id: string) =>
    d.teams.find((t) => t.id === id)?.name ||
    d.athletes.find((a) => a.id === id)?.name ||
    "";
  const matches = d.matches
    .filter(
      (m) =>
        m.seasonId === d.settings.activeSeasonId &&
        m.status !== "void" &&
        (view === "all" ||
          (view === "friendly" ? m.friendly : m.status === view)) &&
        (sport === "all" || m.sport === sport) &&
        (division === "all" || m.division === division) &&
        `${name(m.homeId)} ${name(m.awayId)}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      a.status === b.status
        ? a.status === "scheduled"
          ? chronological(a, b)
          : chronological(b, a)
        : a.status === "scheduled"
          ? -1
          : 1,
    );
  return (
    <>
      <div className="match-centre-tabs" role="group" aria-label="Match view">
        {[
          { id: "all", label: "All matches" },
          { id: "scheduled", label: "Upcoming fixtures" },
          { id: "completed", label: "Results" },
          { id: "friendly", label: "Friendlies" },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="table-toolbar panel mb-6 match-centre-filters">
        <select
          aria-label="Sport"
          value={sport}
          onChange={(e) => setSport(e.target.value)}
        >
          <option value="all">All sports</option>
          {sports.map((s) => (
            <option key={s} value={s}>
              {sportNames[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Division"
          value={division}
          onChange={(e) => setDivision(e.target.value)}
        >
          <option value="all">All divisions</option>
          <option value="boys">Boys</option>
          <option value="girls">Girls</option>
        </select>
        <label className="search-box">
          <input
            aria-label="Search match participants"
            placeholder="Find a team or athlete…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {matches.length ? (
        <div className="match-groups">
          {[false, true].map((friendly) => {
            const group = matches.filter(
              (m) => Boolean(m.friendly) === friendly,
            );
            return group.length ? (
              <MatchGroup
                key={String(friendly)}
                matches={group}
                data={d}
                friendly={friendly}
              />
            ) : null;
          })}
        </div>
      ) : (
        <div className="panel">
          <Empty
            title="The stage is set."
            detail="No matches match these filters. Check back for the next fixture or result."
            icon="calendar"
          />
        </div>
      )}
    </>
  );
}

function MatchGroup({
  matches,
  data,
  friendly,
}: {
  matches: Match[];
  data: Championship;
  friendly: boolean;
}) {
  const title = friendly ? "Friendly games" : "Championship games";
  return (
    <section
      className={`match-group${friendly ? " match-group-friendly" : ""}`}
      aria-label={title}
    >
      <header className="match-group-heading">
        <span className="eyebrow accent">
          {friendly ? "FRIENDLIES" : "THE CHAMPIONSHIP"}
        </span>
        <h2>{title}</h2>
        {friendly && (
          <p>Friendly games do not affect league standings or points.</p>
        )}
      </header>
      {(["boys", "girls"] as const).map((division) => {
        const divisionMatches = matches.filter((m) => m.division === division);
        if (!divisionMatches.length) return null;
        const divisionTitle =
          division === "boys" ? "Boys’ games" : "Girls’ games";
        return (
          <section
            className="match-division"
            aria-label={`${title}: ${divisionTitle}`}
            key={division}
          >
            <h3>{divisionTitle}</h3>
            {sports.map((sport) => {
              const sportMatches = divisionMatches.filter(
                (m) => m.sport === sport,
              );
              return sportMatches.length ? (
                <section
                  className="match-sport"
                  aria-label={`${divisionTitle}: ${sportNames[sport]}`}
                  key={sport}
                >
                  <div className="match-sport-heading">
                    <h4>{sportNames[sport]}</h4>
                    <span>
                      {sportMatches.length}{" "}
                      {sportMatches.length === 1 ? "match" : "matches"}
                    </span>
                  </div>
                  <div className="results-grid">
                    {sportMatches.map((m) => (
                      <MatchCard key={m.id} match={m} data={data} />
                    ))}
                  </div>
                </section>
              ) : null;
            })}
          </section>
        );
      })}
    </section>
  );
}
