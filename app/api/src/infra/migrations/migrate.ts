import { readFileSync, readdirSync } from "fs";
import path from "path";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import { getPool } from "../db/pool";

const logger = createLogger(SERVICE_NAME);

const MIGRATIONS_DIR = path.join(__dirname, "../migrations/migrations");

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await pool.query<{ version: string }>(
    "SELECT version FROM schema_migrations ORDER BY version ASC"
  );
  const applied = new Set(rows.map((r) => r.version));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info("migration_already_applied", {
        event: "migration_already_applied",
        service: SERVICE_NAME,
        file,
      });
      continue;
    }

    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");

      logger.info("migration_applied", {
        event: "migration_applied",
        service: SERVICE_NAME,
        file,
      });
    } catch (err) {
      await client.query("ROLLBACK");

      logger.error("migration_failed", {
        event: "migration_failed",
        service: SERVICE_NAME,
        file,
        error: err instanceof Error ? err.message : String(err),
      });

      throw err;
    } finally {
      client.release();
    }
  }
}