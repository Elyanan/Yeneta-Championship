import "server-only";
import sharp from "sharp";
import { HttpError } from "./auth";
import { sanity } from "./sanity";
import { mediaFileError } from "./media-upload";
export async function storeMedia(
  buffer: Buffer,
  mime: string,
  matchMedia: boolean,
) {
  const invalid = mediaFileError(
    { size: buffer.length, type: mime },
    matchMedia,
  );
  if (invalid)
    throw new HttpError(
      buffer.length > (mime.startsWith("video/") ? 50_000_000 : 8_000_000)
        ? 413
        : 400,
      invalid,
    );
  if (mime.startsWith("video/")) {
    const mp4 = mime === "video/mp4";
    const valid = mp4
      ? buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp"
      : buffer.length >= 4 &&
        buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    if (!valid) throw new HttpError(400, "Choose a valid MP4 or WebM video.");
    const asset = await sanity(true).assets.upload("file", buffer, {
      filename: `match-highlight.${mp4 ? "mp4" : "webm"}`,
      contentType: mime,
    });
    return { url: asset.url, kind: "video" as const };
  }
  let image: Buffer;
  try {
    image = await sharp(buffer, { limitInputPixels: 40_000_000 })
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
  const asset = await sanity(true).assets.upload("image", image, {
    filename: "championship.webp",
    contentType: "image/webp",
  });
  return { url: asset.url, kind: "image" as const };
}
