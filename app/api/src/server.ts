import http from "http";
import { app } from "./app";
import { bootStrap } from "./bootStrap";
import { registerShutdownHooks } from "./shutdown";
import { createLogger } from "./shared/utils/logger";
import { SERVICE_NAME, PORT } from "./shared/constants";
import { brimbleRegistry } from "./shared/utils/metrics";

const logger = createLogger(SERVICE_NAME);

async function main(): Promise<void> {
  await bootStrap();

  const server = app.listen(PORT, () => {
    logger.info("server has started succesfully!", {
      event: "server_started",
      service: SERVICE_NAME,
      port: PORT,
    });
  });

  const metricsServer = http.createServer(async (_req, res) => {
    try {
      res.setHeader("Content-Type", brimbleRegistry.contentType);
      res.end(await brimbleRegistry.metrics());
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });

  metricsServer.listen(9464, () => {
    logger.info("metrics_server_started", {
      event: "metrics_server_started",
      service: SERVICE_NAME,
      port: 9464,
    });
  });

  registerShutdownHooks(server);
}

main().catch((err) => {
  logger.error("startup_failed", {
    event: "startup_failed",
    service: SERVICE_NAME,
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});