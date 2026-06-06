import { Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/deployments/StatusBadge";
import type { IDeployment } from "@/types";

interface DeploymentDetailHeaderProps {
  deployment: IDeployment;
  onRefresh: () => void;
  isFetching: boolean;
}

function shortId(id: string) {
  return id.slice(0, 9).toUpperCase();
}

export function DeploymentDetailHeader({
  deployment,
  onRefresh,
  isFetching,
}: DeploymentDetailHeaderProps) {
  return (
    <div className="border-b border-border bg-background">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/50">
        <Link
          to="/deployments"
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Deployments
        </Link>
        <span className="text-muted-foreground text-[12px]">/</span>
        <span className="text-[12px] font-mono text-foreground">
          {shortId(deployment.id)}
        </span>
      </div>

      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground">
              {deployment.name ?? shortId(deployment.id)}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {deployment.sourceRef}
            </p>
          </div>
          <StatusBadge status={deployment.status} />
        </div>

        <div className="flex items-center gap-2">
          {deployment.url && (
            <a
              href={deployment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] font-medium hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visit
            </a>
          )}
          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}