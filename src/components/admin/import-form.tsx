"use client";
import { useState } from "react";
import {
  parseRosterCsv,
  previewRoster,
  rosterTemplate,
  type ImportRow,
} from "@/lib/import";
import type { Championship } from "@/types/championship";
import { Button } from "@/components/ui/button";
import type { SaveOperation } from "./entity-forms";
export function ImportForm({
  data,
  save,
}: {
  data: Championship;
  save: SaveOperation;
}) {
  const [text, setText] = useState(""),
    [rows, setRows] = useState<ImportRow[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const valid =
    rows.length > 0 && rows.every((r) => !r.errors.length && r.athlete);
  function preview(value: string) {
    setError("");
    try {
      const parsed = parseRosterCsv(value);
      if (parsed.length > 500)
        throw new Error("Import up to 500 athletes at once.");
      if (!parsed.length) throw new Error("The file contains no roster rows.");
      setRows(previewRoster(parsed, data));
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Could not read roster.");
    }
  }
  return (
    <div>
      <p className="inline-help mb-4">
        CSV or Excel (.xlsx), up to 500 rows and 2 MB. Columns: name, team,
        division, sports, jersey (optional), photo (optional). Use boys/girls
        and separate sports with semicolons. Team can be an exact ID or an
        unambiguous batch name. Photo must be a valid imported or Sanity image
        URL.
      </p>
      <a
        download="yeneta-roster-template.csv"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(rosterTemplate)}`}
        className="text-link mb-4"
      >
        Download CSV template ↓
      </a>
      <label className="field">
        Upload roster
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            if (file.size > 2_000_000) {
              setError("Choose a file under 2 MB.");
              return;
            }
            try {
              if (file.name.toLowerCase().endsWith(".xlsx")) {
                const read = (await import("read-excel-file/browser")).default;
                const sheets = await read(file);
                const cells = sheets[0]?.data || [];
                const header = cells[0]?.map(String) || [];
                const records = cells
                  .slice(1)
                  .map((row) =>
                    Object.fromEntries(
                      header.map((key, i) => [key, row[i] ?? ""]),
                    ),
                  );
                if (records.length > 500)
                  throw new Error("Import up to 500 athletes at once.");
                const Papa = (await import("papaparse")).default;
                const csv = Papa.unparse(records);
                setText(csv);
                preview(csv);
              } else {
                const value = await file.text();
                setText(value);
                preview(value);
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not read file.");
              setRows([]);
            }
          }}
        />
      </label>
      <label className="field">
        Review and correct CSV
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setRows([]);
          }}
          placeholder={rosterTemplate}
        />
      </label>
      <Button variant="outline" onClick={() => preview(text)}>
        Validate & preview
      </Button>
      {rows.length > 0 && (
        <div className="import-preview" aria-live="polite">
          {rows.map((r) => (
            <div
              key={r.row}
              className={`preview-row ${r.errors.length ? "invalid" : ""}`}
            >
              <b>Row {r.row}</b>
              <span>{r.name || "Missing name"}</span>
              <span>
                {r.errors.length ? r.errors.join(" · ") : "Ready to import"}
              </span>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <p className="inline-help mt-4">
        All rows must pass validation before import. Correct the CSV above and
        preview again. Existing athletes are never overwritten.
      </p>
      <div className="form-actions">
        <Button
          disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await save({
                kind: "import",
                values: rows.flatMap((r) => (r.athlete ? [r.athlete] : [])),
              });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Import failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Importing…" : `Import ${rows.length} athletes`}
        </Button>
      </div>
    </div>
  );
}
