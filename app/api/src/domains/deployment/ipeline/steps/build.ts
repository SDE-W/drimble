import { spawn } from "child_process";
import type { LogWriter } from "../log-writer";
import { PipelineError } from "../../../../shared/utils/error";

export async function buildStep(
  deploymentId: string,
  workDir: string,
  log: LogWriter,
): Promise<string> {
  const imageTag = `brimble/${deploymentId}:latest`;

  log(`Building image: ${imageTag}`, "build");

  return new Promise((resolve, reject) => {
    const proc = spawn(
      "railpack",
      [
        "build",
        "--name",
        imageTag,
        "--build-cmd",
        "npm install && npm run build",
        // "--build-arg", `VITE_API_URL=https://your-api-domain.com`,
        workDir,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    proc.stdout.on("data", (chunk: Buffer) => {
      chunk
        .toString()
        .split("\n")
        .filter(Boolean)
        .forEach((line) => log(line, "build"));
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      chunk
        .toString()
        .split("\n")
        .filter(Boolean)
        .forEach((line) => log(line, "build"));
    });

    proc.on("error", (err) => {
      log(`Build process error: ${err.message}`, "build");
      reject(new PipelineError(err.message, deploymentId, "build"));
    });

    proc.on("close", (code) => {
      if (code === 0) {
        log(`Build succeeded: ${imageTag}`, "build");
        resolve(imageTag);
      } else {
        const message = `railpack exited with code ${code}`;
        log(message, "build");
        reject(new PipelineError(message, deploymentId, "build"));
      }
    });
  });
}
