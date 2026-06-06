

import { getRedisClientSync } from "../config/redis";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import {
  cacheHitsTotal,
  cacheMissesTotal,
  cacheErrorsTotal,
  cacheOperationDuration,
  cacheInvalidationsTotal,
} from "../../shared/utils/metrics";

const logger = createLogger(SERVICE_NAME);

const KEY_PREFIX = "brimble:";

function prefixed(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

function recordError(domain: string, operation: string, err: unknown): void {
  cacheErrorsTotal.inc({ domain, operation });
  logger.error("cache_error", {
    event: "cache_error",
    service: SERVICE_NAME,
    domain,
    operation,
    error: err instanceof Error ? err.message : String(err),
  });
}

//  Core operations 

export async function cacheGet(
  key: string,
  domain: string,
): Promise<string | null> {
  const stop = cacheOperationDuration.startTimer({ domain, operation: "get" });
  try {
    const value = await getRedisClientSync().get(prefixed(key));
    if (value !== null) {
      cacheHitsTotal.inc({ domain, operation: "get" });
    } else {
      cacheMissesTotal.inc({ domain, operation: "get" });
    }
    return value;
  } catch (err) {
    recordError(domain, "get", err);
    return null;
  } finally {
    stop();
  }
}

export async function cacheSet(
  key: string,
  value: string,
  domain: string,
  ttlSeconds: number,
): Promise<void> {
  const stop = cacheOperationDuration.startTimer({ domain, operation: "set" });
  try {
    await getRedisClientSync().setex(prefixed(key), ttlSeconds, value);
  } catch (err) {
    recordError(domain, "set", err);
  } finally {
    stop();
  }
}

export async function cacheDel(keys: string[], domain: string): Promise<void> {
  if (keys.length === 0) return;
  const stop = cacheOperationDuration.startTimer({ domain, operation: "del" });
  try {
    await getRedisClientSync().del(...keys.map(prefixed));
    cacheInvalidationsTotal.inc({ domain, reason: "explicit_del" });
  } catch (err) {
    recordError(domain, "del", err);
  } finally {
    stop();
  }
}

export async function cacheDelByPattern(
  pattern: string,
  domain: string,
  reason: string,
): Promise<void> {
  const stop = cacheOperationDuration.startTimer({
    domain,
    operation: "del_pattern",
  });
  try {
    const redis = getRedisClientSync();
    const fullPattern = prefixed(pattern);
    let cursor = "0";
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        fullPattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
        totalDeleted += keys.length;
      }
    } while (cursor !== "0");

    if (totalDeleted > 0) {
      cacheInvalidationsTotal.inc({ domain, reason });
      logger.info("cache_pattern_invalidated", {
        event: "cache_pattern_invalidated",
        service: SERVICE_NAME,
        domain,
        pattern: fullPattern,
        keysDeleted: totalDeleted,
        reason,
      });
    }
  } catch (err) {
    recordError(domain, "del_pattern", err);
  } finally {
    stop();
  }
}

//  JSON convenience helpers 
// Repositories deal in typed objects, not raw strings.

export async function cacheGetJson<T>(
  key: string,
  domain: string,
): Promise<T | null> {
  const raw = await cacheGet(key, domain);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    // Corrupted cache entry - treat as miss, let it be overwritten on next set
    logger.warn("cache_parse_error", {
      event: "cache_parse_error",
      service: SERVICE_NAME,
      domain,
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    cacheMissesTotal.inc({ domain, operation: "get" });
    return null;
  }
}

export async function cacheSetJson<T>(
  key: string,
  value: T,
  domain: string,
  ttlSeconds: number,
): Promise<void> {
  await cacheSet(key, JSON.stringify(value), domain, ttlSeconds);
}