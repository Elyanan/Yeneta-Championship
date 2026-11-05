import { afterEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
} from "@/lib/auth-core";

afterEach(() => vi.unstubAllEnvs());
describe("administrator environment compatibility", () => {
  it("generates a hash that Next.js loads without expanding it", async () => {
    const hash = await hashPassword("test-only-administrator-password");
    expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "yeneta-auth-env-"),
    );
    try {
      fs.writeFileSync(
        path.join(directory, ".env.local"),
        `ADMIN_PASSWORD_HASH='${hash}'\n`,
      );
      const env = { ...process.env };
      env.NODE_ENV = "development";
      delete env.ADMIN_PASSWORD_HASH;
      const result = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `
        import nextEnv from '@next/env';
        const {combinedEnv}=nextEnv.loadEnvConfig(process.argv[1],true,{info(){},error(){}});
        process.stdout.write(combinedEnv.ADMIN_PASSWORD_HASH||'');
      `,
          directory,
        ],
        { encoding: "utf8", env },
      );
      expect(result).toBe(hash);
      expect(
        await verifyPassword("test-only-administrator-password", result),
      ).toBe(true);
    } finally {
      fs.rmSync(directory, { recursive: true });
    }
  });
  it("continues to verify legacy dollar-delimited hashes", async () => {
    const hash = (await hashPassword("test-only-password")).replaceAll(
      ":",
      "$",
    );
    expect(await verifyPassword("test-only-password", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
  it("rejects corrupt and mixed-format hashes", async () => {
    for (const hash of [
      "scrypt",
      "scrypt:bad:bad",
      `scrypt:${"a".repeat(32)}$${"b".repeat(128)}`,
    ])
      expect(await verifyPassword("test-password", hash)).toBe(false);
  });
  it("uses ADMIN_SESSION_SECRET and accepts the older AUTH_SESSION_SECRET alias", async () => {
    vi.stubEnv(
      "ADMIN_SESSION_SECRET",
      "admin-secret-with-more-than-32-characters",
    );
    vi.stubEnv(
      "AUTH_SESSION_SECRET",
      "different-legacy-secret-more-than-32-characters",
    );
    const current = await signSession("test-session");
    expect(await verifySession(current)).toBe("test-session");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(await verifySession(current)).toBeNull();
    expect(await verifySession(await signSession("legacy-session"))).toBe(
      "legacy-session",
    );
  });
});
