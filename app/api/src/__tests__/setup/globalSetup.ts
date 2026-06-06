import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(__dirname, "../../../infra/migrations");

async function applyMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
          [file],
        );
        await client.query("COMMIT");
        console.log(`[globalSetup] migration applied: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

export default async function globalSetup(): Promise<void> {
  console.log("[globalSetup] starting PostgreSQL container...");

  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    "postgres:16-alpine",
  )
    .withDatabase("brimble_test")
    .withUsername("brimble_test")
    .withPassword("brimble_test")
    .start();

  const connectionString = container.getConnectionUri();
  process.env.TEST_DATABASE_URL = connectionString;

  console.log(`[globalSetup] container started: ${connectionString}`);
  await applyMigrations(connectionString);
  console.log("[globalSetup] migrations applied");

  // Create ONE pool here and store on global.__PG_POOL__.
  // globalSetup runs in a separate context from test workers but process.env
  // is shared. The pool object itself cannot cross the worker boundary via global
  // in Jest's architecture, so we store the connection string and let each
  // worker's beforeAll create their own pool - but we use module isolation
  // reset prevention via jest.resetModules(false) in the config.
  (global as Record<string, unknown>).__PG_CONTAINER__ = container;
}