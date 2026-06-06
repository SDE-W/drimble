import type { Redis } from "ioredis";
import { getRedisClientSync } from "../config/redis";
import { PubSubChannels } from "./pubsub.channel";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";

const logger = createLogger(SERVICE_NAME);

export type LogMessageHandler = (rawJson: string) => void;

export interface LogSubscription {
  unsubscribe: () => Promise<void>;
}

export async function subscribeToDeploymentLogs(
  deploymentId: string,
  onMessage: LogMessageHandler,
): Promise<LogSubscription> {
  const channel = PubSubChannels.deploymentLogs(deploymentId);
  const subscriber: Redis = getRedisClientSync().duplicate();

  subscriber.on("error", (err: Error) => {
    logger.warn("log_subscriber_error", {
      event: "log_subscriber_error",
      service: SERVICE_NAME,
      deploymentId,
      channel,
      error: err.message,
    });
  });

  subscriber.on("message", (receivedChannel: string, message: string) => {
    if (receivedChannel === channel) {
      onMessage(message);
    }
  });

  await subscriber.subscribe(channel);

  logger.info("log_subscriber_connected", {
    event: "log_subscriber_connected",
    service: SERVICE_NAME,
    deploymentId,
    channel,
  });

  return {
    unsubscribe: async () => {
      try {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
        logger.info("log_subscriber_disconnected", {
          event: "log_subscriber_disconnected",
          service: SERVICE_NAME,
          deploymentId,
          channel,
        });
      } catch (err) {
        logger.warn("log_subscriber_unsubscribe_error", {
          event: "log_subscriber_unsubscribe_error",
          service: SERVICE_NAME,
          deploymentId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
