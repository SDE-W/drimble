import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeploymentLogs } from "@/api/logs";
import { listDeployments } from "@/api/deployments";
import { cn } from "@/lib/utils";
import type { LogPhase } from "@/types";

const PHASES: { label: string; value: LogPhase | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Clone", value: "clone" },
  { label: "Build", value: "build" },
  { label: "Run", value: "run" },
  { label: "Register", value: "register" },
  { label: "System", value: "system" },
];

const PHASE_COLORS: Record<LogPhase, string> = {
  clone: "text-blue-500",
  build: "text-yellow-500",
  run: "text-emerald-500",
  register: "text-purple-500",
  system: "text-zinc-500",
};

const PAGE_SIZE = 17;

export function LogsPage() {
  const [deploymentId, setDeploymentId] = useState("");
  const [phase, setPhase] = useState<LogPhase | "all">("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data: deployments } = useQuery({
    queryKey: ["deployments"],
    queryFn: listDeployments,
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["logs-page", deploymentId, phase, page],
    queryFn: () =>
      getDeploymentLogs({
        deploymentId,
        phase: phase === "all" ? undefined : phase,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: deploymentId.length > 0,
  });

  const logs = (data?.data ?? []).filter((l) =>
    search.trim() === ""
      ? true
      : l.line.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE);

  function handlePhase(value: LogPhase | "all") {
    setPhase(value);
    setPage(1);
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.totalCount} lines` : "Select a deployment"}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching || !deploymentId}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
        <select
          value={deploymentId}
          onChange={(e) => { setDeploymentId(e.target.value); setPage(1); }}
          className="h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Select deployment...</option>
          {(deployments ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name ?? d.id.slice(0, 9).toUpperCase()} — {d.status}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          {PHASES.map((f) => (
            <button
              key={f.value}
              onClick={() => handlePhase(f.value)}
              className={`rounded-md cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors ${
                phase === f.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {!deploymentId && (
          <div className="flex items-center justify-center py-24 text-center">
            <p className="text-base text-muted-foreground">
              Select a deployment to view its logs
            </p>
          </div>
        )}

        {deploymentId && isLoading && (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        )}

        {deploymentId && isError && (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-base text-muted-foreground mb-3">
              Failed to load logs
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {deploymentId && !isLoading && !isError && (
          <table className="w-full text-[11px] font-mono">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b text-sm border-border">
                <th className="text-right text-muted-foreground px-4 py-2 w-12 font-medium">
                  #
                </th>
                <th className="text-left text-muted-foreground px-2 py-2 w-20 font-medium">
                  Phase
                </th>
                <th className="text-left text-muted-foreground px-2 py-2 w-32 font-medium">
                  Time
                </th>
                <th className="text-left text-muted-foreground px-2 py-2 font-medium">
                  Message
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted-foreground">
                    No logs match your filters
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={`${log.deploymentId}-${log.seq}`}
                    className="group border-b text-sm border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <td className="text-right text-muted-foreground px-4 py-1 select-none">
                      {log.seq}
                    </td>
                    <td className={cn("px-2 py-1 uppercase text-sm tracking-wider font-semibold", PHASE_COLORS[log.phase])}>
                      {log.phase}
                    </td>
                    <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.ts), "HH:mm:ss.SSS")}
                    </td>
                    <td className="px-2 py-1 text-foreground break-all whitespace-pre-wrap">
                      {log.line}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-6 py-3">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex cursor-pointer h-10 w-10 items-center justify-center rounded-md border border-border text-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex cursor-pointer h-10 w-10 items-center justify-center rounded-md border border-border text-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}