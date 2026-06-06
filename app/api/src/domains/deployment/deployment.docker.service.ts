import { deploymentRepository } from "./deployment.repository";
import { PORT_RANGE, SERVICE_NAME } from "../../shared/constants";
import { DockerError } from "../../shared/utils/error";
import { createLogger } from "../../shared/utils/logger";
import {
  containerStartDuration,
  containerStopTotal,
} from "../../shared/utils/dockerContainerMetrics";
import { trackError } from "../../shared/utils/metrics";
import { docker } from "../../infra/docker/client";
import { getPool } from "../../infra/db/pool";

const logger = createLogger(SERVICE_NAME);

const DEPLOYMENT_NETWORK = process.env.DEPLOYMENT_NETWORK;

if (!DEPLOYMENT_NETWORK) {
  throw new Error("DEPLOYMENT_NETWORK env var is required");
}

interface RunContainerOptions {
  deploymentId: string;
  imageTag: string;
  hostPort: number;
}

class DockerService {
  async allocateHostPort(): Promise<number> {
    const PORT_MIN = 30001;
    const PORT_MAX = 32000;

    const usedPorts = new Set(await this.findAllocatedPorts());

    for (let port = PORT_MIN; port <= PORT_MAX; port++) {
      if (usedPorts.has(port)) continue;
      const isFree = await this.isPortFreeOnHost(port);
      if (isFree) {
        return port;
      }
    }

    throw new Error("No free ports available in range 30001-32000");
  }

  async findAllocatedPorts(): Promise<number[]> {
    const { rows } = await getPool().query(
      `SELECT host_port FROM deployments 
     WHERE host_port IS NOT NULL 
     AND status NOT IN ('failed', 'stopped', 'failed')`,
    );
    return rows.map((r) => r.host_port as number);
  }
  private isPortFreeOnHost(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const { createServer } = require("net") as typeof import("net");
      const server = createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "0.0.0.0");
    });
  }

  async runContainer(options: RunContainerOptions): Promise<string> {
    const { deploymentId, imageTag, hostPort } = options;
    const end = containerStartDuration.startTimer();

    try {
      const container = await docker.createContainer({
        Image: imageTag,
        name: `brimble-${deploymentId}`,
        Env: [`PORT=80`],
        ExposedPorts: { "80/tcp": {} },
        HostConfig: {
          PortBindings: {
            "80/tcp": [{ HostPort: String(hostPort) }],
          },
          RestartPolicy: { Name: "unless-stopped" },
          NetworkMode: DEPLOYMENT_NETWORK,
        },
      });

      await container.start();

      logger.info("docker_service_container_started", {
        event: "docker_service_container_started",
        service: SERVICE_NAME,
        deploymentId,
        containerId: container.id.slice(0, 12),
        hostPort,
      });

      end({ status: "success" });
      return container.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      end({ status: "error" });
      trackError(
        "container_start_failed",
        "run_container",
        options.deploymentId,
        "high",
      );

      logger.error("docker_service_run_failed", {
        event: "docker_service_run_failed",
        service: SERVICE_NAME,
        deploymentId,
        error: message,
      });

      throw new DockerError(message, { deploymentId, imageTag, hostPort });
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    try {
      containerStopTotal.inc({ status: "success" });
      const container = docker.getContainer(containerId);
      await container.stop();
      await container.remove();

      logger.info("docker_service_container_stopped", {
        event: "docker_service_container_stopped",
        service: SERVICE_NAME,
        containerId: containerId.slice(0, 12),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      containerStopTotal.inc({ status: "error" });
      trackError(
        "container_stop_failed",
        "stop_container",
        containerId,
        "medium",
      );

      logger.error("docker_service_stop_failed", {
        event: "docker_service_stop_failed",
        service: SERVICE_NAME,
        containerId,
        error: message,
      });

      throw new DockerError(message, { containerId });
    }
  }
}

export const dockerService = new DockerService();
