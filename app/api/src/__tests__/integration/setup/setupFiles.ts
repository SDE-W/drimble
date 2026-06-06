import { initPool, closePool, getPool } from "../../../infra/db/pool";
import { beforeAll, afterAll, beforeEach } from "@jest/globals";

const TABLES_TO_TRUNCATE = [
  "deployment_logs",
  "dead_letters",
  "outbox",
  "deployments",
];


beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL not set - globalSetup did not run");
  }
  // Idempotent - only creates pool on first call across all test files
  await initPool(process.env.TEST_DATABASE_URL);
});

beforeEach(async () => {
  const pool = getPool();
  await pool.query(
    `TRUNCATE TABLE ${TABLES_TO_TRUNCATE.join(", ")} RESTART IDENTITY CASCADE`,
  );
});
