import { useQuery } from "@tanstack/react-query";
import {
  X,
  ExternalLink,
  RefreshCw,
  GitBranch,
  Clock,
  Server,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { StatusBadge } from "@/components/deployments/StatusBadge";
import { LogStream } from "@/components/logs/LogStream";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { getDeployment } from "@/api/deployments";

interface DeploymentDetailPanelProps {
  deploymentId: string | null;
  onClose: () => void;
}

function shortId(id: string) {
  return id.slice(0, 9).toUpperCase();
}

export function DeploymentDetailPanel({
  deploymentId,
  onClose,
}: DeploymentDetailPanelProps) {
  const open = deploymentId !== null;

  const { data: deployment, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["deployment", deploymentId],
    queryFn: () => getDeployment(deploymentId!),
    enabled: open,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "building" || s === "deploying" || s === "pending"
        ? 3000
        : false;
    },
  });

  return (
    <ResponsiveModal isOpen={open} onClose={onClose} width={580}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 h-[72px] shrink-0">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-foreground">
            {deployment ? shortId(deployment.id) : "Deployment"}
          </h2>
          <p className="text-[11px] text-muted-foreground truncate">
            {deployment?.name ?? "Details"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : deployment ? (
          <>
            {/* Status + URL */}
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={deployment.status} />
              {deployment.url && (
                <a
                  href={deployment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12px] font-medium hover:bg-muted transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {deployment.url.replace("http://", "")}
                </a>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  <GitBranch className="h-3 w-3" /> Source
                </div>
                <a
                  href={deployment.sourceRef}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-foreground hover:underline underline-offset-2 truncate block"
                >
                  {deployment.sourceRef}
                </a>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  <Clock className="h-3 w-3" /> Created
                </div>
                <p className="text-[12px] text-foreground">
                  {format(new Date(deployment.createdAt), "MMM d, yyyy HH:mm")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(deployment.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              {deployment.hostPort && (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    <Server className="h-3 w-3" /> Port
                  </div>
                  <p className="text-[12px] text-foreground">
                    :{deployment.hostPort}
                  </p>
                </div>
              )}

              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Attempts
                </div>
                <p className="text-[12px] text-foreground">
                  {deployment.attempts}
                </p>
              </div>
            </div>

            {/* Error */}
            {deployment.lastError && deployment.status === "failed" && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">
                    Last error
                  </p>
                </div>
                <p className="text-[12px] text-red-700 leading-relaxed break-all">
                  {deployment.lastError}
                </p>
              </div>
            )}

            {/* Logs */}
            <div>
              <p className="text-[12px] font-semibold text-foreground mb-2.5">
                Build Logs
              </p>
              <LogStream deploymentId={deployment.id} enabled />
            </div>
          </>
        ) : null}
      </div>
    </ResponsiveModal>
  );
}