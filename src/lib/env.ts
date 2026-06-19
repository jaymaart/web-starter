/**
 * Lazy, typed access to environment variables. Deliberately does NOT validate at
 * import time — that would crash `next build` whenever an env var is absent.
 * Call `requireEnv` only at the point of use, so missing config fails the one
 * code path that needs it, not the whole process.
 */
export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
