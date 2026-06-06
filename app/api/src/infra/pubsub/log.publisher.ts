
import { getRedisClientSync } from "../config/redis";
import { PubSubChannels } from "./pubsub.channel";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import type { IDeploymentLog } from "../../shared/types";

const logger = createLogger(SERVICE_NAME);

/**
 * @param log 
 */
export async function publishLog(log: IDeploymentLog): Promise<void> {
  try {
    const channel = PubSubChannels.deploymentLogs(log.deploymentId);
    const payload = JSON.stringify(log);
    await getRedisClientSync().publish(channel, payload);
  } catch (err) {
    logger.warn("log_publish_failed", {
      event: "log_publish_failed",
      service: SERVICE_NAME,
      deploymentId: log.deploymentId,
      seq: log.seq,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function publishManyLogs(logs: IDeploymentLog[]): Promise<void> {
  if (logs.length === 0) return;

  try {
    const redis = getRedisClientSync();
    const pipeline = redis.pipeline();
    for (const log of logs) {
      const channel = PubSubChannels.deploymentLogs(log.deploymentId);
      pipeline.publish(channel, JSON.stringify(log));
    }
    await pipeline.exec();
  } catch (err) {
    logger.warn("log_publish_many_failed", {
      event: "log_publish_many_failed",
      service: SERVICE_NAME,
      deploymentId: logs[0].deploymentId,
      count: logs.length,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}