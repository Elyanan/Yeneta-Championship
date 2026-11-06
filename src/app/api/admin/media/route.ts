import sharp from "sharp";
import { requireAdmin, HttpError } from "@/lib/auth";
import { sanity } from "@/lib/sanity";
import { failure } from "@/lib/http";
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
    const f = (await request.formData()).get("file");
    if (
      matchMedia &&
      f instanceof File &&
      ["video/mp4", "video/webm"].includes(f.type)
    ) {
      if (f.size > 50_000_000)
        throw new HttpError(413, "Choose a video under 50 MB.");
      const buffer = Buffer.from(await f.arrayBuffer());
      const mp4 = f.type === "video/mp4";
      const valid = mp4
        ? buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp"
        : buffer.length >= 4 &&
          buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      if (!valid) throw new HttpError(400, "Choose a valid MP4 or WebM video.");
      const result = await sanity(true).assets.upload("file", buffer, {
        filename: `match-highlight.${mp4 ? "mp4" : "webm"}`,
        contentType: f.type,
      });
      return Response.json({ url: result.url, kind: "video" });
    }
    if (
      !(f instanceof File) ||
      f.size > 8_000_000 ||
      !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(f.type)
    )
      throw new HttpError(
        400,
        matchMedia
          ? "Choose a PNG, JPEG, WebP or AVIF image under 8 MB, or an MP4 / WebM video under 50 MB."
          : "Choose a PNG, JPEG, WebP or AVIF image under 8 MB.",
      );
    let buffer: Buffer;
    try {
      buffer = await sharp(Buffer.from(await f.arrayBuffer()), {
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .resize(matchMedia ? 1600 : 600, matchMedia ? 1600 : 600, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new HttpError(
        400,
        "This image could not be decoded. Choose a valid image under 40 megapixels.",
      );
    }
    const result = await sanity(true).assets.upload("image", buffer, {
      filename: "championship.webp",
      contentType: "image/webp",
    });
    return Response.json({ url: result.url, kind: "image" });
  } catch (e) {
    return failure(e);
  }
}
