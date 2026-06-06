import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { deploymentLogService } from "./deployment-log.service";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME, HTTP_STATUS } from "../../shared/constants";
import type { LogPhase } from "../../shared/types";

const logger = createLogger(SERVICE_NAME);

export const getDeploymentLogsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { deploymentId, phase, page, limit } = req.query as {
      deploymentId: string;
      phase?: LogPhase;
      page: string;
      limit: string;
    };

    const result = await deploymentLogService.getLogs({
      deploymentId,
      phase,
      page: Number(page),
      limit: Number(limit),
    });

    logger.info("deployment_log_controller_fetched", {
      event: "deployment_log_controller_fetched",
      service: SERVICE_NAME,
      deploymentId,
      phase,
      totalCount: result.totalCount,
    });

    res.status(HTTP_STATUS.OK).json(result);
  }
);

export const getDeploymentLogCountHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { deploymentId } = req.query as { deploymentId: string };

    const count = await deploymentLogService.getCount(deploymentId);

    res.status(HTTP_STATUS.OK).json({ deploymentId, count });
  }
);