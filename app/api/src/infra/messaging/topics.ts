import { RABBITMQ_CONFIG } from "../../shared/constants";

export const DEPLOYMENTS_EXCHANGE = RABBITMQ_CONFIG.EXCHANGES.DEPLOYMENTS;
export const DEPLOYMENTS_DLX = RABBITMQ_CONFIG.EXCHANGES.DEPLOYMENTS_DLX;

export const ROUTING_KEYS = {
  DEPLOYMENT_REQUESTED: "deployment.requested.topic",
  DEPLOYMENT_COMPLETED: "deployment.completed.topic",
  DEPLOYMENT_FAILED: "deployment.failed.topic",
  DEPLOYMENT_DEAD: "deployment.dead.topic",
} as const;

export type DeploymentRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {
  [ROUTING_KEYS.DEPLOYMENT_REQUESTED]: "brimble.deployment.pipeline.queue",
  [ROUTING_KEYS.DEPLOYMENT_COMPLETED]: "brimble.deployment.completed.queue",
  [ROUTING_KEYS.DEPLOYMENT_FAILED]: "brimble.deployment.failed.queue",
  [ROUTING_KEYS.DEPLOYMENT_DEAD]: "brimble.deployment.dead.queue",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export interface QueueTopology {
  queue: string;
  exchange: string;
  routingKey: string;
  options: {
    durable: boolean;
    arguments?: Record<string, unknown>;
  };
}

export const QUEUE_TOPOLOGY: QueueTopology[] = [
  {
    queue: QUEUES[ROUTING_KEYS.DEPLOYMENT_REQUESTED],
    exchange: DEPLOYMENTS_EXCHANGE,
    routingKey: ROUTING_KEYS.DEPLOYMENT_REQUESTED,
    options: {
      durable: true,
      arguments: {
        "x-queue-type": "quorum",
        "x-delivery-limit": RABBITMQ_CONFIG.MAX_RETRIES,
        "x-dead-letter-exchange": DEPLOYMENTS_DLX,
        "x-dead-letter-routing-key": ROUTING_KEYS.DEPLOYMENT_DEAD,
      },
    },
  },
  {
    queue: QUEUES[ROUTING_KEYS.DEPLOYMENT_COMPLETED],
    exchange: DEPLOYMENTS_EXCHANGE,
    routingKey: ROUTING_KEYS.DEPLOYMENT_COMPLETED,
    options: {
      durable: true,
      arguments: { "x-queue-type": "quorum" },
    },
  },
  {
    queue: QUEUES[ROUTING_KEYS.DEPLOYMENT_FAILED],
    exchange: DEPLOYMENTS_EXCHANGE,
    routingKey: ROUTING_KEYS.DEPLOYMENT_FAILED,
    options: {
      durable: true,
      arguments: {
        "x-queue-type": "quorum",
        "x-delivery-limit": RABBITMQ_CONFIG.MAX_RETRIES,
        "x-dead-letter-exchange": DEPLOYMENTS_DLX,
        "x-dead-letter-routing-key": ROUTING_KEYS.DEPLOYMENT_DEAD,
      },
    },
  },
  {
    queue: QUEUES[ROUTING_KEYS.DEPLOYMENT_DEAD],
    exchange: DEPLOYMENTS_DLX,
    routingKey: ROUTING_KEYS.DEPLOYMENT_DEAD,
    options: {
      durable: true,
      arguments: { "x-queue-type": "quorum" },
    },
  },
];