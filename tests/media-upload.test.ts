import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mediaFileError,
  uploadMedia,
  uploadResponse,
  UPLOAD_CHUNK_SIZE,
} from "@/lib/media-upload";
afterEach(() => vi.unstubAllGlobals());
describe("media uploads through request-size-limited hosting", () => {
  it("sends a 15 MB MP4 in small requests and preserves every byte", async () => {
    const bytes = new Uint8Array(15_000_000);
    bytes.set([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]);
    const chunks: Uint8Array[] = [];
    const id = "a".repeat(32);
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      if (options.method === "PUT") {
        const blob = options.body as Blob;
        expect(blob.size).toBeLessThanOrEqual(UPLOAD_CHUNK_SIZE);
        chunks.push(new Uint8Array(await blob.arrayBuffer()));
        return Response.json({ ok: true });
      }
      const payload = JSON.parse(options.body as string);
      return Response.json(
        payload.action === "start"
          ? { id }
          : {
              kind: "video",
              url: "https://cdn.sanity.io/files/test/production/clip.mp4",
            },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const progress = vi.fn();
    expect(
      (
        await uploadMedia(
          new File([bytes], "clip.mp4", { type: "video/mp4" }),
          true,
          progress,
        )
      ).kind,
    ).toBe("video");
    expect(chunks).toHaveLength(8);
    expect(Buffer.concat(chunks).equals(Buffer.from(bytes))).toBe(true);
    expect(progress).toHaveBeenLastCalledWith(100);
  });
  it("reports a plain-text 413 without trying to expose it as JSON", async () => {
    await expect(
      uploadResponse(new Response("Request Entity Too Large", { status: 413 })),
    ).rejects.toThrow("too large");
    await expect(
      uploadResponse(new Response("<html>Bad gateway</html>", { status: 502 })),
    ).rejects.toThrow("HTTP 502");
    await expect(uploadResponse(new Response("not JSON"))).rejects.toThrow(
      "unexpected response",
    );
  });
  it("cleans up an interrupted multi-part upload", async () => {
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) =>
      options.method === "PUT"
        ? new Response("Request Entity Too Large", { status: 413 })
        : Response.json({ id: "b".repeat(32), ok: true }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      uploadMedia(
        new File([new Uint8Array(2_000_001)], "clip.mp4", {
          type: "video/mp4",
        }),
        true,
      ),
    ).rejects.toThrow("too large");
    expect(fetchMock.mock.calls.at(-1)?.[1].method).toBe("DELETE");
  });
  it("rejects unsupported, empty and oversized files before upload", () => {
    expect(
      mediaFileError({ type: "video/mp4", size: 15_000_000 }, true),
    ).toBeUndefined();
    expect(
      mediaFileError({ type: "video/mp4", size: 50_000_001 }, true),
    ).toContain("50 MB");
    expect(
      mediaFileError({ type: "image/jpeg", size: 8_000_001 }, true),
    ).toContain("8 MB");
    expect(mediaFileError({ type: "video/mp4", size: 100 }, false)).toContain(
      "image",
    );
    expect(mediaFileError({ type: "image/png", size: 0 }, true)).toContain(
      "empty",
    );
  });
});
