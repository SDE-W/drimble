
import { getPool } from "../../infra/db/pool";
import type { IDeployment, DeploymentStatus } from "../../shared/types";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import type { PoolClient } from "pg";
import { v4 } from "uuid";


const logger = createLogger(SERVICE_NAME);
function rowToDeployment(row: Record<string, unknown>): IDeployment {
  return {
    id: row.id as string,
    name: row.name as string | undefined,
    sourceType: row.source_type as IDeployment["sourceType"],
    sourceRef: row.source_ref as string,
    status: row.status as DeploymentStatus,
    imageTag: row.image_tag as string | undefined,
    containerId: row.container_id as string | undefined,
    hostPort: row.host_port as number | undefined,
    url: row.url as string | undefined,
    attempts: row.attempts as number,
    lastError: row.last_error as string | undefined,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}


class DeploymentRepository {
  async create(
    data: Pick<IDeployment, "sourceType" | "sourceRef" | "name">,
    client?: PoolClient
  ): Promise<IDeployment> {
    const db = client ?? getPool();
    const id = v4();

    const { rows } = await db.query(
      `INSERT INTO deployments (id, name, source_type, source_ref)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, data.name ?? null, data.sourceType, data.sourceRef]
    );

    logger.debug("deployment_repository_created", {
      event: "deployment_repository_created",
      service: SERVICE_NAME,
      deploymentId: id,
    });

    return rowToDeployment(rows[0]);
  }

  async findById(id: string): Promise<IDeployment | null> {
    const { rows } = await getPool().query(
      "SELECT * FROM deployments WHERE id = $1",
      [id]
    );
    return rows.length ? rowToDeployment(rows[0]) : null;
  }

  async findAll(): Promise<IDeployment[]> {
    const { rows } = await getPool().query(
      "SELECT * FROM deployments ORDER BY created_at DESC"
    );
    return rows.map(rowToDeployment);
  }

  async findByStatus(status: DeploymentStatus): Promise<IDeployment[]> {
    const { rows } = await getPool().query(
      "SELECT * FROM deployments WHERE status = $1 ORDER BY created_at DESC",
      [status]
    );
    return rows.map(rowToDeployment);
  }

  async updateStatus(
    id: string,
    status: DeploymentStatus,
    extra?: Partial<
      Pick<IDeployment, "imageTag" | "containerId" | "hostPort" | "url" | "lastError">
    >,
    client?: PoolClient
  ): Promise<IDeployment | null> {
    const db = client ?? getPool();

    const sets: string[] = ["status = $2", "updated_at = NOW()"];
    const values: unknown[] = [id, status];
    let idx = 3;

    if (extra?.imageTag !== undefined) {
      sets.push(`image_tag = $${idx++}`);
      values.push(extra.imageTag);
    }
    if (extra?.containerId !== undefined) {
      sets.push(`container_id = $${idx++}`);
      values.push(extra.containerId);
    }
    if (extra?.hostPort !== undefined) {
      sets.push(`host_port = $${idx++}`);
      values.push(extra.hostPort);
    }
    if (extra?.url !== undefined) {
      sets.push(`url = $${idx++}`);
      values.push(extra.url);
    }
    if (extra?.lastError !== undefined) {
      sets.push(`last_error = $${idx++}`);
      values.push(extra.lastError);
    }

    const { rows } = await db.query(
      `UPDATE deployments SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
      values
    );

    logger.debug("deployment_repository_status_updated", {
      event: "deployment_repository_status_updated",
      service: SERVICE_NAME,
      deploymentId: id,
      status,
    });

    return rows.length ? rowToDeployment(rows[0]) : null;
  }

  async incrementAttempts(
    id: string,
    client?: PoolClient
  ): Promise<number> {
    const db = client ?? getPool();
    const { rows } = await db.query(
      `UPDATE deployments
       SET attempts = attempts + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING attempts`,
      [id]
    );
    return rows[0]?.attempts ?? 0;
  }

  async findAllocatedPorts(): Promise<number[]> {
    const { rows } = await getPool().query(
      "SELECT host_port FROM deployments WHERE host_port IS NOT NULL"
    );
    return rows.map((r) => r.host_port as number);
  }
}

export const deploymentRepository = new DeploymentRepository();

