type OriginConfiguration = {
  appOrigin?: string;
  siteUrl?: string;
  production: boolean;
};

function originUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isTrustedRequestOrigin(
  request: Request,
  configuration: OriginConfiguration,
): boolean {
  const source = originUrl(request.headers.get("origin"));
  if (!source) return false;
  const target = originUrl(new URL(request.url).origin);
  const configured =
    configuration.appOrigin?.trim() || configuration.siteUrl?.trim();
  const expected = originUrl(
    configured || (!configuration.production ? target?.origin : undefined),
  );
  if (expected && source.origin === expected.origin) return true;

  // Next.js may represent a local request with a different loopback hostname.
  // Restrict aliases to development, the actual target port, and the same protocol.
  return (
    !configuration.production &&
    Boolean(target) &&
    loopbackHosts.has(source.hostname) &&
    loopbackHosts.has(target!.hostname) &&
    source.protocol === target!.protocol &&
    source.port === target!.port
  );
}
