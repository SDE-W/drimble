import http from "http";
import { disconnectPostgres } from "./infra/config/postgres";
import { disconnectRabbitMQ } from "./infra/messaging/connection";
import { createLogger } from "./shared/utils/logger";
import { SERVICE_NAME } from "./shared/constants";
import { stopOutboxPoller } from "./shared/utils/outbox-poller";
import { trackError } from "./shared/utils/metrics";

const logger = createLogger(SERVICE_NAME);

function closeHttpServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function runShutdownSteps(): Promise<void> {
  const steps: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: "PostgreSQL",         fn: disconnectPostgres },
    { name: "RabbitMQ_Connection",   fn: disconnectRabbitMQ },
    { name: "outbox_poller",    fn: async () => { stopOutboxPoller(); } },
  ];

  for (const step of steps) {
    try {
      await step.fn();
      logger.info(`${step.name} disconnected`);
    } catch (err) {
      logger.error(`${step.name} shutdown error`, { error: err });
    }
  }
}
async function gracefulShutdown(server: http.Server, signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);
  const start = process.hrtime.bigint();

  try {
    await closeHttpServer(server);
    await runShutdownSteps();

    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info("Graceful shutdown complete", { durationMs: ms.toFixed(2) });
    process.exit(0);
  } catch (err) {
    trackError("graceful_shutdown_failed", "system", "critical");
    logger.error("Shutdown error", { error: err });
    process.exit(1);
  }
}

export function registerShutdownHooks(server: http.Server): void {
  const handler = (signal: string) => () => gracefulShutdown(server, signal);

  process.on("SIGINT",  handler("SIGINT"));
  process.on("SIGTERM", handler("SIGTERM"));

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled promise rejection", { promise, reason });
    gracefulShutdown(server, "unhandledRejection");
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err });
    gracefulShutdown(server, "uncaughtException");
  });
}