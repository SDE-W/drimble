import axios, { AxiosError } from "axios";
import { CADDY_ADMIN_URL } from "../../shared/constants";
import { CaddyError } from "../../shared/utils/error";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";

const logger = createLogger(SERVICE_NAME);

interface CaddyRoute {
  "@id": string;
  match: Array<{
    path?: string[];
    host?: string[];
  }>;
  handle: Array<{
    handler: string;
    upstreams?: Array<{ dial: string }>;
    routes?: Array<{
      handle: Array<{
        handler: string;
        strip_path_prefix?: string;
        upstreams?: Array<{ dial: string }>;
      }>;
    }>;
  }>;
}

class CaddyService {
private buildRoute(deploymentId: string, hostPort: number): CaddyRoute {
  return {
    "@id": `dep_${deploymentId}`,
    match: [{ path: [`/deploy/${deploymentId}/*`] }],
    handle: [
      {
        handler: "subroute",
        routes: [
          {
            handle: [
              {
                handler: "rewrite",
                strip_path_prefix: `/deploy/${deploymentId}`,
              },
              {
                handler: "reverse_proxy",
                upstreams: [{ dial: `host.docker.internal:${hostPort}` }],
              },
            ],
          },
        ],
      },
    ],
  };
}

private buildDeploymentUrl(deploymentId: string): string {
  return `http://${deploymentId}.localhost`;
}

  async registerRoute(
    deploymentId: string,
    hostPort: number
  ): Promise<string> {
    const route = this.buildRoute(deploymentId, hostPort);

    await this.removeRoute(deploymentId).catch(() => {
    });

    try {
      const serversResp = await axios.get(
        `${CADDY_ADMIN_URL}/config/apps/http/servers`,
        { headers: { "Content-Type": "application/json" } }
      );

      const servers = serversResp.data as Record<string, unknown>;
      const serverKey = this.findServerKeyByPort(servers, "80");

      if (!serverKey) {
        throw new CaddyError("No Caddy server found listening on port 80", {
          deploymentId,
        });
      }

      
await axios.post(
  `${CADDY_ADMIN_URL}/config/apps/http/servers/${serverKey}/routes/0`,
  route,
  { headers: { "Content-Type": "application/json" } }
);

      const url = this.buildDeploymentUrl(deploymentId);

      logger.info("caddy_service_route_registered", {
        event: "caddy_service_route_registered",
        service: SERVICE_NAME,
        deploymentId,
        hostPort,
        url,
        serverKey,
      });

      return url;
    } catch (err) {
      if (err instanceof CaddyError) throw err;
      const message = err instanceof Error ? err.message : String(err);

      logger.error("caddy_service_register_failed", {
        event: "caddy_service_register_failed",
        service: SERVICE_NAME,
        deploymentId,
        error: message,
      });

      throw new CaddyError(message, { deploymentId, hostPort });
    }
  }

  async removeRoute(deploymentId: string): Promise<void> {
    const routeId = `dep_${deploymentId}`;

    try {
      await axios.delete(`${CADDY_ADMIN_URL}/id/${routeId}`, {
        headers: { "Content-Type": "application/json" },
      });

      logger.info("caddy_service_route_removed", {
        event: "caddy_service_route_removed",
        service: SERVICE_NAME,
        deploymentId,
      });
    } catch (err) {
      const axiosErr = err as AxiosError;

      if (axiosErr.response?.status === 404) {
        return;
      }

      const message = err instanceof Error ? err.message : String(err);

      logger.error("caddy_service_remove_failed", {
        event: "caddy_service_remove_failed",
        service: SERVICE_NAME,
        deploymentId,
        error: message,
      });

      throw new CaddyError(message, { deploymentId });
    }
  }

  async restoreRoutes(
    deployments: Array<{ deploymentId: string; hostPort: number }>
  ): Promise<void> {
    if (deployments.length === 0) return;

    logger.info("caddy_service_restoring_routes", {
      event: "caddy_service_restoring_routes",
      service: SERVICE_NAME,
      count: deployments.length,
    });

    const results = await Promise.allSettled(
      deployments.map((d) => this.registerRoute(d.deploymentId, d.hostPort))
    );

    const failed = results.filter((r) => r.status === "rejected");
    const succeeded = results.filter((r) => r.status === "fulfilled");

    logger.info("caddy_service_routes_restored", {
      event: "caddy_service_routes_restored",
      service: SERVICE_NAME,
      succeeded: succeeded.length,
      failed: failed.length,
    });

    if (failed.length > 0) {
      logger.error("caddy_service_restore_partial_failure", {
        event: "caddy_service_restore_partial_failure",
        service: SERVICE_NAME,
        errors: failed.map((r) =>
          r.status === "rejected" ? String(r.reason) : ""
        ),
      });
    }
  }

  private findServerKeyByPort(
    servers: Record<string, unknown>,
    port: string
  ): string | null {
    for (const [key, server] of Object.entries(servers)) {
      const s = server as { listen?: string[] };
      if (s.listen?.some((l) => l.includes(`:${port}`))) {
        return key;
      }
    }
    return null;
  }
}

export const caddyService = new CaddyService();