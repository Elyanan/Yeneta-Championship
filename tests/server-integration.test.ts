import { beforeEach, describe, it, expect, vi } from "vitest";
import { fixture, match, goal } from "./fixtures";
import sharp from "sharp";
const memory = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  cookies: new Map<string, string>(),
  version: 0,
  invalidations: [] as unknown[][],
  uploaded: new Uint8Array(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      memory.cookies.has(key) ? { value: memory.cookies.get(key) } : undefined,
    set: (key: string, value: string) => memory.cookies.set(key, value),
  }),
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: (...args: unknown[]) => memory.invalidations.push(args),
}));
vi.mock("@sanity/client", () => ({
  createClient: () => ({
    assets: {
      upload: async (
        kind: string,
        buffer: Uint8Array,
        options?: { filename?: string },
      ) => {
        memory.uploaded = new Uint8Array(buffer);
        return {
          url:
            kind === "file"
              ? `https://cdn.sanity.io/files/testproject/production/test.${options?.filename?.split(".").pop()}`
              : "https://cdn.sanity.io/images/testproject/production/test-600x400.webp",
        };
      },
    },
    getDocument: async (id: string) => structuredClone(memory.docs.get(id)),
    create: async (doc: Record<string, unknown>) => {
      if (memory.docs.has(doc._id as string))
        throw Object.assign(new Error("Conflict"), { statusCode: 409 });
      const result = { ...doc, _rev: String(++memory.version) };
      memory.docs.set(doc._id as string, result);
      return result;
    },
    createIfNotExists: async (doc: Record<string, unknown>) => {
      if (!memory.docs.has(doc._id as string))
        memory.docs.set(doc._id as string, {
          ...doc,
          _rev: String(++memory.version),
        });
    },
    delete: async (id: string) => memory.docs.delete(id),
    patch: (id: string) => {
      let rev = "",
        values = {};
      const patch = {
        ifRevisionId: (r: string) => {
          rev = r;
          return patch;
        },
        set: (v: Record<string, unknown>) => {
          values = v;
          return patch;
        },
        commit: async () => {
          const before = memory.docs.get(id);
          if (!before || before._rev !== rev)
            throw Object.assign(new Error("Conflict"), { statusCode: 409 });
          const result = {
            ...before,
            ...values,
            _rev: String(++memory.version),
          };
          memory.docs.set(id, result);
          return result;
        },
      };
      return patch;
    },
  }),
}));
import { hashPassword, signSession, verifySession } from "@/lib/auth-core";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as write, GET as read } from "@/app/api/admin/route";
import { POST as media } from "@/app/api/admin/media/route";
import { GET as exportCsv } from "@/app/api/export/route";
import { publicSnapshot, mutate, readSnapshot } from "@/lib/sanity";
const origin = "http://localhost:3000";
function post(url: string, data: unknown, requestOrigin = origin) {
  return new Request(origin + url, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: requestOrigin },
    body: JSON.stringify(data),
  });
}
async function authenticate() {
  const r = await login(
    post("/api/auth/login", {
      username: "test-admin",
      password: "test-password-very-long",
    }),
  );
  expect(r.status).toBe(200);
}
beforeEach(async () => {
  memory.docs.clear();
  memory.cookies.clear();
  memory.invalidations = [];
  memory.version = 1;
  process.env.SANITY_PROJECT_ID = "testproject";
  process.env.SANITY_DATASET = "production";
  process.env.SANITY_API_WRITE_TOKEN = "test-write";
  process.env.SANITY_API_READ_TOKEN = "test-read";
  process.env.ADMIN_USERNAME = "test-admin";
  process.env.ADMIN_PASSWORD_HASH = await hashPassword(
    "test-password-very-long",
  );
  process.env.AUTH_SESSION_SECRET =
    "test-only-secret-with-more-than-32-characters";
  process.env.APP_ORIGIN = origin;
  memory.docs.set("championship.current", {
    _id: "championship.current",
    _rev: "1",
    payload: fixture(),
  });
});
describe("server authorization and persistent operations", () => {
  it("persists a friendly and includes it in match exports without scoring rankings", async () => {
    await authenticate();
    const response = await write(
      post("/api/admin", {
        revision: "1",
        operation: { kind: "match", value: match({ friendly: true }) },
      }),
    );
    expect(response.status).toBe(200);
    expect((await (await read()).json()).data.matches[0].friendly).toBe(true);
    const results = await exportCsv(
      new Request(origin + "/api/export?kind=matches"),
    );
    expect(await results.text()).toContain('"Friendly"');
    const scorers = await exportCsv(
      new Request(origin + "/api/export?kind=goals"),
    );
    expect(await scorers.text()).not.toContain("Test athlete a");
  });
  it.each(["chess", "table-tennis"])(
    "exports %s match records without a rating column",
    async (sport) => {
      const response = await exportCsv(
        new Request(
          `${origin}/api/export?kind=standings&sport=${sport}&division=boys`,
        ),
      );
      expect(response.status).toBe(200);
      const content = await response.text();
      expect(content).toContain('"Played"');
      expect(content).not.toMatch(/rating/i);
    },
  );
  it("persists future fixtures, optional formations and media through the authenticated API", async () => {
    await authenticate();
    const response = await write(
      post("/api/admin", {
        revision: "1",
        operation: {
          kind: "match",
          value: {
            ...match(),
            status: "scheduled",
            date: new Date(Date.now() + 86_400_000).toISOString(),
            homeScore: 0,
            outcome: "draw",
            goals: [],
            lineups: {
              home: {
                formation: "4-3-3",
                players: [{ position: "GK", athleteId: "a" }],
              },
            },
            media: [
              {
                id: "clip",
                kind: "video",
                url: "https://cdn.sanity.io/files/testproject/production/test.mp4",
                caption: "Highlights",
              },
            ],
          },
        },
      }),
    );
    expect(response.status).toBe(200);
    const saved = await response.json();
    expect(saved.data.matches[0].status).toBe("scheduled");
    const reloaded = await (await read()).json();
    expect(reloaded.data.matches[0].lineups.home.players[0].athleteId).toBe(
      "a",
    );
    expect(reloaded.data.matches[0].media[0].kind).toBe("video");
    expect(memory.invalidations).toContainEqual([
      "championship",
      { expire: 0 },
    ]);
  });
  it.each(["mp4", "webm"])(
    "uploads supported %s clips only through match media",
    async (extension) => {
      await authenticate();
      const bytes =
        extension === "mp4"
          ? new Uint8Array([
              0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109,
            ])
          : new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);
      const form = new FormData();
      form.set(
        "file",
        new File([bytes], `clip.${extension}`, { type: `video/${extension}` }),
      );
      const req = (url: string) =>
        new Request(origin + url, {
          method: "POST",
          headers: { origin },
          body: form,
        });
      expect((await media(req("/api/admin/media"))).status).toBe(400);
      const response = await media(req("/api/admin/media?kind=match"));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        kind: "video",
        url: expect.stringContaining(`/test.${extension}`),
      });
      expect(memory.uploaded).toEqual(bytes);
    },
  );
  it("rejects malformed videos and oversized upload bodies", async () => {
    await authenticate();
    const form = new FormData();
    form.set(
      "file",
      new File(["not a video"], "bad.mp4", { type: "video/mp4" }),
    );
    expect(
      (
        await media(
          new Request(origin + "/api/admin/media?kind=match", {
            method: "POST",
            headers: { origin },
            body: form,
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await media(
          new Request(origin + "/api/admin/media?kind=match", {
            method: "POST",
            headers: { origin, "content-length": "52000000" },
          }),
        )
      ).status,
    ).toBe(413);
  });
  it("supports login, protected writes and logout through the local hostname alias", async () => {
    process.env.APP_ORIGIN = "http://127.0.0.1:3000";
    const response = await login(
      post("/api/auth/login", {
        username: "test-admin",
        password: "test-password-very-long",
      }),
    );
    expect(response.status).toBe(200);
    expect((await read()).status).toBe(200);
    const save = await write(
      post("/api/admin", {
        revision: "1",
        operation: {
          kind: "team",
          value: { ...fixture().teams[0], name: "Updated class" },
        },
      }),
    );
    expect(save.status).toBe(200);
    expect((await logout(post("/api/auth/logout", {}))).status).toBe(200);
    expect((await read()).status).toBe(401);
  });
  it("optimizes authenticated image uploads before persisting them", async () => {
    await authenticate();
    const source = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: "#125640" },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.set(
      "file",
      new File([new Uint8Array(source)], "test.png", { type: "image/png" }),
    );
    const response = await media(
      new Request(origin + "/api/admin/media", {
        method: "POST",
        headers: { origin },
        body: form,
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).url).toContain("cdn.sanity.io");
    expect(await sharp(memory.uploaded).metadata()).toMatchObject({
      width: 600,
      height: 400,
      format: "webp",
    });
  });
  it("keeps match photos large enough for a gallery", async () => {
    await authenticate();
    const source = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: "#125640" },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.set(
      "file",
      new File([new Uint8Array(source)], "match.png", { type: "image/png" }),
    );
    const response = await media(
      new Request(origin + "/api/admin/media?kind=match", {
        method: "POST",
        headers: { origin },
        body: form,
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).kind).toBe("image");
    expect(await sharp(memory.uploaded).metadata()).toMatchObject({
      width: 1600,
      height: 800,
      format: "webp",
    });
  });
  it("rejects malformed image content without treating it as a backend failure", async () => {
    await authenticate();
    const form = new FormData();
    form.set(
      "file",
      new File(["not an image"], "bad.png", { type: "image/png" }),
    );
    const response = await media(
      new Request(origin + "/api/admin/media", {
        method: "POST",
        headers: { origin },
        body: form,
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("could not be decoded");
  });
  it("permits public reads without a session and omits the audit trail", async () => {
    const doc = memory.docs.get("championship.current")!;
    (doc.payload as ReturnType<typeof fixture>).audit = [
      {
        id: "audit",
        date: "2026-10-01",
        message: "Internal administrative event",
      },
    ];
    const s = await publicSnapshot();
    expect(s.data.teams).toHaveLength(4);
    expect(s.data.audit).toEqual([]);
    expect(s.revision).toBe("public");
  });
  it("rejects unauthenticated reads, writes and media uploads", async () => {
    expect((await read()).status).toBe(401);
    expect(
      (
        await write(
          post("/api/admin", {
            revision: "1",
            operation: { kind: "delete-match", id: "x" },
          }),
        )
      ).status,
    ).toBe(401);
    expect((await media(post("/api/admin/media", {}))).status).toBe(401);
  });
  it("rejects foreign origins even before login or mutation", async () => {
    expect(
      (await login(post("/api/auth/login", {}, "https://evil.example"))).status,
    ).toBe(403);
    expect(
      (await write(post("/api/admin", {}, "https://evil.example"))).status,
    ).toBe(403);
  });
  it("rejects incorrect credentials with a generic error", async () => {
    const r = await login(
      post("/api/auth/login", { username: "wrong", password: "wrong" }),
    );
    expect(r.status).toBe(401);
    expect((await r.json()).error).toBe("Username or password is incorrect.");
    expect(memory.cookies.size).toBe(0);
  });
  it("rate limits attempts durably across requests", async () => {
    for (let i = 0; i < 5; i++)
      expect(
        (
          await login(
            post("/api/auth/login", { username: "wrong", password: "wrong" }),
          )
        ).status,
      ).toBe(401);
    expect(
      (
        await login(
          post("/api/auth/login", {
            username: "test-admin",
            password: "test-password-very-long",
          }),
        )
      ).status,
    ).toBe(429);
    expect(memory.docs.get("security.admin-login")?.attempts).toBe(5);
  });
  it("logs in, authorizes protected data, and revokes the session on logout", async () => {
    await authenticate();
    const token = [...memory.cookies.values()][0];
    expect(await verifySession(token)).toBeTruthy();
    expect((await read()).status).toBe(200);
    expect((await logout(post("/api/auth/logout", {}))).status).toBe(200);
    expect((await read()).status).toBe(401);
    const sid = await verifySession(token);
    expect(memory.docs.has(`session.${sid}`)).toBe(false);
  });
  it("rejects expired, forged or database-revoked sessions", async () => {
    await authenticate();
    const key = [...memory.cookies.keys()][0],
      token = memory.cookies.get(key)!;
    const sid = await verifySession(token);
    memory.docs.set(`session.${sid}`, { expires: 0 });
    expect((await read()).status).toBe(401);
    memory.cookies.set(key, token + "tampered");
    expect((await read()).status).toBe(401);
    expect(await verifySession(await signSession("missing"))).toBe("missing");
  });
  it("validates writes, persists records, and invalidates public cache", async () => {
    await authenticate();
    let r = await write(
      post("/api/admin", {
        revision: "1",
        operation: { kind: "match", value: match() },
      }),
    );
    expect(r.status).toBe(200);
    const next = await r.json();
    expect(next.data.matches).toHaveLength(1);
    expect(memory.invalidations).toContainEqual([
      "championship",
      { expire: 0 },
    ]);
    r = await write(
      post("/api/admin", {
        revision: next.revision,
        operation: {
          kind: "match",
          value: {
            ...next.data.matches[0],
            homeScore: 0,
            awayScore: 1,
            outcome: "away",
            goals: [goal({ teamId: "grade-11", scorerId: "c", assistId: "d" })],
          },
        },
      }),
    );
    expect(r.status).toBe(200);
    const edited = await r.json();
    expect(edited.data.matches[0].goals[0].scorerId).toBe("c");
    const deleted = await write(
      post("/api/admin", {
        revision: edited.revision,
        operation: { kind: "delete-match", id: "match-1" },
      }),
    );
    expect(deleted.status).toBe(200);
    expect((await deleted.json()).data.matches).toEqual([]);
  });
  it("rejects invalid scorer attribution at the API boundary", async () => {
    await authenticate();
    const r = await write(
      post("/api/admin", {
        revision: "1",
        operation: {
          kind: "match",
          value: match({ goals: [goal({ scorerId: "c" })] }),
        },
      }),
    );
    expect(r.status).toBe(400);
    expect((await readSnapshot()).data.matches).toEqual([]);
  });
  it("preserves the first concurrent write and rejects a stale revision", async () => {
    await authenticate();
    const first = await mutate("1", {
      kind: "team",
      value: { ...fixture().teams[0], name: "Updated class" },
    });
    expect(first.data.teams[0].name).toBe("Updated class");
    const r = await write(
      post("/api/admin", {
        revision: "1",
        operation: {
          kind: "team",
          value: { ...fixture().teams[0], name: "Overwritten" },
        },
      }),
    );
    expect(r.status).toBe(409);
    expect((await readSnapshot()).data.teams[0].name).toBe("Updated class");
  });
  it("persists class creation, athlete edits, import and archival", async () => {
    await authenticate();
    let snap = await readSnapshot();
    snap = await mutate(snap.revision, {
      kind: "team",
      value: { ...fixture().teams[0], id: "new-team", name: "New class" },
    });
    snap = await mutate(snap.revision, {
      kind: "import",
      values: [
        {
          ...fixture().athletes[0],
          id: "new-athlete",
          name: "Test imported athlete",
          teamId: "new-team",
        },
      ],
    });
    snap = await mutate(snap.revision, {
      kind: "athlete",
      value: {
        ...snap.data.athletes.find((a) => a.id === "new-athlete")!,
        name: "Test renamed athlete",
      },
    });
    expect(snap.data.athletes.find((a) => a.id === "new-athlete")?.name).toBe(
      "Test renamed athlete",
    );
    snap = await mutate(snap.revision, {
      kind: "archive-athlete",
      id: "new-athlete",
    });
    expect(snap.data.athletes.find((a) => a.id === "new-athlete")?.active).toBe(
      false,
    );
  });
  it("exports public CSV without exposing server credentials or audit data", async () => {
    const r = await exportCsv(new Request(origin + "/api/export?kind=roster"));
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).toContain("Test athlete a");
    expect(text).not.toContain("test-password");
    expect(text).not.toContain("test-write");
    expect(text).not.toContain("audit");
  });
});
