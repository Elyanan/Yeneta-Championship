"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, ArrowUpRight } from "lucide-react";
const subscribe = () => () => {};
export function ThemeSelector() {
  const { setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <div className="theme-selector" aria-label="Color theme">
      {[
        { id: "light", Icon: Sun },
        { id: "dark", Icon: Moon },
        { id: "system", Icon: Monitor },
      ].map(({ id, Icon }) => (
        <button
          key={id}
          aria-pressed={mounted && theme === id}
          onClick={() => setTheme(id)}
          aria-label={`${id} theme`}
          title={`${id[0].toUpperCase() + id.slice(1)} theme`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
export function Header({ season = "2026–27" }: { season?: string }) {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand">
          <Image
            src="/images/school-logo.webp"
            alt="Yeneta Academy"
            width={46}
            height={46}
            priority
          />
          <span>
            YENETA<span className="brand-sub">SCHOOL CHAMPIONSHIP</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {[
            { href: "/", label: "Championship" },
            { href: "/teams", label: "The teams" },
            { href: "/matches", label: "Match centre" },
          ].map(({ href, label }) => {
            const active =
              pathname === href ||
              (href !== "/" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                className={active ? "nav-current" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="header-actions">
          <span className="season-tag">SEASON {season}</span>
          <ThemeSelector />
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="brand">
        <Image
          src="/images/school-logo.webp"
          alt="Yeneta Academy"
          width={32}
          height={32}
        />
        <span>
          YENETA<span className="brand-sub">ONE SCHOOL. EVERY CHAMPION.</span>
        </span>
      </div>
      <p>Built on teamwork. Played with pride.</p>
      <Link href="/admin">
        Championship administration <ArrowUpRight size={14} />
      </Link>
    </footer>
  );
}
