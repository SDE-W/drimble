import { client } from "./client";
import type { IDeploymentLog, PaginatedResult, LogPhase } from "../types";

export interface GetDeploymentLogsParams {
  deploymentId: string;
  phase?: LogPhase;
  page?: number;
  limit?: number;
}

export async function getDeploymentLogs(
  params: GetDeploymentLogsParams
): Promise<PaginatedResult<IDeploymentLog>> {
  const query = new URLSearchParams();
  query.set("deploymentId", params.deploymentId);
  if (params.phase) query.set("phase", params.phase);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  return client.get<PaginatedResult<IDeploymentLog>>(
    `/api/v1/deployment-logs?${query.toString()}`
  );
}

export async function getLogCount(deploymentId: string): Promise<number> {
  const res = await client.get<{ deploymentId: string; count: number }>(
    `/api/v1/deployment-logs/count?deploymentId=${deploymentId}`
  );
  return res.count;
}