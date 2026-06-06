import IORedisMock from "ioredis-mock";
import { jest, beforeEach, beforeAll, afterAll } from "@jest/globals";

jest.mock("../../infra/config/redis", () => {
  const IORedisMock = require("ioredis-mock");
  const instance = new IORedisMock();
  return {
    getRedisClientSync: jest.fn(() => instance),
    getRedisClient: jest.fn(async () => instance),
    connectRedis: jest.fn(async () => instance),
    disconnectRedis: jest.fn(async () => undefined),
    isRedisReady: jest.fn(() => true),
    getRedisServerTimeMs: jest.fn(async () => Date.now()),
  };
});

// RabbitMQ mock
jest.mock("../../infra/messaging/connection", () => ({
  connectRabbitMQ: jest.fn(async () => undefined),
  disconnectRabbitMQ: jest.fn(async () => undefined),
  getRabbitMQChannel: jest.fn(() => ({
    publish: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
    prefetch: jest.fn(),
  })),
}));

jest.mock("../../infra/messaging/consumers/deployment.consumer", () => ({
  connectDeploymentConsumer: jest.fn(async () => undefined),
}));

// Outbox mock
jest.mock("../../domains/outbox/outbox.repository", () => ({
  outboxRepository: {
    create: jest.fn(async () => undefined),
  },
}));

// Outbox poller mock
jest.mock("../../shared/utils/outbox-poller", () => ({
  startOutboxPoller: jest.fn(),
  stopOutboxPoller: jest.fn(),
}));

// RabbitMQ producer mock
jest.mock("../../infra/messaging/producer", () => ({
  publishDeploymentRequested: jest.fn(async () => undefined),
  publishToExchange: jest.fn(),
}));

// Deployment event bus mock
jest.mock("../../domains/deployment/events/bus", () => ({
  deploymentEventBus: {
    onLog: jest.fn(() => jest.fn()),
    onStatus: jest.fn(() => jest.fn()),
    emitLog: jest.fn(),
    emitStatus: jest.fn(),
  },
}));

import { initPool, closePool, getPool } from "../../infra/db/pool";
 
const TABLES_TO_TRUNCATE = [
  "deployment_logs",
  "dead_letters",
  "outbox",
  "deployments",
];
 
if (process.env.TEST_DATABASE_URL) {
  beforeAll(async () => {
    await initPool(process.env.TEST_DATABASE_URL!);
  });
 
  beforeEach(async () => {
    const pool = getPool();
    await pool.query(
      `TRUNCATE TABLE ${TABLES_TO_TRUNCATE.join(", ")} RESTART IDENTITY CASCADE`,
    );
  });
 
  afterAll(async () => {
    await closePool();
  });
}