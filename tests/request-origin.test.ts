import { describe, expect, it } from "vitest";
import { isTrustedRequestOrigin } from "@/lib/request-origin";

function request(
  origin?: string,
  url = "http://127.0.0.1:3000/api/auth/login",
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method: "POST",
    headers: { ...headers, ...(origin ? { origin } : {}) },
  });
}
const local = { appOrigin: "http://127.0.0.1:3000", production: false };
const production = {
  appOrigin: "https://championship.example",
  production: true,
};

describe("request-origin validation", () => {
  it("allows the exact configured origin", () => {
    expect(isTrustedRequestOrigin(request(local.appOrigin), local)).toBe(true);
  });
  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "allows the %s loopback alias during development",
    (host) => {
      expect(
        isTrustedRequestOrigin(request(`http://${host}:3000`), local),
      ).toBe(true);
    },
  );
  it("supports the local port actually chosen by the dev server", () => {
    expect(
      isTrustedRequestOrigin(
        request("http://localhost:3001", "http://127.0.0.1:3001/api/admin"),
        local,
      ),
    ).toBe(true);
  });
  it("normalizes trailing slashes, casing and default ports", () => {
    expect(
      isTrustedRequestOrigin(request("https://championship.example"), {
        appOrigin: "  https://CHAMPIONSHIP.example:443/  ",
        production: true,
      }),
    ).toBe(true);
  });
  it("uses the configured public site URL when APP_ORIGIN is absent", () => {
    expect(
      isTrustedRequestOrigin(request("https://championship.example"), {
        siteUrl: "https://championship.example/",
        production: true,
      }),
    ).toBe(true);
  });
  it("allows a configured public origin behind an internal reverse proxy", () => {
    expect(
      isTrustedRequestOrigin(
        request(
          "https://championship.example",
          "http://internal:3000/api/admin",
        ),
        production,
      ),
    ).toBe(true);
  });
  it("does not enable loopback aliases in production", () => {
    expect(
      isTrustedRequestOrigin(request("http://localhost:3000"), {
        ...local,
        production: true,
      }),
    ).toBe(false);
  });
  it.each([
    "http://localhost:3001",
    "https://localhost:3000",
    "http://localhost.attacker.example:3000",
    "http://192.168.1.10:3000",
  ])("rejects the untrusted local origin %s", (origin) => {
    expect(isTrustedRequestOrigin(request(origin), local)).toBe(false);
  });
  it.each([
    undefined,
    "null",
    "file:///tmp/page",
    "https://championship.example.attacker.test",
    "https://championship.example@attacker.test",
    "https://championship.example/login",
    "https://championship.example?x=1",
    "https://championship.example#fragment",
  ])("rejects missing, malformed or forged origins: %s", (origin) => {
    expect(isTrustedRequestOrigin(request(origin), production)).toBe(false);
  });
  it("fails closed when production has no configured origin", () => {
    expect(
      isTrustedRequestOrigin(request("http://127.0.0.1:3000"), {
        production: true,
      }),
    ).toBe(false);
  });
  it("does not trust client-supplied forwarding headers", () => {
    expect(
      isTrustedRequestOrigin(
        request("https://attacker.test", undefined, {
          "x-forwarded-host": "attacker.test",
          "x-forwarded-proto": "https",
        }),
        production,
      ),
    ).toBe(false);
  });
  it("does not treat a missing origin as a local request", () => {
    expect(isTrustedRequestOrigin(request(), local)).toBe(false);
  });
});
