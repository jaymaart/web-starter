import { Pool, type QueryResultRow } from "pg";
import { createLogger } from "./logger";

const log = createLogger("db");

// Single pooled connection for the lifetime of the process (§9 Performance).
// Lazily created so the app boots without a database configured.
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
    pool.on("error", (err) => log.error("idle client error", err));
    log.info("pool created");
  }
  return pool;
}

/**
 * Run a parameterized query. NEVER interpolate values into `text` — pass them as
 * `params` so the driver handles escaping (§6 Security, §5 Data Layer).
 *
 *   const rows = await query<UserRow>("select * from users where id = $1", [id]);
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}
