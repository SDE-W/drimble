import type { LogWriter } from "../log-writer";
import { caddyService } from "../../deployment.caddy.service";
import { PipelineError } from "../../../../shared/utils/error";

export async function registerStep(
  deploymentId: string,
  hostPort: number,
  log: LogWriter
): Promise<string> {
  try {
    log(`Registering Caddy route for /deploy/${deploymentId}/*`, "register");

    const url = await caddyService.registerRoute(deploymentId, hostPort);

    log(`Route registered: ${url}`, "register");

    return url;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Register failed: ${message}`, "register");
    throw new PipelineError(message, deploymentId, "register");
  }
}