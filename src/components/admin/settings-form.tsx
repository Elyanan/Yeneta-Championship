"use client";
import { useState } from "react";
import { sports, sportNames, type Championship } from "@/types/championship";
import { Button } from "@/components/ui/button";
import type { SaveOperation } from "./entity-forms";
export function SettingsForm({
  data,
  save,
}: {
  data: Championship;
  save: SaveOperation;
}) {
  const [settings, setSettings] = useState(data.settings),
    [seasons, setSeasons] = useState(data.seasons),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="panel p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          await save({ kind: "settings", value: settings, seasons });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Save failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="mb-5">Competition settings</h3>
      <label className="field">
        Public season
        <select
          value={settings.activeSeasonId}
          onChange={(e) =>
            setSettings({ ...settings, activeSeasonId: e.target.value })
          }
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.academicYear}
            </option>
          ))}
        </select>
        <small>Changing the season preserves all historical records.</small>
      </label>
      <div className="form-grid">
        {(
          [
            { key: "footballWin", label: "Football · win points" },
            { key: "footballDraw", label: "Football · draw points" },
            { key: "volleyballWin", label: "Volleyball · win points" },
          ] as const
        ).map(({ key, label }) => (
          <label key={key} className="field">
            {label}
            <input
              type="number"
              min={0}
              max={10}
              value={settings[key]}
              onChange={(e) =>
                setSettings({ ...settings, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        <label className="field">
          Volleyball · maximum sets per team
          <input
            type="number"
            min={1}
            max={99}
            value={settings.volleyballMaxSets ?? ""}
            placeholder="No restriction"
            onChange={(e) =>
              setSettings({
                ...settings,
                volleyballMaxSets: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />
        </label>
      </div>
      <span className="field">Available sports</span>
      <div className="sport-checks">
        {sports.map((s) => (
          <label key={s}>
            <input
              type="checkbox"
              checked={settings.enabledSports.includes(s)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  enabledSports: e.target.checked
                    ? [...settings.enabledSports, s]
                    : settings.enabledSports.filter((v) => v !== s),
                })
              }
            />
            {sportNames[s]}
          </label>
        ))}
      </div>
      <h3 className="mt-8 mb-5">Academic seasons</h3>
      {seasons.map((s, i) => (
        <div key={s.id} className="goal-editor">
          <div className="form-grid">
            {(["name", "academicYear", "start", "end"] as const).map((key) => (
              <label className="field" key={key}>
                {
                  {
                    name: "Season name",
                    academicYear: "Academic year",
                    start: "Start date",
                    end: "End date",
                  }[key]
                }
                <input
                  type={key === "start" || key === "end" ? "date" : "text"}
                  required
                  value={s[key]}
                  onChange={(e) =>
                    setSeasons((old) =>
                      old.map((v, j) =>
                        j === i ? { ...v, [key]: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <p className="inline-help">Season ID: {s.id}</p>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setSeasons([
            ...seasons,
            {
              id: crypto.randomUUID(),
              name: "School Championship",
              academicYear: "",
              start: "",
              end: "",
              active: true,
            },
          ])
        }
      >
        + Add academic season
      </Button>
      <p className="inline-help mt-5">
        Create new class registrations for each season. Historical class and
        athlete records stay attached to their original season. Updating scoring
        rules recalculates the standings.
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button disabled={busy}>
          {busy ? "Saving…" : "Save championship settings"}
        </Button>
      </div>
    </form>
  );
}
