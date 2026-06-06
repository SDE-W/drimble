import { client } from "./client";
import type { IDeadLetter, JobType, PaginatedResult } from "../types";

export interface ListDeadLettersParams {
  tenantId?: string;
  jobType?: JobType;
  page?: number;
  limit?: number;
}

export async function listDeadLetters(
  params: ListDeadLettersParams = {}
): Promise<PaginatedResult<IDeadLetter>> {
  const query = new URLSearchParams();
  if (params.tenantId) query.set("tenantId", params.tenantId);
  if (params.jobType) query.set("jobType", params.jobType);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  return client.get<PaginatedResult<IDeadLetter>>(
    `/api/v1/dead-letters?${query.toString()}`
  );
}

export async function getDeadLetter(jobId: string): Promise<IDeadLetter> {
  return client.get<IDeadLetter>(`/api/v1/dead-letters/${jobId}`);
}

export async function resolveDeadLetter(
  jobId: string,
  resolution: string
): Promise<IDeadLetter> {
  return client.patch<IDeadLetter>(`/api/v1/dead-letters/${jobId}/resolve`, {
    resolution,
  });
}