import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { sanity, isConfigured } from "./sanity";
import { signSession, verifySession } from "./auth-core";
import { isTrustedRequestOrigin } from "./request-origin";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const cookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-yeneta-session"
    : "yeneta-session";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 8 * 60 * 60,
};
export function checkOrigin(request: Request) {
  if (
    !isTrustedRequestOrigin(request, {
      appOrigin: process.env.APP_ORIGIN,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      production: process.env.NODE_ENV === "production",
    })
  )
    throw new HttpError(403, "Request origin is not allowed.");
}
export async function session() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !isConfigured()) return false;
  const sid = await verifySession(token);
  if (!sid) return false;
  const doc = await sanity().getDocument<{ expires: number }>(`session.${sid}`);
  return Boolean(doc && doc.expires > Date.now());
}
export async function requireAdmin(request?: Request) {
  if (request) checkOrigin(request);
  if (!(await session()))
    throw new HttpError(401, "Your session has expired. Please sign in.");
}
export async function createSession() {
  const sid = randomBytes(24).toString("hex");
  await sanity(true).create({
    _id: `session.${sid}`,
    _type: "adminSession",
    expires: Date.now() + 8 * 60 * 60 * 1000,
  });
  return signSession(sid);
}
export async function revokeSession() {
  const token = (await cookies()).get(cookieName)?.value;
  const sid = token ? await verifySession(token) : null;
  if (sid) await sanity(true).delete(`session.${sid}`);
}
// One durable account bucket avoids trusting spoofable forwarding headers. CAS serializes attempts across instances.
export async function rateLimit() {
  const client = sanity(true),
    id = "security.admin-login";
  await client.createIfNotExists({
    _id: id,
    _type: "loginThrottle",
    attempts: 0,
    resetAt: 0,
  });
  for (let i = 0; i < 5; i++) {
    const doc = await client.getDocument<{
      _rev: string;
      attempts: number;
      resetAt: number;
    }>(id);
    if (!doc) throw new HttpError(503, "Login protection is unavailable.");
    const fresh = doc.resetAt <= Date.now();
    if (!fresh && doc.attempts >= 5)
      throw new HttpError(
        429,
        "Too many login attempts. Try again in 15 minutes.",
      );
    try {
      await client
        .patch(id)
        .ifRevisionId(doc._rev)
        .set({
          attempts: fresh ? 1 : doc.attempts + 1,
          resetAt: fresh ? Date.now() + 15 * 60 * 1000 : doc.resetAt,
        })
        .commit({ visibility: "sync" });
      return;
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode !== 409) throw e;
    }
  }
  throw new HttpError(429, "Login is busy. Try again shortly.");
}
