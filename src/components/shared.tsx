import { ImageWithFallback } from "./image-fallback";
import assets from "../../public/images/asset-manifest.json";
import Link from "next/link";
import {
  ArrowUpRight,
  Shield,
  UserRound,
  Trophy,
  CalendarDays,
} from "lucide-react";
import type { Athlete, Championship, Match, Team } from "@/types/championship";
export function Badge({
  team,
  size = 40,
  priority = false,
}: {
  team?: Team;
  size?: number;
  priority?: boolean;
}) {
  return (
    <span className="team-badge" style={{ width: size, height: size }}>
      {team?.logo ? (
        <ImageWithFallback
          key={team.logo}
          src={
            size <= 64
              ? assets.files.find((f) => f.url === team.logo)?.thumbnail ||
                team.logo
              : team.logo
          }
          alt={`${team.name} badge`}
          size={size}
          priority={priority}
          contain
          fallback={<Shield size={size * 0.55} />}
        />
      ) : (
        <Shield size={size * 0.55} />
      )}
    </span>
  );
}
export function Avatar({
  athlete,
  size = 42,
}: {
  athlete: Athlete;
  size?: number;
}) {
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {athlete.photo ? (
        <ImageWithFallback
          key={athlete.photo}
          src={athlete.photo}
          alt={athlete.name}
          size={size}
          fallback={<UserRound size={size * 0.5} />}
        />
      ) : (
        <UserRound size={size * 0.5} />
      )}
    </span>
  );
}
export function Empty({
  title,
  detail,
  icon = "trophy",
}: {
  title: string;
  detail?: string;
  icon?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        {icon === "calendar" ? (
          <CalendarDays size={25} />
        ) : (
          <Trophy size={25} />
        )}
      </span>
      <h3>{title}</h3>
      {detail && <p>{detail}</p>}
    </div>
  );
}
export function TeamCard({ team, data }: { team: Team; data: Championship }) {
  return (
    <Link href={`/teams/${team.id}`} className="team-card">
      <span className="eyebrow">
        GRADE {team.grade} {team.classCode}
      </span>
      <ArrowUpRight className="team-arrow" size={19} />
      <Badge team={team} size={88} />
      <h3>{team.name}</h3>
      <p>
        {data.athletes.filter((a) => a.active && a.teamId === team.id).length}{" "}
        registered athletes
      </p>
      <span className="card-link">
        Meet the team <span>↗</span>
      </span>
    </Link>
  );
}
export function MatchCard({
  match: m,
  data: d,
}: {
  match: Match;
  data: Championship;
}) {
  const teamSport = ["football", "volleyball"].includes(m.sport);
  const home = d.teams.find((t) => t.id === m.homeId),
    away = d.teams.find((t) => t.id === m.awayId);
  const name = (id: string) =>
    d.athletes.find((a) => a.id === id)?.name || "Archived athlete";
  return (
    <Link href={`/matches/${m.id}`} className="match-card">
      <div className="match-meta">
        <span>
          {m.sport.replace("-", " ")} · {m.division}
        </span>
        <span>FULL TIME</span>
      </div>
      <div className="match-score">
        <div>
          {teamSport && <Badge team={home} />}
          <b>{teamSport ? home?.name : name(m.homeId)}</b>
        </div>
        <strong>
          {teamSport
            ? `${m.homeScore} : ${m.awayScore}`
            : m.outcome === "draw"
              ? "½ : ½"
              : m.outcome === "home"
                ? "1 : 0"
                : "0 : 1"}
        </strong>
        <div>
          {teamSport && <Badge team={away} />}
          <b>{teamSport ? away?.name : name(m.awayId)}</b>
        </div>
      </div>
      <div className="match-meta">
        <span>
          {new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
            timeZone: "Africa/Nairobi",
          }).format(new Date(m.date))}
        </span>
        <ArrowUpRight size={15} />
      </div>
    </Link>
  );
}
