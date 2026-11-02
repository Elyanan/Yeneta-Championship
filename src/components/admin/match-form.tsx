"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Minus, Trash2, ShieldCheck } from "lucide-react";
import {
  sports,
  sportNames,
  type Championship,
  type Match,
  type Goal,
  type Sport,
  type Division,
} from "@/types/championship";
import { matchSchema } from "@/types/championship";
import { validateMatch, minuteValue } from "@/lib/validation";
import { Badge, Avatar } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { SaveOperation } from "./entity-forms";
function localDate(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function MatchForm({
  match,
  data: d,
  save,
}: {
  match?: Match;
  data: Championship;
  save: SaveOperation;
}) {
  const [m, setM] = useState<Match>(() =>
    match
      ? structuredClone(match)
      : {
          id: crypto.randomUUID(),
          seasonId: d.settings.activeSeasonId,
          sport: "football",
          division: "boys",
          homeId: "",
          awayId: "",
          date: new Date().toISOString(),
          homeScore: 0,
          awayScore: 0,
          goals: [],
          outcome: "draw",
          status: "completed",
          updatedAt: new Date().toISOString(),
        },
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [minuteErrors, setMinuteErrors] = useState<Record<string, string>>({});
  const isTeam = ["football", "volleyball"].includes(m.sport);
  const choices = isTeam
    ? d.teams.filter(
        (t) =>
          t.seasonId === m.seasonId &&
          (t.active || [m.homeId, m.awayId].includes(t.id)),
      )
    : d.athletes.filter(
        (a) =>
          a.division === m.division &&
          a.sports.includes(m.sport) &&
          d.teams.some((t) => t.id === a.teamId && t.seasonId === m.seasonId) &&
          (a.active || [m.homeId, m.awayId].includes(a.id)),
      );
  function patch(v: Partial<Match>) {
    setM((old) => ({ ...old, ...v }));
  }
  function resetSport(v: {
    sport?: Sport;
    division?: Division;
    seasonId?: string;
  }) {
    patch({
      ...v,
      homeId: "",
      awayId: "",
      homeScore: 0,
      awayScore: 0,
      goals: [],
      outcome: "draw",
    });
    setMinuteErrors({});
  }
  function score(side: "home" | "away", value: number) {
    const val = Math.min(
      100,
      Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0)),
    );
    patch(side === "home" ? { homeScore: val } : { awayScore: val });
  }
  function goalPatch(id: string, value: Partial<Goal>) {
    patch({
      goals: m.goals.map((g) => (g.id === id ? { ...g, ...value } : g)),
    });
  }
  const roster = (teamId: string) =>
    d.athletes.filter(
      (a) =>
        a.teamId === teamId &&
        a.division === m.division &&
        a.sports.includes("football"),
    );
  const reconciled =
    m.goals.filter((g) => g.teamId === m.homeId).length === m.homeScore &&
    m.goals.filter((g) => g.teamId === m.awayId).length === m.awayScore;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          if (Object.values(minuteErrors).some(Boolean))
            throw new Error("Correct invalid match minutes.");
          const value = matchSchema.parse({
            ...m,
            outcome: isTeam
              ? m.homeScore > m.awayScore
                ? "home"
                : m.homeScore < m.awayScore
                  ? "away"
                  : "draw"
              : m.outcome,
          });
          validateMatch(value, d);
          await save({ kind: "match", value });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save match.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        <label className="field">
          Sport
          <select
            value={m.sport}
            onChange={(e) => resetSport({ sport: e.target.value as Sport })}
          >
            {sports.map((s) => (
              <option key={s} value={s}>
                {sportNames[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Division
          <select
            value={m.division}
            onChange={(e) =>
              resetSport({ division: e.target.value as Division })
            }
          >
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </label>
        <label className="field">
          Season
          <select
            value={m.seasonId}
            onChange={(e) => resetSport({ seasonId: e.target.value })}
          >
            {d.seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.academicYear}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Match date & time
          <input
            type="datetime-local"
            required
            value={localDate(m.date)}
            onChange={(e) => {
              if (e.target.value)
                patch({ date: new Date(e.target.value).toISOString() });
            }}
          />
        </label>
      </div>
      <div className="versus-arena">
        {(["home", "away"] as const).map((side, i) => {
          const id = side === "home" ? m.homeId : m.awayId,
            team = d.teams.find((t) => t.id === id),
            athlete = d.athletes.find((a) => a.id === id);
          return (
            <div
              style={{ gridColumn: i === 0 ? 1 : 3 }}
              className="contestant"
              key={side}
            >
              {isTeam ? (
                <Badge team={team} size={72} />
              ) : athlete ? (
                <Avatar athlete={athlete} size={72} />
              ) : (
                <Badge size={72} />
              )}
              <label className="sr-only" htmlFor={`participant-${side}`}>
                {side} {isTeam ? "team" : "athlete"}
              </label>
              <select
                id={`participant-${side}`}
                required
                value={id}
                onChange={(e) =>
                  patch({
                    ...(side === "home"
                      ? { homeId: e.target.value }
                      : { awayId: e.target.value }),
                    goals: [],
                    homeScore: 0,
                    awayScore: 0,
                  })
                }
              >
                <option value="">Choose {isTeam ? "team" : "athlete"}</option>
                {choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {isTeam && (
                <div className="score-control">
                  <button
                    type="button"
                    aria-label={`Decrease ${side} score`}
                    onClick={() =>
                      score(
                        side,
                        (side === "home" ? m.homeScore : m.awayScore) - 1,
                      )
                    }
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    aria-label={`${side} ${m.sport === "football" ? "goals" : "sets"}`}
                    type="number"
                    min={0}
                    max={100}
                    value={side === "home" ? m.homeScore : m.awayScore}
                    onChange={(e) => score(side, Number(e.target.value))}
                  />
                  <button
                    type="button"
                    aria-label={`Increase ${side} score`}
                    onClick={() =>
                      score(
                        side,
                        (side === "home" ? m.homeScore : m.awayScore) + 1,
                      )
                    }
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <span className="versus-word" style={{ gridColumn: 2, gridRow: 1 }}>
          VS
        </span>
      </div>
      {!isTeam && (
        <label className="field">
          Match outcome
          <select
            value={m.outcome}
            onChange={(e) =>
              patch({ outcome: e.target.value as Match["outcome"] })
            }
          >
            <option value="home">First athlete wins</option>
            <option value="away">Second athlete wins</option>
            <option value="draw">Draw</option>
          </select>
          <small>
            Elo K = 32 · minimum rating 100 · replayed chronologically after
            every edit.
          </small>
        </label>
      )}
      {m.sport === "football" && (
        <section>
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">THE STORY BEHIND THE SCORE</span>
              <h3>Match goal events</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!m.homeId || !m.awayId}
              onClick={() =>
                patch({
                  goals: [
                    ...m.goals,
                    {
                      id: crypto.randomUUID(),
                      teamId: m.homeId,
                      scorerId: "",
                      assistId: "",
                      minute: 0,
                      stoppage: 0,
                      type: "regular",
                    },
                  ],
                })
              }
            >
              <Plus size={14} />
              Add goal
            </Button>
          </div>
          <p className="inline-help">
            Enter the final score above, then record one event per goal. Own
            goals benefit the selected scoring team; select their scorer from
            the opposition.
          </p>
          <AnimatePresence>
            {m.goals.map((g, i) => {
              const scorerTeam =
                g.type === "own-goal"
                  ? g.teamId === m.homeId
                    ? m.awayId
                    : m.homeId
                  : g.teamId;
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="goal-editor"
                  key={g.id}
                >
                  <div className="goal-editor-top">
                    <b>GOAL {String(i + 1).padStart(2, "0")}</b>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove goal ${i + 1}`}
                      onClick={() => {
                        patch({ goals: m.goals.filter((v) => v.id !== g.id) });
                        setMinuteErrors((old) => ({ ...old, [g.id]: "" }));
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      Benefiting team
                      <select
                        value={g.teamId}
                        onChange={(e) =>
                          goalPatch(g.id, {
                            teamId: e.target.value,
                            scorerId: "",
                            assistId: "",
                          })
                        }
                      >
                        {[m.homeId, m.awayId].map((id) => (
                          <option key={id} value={id}>
                            {d.teams.find((t) => t.id === id)?.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Goal type
                      <select
                        value={g.type}
                        onChange={(e) =>
                          goalPatch(g.id, {
                            type: e.target.value as Goal["type"],
                            scorerId: "",
                            assistId: "",
                          })
                        }
                      >
                        <option value="regular">Regular goal</option>
                        <option value="penalty">Penalty</option>
                        <option value="own-goal">Own goal</option>
                      </select>
                    </label>
                    <label className="field">
                      Minute
                      <input
                        aria-invalid={Boolean(minuteErrors[g.id])}
                        defaultValue={`${g.minute}${g.stoppage ? `+${g.stoppage}` : ""}`}
                        placeholder="45+2"
                        onChange={(e) => {
                          try {
                            goalPatch(g.id, minuteValue(e.target.value));
                            setMinuteErrors((v) => ({ ...v, [g.id]: "" }));
                          } catch {
                            setMinuteErrors((v) => ({
                              ...v,
                              [g.id]: "Use 24 or 45+2 (up to 120+30).",
                            }));
                          }
                        }}
                      />
                      {minuteErrors[g.id] && (
                        <span className="field-error">
                          {minuteErrors[g.id]}
                        </span>
                      )}
                    </label>
                    <label className="field">
                      {g.type === "own-goal"
                        ? "Opposition scorer"
                        : "Goal scorer"}
                      <select
                        required
                        value={g.scorerId}
                        onChange={(e) =>
                          goalPatch(g.id, {
                            scorerId: e.target.value,
                            assistId: "",
                          })
                        }
                      >
                        <option value="">Choose athlete</option>
                        {roster(scorerTeam).map((a) => (
                          <option value={a.id} key={a.id}>
                            {a.name}
                            {!a.active ? " (archived)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Assist (optional)
                      <select
                        disabled={g.type === "own-goal"}
                        value={g.assistId}
                        onChange={(e) =>
                          goalPatch(g.id, { assistId: e.target.value })
                        }
                      >
                        <option value="">Unassisted</option>
                        {roster(g.teamId)
                          .filter((a) => a.id !== g.scorerId)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div className={`notice ${reconciled ? "" : "error"}`}>
            <ShieldCheck size={15} className="inline mr-2" />
            {reconciled
              ? "Goal events match the final score."
              : `Final score ${m.homeScore}–${m.awayScore}; goal events ${m.goals.filter((g) => g.teamId === m.homeId).length}–${m.goals.filter((g) => g.teamId === m.awayId).length}. Add or correct events before saving.`}
          </div>
        </section>
      )}
      {m.sport === "volleyball" && (
        <p className="notice">
          Win = {d.settings.volleyballWin} points · loss = 0 points. The winning
          team must have more sets.
          {d.settings.volleyballMaxSets
            ? ` Maximum ${d.settings.volleyballMaxSets} sets per team.`
            : ""}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button disabled={busy || (m.sport === "football" && !reconciled)}>
          {busy
            ? "Saving result…"
            : match
              ? "Save corrected result"
              : "Save match result"}
          <ArrowIcon />
        </Button>
      </div>
    </form>
  );
}
function ArrowIcon() {
  return <ShieldCheck size={16} />;
}
