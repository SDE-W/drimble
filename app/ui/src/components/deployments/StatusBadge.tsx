import { cn } from "@/lib/utils";
import type { DeploymentStatus } from "@/types";

interface StatusBadgeProps {
  status: DeploymentStatus;
  className?: string;
}

const statusConfig: Record<
  DeploymentStatus,
  { label: string; dotClass: string; textClass: string; bgClass: string }
> = {
  running: {
    label: "Ready",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50 border-emerald-200",
  },
  building: {
    label: "Building",
    dotClass: "bg-yellow-400 animate-pulse",
    textClass: "text-yellow-700",
    bgClass: "bg-yellow-50 border-yellow-200",
  },
  deploying: {
    label: "Deploying",
    dotClass: "bg-blue-400 animate-pulse",
    textClass: "text-blue-700",
    bgClass: "bg-blue-50 border-blue-200",
  },
  pending: {
    label: "Queued",
    dotClass: "bg-gray-400",
    textClass: "text-gray-600",
    bgClass: "bg-gray-50 border-gray-200",
  },
  failed: {
    label: "Error",
    dotClass: "bg-red-500",
    textClass: "text-red-600",
    bgClass: "bg-red-50 border-red-200",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", config.dotClass)} />
      {config.label}
    </span>
  );
}