"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Swords,
  Users,
  Shield,
  Trophy,
  ImageIcon,
  Settings,
  LogOut,
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  Archive,
  RefreshCw,
} from "lucide-react";
import {
  type Snapshot,
  type Athlete,
  type Team,
  type Match,
  sports,
  sportNames,
} from "@/types/championship";
import { relevant } from "@/lib/statistics";
import { Badge, Avatar, Empty } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TeamForm, AthleteForm, type SaveOperation } from "./entity-forms";
import { MatchForm } from "./match-form";
import { ImportForm } from "./import-form";
import { SettingsForm } from "./settings-form";
const navigation = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "matches", label: "Matches", Icon: Swords },
  { id: "players", label: "Players", Icon: Users },
  { id: "teams", label: "Teams", Icon: Shield },
  { id: "standings", label: "Standings & exports", Icon: Trophy },
  { id: "media", label: "Media", Icon: ImageIcon },
  { id: "settings", label: "Settings", Icon: Settings },
];
type Editor =
  | { kind: "team"; value?: Team }
  | { kind: "athlete"; value?: Athlete }
  | { kind: "match"; value?: Match }
  | { kind: "import" }
  | null;
type Confirm = {
  kind: "delete-match" | "archive-athlete" | "archive-team";
  id: string;
  name: string;
} | null;
export function AdminDashboard({
  snapshot,
  section,
}: {
  snapshot: Snapshot;
  section: string;
}) {
  const [snap, setSnap] = useState(snapshot),
    [editor, setEditor] = useState<Editor>(null),
    [confirm, setConfirm] = useState<Confirm>(null),
    [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [sport, setSport] = useState("all"),
    [division, setDivision] = useState("all"),
    [team, setTeam] = useState("all"),
    [archived, setArchived] = useState(false);
  const router = useRouter(),
    d = snap.data;
  const activeTeams = d.teams.filter(
      (t) => t.seasonId === d.settings.activeSeasonId,
    ),
    activeIds = new Set(activeTeams.map((t) => t.id));
  const athletes = d.athletes.filter(
      (a) => activeIds.has(a.teamId) && (archived || a.active),
    ),
    matches = d.matches.filter((m) => m.seasonId === d.settings.activeSeasonId);
  function notify(text: string, error = false) {
    setToast({ text, error });
    setTimeout(() => setToast(null), 7000);
  }
  const save: SaveOperation = async (operation) => {
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: snap.revision, operation }),
    });
    const b = await r.json();
    if (!r.ok) throw new Error(b.error);
    setSnap(b);
    setEditor(null);
    setConfirm(null);
    notify("Championship updated. Public statistics have been refreshed.");
    router.refresh();
  };
  const athleteRows = athletes.filter(
    (a) =>
      (team === "all" || a.teamId === team) &&
      (division === "all" || a.division === division) &&
      (sport === "all" ||
        a.sports.includes(sport as (typeof sports)[number])) &&
      a.name.toLowerCase().includes(query.toLowerCase()),
  );
  const name = (id: string) =>
    d.teams.find((t) => t.id === id)?.name ||
    d.athletes.find((a) => a.id === id)?.name ||
    id;
  const matchRows = [...matches]
    .filter(
      (m) =>
        (sport === "all" || m.sport === sport) &&
        (division === "all" || m.division === division) &&
        `${name(m.homeId)} ${name(m.awayId)}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const reload = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin", { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setSnap(b);
      notify("Latest championship data loaded.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Reload failed.", true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <span className="eyebrow">COMPETITION CONTROL</span>
        {navigation.map(({ id, label, Icon }) => (
          <Link
            href={id === "overview" ? "/admin" : `/admin/${id}`}
            className={section === id ? "active" : ""}
            key={id}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
        <button
          onClick={async () => {
            try {
              const r = await fetch("/api/auth/logout", { method: "POST" });
              if (!r.ok) throw new Error("Could not sign out. Try again.");
              router.replace("/admin/login");
              router.refresh();
            } catch (e) {
              notify(e instanceof Error ? e.message : "Sign out failed.", true);
            }
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </aside>
      <div className="admin-main">
        <div className="admin-top">
          <div>
            <span className="eyebrow accent">YENETA · ADMINISTRATION</span>
            <h1>{navigation.find((n) => n.id === section)?.label}</h1>
            <p>
              {
                d.seasons.find((s) => s.id === d.settings.activeSeasonId)
                  ?.academicYear
              }{" "}
              · Your championship, under control.
            </p>
          </div>
          <div className="admin-actions">
            <Button variant="outline" onClick={reload} disabled={busy}>
              <RefreshCw size={14} />
              Reload
            </Button>
            <Button onClick={() => setEditor({ kind: "match" })}>
              <Plus size={15} />
              Record match
            </Button>
          </div>
        </div>
        {section === "overview" && (
          <>
            <div className="admin-stats">
              {[
                {
                  label: "Registered athletes",
                  value: athletes.filter((a) => a.active).length,
                },
                {
                  label: "Active classes",
                  value: activeTeams.filter((t) => t.active).length,
                },
                { label: "Matches recorded", value: relevant(d).length },
                {
                  label: "Football goals",
                  value: relevant(d, "football").reduce(
                    (sum, m) => sum + m.goals.length,
                    0,
                  ),
                },
                {
                  label: "Active sports",
                  value: d.settings.enabledSports.length,
                },
              ].map((s) => (
                <div className="panel admin-stat" key={s.label}>
                  <span>{s.label}</span>
                  <strong>{s.value}</strong>
                </div>
              ))}
            </div>
            <div className="admin-quick">
              <h3>Ready for the next chapter?</h3>
              <p>
                Build your rosters, bring your teams together, and let the
                results tell the story.
              </p>
              <div className="admin-actions">
                <Button onClick={() => setEditor({ kind: "match" })}>
                  <Swords size={15} />
                  Record a match
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditor({ kind: "athlete" })}
                >
                  <Plus size={15} />
                  Add athlete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditor({ kind: "import" })}
                >
                  <Upload size={15} />
                  Import roster
                </Button>
              </div>
            </div>
            <section className="panel">
              <div className="panel-heading">
                <h3>Recent administrative activity</h3>
                <span className="eyebrow">AUDIT TRAIL</span>
              </div>
              {d.audit.length ? (
                <div className="admin-list">
                  {d.audit.slice(0, 8).map((a) => (
                    <div className="admin-list-row" key={a.id}>
                      <Shield size={17} />
                      <div>
                        <b className="capitalize">{a.message}</b>
                        <small>
                          {new Date(a.date).toLocaleString("en", {
                            timeZone: "Africa/Nairobi",
                          })}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="A fresh championship starts here."
                  detail="Your administrative activity will appear here as you register athletes and record results."
                />
              )}
            </section>
          </>
        )}
        {(section === "players" || section === "matches") && (
          <>
            <div className="table-toolbar panel mb-5">
              <div className="table-filters flex-wrap">
                <select
                  aria-label="Filter sport"
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
                  aria-label="Filter division"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                >
                  <option value="all">All divisions</option>
                  <option value="boys">Boys</option>
                  <option value="girls">Girls</option>
                </select>
                {section === "players" && (
                  <select
                    aria-label="Filter team"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                  >
                    <option value="all">All teams</option>
                    {activeTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
                <label className="search-box">
                  <input
                    placeholder="Search…"
                    aria-label={`Search ${section}`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              {section === "players" && (
                <div className="admin-actions">
                  <Button
                    variant="outline"
                    onClick={() => setEditor({ kind: "import" })}
                  >
                    <Upload size={14} />
                    Import
                  </Button>
                  <Button onClick={() => setEditor({ kind: "athlete" })}>
                    <Plus size={14} />
                    Add athlete
                  </Button>
                </div>
              )}
            </div>
            {section === "players" && (
              <label className="check-row mb-5">
                <input
                  type="checkbox"
                  checked={archived}
                  onChange={(e) => setArchived(e.target.checked)}
                />
                Include archived athletes
              </label>
            )}
            <div className="panel">
              <div className="admin-list">
                {section === "players"
                  ? athleteRows.map((a) => (
                      <div className="admin-list-row" key={a.id}>
                        <Avatar athlete={a} />
                        <div>
                          <Link href={`/players/${a.id}`}>
                            <b>
                              {a.name}
                              {!a.active ? " · Archived" : ""}
                            </b>
                          </Link>
                          <small>
                            {name(a.teamId)} · {a.division} ·{" "}
                            {a.sports.join(", ")}
                          </small>
                        </div>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${a.name}`}
                            onClick={() =>
                              setEditor({ kind: "athlete", value: a })
                            }
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Archive ${a.name}`}
                            disabled={!a.active}
                            onClick={() =>
                              setConfirm({
                                kind: "archive-athlete",
                                id: a.id,
                                name: a.name,
                              })
                            }
                          >
                            <Archive size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  : matchRows.map((m) => (
                      <div className="admin-list-row" key={m.id}>
                        <Swords size={22} />
                        <div>
                          <Link href={`/matches/${m.id}`}>
                            <b>
                              {name(m.homeId)}{" "}
                              {["football", "volleyball"].includes(m.sport)
                                ? `${m.homeScore}–${m.awayScore}`
                                : "vs"}{" "}
                              {name(m.awayId)}
                            </b>
                          </Link>
                          <small>
                            {sportNames[m.sport]} · {m.division} ·{" "}
                            {new Date(m.date).toLocaleDateString("en", {
                              timeZone: "Africa/Nairobi",
                            })}
                          </small>
                        </div>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label="Edit match"
                            onClick={() =>
                              setEditor({ kind: "match", value: m })
                            }
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Delete match"
                            onClick={() =>
                              setConfirm({
                                kind: "delete-match",
                                id: m.id,
                                name: `${name(m.homeId)} vs ${name(m.awayId)}`,
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
              </div>
              {!(section === "players" ? athleteRows : matchRows).length && (
                <Empty
                  title={
                    section === "players"
                      ? "No athletes found."
                      : "No recorded matches found."
                  }
                  detail={
                    section === "players"
                      ? "Add an athlete manually or import a roster to get started."
                      : "Record a result to calculate standings and rankings."
                  }
                />
              )}
            </div>
          </>
        )}
        {section === "teams" && (
          <>
            <div className="admin-actions mb-5">
              <Button onClick={() => setEditor({ kind: "team" })}>
                <Plus size={15} />
                Create class
              </Button>
            </div>
            <div className="panel admin-list">
              {activeTeams.map((t) => (
                <div className="admin-list-row" key={t.id}>
                  <Badge team={t} size={50} />
                  <div>
                    <Link href={`/teams/${t.id}`}>
                      <b>
                        {t.name}
                        {!t.active ? " · Inactive" : ""}
                      </b>
                    </Link>
                    <small>
                      Grade {t.grade} {t.classCode} ·{" "}
                      {
                        d.athletes.filter((a) => a.active && a.teamId === t.id)
                          .length
                      }{" "}
                      athletes
                    </small>
                    <small>ID: {t.id}</small>
                  </div>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Edit ${t.name}`}
                      onClick={() => setEditor({ kind: "team", value: t })}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Deactivate ${t.name}`}
                      disabled={!t.active}
                      onClick={() =>
                        setConfirm({
                          kind: "archive-team",
                          id: t.id,
                          name: t.name,
                        })
                      }
                    >
                      <Archive size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {section === "standings" && (
          <>
            <p className="notice">
              All rankings are derived from match records. Use match management
              to correct a result.
            </p>
            <div className="panel">
              <div className="panel-heading">
                <h3>Rankings & data exports</h3>
                <Download size={20} />
              </div>
              <div className="admin-list">
                {sports.flatMap((s) =>
                  (["boys", "girls"] as const).map((v) => (
                    <a
                      key={s + v}
                      className="admin-list-row"
                      href={`/api/export?kind=standings&sport=${s}&division=${v}`}
                    >
                      <Trophy size={18} />
                      <div>
                        <b>
                          {sportNames[s]} · {v}
                        </b>
                        <small>Full standings / rankings · CSV</small>
                      </div>
                      <Download size={16} />
                    </a>
                  )),
                )}
                {(["goals", "assists"] as const).flatMap((kind) =>
                  (["boys", "girls"] as const).map((v) => (
                    <a
                      key={kind + v}
                      className="admin-list-row"
                      href={`/api/export?kind=${kind}&division=${v}`}
                    >
                      <Trophy size={18} />
                      <div>
                        <b>
                          Football {kind} · {v}
                        </b>
                        <small>Player contributions · CSV</small>
                      </div>
                      <Download size={16} />
                    </a>
                  )),
                )}
                {["roster", "matches"].map((kind) => (
                  <a
                    className="admin-list-row"
                    key={kind}
                    href={`/api/export?kind=${kind}`}
                  >
                    <Download size={18} />
                    <div>
                      <b className="capitalize">
                        {kind === "roster"
                          ? "All active rosters"
                          : "All match results"}
                      </b>
                      <small>Current season · CSV</small>
                    </div>
                    <Download size={16} />
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
        {section === "media" && (
          <>
            <p className="notice">
              Images are resized to a maximum of 600 px and compressed before
              upload. Edit a class or athlete to upload or replace its image.
            </p>
            <div className="media-grid">
              {activeTeams.map((t) => (
                <div className="panel media-item" key={t.id}>
                  <Badge team={t} size={100} />
                  <p>{t.name}</p>
                  <Button
                    variant="outline"
                    onClick={() => setEditor({ kind: "team", value: t })}
                  >
                    <Upload size={14} />
                    Manage logo
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
        {section === "settings" && <SettingsForm data={d} save={save} />}
      </div>
      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        title={
          editor?.kind === "match"
            ? editor.value
              ? "Correct match result"
              : "Record a match"
            : editor?.kind === "team"
              ? editor.value
                ? "Edit class"
                : "Create a class"
              : editor?.kind === "athlete"
                ? editor.value
                  ? "Edit athlete"
                  : "Add an athlete"
                : "Import your roster"
        }
        description={
          editor?.kind === "match"
            ? "Every goal, every assist, every point. Record the full story."
            : "Validated and saved securely to the championship."
        }
        wide={editor?.kind === "match" || editor?.kind === "import"}
      >
        {editor?.kind === "team" && (
          <TeamForm team={editor.value} data={d} save={save} />
        )}
        {editor?.kind === "athlete" && (
          <AthleteForm athlete={editor.value} data={d} save={save} />
        )}
        {editor?.kind === "match" && (
          <MatchForm match={editor.value} data={d} save={save} />
        )}
        {editor?.kind === "import" && <ImportForm data={d} save={save} />}
      </Dialog>
      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={
          confirm?.kind === "delete-match"
            ? "Delete this match?"
            : "Archive this registration?"
        }
        description={confirm?.name}
      >
        <p className="inline-help">
          {confirm?.kind === "delete-match"
            ? "The match will be removed. All affected standings, goals, assists and ratings will be recalculated immediately."
            : "The registration will leave active rosters. Historical matches and statistics are preserved. Archiving a class also archives its athletes."}
        </p>
        <div className="form-actions">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              if (!confirm) return;
              setBusy(true);
              try {
                await save({ kind: confirm.kind, id: confirm.id });
              } catch (e) {
                notify(
                  e instanceof Error
                    ? e.message
                    : "Could not complete the action.",
                  true,
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? "Saving…"
              : confirm?.kind === "delete-match"
                ? "Delete match"
                : "Archive"}
          </Button>
        </div>
      </Dialog>
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.text}
          <button
            className="ml-4"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            ×
          </button>
          {toast.text.includes("session") && (
            <Link href="/admin/login" className="text-link">
              Sign in again
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
