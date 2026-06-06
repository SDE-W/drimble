import { client } from "./client";
import type {
  IDeployment,
  CreateDeploymentPayload,
  CreateDeploymentResponse,
} from "../types";

export async function listDeployments(): Promise<IDeployment[]> {
  return client.get<IDeployment[]>("/api/v1/deployments");
}

export async function getDeployment(id: string): Promise<IDeployment> {
  return client.get<IDeployment>(`/api/v1/deployments/${id}`);
}

export async function createDeployment(
  payload: CreateDeploymentPayload
): Promise<CreateDeploymentResponse> {
  return client.post<CreateDeploymentResponse>("/api/v1/deployments", payload);
}
