import { getPool } from "../../infra/db/pool";
import { measureDatabaseQuery } from "../../shared/utils/metrics";
import {
  cacheGetJson,
  cacheSetJson,
  cacheDelByPattern,
} from "../../infra/cache/cache.client";
import { CacheKeys, CacheTTL, InvalidationPatterns } from "../../infra/cache/cache.keys";
import type { IDeploymentLog, LogPhase } from "../../shared/types";
import type { PoolClient } from "pg";
import { publishLog, publishManyLogs } from "../../infra/pubsub/log.publisher";

const DOMAIN = "deployment-log";

function rowToLog(row: Record<string, unknown>): IDeploymentLog {
  return {
    id: row.id as string,
    deploymentId: row.deployment_id as string,
    seq: row.seq as number,
    ts: row.ts as Date,
    line: row.line as string,
    phase: row.phase as LogPhase,
  };
}

class DeploymentLogRepository {

  async insert(log: Omit<IDeploymentLog, "id">, client?: PoolClient): Promise<void> {
    const db = client ?? getPool();

    const { rows } = await measureDatabaseQuery(
      "deployment_log_insert",
      () =>
        db.query(
          `INSERT INTO deployment_logs (id, deployment_id, seq, ts, line, phase)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
           ON CONFLICT (deployment_id, seq) DO NOTHING
           RETURNING *`,
          [log.deploymentId, log.seq, log.ts, log.line, log.phase],
        ),
      DOMAIN,
    );

    if (rows.length > 0) {
      const persisted = rowToLog(rows[0]);
      await Promise.all([
        publishLog(persisted),
        cacheDelByPattern(
          InvalidationPatterns.deploymentLogs(log.deploymentId),
          DOMAIN,
          "log_inserted",
        ),
      ]);
    }
  }

 
  async insertMany(
    logs: Omit<IDeploymentLog, "id">[],
    client?: PoolClient,
  ): Promise<void> {
    if (logs.length === 0) return;
    const db = client ?? getPool();

    const { rows } = await measureDatabaseQuery(
      "deployment_log_insert_many",
      () =>
        db.query(
          `INSERT INTO deployment_logs (id, deployment_id, seq, ts, line, phase)
           SELECT gen_random_uuid(), * FROM unnest(
             $1::uuid[],
             $2::int[],
             $3::timestamptz[],
             $4::text[],
             $5::text[]
           )
           ON CONFLICT (deployment_id, seq) DO NOTHING
           RETURNING *`,
          [
            logs.map((l) => l.deploymentId),
            logs.map((l) => l.seq),
            logs.map((l) => l.ts),
            logs.map((l) => l.line),
            logs.map((l) => l.phase),
          ],
        ),
      DOMAIN,
    );

    const persisted = rows.map(rowToLog);

    if (persisted.length > 0) {
      await Promise.all([
        publishManyLogs(persisted),
        cacheDelByPattern(
          InvalidationPatterns.deploymentLogs(logs[0].deploymentId),
          DOMAIN,
          "logs_bulk_inserted",
        ),
      ]);
    }
  }

  async findByDeploymentId(
    deploymentId: string,
    phase?: LogPhase,
  ): Promise<IDeploymentLog[]> {
    const cacheKey = CacheKeys.deploymentLogs(deploymentId, phase);

    const cached = await cacheGetJson<IDeploymentLog[]>(cacheKey, DOMAIN);
    if (cached !== null) return cached;

    const result = await measureDatabaseQuery(
      "deployment_log_find_by_deployment",
      async () => {
        if (phase) {
          const { rows } = await getPool().query(
            `SELECT * FROM deployment_logs
             WHERE deployment_id = $1 AND phase = $2
             ORDER BY seq ASC`,
            [deploymentId, phase],
          );
          return rows.map(rowToLog);
        }

        const { rows } = await getPool().query(
          `SELECT * FROM deployment_logs
           WHERE deployment_id = $1
           ORDER BY seq ASC`,
          [deploymentId],
        );
        return rows.map(rowToLog);
      },
      DOMAIN,
    );

    if (result.length > 0) {
      await cacheSetJson(cacheKey, result, DOMAIN, CacheTTL.DEPLOYMENT_LOGS);
    }

    return result;
  }

  async countByDeploymentId(deploymentId: string): Promise<number> {
    return measureDatabaseQuery(
      "deployment_log_count",
      async () => {
        const { rows } = await getPool().query(
          "SELECT COUNT(*) AS count FROM deployment_logs WHERE deployment_id = $1",
          [deploymentId],
        );
        return parseInt(rows[0].count as string, 10);
      },
      DOMAIN,
    );
  }
}

export const deploymentLogRepository = new DeploymentLogRepository();