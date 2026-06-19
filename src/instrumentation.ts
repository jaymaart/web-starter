import { createLogger } from "@/lib/logger";

const log = createLogger("startup");

/**
 * Runs once on server boot (§4.3 Caching). Use this to warm caches or prime
 * connections so the first user request isn't the slow one. Kept light by
 * default — add warm-up calls here as you wire integrations in.
 */
export async function register() {
  log.info("register() — server starting");
}
