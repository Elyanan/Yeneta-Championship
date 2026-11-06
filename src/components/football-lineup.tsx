"use client";
import { useState } from "react";
import { Check, Plus, Search, Shirt, X } from "lucide-react";
import {
  formationIds,
  formationSlots,
  type FormationId,
} from "@/lib/formations";
import type {
  Athlete,
  Championship,
  Lineup,
  Match,
} from "@/types/championship";
import { Badge, Avatar } from "./shared";

export function LineupPitch({
  lineup,
  athletes,
  selected,
  onSelect,
  label,
}: {
  lineup: Lineup;
  athletes: Athlete[];
  selected?: string;
  onSelect?: (position: string) => void;
  label: string;
}) {
  return (
    <div className="lineup-pitch" role="group" aria-label={label}>
      <div className="pitch-markings" aria-hidden="true">
        <i className="pitch-half" />
        <i className="pitch-circle" />
        <i className="pitch-box pitch-box-top" />
        <i className="pitch-box pitch-box-bottom" />
        <i className="pitch-goal pitch-goal-top" />
        <i className="pitch-goal pitch-goal-bottom" />
      </div>
      <span className="pitch-direction" aria-hidden="true">
        ATTACK ↑
      </span>
      {formationSlots(lineup.formation).map(({ position, x, y }) => {
        const athlete = athletes.find(
          (a) =>
            a.id ===
            lineup.players.find((p) => p.position === position)?.athleteId,
        );
        const content = (
          <>
            <span className={`pitch-shirt ${athlete ? "assigned" : ""}`}>
              <Shirt aria-hidden="true" />
              <b>{athlete ? (athlete.jersey ?? "•") : <Plus size={14} />}</b>
            </span>
            <span className="pitch-player-name">
              {athlete ? athlete.name.split(" ").slice(-1)[0] : position}
            </span>
            <small>{athlete ? position : onSelect ? "Add" : "—"}</small>
          </>
        );
        const style = { left: `${x}%`, top: `${y}%` };
        return onSelect ? (
          <button
            key={position}
            type="button"
            style={style}
            className={`pitch-position ${selected === position ? "selected" : ""}`}
            aria-label={`${position}: ${athlete?.name || "Choose player"}`}
            aria-pressed={selected === position}
            onClick={() => onSelect(position)}
          >
            {content}
          </button>
        ) : (
          <div
            key={position}
            style={style}
            className="pitch-position"
            title={`${position}: ${athlete?.name || "Unassigned"}`}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function FootballLineups({
  match: m,
  data: d,
  onChange,
}: {
  match: Match;
  data: Championship;
  onChange: (lineups: Match["lineups"]) => void;
}) {
  const [side, setSide] = useState<"home" | "away">("home"),
    [position, setPosition] = useState("GK"),
    [query, setQuery] = useState("");
  const teamId = side === "home" ? m.homeId : m.awayId;
  const team = d.teams.find((t) => t.id === teamId);
  const lineup = m.lineups?.[side];
  const eligible = d.athletes.filter(
    (a) =>
      a.teamId === teamId &&
      a.division === m.division &&
      a.sports.includes("football") &&
      (a.active || lineup?.players.some((p) => p.athleteId === a.id)),
  );
  const selected =
    lineup &&
    formationSlots(lineup.formation).some((s) => s.position === position)
      ? position
      : "GK";
  const assigned = lineup?.players.find((p) => p.position === selected);
  const update = (value: Lineup | undefined) => {
    const next = { ...m.lineups, [side]: value };
    onChange(next.home || next.away ? next : undefined);
  };
  return (
    <section className="lineup-editor">
      <div className="match-section-title">
        <div>
          <span className="eyebrow accent">THE GAME PLAN</span>
          <h3>Formations & players</h3>
        </div>
        <span className="optional-tag">Optional</span>
      </div>
      <p className="inline-help">
        Pick a shape, tap a position, then choose a player. You can save a
        partial lineup or skip formations entirely.
      </p>
      <div
        className="lineup-team-tabs"
        role="group"
        aria-label="Choose lineup team"
      >
        {(["home", "away"] as const).map((s) => {
          const t = d.teams.find(
            (t) => t.id === (s === "home" ? m.homeId : m.awayId),
          );
          return (
            <button
              type="button"
              key={s}
              aria-pressed={side === s}
              onClick={() => {
                setSide(s);
                setQuery("");
              }}
            >
              <Badge team={t} size={28} />
              <span>
                <small>{s === "home" ? "HOME" : "AWAY"}</small>
                <b>{t?.name || "Choose team first"}</b>
              </span>
              {m.lineups?.[s] && <Check size={15} />}
            </button>
          );
        })}
      </div>
      {!lineup ? (
        <div className="lineup-start">
          <Shirt size={30} />
          <h4>{team ? `${team.name}’s game plan` : "Choose a team above"}</h4>
          <p>
            A shape for every style of play. Add a lineup whenever you’re ready.
          </p>
          <button
            type="button"
            className="lineup-add-button"
            disabled={!teamId}
            onClick={() => update({ formation: "4-3-3", players: [] })}
          >
            <Plus size={16} /> Add {side} lineup
          </button>
        </div>
      ) : (
        <>
          <div className="lineup-controls">
            <label className="field">
              Formation
              <select
                value={lineup.formation}
                onChange={(e) => {
                  const formation = e.target.value as FormationId;
                  const positions = formationSlots(formation).map(
                    (s) => s.position,
                  );
                  update({
                    formation,
                    players: lineup.players.filter((p) =>
                      positions.includes(p.position),
                    ),
                  });
                  setPosition("GK");
                }}
              >
                {formationIds.map((f) => (
                  <option key={f} value={f}>
                    {f} · {formationSlots(f).length}-a-side
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="text-link"
              onClick={() => update(undefined)}
            >
              <X size={14} /> Remove lineup
            </button>
          </div>
          <div className="lineup-progress">
            <span>
              {lineup.players.length} /{" "}
              {formationSlots(lineup.formation).length} positions filled
            </span>
            <span>{team?.name}</span>
            <progress
              max={formationSlots(lineup.formation).length}
              value={lineup.players.length}
              aria-label={`${side} lineup positions filled`}
            />
          </div>
          <div className="lineup-workspace">
            <LineupPitch
              lineup={lineup}
              athletes={eligible}
              label={`${team?.name} ${lineup.formation} formation`}
              selected={selected}
              onSelect={(p) => {
                setPosition(p);
                setQuery("");
              }}
            />
            <div className="lineup-picker">
              <div className="lineup-picker-heading">
                <div>
                  <small>SELECTED POSITION</small>
                  <h4>{selected}</h4>
                </div>
                {assigned && (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Clear ${selected}`}
                    onClick={() =>
                      update({
                        ...lineup,
                        players: lineup.players.filter(
                          (p) => p.position !== selected,
                        ),
                      })
                    }
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <label className="search-box">
                <Search size={15} />
                <input
                  aria-label={`Search ${side} lineup players`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a player…"
                />
              </label>
              <div
                className="lineup-player-list"
                role="group"
                aria-label={`Choose player for ${selected}`}
              >
                {eligible
                  .filter((a) =>
                    a.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((a) => {
                    const current = lineup.players.find(
                      (p) => p.athleteId === a.id,
                    );
                    return (
                      <button
                        type="button"
                        key={a.id}
                        aria-pressed={assigned?.athleteId === a.id}
                        onClick={() =>
                          update({
                            ...lineup,
                            players: [
                              ...lineup.players.filter(
                                (p) =>
                                  p.position !== selected &&
                                  p.athleteId !== a.id,
                              ),
                              { position: selected, athleteId: a.id },
                            ],
                          })
                        }
                      >
                        <Avatar athlete={a} size={32} />
                        <span>
                          <b>{a.name}</b>
                          <small>
                            {current
                              ? current.position === selected
                                ? "Selected"
                                : `Move from ${current.position}`
                              : a.jersey !== null
                                ? `Shirt ${a.jersey}`
                                : "Available"}
                          </small>
                        </span>
                        {assigned?.athleteId === a.id && <Check size={15} />}
                      </button>
                    );
                  })}
                {!eligible.length && (
                  <p className="lineup-empty">
                    No football players in this roster yet. Add athletes under
                    Players to start building your lineup.
                  </p>
                )}
                {eligible.length > 0 &&
                  !eligible.some((a) =>
                    a.name.toLowerCase().includes(query.toLowerCase()),
                  ) && (
                    <p className="lineup-empty">
                      No players match your search.
                    </p>
                  )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function MatchLineups({
  match: m,
  data: d,
}: {
  match: Match;
  data: Championship;
}) {
  const [side, setSide] = useState<"home" | "away">(
    m.lineups?.home ? "home" : "away",
  );
  const lineup = m.lineups?.[side];
  return (
    <section className="panel section-space public-lineups">
      <div className="panel-heading">
        <div>
          <span className="eyebrow accent">THE GAME PLAN</span>
          <h2>Team formations</h2>
        </div>
      </div>
      <div
        className="lineup-team-tabs"
        role="group"
        aria-label="View team formation"
      >
        {(["home", "away"] as const)
          .filter((s) => m.lineups?.[s])
          .map((s) => (
            <button
              type="button"
              key={s}
              aria-pressed={s === side}
              onClick={() => setSide(s)}
            >
              <Badge
                team={d.teams.find(
                  (t) => t.id === (s === "home" ? m.homeId : m.awayId),
                )}
                size={26}
              />
              <b>
                {
                  d.teams.find(
                    (t) => t.id === (s === "home" ? m.homeId : m.awayId),
                  )?.name
                }
              </b>
            </button>
          ))}
      </div>
      {lineup && (
        <>
          <div className="public-formation-label">
            {lineup.formation}{" "}
            <span>{lineup.players.length} players selected</span>
          </div>
          <LineupPitch
            lineup={lineup}
            athletes={d.athletes}
            label={`${side} ${lineup.formation} formation`}
          />
          <ul className="lineup-roster">
            {formationSlots(lineup.formation).map(({ position }) => {
              const a = d.athletes.find(
                (a) =>
                  a.id ===
                  lineup.players.find((p) => p.position === position)
                    ?.athleteId,
              );
              return (
                <li key={position}>
                  <b>{position}</b>
                  <span>{a?.name || "To be confirmed"}</span>
                  {a?.jersey !== null && a?.jersey !== undefined && (
                    <small>#{a.jersey}</small>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
