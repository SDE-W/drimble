export const SERVICE_NAME = "brimble-api";

export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const PORT = Number(process.env.PORT ?? 3000);
export const DATABASE_URL = process.env.DATABASE_URL ?? "";
export const REDIS_URL = process.env.REDIS_URL ?? "redis://redis:6379";
export const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "";
export const CADDY_ADMIN_URL = process.env.CADDY_ADMIN_URL ?? "http://caddy:2019";
export const WORKSPACES_DIR = process.env.WORKSPACES_DIR ?? "/app/workspaces";
export const METRICS_PORT = Number(process.env.METRICS_PORT ?? 9464);

// topology
export const RABBITMQ_CONFIG = {
  EXCHANGES: {
    DEPLOYMENTS: "brimble.deployments.exchange",
    DEPLOYMENTS_DLX: "brimble.deployments.dlx",
  },
  ROUTING_KEYS: {
    DEPLOYMENT_REQUESTED: "deployment.requested.topic",
    DEPLOYMENT_COMPLETED: "deployment.completed.topic",
    DEPLOYMENT_FAILED: "deployment.failed.topic",
    DEPLOYMENT_DEAD: "deployment.dead.topic",
  },
  QUEUES: {
    PIPELINE: "brimble.deployment.pipeline.queue",
    COMPLETED: "brimble.deployment.completed.queue",
    FAILED: "brimble.deployment.failed.queue",
    DEAD: "brimble.deployment.dead.queue",
  },
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY_MS: 1_000,
  MAX_RETRY_DELAY_MS: 30_000,
  PREFETCH: 2,
} as const;


export const PORT_RANGE = {
  MIN: 30000,
  MAX: 32000,
} as const;

// Dead letter TTL: 30 days
export const DEAD_LETTER_TTL_SECONDS = 60 * 60 * 24 * 30;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;