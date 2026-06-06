import client from "prom-client";
import { brimbleRegistry } from "./metrics";
const deploymentCreatedCounter = new client.Counter({
  name: "brimble_deployment_created_total",
  help: "Deployments successfully created",
  registers: [brimbleRegistry],
  labelNames: ["source_type"],
});

const deploymentConflictCounter = new client.Counter({
  name: "brimble_deployment_conflict_total",
  help: "Deployment name conflicts",
  registers: [brimbleRegistry],
});

const deploymentPublishErrorCounter = new client.Counter({
  name: "brimble_deployment_publish_errors_total",
  help: "Failures publishing deployment.requested after DB create",
  registers: [brimbleRegistry],
});

const deploymentNotFoundCounter = new client.Counter({
  name: "brimble_deployment_not_found_total",
  help: "getDeployment calls that resulted in NotFoundError",
  registers: [brimbleRegistry],
});

export { deploymentConflictCounter, deploymentCreatedCounter, deploymentPublishErrorCounter, deploymentNotFoundCounter };
