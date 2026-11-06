export const UPLOAD_CHUNK_SIZE = 2_000_000;
export function mediaFileError(
  file: { size: number; type: string },
  matchMedia: boolean,
) {
  const video = ["video/mp4", "video/webm"].includes(file.type);
  if (
    !(video && matchMedia) &&
    !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(file.type)
  )
    return matchMedia
      ? "Choose a PNG, JPEG, WebP or AVIF photo, or an MP4 / WebM video."
      : "Choose a PNG, JPEG, WebP or AVIF image.";
  if (!file.size) return "This file is empty. Choose another file.";
  if (file.size > (video ? 50_000_000 : 8_000_000))
    return video
      ? "Choose a video under 50 MB."
      : "Choose an image under 8 MB.";
}
export async function uploadResponse(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  let data: Record<string, unknown> | undefined;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      data = parsed;
  } catch {
    /* Hosting errors can be plain text or HTML. */
  }
  if (!response.ok) {
    if (response.status === 413)
      throw new Error(
        "The server rejected the upload as too large. Try a smaller file or retry the upload.",
      );
    if (response.status === 401)
      throw new Error("Your session has expired. Please sign in again.");
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Upload failed (HTTP ${response.status}). Please retry.`,
    );
  }
  if (!data)
    throw new Error(
      "The upload server returned an unexpected response. Please retry.",
    );
  return data;
}
export async function uploadMedia(
  file: File,
  matchMedia: boolean,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; kind: "image" | "video" }> {
  const invalid = mediaFileError(file, matchMedia);
  if (invalid) throw new Error(invalid);
  let result: Record<string, unknown>;
  if (file.size <= UPLOAD_CHUNK_SIZE) {
    const form = new FormData();
    form.set("file", file);
    result = await uploadResponse(
      await fetch(`/api/admin/media${matchMedia ? "?kind=match" : ""}`, {
        method: "POST",
        body: form,
      }),
    );
  } else {
    const endpoint = "/api/admin/media/chunks";
    const started = await uploadResponse(
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          size: file.size,
          mime: file.type,
          matchMedia,
        }),
      }),
    );
    if (typeof started.id !== "string" || !/^[a-f0-9]{32}$/.test(started.id))
      throw new Error("Could not start this upload. Please retry.");
    const id = started.id;
    try {
      const count = Math.ceil(file.size / UPLOAD_CHUNK_SIZE);
      for (let index = 0; index < count; index++) {
        await uploadResponse(
          await fetch(`${endpoint}?id=${id}&index=${index}`, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: file.slice(
              index * UPLOAD_CHUNK_SIZE,
              (index + 1) * UPLOAD_CHUNK_SIZE,
            ),
          }),
        );
        onProgress?.(Math.round(((index + 1) / count) * 95));
      }
      result = await uploadResponse(
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", id }),
        }),
      );
    } catch (error) {
      await fetch(`${endpoint}?id=${id}`, { method: "DELETE" }).catch(() => {});
      throw error;
    }
  }
  if (
    typeof result.url !== "string" ||
    (result.kind !== "image" && result.kind !== "video")
  )
    throw new Error(
      "The upload did not return a valid media file. Please retry.",
    );
  onProgress?.(100);
  return { url: result.url, kind: result.kind };
}
