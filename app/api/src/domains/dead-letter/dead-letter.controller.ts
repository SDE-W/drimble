import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { deadLetterService } from "./dead-letter.service";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME, HTTP_STATUS } from "../../shared/constants";
import type { AuthenticatedRequest, JobType } from "../../shared/types";

const logger = createLogger(SERVICE_NAME);

export const listDeadLettersHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { tenantId, jobType, page = "1", limit = "20" } = req.query;

    const result = await deadLetterService.findUnresolved(
      tenantId as string | undefined,
      jobType as JobType | undefined,
      Math.max(1, parseInt(page as string, 10)),
      Math.min(100, Math.max(1, parseInt(limit as string, 10)))
    );

    logger.info("dead_letter_list_fetched", {
      event: "dead_letter_list_fetched",
      service: SERVICE_NAME,
      tenantId,
      jobType,
      totalCount: result.totalCount,
      requestId: (req as AuthenticatedRequest).requestId,
    });

    res.status(HTTP_STATUS.OK).json(result);
  }
);

export const getDeadLetterHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params;
    const doc = await deadLetterService.findByJobId(jobId);

    if (!doc) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ error: "Dead letter not found" });
      return;
    }

    res.status(HTTP_STATUS.OK).json(doc);
  }
);

export const resolveDeadLetterHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params;
    const { resolution } = req.body as { resolution: string };
    const requestId = (req as AuthenticatedRequest).requestId;

    const doc = await deadLetterService.resolve(jobId, resolution);

    if (!doc) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ error: "Dead letter not found or already resolved" });
      return;
    }

    logger.info("dead_letter_resolved_via_api", {
      event: "dead_letter_resolved_via_api",
      service: SERVICE_NAME,
      jobId,
      jobType: doc.jobType,
      requestId,
    });

    res.status(HTTP_STATUS.OK).json(doc);
  }
);