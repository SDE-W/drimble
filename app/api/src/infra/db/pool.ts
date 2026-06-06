import { Pool } from "pg";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import {
  dbPoolCheckoutDuration,
  dbPoolIdleConnections,
  dbPoolSize,
  dbPoolWaitingCount,
} from "../../shared/utils/metrics";

const logger = createLogger(SERVICE_NAME);

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initPool() first.");
  }
  return pool;
}

function instrumentPool(p: Pool): void {

  const syncGauges = () => {
    dbPoolSize.set(p.totalCount);
    dbPoolIdleConnections.set(p.idleCount);
    dbPoolWaitingCount.set(p.waitingCount);
  };

  p.on("connect", syncGauges);
  p.on("acquire", syncGauges);
  p.on("remove", syncGauges);

  const originalConnect = p.connect.bind(p);

  p.connect = async function patchedConnect(...args: unknown[]) {
    const checkoutStart = process.hrtime();
    const client = await originalConnect(...(args as []));
    const [sec, ns] = process.hrtime(checkoutStart);
    dbPoolCheckoutDuration.observe(sec + ns / 1e9);
    return client;
  };
}

export async function initPool(connectionString: string): Promise<void> {
  if (pool) {
    return;
  }

  pool = new Pool({
    connectionString,
    max: 20,
    min: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  const client = await pool.connect();
  await client.query("SELECT 1");
  client.release();

  try { instrumentPool(pool); } catch {  }

  logger.info("postgres_pool_initialized", {
    event: "postgres_pool_initialized",
    service: SERVICE_NAME,
  });
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;

    dbPoolSize.set(0);
    dbPoolIdleConnections.set(0);
    dbPoolWaitingCount.set(0);

    logger.info("postgres_pool_closed", {
      event: "postgres_pool_closed",
      service: SERVICE_NAME,
    });
  }
}
