"use client";
import { useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  athleteSchema,
  teamSchema,
  sportNames,
  sports,
  type Athlete,
  type Team,
  type Championship,
} from "@/types/championship";
import type { Operation } from "@/lib/operations";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/image-fallback";
import { uploadMedia } from "@/lib/media-upload";
export type SaveOperation = (op: Operation) => Promise<void>;
export function MediaUpload({
  value,
  onChange,
  label = "Upload image",
  removable = false,
  disabled = false,
  onBusyChange,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  removable?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const labelId = useId();
  return (
    <div className="field">
      <span id={labelId}>{label}</span>
      {value && (
        <div className="media-upload-preview">
          <div className="media-upload-thumbnail">
            <ImageWithFallback
              key={value}
              src={value}
              alt={`${label} preview`}
              size={112}
              contain
              fallback={<span>Preview unavailable</span>}
            />
          </div>
          {removable && (
            <Button
              type="button"
              variant="outline"
              disabled={busy || disabled}
              onClick={() => {
                onChange("");
                setError("");
                if (fileInput.current) fileInput.current.value = "";
              }}
            >
              Remove photo
            </Button>
          )}
        </div>
      )}
      <input
        ref={fileInput}
        aria-labelledby={labelId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        disabled={busy || disabled}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          onBusyChange?.(true);
          setError("");
          try {
            const b = await uploadMedia(file, false);
            onChange(b.url);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed.");
          } finally {
            setBusy(false);
            onBusyChange?.(false);
            if (fileInput.current) fileInput.current.value = "";
          }
        }}
      />
      <small>
        {busy
          ? "Optimizing and uploading…"
          : value
            ? "Image assigned. Choose a file to replace it."
            : "PNG, JPEG, WebP or AVIF · up to 8 MB"}
      </small>
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
export function TeamForm({
  team,
  data,
  save,
}: {
  team?: Team;
  data: Championship;
  save: SaveOperation;
}) {
  const [error, setError] = useState("");
  const f = useForm<Team>({
    resolver: zodResolver(teamSchema),
    defaultValues: team || {
      id: crypto.randomUUID(),
      name: "",
      grade: 9,
      classCode: "",
      logo: "",
      seasonId: data.settings.activeSeasonId,
      active: true,
    },
  });
  const logo = useWatch({ control: f.control, name: "logo" });
  return (
    <form
      onSubmit={f.handleSubmit(async (value) => {
        setError("");
        try {
          await save({ kind: "team", value });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Save failed.");
        }
      })}
    >
      <label className="field">
        Batch / team name
        <input {...f.register("name")} />
        <span className="field-error">{f.formState.errors.name?.message}</span>
      </label>
      <div className="form-grid">
        <label className="field">
          Grade
          <input
            type="number"
            min={1}
            max={12}
            {...f.register("grade", { valueAsNumber: true })}
          />
        </label>
        <label className="field">
          Class identifier
          <input placeholder="e.g. 12A" {...f.register("classCode")} />
        </label>
      </div>
      <label className="field">
        Season
        <select {...f.register("seasonId")}>
          {data.seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.academicYear}
            </option>
          ))}
        </select>
      </label>
      <MediaUpload
        value={logo}
        onChange={(url) =>
          f.setValue("logo", url, { shouldDirty: true, shouldValidate: true })
        }
        label="Class logo"
      />
      <label className="check-row">
        <input type="checkbox" {...f.register("active")} />
        Active class
      </label>
      {Object.values(f.formState.errors).map((v, i) => (
        <p className="field-error" key={i}>
          {v.message}
        </p>
      ))}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button disabled={f.formState.isSubmitting}>
          {f.formState.isSubmitting ? "Saving…" : "Save class"}
        </Button>
      </div>
    </form>
  );
}
export function AthleteForm({
  athlete,
  data,
  save,
}: {
  athlete?: Athlete;
  data: Championship;
  save: SaveOperation;
}) {
  const [error, setError] = useState(""),
    [photoBusy, setPhotoBusy] = useState(false);
  const f = useForm<Athlete>({
    resolver: zodResolver(athleteSchema),
    defaultValues: athlete || {
      id: crypto.randomUUID(),
      name: "",
      teamId:
        data.teams.find(
          (t) => t.active && t.seasonId === data.settings.activeSeasonId,
        )?.id || "",
      division: "boys",
      photo: "",
      sports: ["football"],
      jersey: null,
      active: true,
    },
  });
  const photo = useWatch({ control: f.control, name: "photo" });
  return (
    <form
      onSubmit={f.handleSubmit(async (value) => {
        setError("");
        try {
          await save({ kind: "athlete", value });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Save failed.");
        }
      })}
    >
      <label className="field">
        Athlete full name
        <input {...f.register("name")} />
      </label>
      <div className="form-grid">
        <label className="field">
          Team / class
          <select {...f.register("teamId")}>
            {data.teams
              .filter((t) => t.active || t.id === athlete?.teamId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · Grade {t.grade} ·{" "}
                  {data.seasons.find((s) => s.id === t.seasonId)?.academicYear}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          Division
          <select {...f.register("division")}>
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </label>
      </div>
      <span className="field">Eligible sports</span>
      <div className="sport-checks">
        {sports.map((s) => (
          <label key={s}>
            <input type="checkbox" value={s} {...f.register("sports")} />
            {sportNames[s]}
          </label>
        ))}
      </div>
      <label className="field">
        Jersey number (optional)
        <input
          type="number"
          min={0}
          max={999}
          {...f.register("jersey", {
            setValueAs: (v) => (v === "" ? null : Number(v)),
          })}
        />
      </label>
      <MediaUpload
        value={photo}
        onChange={(url) =>
          f.setValue("photo", url, { shouldDirty: true, shouldValidate: true })
        }
        label="Athlete photo"
        removable
        disabled={f.formState.isSubmitting}
        onBusyChange={setPhotoBusy}
      />
      <p className="inline-help">Save the athlete to apply photo changes.</p>
      <label className="check-row">
        <input type="checkbox" {...f.register("active")} />
        Active athlete
      </label>
      <p className="inline-help">
        Moving an athlete with recorded results to an incompatible team or
        division is blocked to protect history. Archive the old registration and
        create a new one for a new season.
      </p>
      {Object.values(f.formState.errors).map((v, i) => (
        <p className="field-error" key={i}>
          {v.message}
        </p>
      ))}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button disabled={f.formState.isSubmitting || photoBusy}>
          {photoBusy
            ? "Uploading photo…"
            : f.formState.isSubmitting
              ? "Saving…"
              : "Save athlete"}
        </Button>
      </div>
    </form>
  );
}
