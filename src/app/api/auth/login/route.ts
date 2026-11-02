import { z } from "zod";
import { cookies } from "next/headers";
import {
  checkOrigin,
  cookieName,
  cookieOptions,
  createSession,
  HttpError,
  rateLimit,
} from "@/lib/auth";
import { safeEqual, verifyPassword } from "@/lib/auth-core";
import { failure, jsonBody } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit();
    const { username, password } = z
      .object({
        username: z.string().min(1).max(100),
        password: z.string().min(1).max(256),
      })
      .parse(await jsonBody(request));
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH)
      throw new HttpError(
        503,
        "Administrator credentials have not been configured.",
      );
    const valid = await verifyPassword(
      password,
      process.env.ADMIN_PASSWORD_HASH,
    );
    if (!safeEqual(username, process.env.ADMIN_USERNAME) || !valid)
      throw new HttpError(401, "Username or password is incorrect.");
    (await cookies()).set(cookieName, await createSession(), cookieOptions);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
