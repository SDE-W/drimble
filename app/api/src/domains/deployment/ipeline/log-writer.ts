import { deploymentEventBus } from "../events/bus";
import type { LogPhase } from "../../../shared/types";
import { deploymentLogRepository } from "../../../domains/deployment-log/deployment-log.repository";

export type LogWriter = (line: string, phase: LogPhase) => void;

export function createLogWriter(deploymentId: string): LogWriter {
  let seq = 1;

  return function write(line: string, phase: LogPhase): void {
    const currentSeq = seq++;
    const ts = new Date();

    deploymentLogRepository
      .insert({ deploymentId, seq: currentSeq, ts, line, phase })
      .catch(() => {});
    deploymentEventBus.emitLog({
      deploymentId,
      seq: currentSeq,
      ts: ts.toISOString(),
      line,
      phase,
    });
  };
}