"use client";
import { useState } from "react";
import { LockKeyhole, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export function LoginForm() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel login-card">
      <LockKeyhole size={26} className="mb-4" />
      <h1>Welcome back.</h1>
      <p>Sign in to manage the Yeneta School Championship.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            const r = await fetch("/api/auth/login", {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: f.get("username"),
                password: f.get("password"),
              }),
            });
            const body = await r.json();
            if (!r.ok) throw new Error(body.error);
            // A full navigation discards protected routes cached before the cookie existed.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- The API-set session cookie must cross a fresh authentication boundary.
            window.location.assign("/admin");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not sign in.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Username
          <input
            name="username"
            autoComplete="username"
            required
            maxLength={100}
          />
        </label>
        <label className="field">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
          />
        </label>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <Button className="w-full mt-2" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
          <ArrowRight size={16} />
        </Button>
      </form>
      <p className="inline-help mt-5">
        Authorized championship administrators only.
      </p>
    </section>
  );
}
