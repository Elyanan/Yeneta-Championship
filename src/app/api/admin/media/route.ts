import { requireAdmin, HttpError } from "@/lib/auth";
import { failure } from "@/lib/http";
import { storeMedia } from "@/lib/media-assets";
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const matchMedia =
      new URL(request.url).searchParams.get("kind") === "match";
    if (
      Number(request.headers.get("content-length") || 0) >
      (matchMedia ? 51_000_000 : 8_100_000)
    )
      throw new HttpError(
        413,
        matchMedia
          ? "Choose a video under 50 MB or an image under 8 MB."
          : "Choose an image under 8 MB.",
      );
    const file = (await request.formData()).get("file");
    if (!(file instanceof File))
      throw new HttpError(400, "Choose a file to upload.");
    return Response.json(
      await storeMedia(
        Buffer.from(await file.arrayBuffer()),
        file.type,
        matchMedia,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
