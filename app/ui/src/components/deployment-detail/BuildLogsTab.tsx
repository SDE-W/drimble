import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDeploymentLogs } from "@/api/logs";
import { cn } from "@/lib/utils";
import type { IDeploymentLog, LogPhase, DeploymentStatus } from "@/types";

const PHASES: LogPhase[] = ["clone", "build", "run", "register", "system"];

const PHASE_LABELS: Record<LogPhase, string> = {
  clone: "Clone Repository",
  build: "Build Image",
  run: "Start Container",
  register: "Register Route",
  system: "System",
};

const PHASE_COLORS: Record<LogPhase, string> = {
  clone: "text-blue-400",
  build: "text-yellow-300",
  run: "text-emerald-400",
  register: "text-purple-400",
  system: "text-zinc-500",
};

function phaseStatus(
  logs: IDeploymentLog[],
  phase: LogPhase,
  deployStatus: DeploymentStatus,
): "success" | "error" | "running" | "pending" {
  const phaseLogs = logs.filter((l) => l.phase === phase);
  if (phaseLogs.length === 0) return "pending";
  const hasError = phaseLogs.some((l) =>
    l.line.toLowerCase().includes("failed"),
  );
  if (hasError && deployStatus === "failed") return "error";
  if (deployStatus === "building" || deployStatus === "deploying")
    return "running";
  return "success";
}

function PhaseIcon({ status }: { status: ReturnType<typeof phaseStatus> }) {
  if (status === "success")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (status === "error")
    return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  if (status === "running")
    return (
      <Loader2 className="h-4 w-4 text-yellow-500 shrink-0 animate-spin" />
    );
  return (
    <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
  );
}

interface PhaseGroupProps {
  phase: LogPhase;
  logs: IDeploymentLog[];
  deployStatus: DeploymentStatus;
}

function PhaseGroup({ phase, logs, deployStatus }: PhaseGroupProps) {
  const phaseLogs = logs.filter((l) => l.phase === phase);
  const status = phaseStatus(logs, phase, deployStatus);
  const [open, setOpen] = useState(status === "error" || status === "running");

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center cursor-pointer gap-3 w-full px-4 py-3 bg-muted/30 hover:bg-muted/100 transition-colors text-left"
      >
        <PhaseIcon status={status} />
        <span className="flex-1 text-[13px] font-medium text-foreground">
          {PHASE_LABELS[phase]}
        </span>
        <span className="text-sm text-muted-foreground mr-2">
          {phaseLogs.length} lines
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="bg-zinc-950 overflow-x-auto">
          {phaseLogs.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-600 font-mono">
              No logs for this phase.
            </p>
          ) : (
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-right text-zinc-600 px-4 py-1.5 w-12 font-normal">
                    #
                  </th>
                  <th className="text-left text-zinc-600 px-2 py-1.5 w-16 font-normal">
                    phase
                  </th>

                  <th className="text-left text-zinc-600 px-2 py-1.5 w-28 font-normal">
                    time
                  </th>
                  <th className="text-left text-zinc-600 px-2 py-1.5 font-normal">
                    message
                  </th>
                </tr>
              </thead>
              <tbody>
                {phaseLogs.map((log) => (
                  <tr
                    key={log.seq}
                    className="group hover:bg-zinc-900 transition-colors"
                  >
                    <td className="text-right text-zinc-700 px-4 py-0.5 select-none group-hover:text-zinc-500">
                      {log.seq}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-0.5 uppercase text-[10px] tracking-wider shrink-0",
                        PHASE_COLORS[log.phase],
                      )}
                    >
                      {log.phase}
                    </td>
                    <td className="px-2 py-0.5 text-zinc-600 whitespace-nowrap">
                      {new Date(log.ts).toLocaleTimeString()}
                    </td>
                    <td className="px-2 py-0.5 text-zinc-200 break-all whitespace-pre-wrap">
                      {log.line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

interface BuildLogsTabProps {
  deploymentId: string;
  deployStatus: DeploymentStatus;
}

export function BuildLogsTab({
  deploymentId,
  deployStatus,
}: BuildLogsTabProps) {
  const isActive = deployStatus === "building" || deployStatus === "deploying";

  const { data: page1, isLoading } = useQuery({
    queryKey: ["deployment-logs", deploymentId, 1],
    queryFn: () => getDeploymentLogs({ deploymentId, limit: 100, page: 1 }),
    refetchInterval: isActive ? 3000 : false,
  });

  const { data: page2 } = useQuery({
    queryKey: ["deployment-logs", deploymentId, 2],
    queryFn: () => getDeploymentLogs({ deploymentId, limit: 100, page: 2 }),
    enabled: (page1?.totalCount ?? 0) > 100,
    refetchInterval: isActive ? 3000 : false,
  });

  const { data: page3 } = useQuery({
    queryKey: ["deployment-logs", deploymentId, 3],
    queryFn: () => getDeploymentLogs({ deploymentId, limit: 100, page: 3 }),
    enabled: (page1?.totalCount ?? 0) > 200,
    refetchInterval: isActive ? 3000 : false,
  });

  const { data: page4 } = useQuery({
    queryKey: ["deployment-logs", deploymentId, 4],
    queryFn: () => getDeploymentLogs({ deploymentId, limit: 100, page: 4 }),
    enabled: (page1?.totalCount ?? 0) > 300,
    refetchInterval: isActive ? 3000 : false,
  });

  const logs = [
    ...(page1?.data ?? []),
    ...(page2?.data ?? []),
    ...(page3?.data ?? []),
    ...(page4?.data ?? []),
  ].sort((a, b) => a.seq - b.seq);

  const totalLines = page1?.totalCount ?? 0;

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-semibold text-foreground">
          Build Logs
        </h3>
        {!isLoading && (
          <span className="text-sm text-muted-foreground">
            {totalLines} lines
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 cursor-pointer rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {PHASES.map((phase) => (
            <PhaseGroup
              key={phase}
              phase={phase}
              logs={logs}
              deployStatus={deployStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
