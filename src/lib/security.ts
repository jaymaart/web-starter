/**
 * Origin allowlist for mutation endpoints (§6 Security). Call `isSameOrigin(req)`
 * at the top of any POST/PUT/DELETE handler that a browser form hits, and reject
 * with 403 when it returns false. Drive production hosts via ALLOWED_ORIGINS.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false; // require an Origin header on mutations
  try {
    const host = new URL(origin).host;
    return allowedHosts().includes(host);
  } catch {
    return false;
  }
}

function allowedHosts(): string[] {
  const fromEnv =
    process.env.ALLOWED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  return ["localhost:3000", "127.0.0.1:3000", ...fromEnv];
}
