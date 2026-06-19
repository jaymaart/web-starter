import { createLogger } from "./logger";

const log = createLogger("example-service");

/**
 * Template for wrapping a third-party API (§4.5). Copy this file per integration.
 * Rules it demonstrates:
 *   - Typed domain model out (`Widget`), not the vendor's raw shape.
 *   - A `toWidget` mapper isolates vendor field names from the rest of the app.
 *   - All errors handled inside; the decided fallback is `null`, never a thrown 500.
 *   - No config => no-op that logs, so the app boots without this integration.
 */
export type Widget = { id: string; name: string; status: string };

function toWidget(raw: Record<string, unknown>): Widget {
  return {
    id: String(raw.id ?? ""),
    name: typeof raw.title === "string" ? raw.title : "",
    status: typeof raw.state === "string" ? raw.state : "unknown",
  };
}

export async function getWidget(id: string): Promise<Widget | null> {
  const base = process.env.EXAMPLE_SERVICE_BASE_URL;
  const key = process.env.EXAMPLE_SERVICE_API_KEY;
  if (!base || !key) {
    log.warn("not configured — returning null");
    return null;
  }
  try {
    const res = await fetch(`${base}/widgets/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      log.error("getWidget non-2xx", res.status);
      return null;
    }
    const raw = (await res.json()) as Record<string, unknown>;
    return toWidget(raw);
  } catch (err) {
    log.error("getWidget threw", err);
    return null;
  }
}
