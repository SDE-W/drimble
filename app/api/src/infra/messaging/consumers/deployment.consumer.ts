import type { ConsumeMessage, Channel } from "amqplib";
import { getRabbitMQChannel } from "../connection";
import { QUEUES, ROUTING_KEYS } from "../topics";
import { createLogger } from "../../../shared/utils/logger";
import { SERVICE_NAME, RABBITMQ_CONFIG } from "../../../shared/constants";
import { deploymentRepository } from "../../../domains/deployment/deployment.repository";
import { deadLetterService } from "../../../domains/dead-letter/dead-letter.service";
import type {
  DeploymentCompletedEvent,
  DeploymentFailedEvent,
  DeploymentRequestedEvent,
} from "../../../shared/types";
import { PipelineRunner } from "../../../domains/deployment/ipeline/runner";


const logger = createLogger(SERVICE_NAME);

const topicHandlers: Record<
  string,
  (data: unknown, channel: Channel, msg: ConsumeMessage) => Promise<void>
> = {
  [ROUTING_KEYS.DEPLOYMENT_REQUESTED]: handleDeploymentRequested,
  [ROUTING_KEYS.DEPLOYMENT_COMPLETED]: handleDeploymentCompleted,
  [ROUTING_KEYS.DEPLOYMENT_FAILED]: handleDeploymentFailed,
  [ROUTING_KEYS.DEPLOYMENT_DEAD]: handleDeploymentDead,
};

async function handleDeploymentRequested(
  data: unknown,
  channel: Channel,
  msg: ConsumeMessage
): Promise<void> {
  const event = data as DeploymentRequestedEvent;
  const { deploymentId, sourceType, sourceRef, requestId } = event;

  const attempts = await deploymentRepository.incrementAttempts(deploymentId);

  logger.info("deployment_handler_received", {
    event: "deployment_handler_received",
    service: SERVICE_NAME,
    deploymentId,
    attempt: attempts,
    requestId,
  });

  try {
    const runner = new PipelineRunner(deploymentId);
    await runner.run(sourceType, sourceRef);
    channel.ack(msg);

    logger.info("deployment_handler_acked", {
      event: "deployment_handler_acked",
      service: SERVICE_NAME,
      deploymentId,
      attempt: attempts,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error("deployment_handler_failed", {
      event: "deployment_handler_failed",
      service: SERVICE_NAME,
      deploymentId,
      attempt: attempts,
      error: errorMessage,
    });

    if (attempts >= RABBITMQ_CONFIG.MAX_RETRIES) {
      try {
        await deadLetterService.create({
          jobId: deploymentId,
          jobType: "DEPLOYMENT",
          tenantId: "system",
          payload: { sourceType, sourceRef },
          attempts,
          lastError: errorMessage,
        });
      } catch (dlErr) {
        logger.error("deployment_dead_letter_create_failed", {
          event: "deployment_dead_letter_create_failed",
          service: SERVICE_NAME,
          deploymentId,
          error: dlErr instanceof Error ? dlErr.message : String(dlErr),
        });
      }

      logger.error("deployment_handler_dead_lettered", {
        event: "deployment_handler_dead_lettered",
        service: SERVICE_NAME,
        deploymentId,
        attempts,
      });

      channel.nack(msg, false, false);
    } else {
      logger.warn("deployment_handler_retrying", {
        event: "deployment_handler_retrying",
        service: SERVICE_NAME,
        deploymentId,
        attempt: attempts,
        nextAttempt: attempts + 1,
      });

      channel.nack(msg, false, true);
    }
  }
}

async function handleDeploymentCompleted(
  data: unknown,
  channel: Channel,
  msg: ConsumeMessage
): Promise<void> {
  const event = data as DeploymentCompletedEvent;
  const { deploymentId, requestId, imageTag, url } = event;

  try {
    await deploymentRepository.updateStatus(deploymentId, "running", {
      imageTag,
      url,
    });

    logger.info("deployment_completed", {
      event: "deployment_completed",
      service: SERVICE_NAME,
      deploymentId,
      requestId,
    });

    channel.ack(msg);
  } catch (err) {
    logger.error("deployment_completed_handler_failed", {
      event: "deployment_completed_handler_failed",
      service: SERVICE_NAME,
      deploymentId,
      error: err instanceof Error ? err.message : String(err),
    });
    channel.nack(msg, false, true);
  }
}

async function handleDeploymentDead(
  data: unknown,
  channel: Channel,
  msg: ConsumeMessage
): Promise<void> {
  const event = data as DeploymentRequestedEvent;
  const { deploymentId, requestId } = event;

  const xDeath = msg.properties.headers?.["x-death"];
  const reason = Array.isArray(xDeath) ? xDeath[0]?.reason : "unknown";
  const originalQueue = Array.isArray(xDeath) ? xDeath[0]?.queue : "unknown";

  try {
    await deploymentRepository.updateStatus(deploymentId, "failed", {
      lastError: `Dead lettered after max retries. Reason: ${reason}`,
    });

    logger.error("deployment_dead_lettered", {
      event: "deployment_dead_lettered",
      service: SERVICE_NAME,
      deploymentId,
      requestId,
      reason,
      originalQueue,
    });

    channel.ack(msg);
  } catch (err) {
    logger.error("deployment_dead_handler_failed", {
      event: "deployment_dead_handler_failed",
      service: SERVICE_NAME,
      deploymentId,
      error: err instanceof Error ? err.message : String(err),
    });
    channel.ack(msg);
  }
}

async function handleDeploymentFailed(
  data: unknown,
  channel: Channel,
  msg: ConsumeMessage
): Promise<void> {
  const event = data as DeploymentFailedEvent;
  const { deploymentId, requestId, error } = event;

  try {
    await deploymentRepository.updateStatus(deploymentId, "failed", {
      lastError: error,
    });

    logger.error("deployment_failed", {
      event: "deployment_failed",
      service: SERVICE_NAME,
      deploymentId,
      requestId,
      error,
    });

    channel.ack(msg);
  } catch (err) {
    logger.error("deployment_failed_handler_failed", {
      event: "deployment_failed_handler_failed",
      service: SERVICE_NAME,
      deploymentId,
      error: err instanceof Error ? err.message : String(err),
    });
    channel.nack(msg, false, true);
  }
}

export async function connectDeploymentConsumer(): Promise<void> {
  const channel = getRabbitMQChannel();

  channel.prefetch(RABBITMQ_CONFIG.PREFETCH);

  for (const [routingKey, queue] of Object.entries(QUEUES)) {
    const handler = topicHandlers[routingKey];

    if (!handler) {
      logger.warn("deployment_consumer_no_handler", {
        event: "deployment_consumer_no_handler",
        service: SERVICE_NAME,
        routingKey,
        queue,
      });
      continue;
    }

    await channel.consume(
      queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        let data: unknown;

        try {
          data = JSON.parse(msg.content.toString());
        } catch {
          logger.error("deployment_consumer_malformed_message", {
            event: "deployment_consumer_malformed_message",
            service: SERVICE_NAME,
            queue,
            content: msg.content.toString(),
          });
          channel.nack(msg, false, false);
          return;
        }

        await handler(data, channel, msg);
      },
      { noAck: false }
    );

    logger.info("deployment_consumer_started", {
      event: "deployment_consumer_started",
      service: SERVICE_NAME,
      queue,
      routingKey,
    });
  }
}

