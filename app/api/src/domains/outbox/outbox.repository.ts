import { v4 as uuidv4 } from "uuid";
import { getPool } from "../../infra/db/pool";
import type { IOutbox } from "../../shared/types";
import type { PoolClient } from "pg";

function rowToOutbox(row: Record<string, unknown>): IOutbox {
  return {
    id: row.id as string,
    type: row.type as string,
    payload: row.payload as Record<string, unknown>,
    status: row.status as IOutbox["status"],
    retryCount: row.retry_count as number,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

class OutboxRepository {
  async create(
    data: Pick<IOutbox, "type" | "payload">,
    client?: PoolClient
  ): Promise<IOutbox> {
    const db = client ?? getPool();
    const id = uuidv4();

    const { rows } = await db.query(
      `INSERT INTO outbox (id, type, payload)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, data.type, JSON.stringify(data.payload)]
    );

    return rowToOutbox(rows[0]);
  }

  async findPending(limit = 50): Promise<IOutbox[]> {
    const { rows } = await getPool().query(
      `SELECT * FROM outbox
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );
    return rows.map(rowToOutbox);
  }

  async markPublished(id: string, client?: PoolClient): Promise<void> {
    const db = client ?? getPool();
    await db.query(
      `UPDATE outbox SET status = 'published', updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async markFailed(id: string, client?: PoolClient): Promise<void> {
    const db = client ?? getPool();
    await db.query(
      `UPDATE outbox
       SET status = 'failed', retry_count = retry_count + 1, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }
}

export const outboxRepository = new OutboxRepository();