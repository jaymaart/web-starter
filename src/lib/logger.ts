/**
 * Tagged logging (§10 Observability). Every log line is prefixed `[tag]` so it's
 * greppable in aggregated logs. Use one logger per module: `createLogger("db")`.
 */
export function createLogger(tag: string) {
  const prefix = `[${tag}]`;
  return {
    info: (...args: unknown[]) => console.log(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };
}
