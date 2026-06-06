import { getRabbitMQChannel } from "./connection";
import { DEPLOYMENTS_EXCHANGE, type DeploymentRoutingKey } from "./topics";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";
import type { DeploymentRequestedEvent } from "../../shared/types";

const logger = createLogger(SERVICE_NAME);

export function publishToExchange(
  routingKey: DeploymentRoutingKey,
  payload: unknown,
  requestId?: string
): void {
  const channel = getRabbitMQChannel();

  channel.publish(
    DEPLOYMENTS_EXCHANGE,
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    {
      persistent: true,
      contentType: "application/json",
      timestamp: Date.now(),
      appId: SERVICE_NAME,
      headers: {
        "x-request-id": requestId ?? "",
        "x-service": SERVICE_NAME,
      },
    }
  );

  logger.info("rabbitmq_message_published", {
    event: "rabbitmq_message_published",
    service: SERVICE_NAME,
    routingKey,
    requestId,
  });
}

export async function publishDeploymentRequested(
  event: DeploymentRequestedEvent
): Promise<void> {
  await publishToExchange(
    "deployment.requested.topic",
    event,
    event.requestId
  );
}