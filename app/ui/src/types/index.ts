export type DeploymentStatus =
  | "pending"
  | "building"
  | "deploying"
  | "running"
  | "failed";

export type DeploymentSource = "git" | "upload";

export type DetailTab = "overview" | "logs" | "details";

export const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "logs", label: "Build Logs" },
  { id: "details", label: "Details" },
];

export type LogPhase =
  | "clone"
  | "build"
  | "run"
  | "register"
  | "system";

export type JobType =
  | "DEPLOYMENT"
  | "RESERVATION_EXPIRY"
  | "PAYOUT_BATCH"
  | "ORDER_ABANDONMENT"
  | "LOW_STOCK_ALERT"
  | "SCHEDULED_REPORT";

export interface IDeployment {
  id: string;
  name?: string;
  sourceType: DeploymentSource;
  sourceRef: string;
  status: DeploymentStatus;
  imageTag?: string;
  containerId?: string;
  hostPort?: number;
  url?: string;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDeploymentLog {
  id: string;
  deploymentId: string;
  seq: number;
  ts: string;
  line: string;
  phase: LogPhase;
}

export interface IDeadLetterError {
  attempt: number;
  error: string;
  stack?: string;
  occurredAt: string;
}

export interface IDeadLetter {
  id: string;
  jobId: string;
  jobType: JobType;
  tenantId: string;
  payload: Record<string, unknown>;
  attempts: number;
  errors: IDeadLetterError[];
  deadAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  expiresAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface CreateDeploymentPayload {
  sourceType: DeploymentSource;
  sourceRef: string;
  name?: string;
}

export interface CreateDeploymentResponse {
  id: string;
  name?: string;
  sourceType: DeploymentSource;
  sourceRef: string;
  status: DeploymentStatus;
  createdAt: string;
}

export interface ApiError {
  error: string;
  statusCode: number;
}


