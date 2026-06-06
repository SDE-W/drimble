import { getPool } from "../../infra/db/pool";
import { deadLetterRepository } from "./dead-letter.repository";
import { outboxRepository } from "../outbox/outbox.repository";
import { cacheDelByPattern } from "../../infra/cache/cache.client";
import { InvalidationPatterns } from "../../infra/cache/cache.keys";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import type { IDeadLetter, JobType, PaginatedResult } from "../../shared/types";
import { deadLetterCreatedCounter } from "../../shared/utils/dlqMetrics";
import { trackError } from "../../shared/utils/metrics";

const logger = createLogger(SERVICE_NAME);

interface DeadLetterInput {
  jobId: string;
  jobType: JobType;
  tenantId: string;
  payload: Record<string, unknown>;
  attempts: number;
  lastError: string;
}

const DOMAIN = "dead-letter";

class DeadLetterService {
  async create(input: DeadLetterInput): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
      await deadLetterRepository.create(
        {
          jobId: input.jobId,
          jobType: input.jobType,
          tenantId: input.tenantId,
          payload: input.payload,
          attempts: input.attempts,
          errors: [
            {
              attempt: input.attempts,
              error: input.lastError,
              occurredAt: new Date(),
            },
          ],
        },
        client,
      );
      

      await outboxRepository.create(
        {
          type: "deployment.dead.topic",
          payload: {
            jobId: input.jobId,
            jobType: input.jobType,
            tenantId: input.tenantId,
            totalAttempts: input.attempts,
            lastError: input.lastError,
            deadAt: new Date().toISOString(),
          },
        },
        client,
      );

      await client.query("COMMIT");
      await cacheDelByPattern(
        InvalidationPatterns.allDeadLetterLists(),
        DOMAIN,
        "dead_letter_created",
      );

      logger.info("dead_letter_service_created", {
        event: "dead_letter_service_created",
        service: SERVICE_NAME,
        domain: DOMAIN,
        jobId: input.jobId,
        jobType: input.jobType,
        attempts: input.attempts,
      });

      deadLetterCreatedCounter.inc({ job_type: input.jobType });
    } catch (error) {
      await client.query("ROLLBACK");

      trackError("dead_letter_create_failed", "dead_letter_create", DOMAIN, "high");

      logger.error("dead_letter_service_create_failed", {
        event: "dead_letter_service_create_failed",
        service: SERVICE_NAME,
        domain: DOMAIN,
        jobId: input.jobId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      client.release();
    }
  }

  async findUnresolved(
    tenantId: string | undefined,
    jobType: JobType | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<IDeadLetter>> {
    return deadLetterRepository.findUnresolved(tenantId, jobType, page, limit);
  }

  async findByJobId(jobId: string): Promise<IDeadLetter | null> {
    return deadLetterRepository.findByJobId(jobId);
  }

  async resolve(jobId: string, resolution: string): Promise<IDeadLetter | null> {
    const doc = await deadLetterRepository.resolve(jobId, "system", resolution);

    if (doc) {
      logger.info("dead_letter_service_resolved", {
        event: "dead_letter_service_resolved",
        service: SERVICE_NAME,
        domain: DOMAIN,
        jobId,
      });
    }

    return doc;
  }
}

export const deadLetterService = new DeadLetterService();