"use client";
import { useState } from "react";
import { sports, sportNames, type Championship } from "@/types/championship";
import { MatchCard, Empty } from "./shared";
import { relevant } from "@/lib/statistics";
export function MatchCentre({ data: d }: { data: Championship }) {
  const [sport, setSport] = useState("all"),
    [division, setDivision] = useState("all"),
    [search, setSearch] = useState("");
  const name = (id: string) =>
    d.teams.find((t) => t.id === id)?.name ||
    d.athletes.find((a) => a.id === id)?.name ||
    "";
  const matches = relevant(d)
    .filter(
      (m) =>
        (sport === "all" || m.sport === sport) &&
        (division === "all" || m.division === division) &&
        `${name(m.homeId)} ${name(m.awayId)}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .reverse();
  return (
    <>
      <div className="table-toolbar panel mb-6">
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
        <div className="results-grid">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} data={d} />
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            title="The stage is set."
            detail="No recorded matches match these filters. Check back after the next game."
            icon="calendar"
          />
        </div>
      )}
    </>
  );
}
