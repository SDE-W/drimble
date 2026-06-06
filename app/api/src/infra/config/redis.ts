import Redis from "ioredis";
import logger from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";

const MAX_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

const REQUIRED_ENV = ["REDIS_PASSWORD", "REDIS_HOST", "REDIS_URL"] as const;

let redisClient: Redis | null = null;
let isReady = false;

export function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(
        `Missing required env var: ${key}. Redis connection refused.`,
      );
    }
  }

  const client = new Redis(url!, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    password: process.env.REDIS_PASSWORD,
    retryStrategy(attempt: number): number | null {
      if (attempt >= MAX_RETRIES) {
        logger.error("redis_retry_exhausted", {
          event: "redis_retry_exhausted",
          service: SERVICE_NAME,
          attempt,
        });
        return null;
      }
      const delay = Math.min(
        BASE_RETRY_DELAY_MS * Math.pow(2, attempt),
        MAX_RETRY_DELAY_MS,
      );
      const jitter = Math.random() * 500;
      logger.warn("redis_retry_attempt", {
        event: "redis_retry_attempt",
        service: SERVICE_NAME,
        attempt,
        delayMs: Math.floor(delay + jitter),
      });
      return Math.floor(delay + jitter);
    },
  });

  client.on("connect", () => {
    logger.info("redis_connecting", {
      event: "redis_connecting",
      service: SERVICE_NAME,
    });
  });

  client.on("ready", () => {
    isReady = true;
    logger.info("redis_ready", {
      event: "redis_ready",
      service: SERVICE_NAME,
    });
  });

  client.on("error", (error: Error) => {
    isReady = false;
    logger.error("redis_error", {
      event: "redis_error",
      service: SERVICE_NAME,
      error: error.message,
    });
  });

  client.on("close", () => {
    isReady = false;
    logger.warn("redis_connection_closed", {
      event: "redis_connection_closed",
      service: SERVICE_NAME,
    });
  });

  client.on("reconnecting", () => {
    logger.warn("redis_reconnecting", {
      event: "redis_reconnecting",
      service: SERVICE_NAME,
    });
  });

  client.on("end", () => {
    isReady = false;
    logger.warn("redis_connection_ended", {
      event: "redis_connection_ended",
      service: SERVICE_NAME,
    });
  });

  return client;
}

export async function connectRedis(): Promise<Redis> {
  if (redisClient && isReady) {
    return redisClient;
  }

  redisClient = createRedisClient();
  await redisClient.connect();

  let [seconds] = await redisClient.time();
  logger.info("redis_connected", {
    event: "redis_connected",
    service: SERVICE_NAME,
    redisServerTimeMs: parseInt(String(seconds), 10) * 1000,
    localTimeMs: Date.now(),
    clockOffsetMs: Date.now() - parseInt(String(seconds), 10) * 1000,
  });

  return redisClient;
}

export async function getRedisClient(): Promise<Redis> {
  if (!redisClient || !isReady) {
    return connectRedis();
  }
  return redisClient;
}

export function getRedisClientSync(): Redis {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call connectRedis() first.");
  }
  return redisClient;
}

export function isRedisReady(): boolean {
  return isReady;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isReady = false;
    logger.info("redis_disconnected_gracefully", {
      event: "redis_disconnected_gracefully",
      service: SERVICE_NAME,
    });
  }
}

export async function getRedisServerTimeMs(): Promise<number> {
  const client = await getRedisClient();
  const [seconds, microseconds] = await client.time();
  return (
    parseInt(String(seconds), 10) * 1_000 +
    Math.floor(parseInt(String(microseconds)) / 1_000)
  );
}
