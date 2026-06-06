import { DockerError } from "../../shared/utils/error";
import Dockerode from "dockerode";

function createDockerClient(): Dockerode {
  const host = process.env.DOCKER_HOST;

  if (!host) {
    throw new DockerError(
      "DOCKER_HOST must be set. Direct socket access is not permitted.",
    );
  }

  if (host.startsWith("unix://")) {
    throw new DockerError(
      "Unix socket Docker access is forbidden in production. Use socket proxy.",
    );
  }

  const url = new URL(host);

  return new Dockerode({
    host: url.hostname,
    port: parseInt(url.port, 10),
    protocol: "http",
  });
}

export const docker = createDockerClient();
