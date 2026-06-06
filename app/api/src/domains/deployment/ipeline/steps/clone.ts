import { spawn } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import type { LogWriter } from "../log-writer";
import { WORKSPACES_DIR } from "../../../../shared/constants";
import { PipelineError } from "../../../../shared/utils/error";

export async function cloneStep(
  deploymentId: string,
  sourceType: string,
  sourceRef: string,
  log: LogWriter,
): Promise<string> {
  const workDir = path.join(WORKSPACES_DIR, deploymentId);

  if (existsSync(workDir)) {
    rmSync(workDir, { recursive: true, force: true });
  }
  mkdirSync(workDir, { recursive: true });

  try {
    if (sourceType === "git") {
      log(`Cloning your git repository: ${sourceRef}`, "clone");

      await new Promise<void>((resolve, reject) => {
        const proc = spawn("git", ["clone", "--depth=1", sourceRef, workDir], {
          stdio: ["ignore", "pipe", "pipe"],
        });

        proc.stdout.on("data", (chunk: Buffer) =>
          chunk
            .toString()
            .split("\n")
            .filter(Boolean)
            .forEach((l) => log(l, "clone")),
        );
        proc.stderr.on("data", (chunk: Buffer) =>
          chunk
            .toString()
            .split("\n")
            .filter(Boolean)
            .forEach((l) => log(l, "clone")),
        );
        proc.on("error", reject);
        proc.on("close", (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`git clone exited with code ${code}`)),
        );
      });

      log("Cloning step has been completed", "clone");
    } else {
      log(`Using uploaded source at ${sourceRef}`, "clone");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Clone failed: ${message}`, "clone");
    throw new PipelineError(message, deploymentId, "clone");
  }

  return workDir;
}
