import { formatDistanceToNow } from "date-fns";
import { GitBranch, GitCommit, Globe, MoreHorizontal, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "./StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { IDeployment } from "@/types";

interface DeploymentRowProps {
  deployment: IDeployment;
}

function shortId(id: string): string {
  return id.slice(0, 9).toUpperCase();
}

function shortRef(ref: string): string {
  try {
    const url = new URL(ref);
    return url.pathname.replace(/^\//, "").split("/").slice(-1)[0] ?? ref;
  } catch {
    return ref;
  }
}

export function DeploymentRow({ deployment }: DeploymentRowProps) {
  const timeAgo = formatDistanceToNow(new Date(deployment.createdAt), {
    addSuffix: false,
  });

  const isActive =
    deployment.status === "building" || deployment.status === "deploying";

  return (
    <Link
    to="/deployments/$id"
      params={{ id: deployment.id }}
      className={cn(
        "group flex items-center gap-4 border-b border-border px-6 py-4 transition-colors hover:bg-muted/40",
        isActive && "bg-yellow-50/40"
      )}
    >
      {/* ID + environment */}
      <div className="w-45 shrink-0">
        <Link
          to="/deployments/$id"
          params={{ id: deployment.id }}
          className="text-sm font-semibold text-foreground hover:underline underline-offset-2"
        >
          {shortId(deployment.id)}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">
          {deployment.name ?? "Production"}
        </p>
      </div>

      {/* Status */}
      <div className="w-25 shrink-0">
        <StatusBadge status={deployment.status} />
        {deployment.attempts > 1 && (
          <p className="text-xs text-muted-foreground mt-1">
            attempt {deployment.attempts}
          </p>
        )}
      </div>

      {/* Branch + commit */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <GitBranch className="h-3 w-3 shrink-0" />
          <span className="font-medium text-foreground">main</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5 min-w-0">
          <GitCommit className="h-3 w-3 shrink-0" />
          <span className="truncate">{shortRef(deployment.sourceRef)}</span>
        </div>
      </div>

      {/* URL */}
      {deployment.url ? (
        <div className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground w-70 shrink-0 min-w-0">
          <Globe className="h-3 w-3 shrink-0" />
          <a
            href={deployment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate hover:text-foreground hover:underline underline-offset-2 transition-colors"
          >
            {deployment.url.replace("http://", "")}
          </a>
        </div>
      ) : (
        <div className="hidden lg:block w-50 shrink-0" />
      )}

      {/* Time + author */}
      <div className="text-right shrink-0 w-70">
        <p className="text-sm text-muted-foreground">{timeAgo} ago</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          by brimble-user
        </p>
      </div>

      {/* Actions */}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link
                to="/deployments/$id"
                params={{ id: deployment.id }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View details
              </Link>
            </DropdownMenuItem>
            {deployment.url && (
              <DropdownMenuItem asChild>
                <a
                  href={deployment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Open URL
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to="/deployments/$id"
                params={{ id: deployment.id }}
                className="flex items-center gap-2 cursor-pointer"
              >
                View logs
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  );
}