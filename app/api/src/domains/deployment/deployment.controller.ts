import type { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { deploymentService } from "./deployment.service";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME, HTTP_STATUS } from "../../shared/constants";
import type { AuthenticatedRequest } from "../../shared/types";

const logger = createLogger(SERVICE_NAME);


export const createDeploymentHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { sourceType, sourceRef, name } = req.body as {
      sourceType: "git" | "upload";
      sourceRef: string;
      name?: string;
    };

    const requestId = (req as AuthenticatedRequest).requestId;

    const deployment = await deploymentService.createDeployment(
      sourceType,
      sourceRef,
      name,
      requestId,
    );

    logger.info("deployment_controller_created", {
      event: "deployment_controller_created",
      service: SERVICE_NAME,
      deploymentId: deployment.id.toString(),
      sourceType,
      requestId,
    });

    res.status(HTTP_STATUS.ACCEPTED).json(deployment);
  },
);

export const listDeploymentsHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const deployments = await deploymentService.listDeployments();
    res.status(HTTP_STATUS.OK).json(deployments);
  },
);

export const getDeploymentHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const deployment = await deploymentService.getDeployment(id);
    res.status(HTTP_STATUS.OK).json(deployment);
  },
);

export const streamLogsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    await deploymentService.streamLogs(id, req, res);
  } catch (err) {
    next(err);
  }
};
