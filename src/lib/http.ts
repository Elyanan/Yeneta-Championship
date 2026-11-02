import { ZodError } from "zod";
import { HttpError } from "./auth";
import { DomainError } from "./validation";
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  if (error instanceof DomainError)
    return Response.json({ error: error.message }, { status: 400 });
  if (
    (error as { statusCode?: number })?.statusCode === 409 ||
    (error instanceof Error && error.message.startsWith("CONFLICT:"))
  )
    return Response.json(
      {
        error: "Another administrator changed the data. Reload and try again.",
      },
      { status: 409 },
    );
  console.error(
    "Championship request failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  return Response.json(
    {
      error:
        "The request could not be completed. Check server configuration and try again.",
    },
    { status: 503 },
  );
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 2_000_000)
    throw new HttpError(413, "Request too large.");
  const text = await request.text();
  if (text.length > 2_000_000) throw new HttpError(413, "Request too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON request.");
  }
}
