import { deploymentLogRepository } from "./deployment-log.repository";
import { deploymentRepository } from "../deployment/deployment.repository";
import { NotFoundError } from "../../shared/utils/error";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import type { IDeploymentLog, LogPhase, PaginatedResult } from "../../shared/types";

const logger = createLogger(SERVICE_NAME);

interface GetLogsOptions {
  deploymentId: string;
  phase?: LogPhase;
  page: number;
  limit: number;
}

const DOMAIN = "deployment-log";

class DeploymentLogService {
  async getLogs(options: GetLogsOptions): Promise<PaginatedResult<IDeploymentLog>> {
    const { deploymentId, phase, page, limit } = options;

    const deployment = await deploymentRepository.findById(deploymentId);
    if (!deployment) {
      throw new NotFoundError("Deployment", deploymentId);
    }
    const allLogs = await deploymentLogRepository.findByDeploymentId(
      deploymentId,
      phase,
    );

    const totalCount = allLogs.length;
    const start = (page - 1) * limit;
    const data = allLogs.slice(start, start + limit);

    logger.info("deployment_log_service_fetched", {
      event: "deployment_log_service_fetched",
      service: SERVICE_NAME,
      domain: DOMAIN,
      deploymentId,
      phase: phase ?? "all",
      totalCount,
      returned: data.length,
      page,
      limit,
    });

    return { data, totalCount, page, limit };
  }

  async getCount(deploymentId: string): Promise<number> {
    const deployment = await deploymentRepository.findById(deploymentId);
    if (!deployment) {
      throw new NotFoundError("Deployment", deploymentId);
    }

    return deploymentLogRepository.countByDeploymentId(deploymentId);
  }
}

export const deploymentLogService = new DeploymentLogService();