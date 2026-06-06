
import { v4 as uuidv4 } from "uuid";
import { getPool } from "@/infra/db/pool";
import type { IDeployment, IDeadLetter, IDeploymentLog } from "@/shared/types";

//  Deployment 

type SeedDeploymentInput = Partial<{
  id: string;
  name: string;
  sourceType: "git" | "upload";
  sourceRef: string;
  status: "pending" | "building" | "deploying" | "running" | "failed";
  imageTag: string;
  containerId: string;
  hostPort: number;
  url: string;
  attempts: number;
  lastError: string;
}>;

export async function seedDeployment(
  overrides: SeedDeploymentInput = {},
): Promise<IDeployment> {
  const pool = getPool();
  const id = overrides.id ?? uuidv4();

  const { rows } = await pool.query(
    `INSERT INTO deployments
       (id, name, source_type, source_ref, status, image_tag,
        container_id, host_port, url, attempts, last_error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      id,
      overrides.name !== undefined ? overrides.name : null,
      overrides.sourceType ?? "git",
      overrides.sourceRef ?? "https://github.com/test/repo",
      overrides.status ?? "pending",
      overrides.imageTag ?? null,
      overrides.containerId ?? null,
      overrides.hostPort ?? null,
      overrides.url ?? null,
      overrides.attempts ?? 0,
      overrides.lastError ?? null,
    ],
  );

  return {
    id: rows[0].id as string,
    name: rows[0].name as string,
    sourceType: rows[0].source_type as "git" | "upload",
    sourceRef: rows[0].source_ref as string,
    status: rows[0].status as IDeployment["status"],
    imageTag: rows[0].image_tag as string | undefined,
    containerId: rows[0].container_id as string | undefined,
    hostPort: rows[0].host_port as number | undefined,
    url: rows[0].url as string | undefined,
    attempts: rows[0].attempts as number,
    lastError: rows[0].last_error as string | undefined,
    createdAt: rows[0].created_at as Date,
    updatedAt: rows[0].updated_at as Date,
  };
}

//  Deployment log 

type SeedLogInput = {
  deploymentId: string;
  seq: number;
  line: string;
  phase?: "clone" | "build" | "run" | "register" | "system";
  ts?: Date;
};

export async function seedDeploymentLog(
  input: SeedLogInput,
): Promise<IDeploymentLog> {
  const pool = getPool();

  // Use DO UPDATE instead of DO NOTHING so RETURNING always returns the row.
  // DO NOTHING with RETURNING returns empty rows on conflict, making rows[0]
  // undefined and throwing silently - which corrupts subsequent test state.
  const { rows } = await pool.query(
    `INSERT INTO deployment_logs (id, deployment_id, seq, ts, line, phase)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
     ON CONFLICT (deployment_id, seq) DO UPDATE
       SET line = EXCLUDED.line, phase = EXCLUDED.phase
     RETURNING *`,
    [
      input.deploymentId,
      input.seq,
      input.ts ?? new Date(),
      input.line,
      input.phase ?? "build",
    ],
  );

  return {
    id: rows[0].id as string,
    deploymentId: rows[0].deployment_id as string,
    seq: rows[0].seq as number,
    ts: rows[0].ts as Date,
    line: rows[0].line as string,
    phase: rows[0].phase as IDeploymentLog["phase"],
  };
}

export async function seedDeploymentLogs(
  deploymentId: string,
  count: number,
  phase: IDeploymentLog["phase"] = "build",
  startSeq = 1,
): Promise<IDeploymentLog[]> {
  const results: IDeploymentLog[] = [];
  for (let i = 0; i < count; i++) {
    results.push(
      await seedDeploymentLog({
        deploymentId,
        seq: startSeq + i,
        line: `log line ${startSeq + i}`,
        phase,
      }),
    );
  }
  return results;
}

//  Dead letter 

type SeedDeadLetterInput = Partial<{
  id: string;
  jobId: string;
  jobType: string;
  tenantId: string;
  payload: Record<string, unknown>;
  attempts: number;
  errors: Array<{ attempt: number; error: string; occurredAt: Date }>;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: string | null;
}>;

export async function seedDeadLetter(
  overrides: SeedDeadLetterInput = {},
): Promise<IDeadLetter> {
  const pool = getPool();
  const id = overrides.id ?? uuidv4();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const { rows } = await pool.query(
    `INSERT INTO dead_letters
       (id, job_id, job_type, tenant_id, payload, attempts, errors,
        expires_at, resolved_at, resolved_by, resolution)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      id,
      overrides.jobId ?? uuidv4(),
      overrides.jobType ?? "DEPLOYMENT",
      overrides.tenantId ?? "tenant-test",
      JSON.stringify(overrides.payload ?? {}),
      overrides.attempts ?? 3,
      JSON.stringify(
        overrides.errors ?? [
          { attempt: 3, error: "timeout", occurredAt: new Date() },
        ],
      ),
      expiresAt,
      overrides.resolvedAt ?? null,
      overrides.resolvedBy ?? null,
      overrides.resolution ?? null,
    ],
  );

  return {
    id: rows[0].id as string,
    jobId: rows[0].job_id as string,
    jobType: rows[0].job_type as IDeadLetter["jobType"],
    tenantId: rows[0].tenant_id as string,
    payload: rows[0].payload as Record<string, unknown>,
    attempts: rows[0].attempts as number,
    errors: rows[0].errors as IDeadLetter["errors"],
    deadAt: rows[0].dead_at as Date,
    resolvedAt: rows[0].resolved_at as Date | undefined,
    resolvedBy: rows[0].resolved_by as string | undefined,
    resolution: rows[0].resolution as string | undefined,
    expiresAt: rows[0].expires_at as Date,
  };
}