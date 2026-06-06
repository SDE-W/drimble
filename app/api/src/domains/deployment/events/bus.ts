import { EventEmitter } from "events";
import type { LogEvent, StatusEvent, DeploymentStatus } from "../../../shared/types";

class DeploymentEventBus extends EventEmitter {
  private static instance: DeploymentEventBus;

  private constructor() {
    super();
    this.setMaxListeners(200);
  }

  static getInstance(): DeploymentEventBus {
    if (!DeploymentEventBus.instance) {
      DeploymentEventBus.instance = new DeploymentEventBus();
    }
    return DeploymentEventBus.instance;
  }

  emitLog(event: LogEvent): void {
    this.emit(`log:${event.deploymentId}`, event);
  }

  emitStatus(deploymentId: string, status: DeploymentStatus): void {
    const event: StatusEvent = { type: "status", deploymentId, status };
    this.emit(`status:${deploymentId}`, event);
  }

  onLog(
    deploymentId: string,
    handler: (event: LogEvent) => void
  ): () => void {
    const key = `log:${deploymentId}`;
    this.on(key, handler);
    return () => this.off(key, handler);
  }

  onStatus(
    deploymentId: string,
    handler: (event: StatusEvent) => void
  ): () => void {
    const key = `status:${deploymentId}`;
    this.on(key, handler);
    return () => this.off(key, handler);
  }
}

export const deploymentEventBus = DeploymentEventBus.getInstance();