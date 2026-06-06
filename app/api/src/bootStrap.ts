import { connectPostgres } from "./infra/config/postgres";
import { connectRabbitMQ } from "./infra/messaging/connection";
import { connectDeploymentConsumer } from "./infra/messaging/consumers/deployment.consumer";
import { createLogger } from "./shared/utils/logger";
import { SERVICE_NAME, DATABASE_URL } from "./shared/constants";
import { startOutboxPoller } from "./shared/utils/outbox-poller";

const logger = createLogger(SERVICE_NAME);


const buildInitSteps: Array<{ name: string; fn: () => Promise<void> }> = [
  {
    name: "PostgreSQL",
    fn: () => connectPostgres(DATABASE_URL),
  },
  {
    name: "RabbitMQ Connection",
    fn: () => connectRabbitMQ(),
  },
  {
    name: "Deployment Consumer",
    fn: () => connectDeploymentConsumer(),
  },
  {
    name: "Outbox Poller",
    fn: async () => { startOutboxPoller(); },
  },
];

export async function bootStrap(): Promise<void> {
  for (const step of buildInitSteps) {
    try {
      await step.fn();
      logger.info(`${step.name} has been initialized successfully!`, {
        event: `${step.name}_started`,
        service: SERVICE_NAME,
      });
    } catch (error) {
      logger.error(`${step.name} failed to initialize`, {
        event: `${step.name}_failed_startup`,
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}