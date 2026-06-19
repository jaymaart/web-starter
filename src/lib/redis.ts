import Redis from "ioredis";
import { createLogger } from "./logger";

const log = createLogger("redis");

// Lazy singleton. Returns null when REDIS_URL is unset so callers degrade
// gracefully (§4.4) rather than crashing.
let client: Redis | null = null;
let warned = false;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (!warned) {
      log.warn("REDIS_URL not set — running without Redis (in-memory fallbacks)");
      warned = true;
    }
    return null;
  }
  if (!client) {
    client = new Redis(url, { maxRetriesPerRequest: 2 });
    client.on("error", (err) => log.error("connection error", err.message));
    log.info("client created");
  }
  return client;
}
