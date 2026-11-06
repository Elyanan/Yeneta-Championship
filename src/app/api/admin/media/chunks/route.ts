import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdmin, HttpError } from "@/lib/auth";
import { sanity } from "@/lib/sanity";
import { failure, jsonBody } from "@/lib/http";
import { UPLOAD_CHUNK_SIZE, mediaFileError } from "@/lib/media-upload";
import { storeMedia } from "@/lib/media-assets";
export const maxDuration = 300;
const idSchema = z.string().regex(/^[a-f0-9]{32}$/);
const startSchema = z.object({
  action: z.literal("start"),
  size: z.number().int().positive().max(50_000_000),
  mime: z.string().max(80),
  matchMedia: z.boolean(),
});
type Upload = {
  _id: string;
  size: number;
  mime: string;
  matchMedia: boolean;
  expires: number;
};
const documentId = (id: string) => `upload.${id}`;
async function getUpload(id: string) {
  const upload = await sanity().getDocument<Upload>(documentId(id));
  if (!upload || upload.expires <= Date.now())
    throw new HttpError(
      410,
      "This upload has expired. Please select the file again.",
    );
  return upload;
}
async function cleanup(id: string) {
  const root = documentId(id);
  await sanity(true).delete({
    query: '*[_id == $id || (_type == "mediaUploadChunk" && uploadId == $id)]',
    params: { id: root },
  });
}
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const action = z
      .discriminatedUnion("action", [
        startSchema,
        z.object({ action: z.literal("complete"), id: idSchema }),
      ])
      .parse(await jsonBody(request));
    if (action.action === "start") {
      const invalid = mediaFileError(
        { size: action.size, type: action.mime },
        action.matchMedia,
      );
      if (invalid) throw new HttpError(400, invalid);
      // Upload state is durable across function instances; dot IDs deny anonymous reads.
      await sanity(true)
        .delete({
          query:
            '*[_type in ["mediaUpload", "mediaUploadChunk"] && expires < $now]',
          params: { now: Date.now() },
        })
        .catch(() => {});
      const id = randomBytes(16).toString("hex");
      await sanity(true).create({
        _id: documentId(id),
        _type: "mediaUpload",
        size: action.size,
        mime: action.mime,
        matchMedia: action.matchMedia,
        expires: Date.now() + 3_600_000,
      });
      return Response.json({ id });
    }
    const upload = await getUpload(action.id);
    const buffers: Buffer[] = [];
    const count = Math.ceil(upload.size / UPLOAD_CHUNK_SIZE);
    for (let index = 0; index < count; index++) {
      const chunk = await sanity().getDocument<{ data: string }>(
        `${upload._id}.${index}`,
      );
      if (!chunk)
        throw new HttpError(
          400,
          "The upload is incomplete. Please select the file again.",
        );
      const buffer = Buffer.from(chunk.data, "base64");
      const expected = Math.min(
        UPLOAD_CHUNK_SIZE,
        upload.size - index * UPLOAD_CHUNK_SIZE,
      );
      if (buffer.length !== expected)
        throw new HttpError(400, "An upload part is invalid. Please retry.");
      buffers.push(buffer);
    }
    const result = await storeMedia(
      Buffer.concat(buffers, upload.size),
      upload.mime,
      upload.matchMedia,
    );
    await cleanup(action.id).catch(() => {});
    return Response.json(result);
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const id = idSchema.parse(params.get("id"));
    if (!params.has("index"))
      throw new HttpError(400, "Choose an upload part.");
    const index = z.coerce
      .number()
      .int()
      .min(0)
      .max(24)
      .parse(params.get("index"));
    const upload = await getUpload(id);
    const expected = Math.min(
      UPLOAD_CHUNK_SIZE,
      upload.size - index * UPLOAD_CHUNK_SIZE,
    );
    if (expected <= 0) throw new HttpError(400, "Invalid upload part.");
    if (Number(request.headers.get("content-length") || 0) > expected)
      throw new HttpError(413, "Upload part is too large.");
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.length !== expected)
      throw new HttpError(400, "The upload part was truncated. Please retry.");
    const data = buffer.toString("base64");
    const chunk = await sanity(true).createIfNotExists({
      _id: `${upload._id}.${index}`,
      _type: "mediaUploadChunk",
      uploadId: upload._id,
      data,
      expires: upload.expires,
    });
    if (chunk.data !== data)
      throw new HttpError(
        409,
        "This upload part changed. Please start the upload again.",
      );
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const id = idSchema.parse(new URL(request.url).searchParams.get("id"));
    await cleanup(id);
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
