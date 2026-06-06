import { AlertCircle } from "lucide-react";
import type { IDeployment } from "@/types";

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-8 py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-32">{label}</span>
      <span className={`text-sm text-foreground text-right flex-1 ${mono ? "font-mono break-all" : ""}`}>
        {value}
      </span>
    </div>
  );
}

interface DetailsTabProps {
  deployment: IDeployment;
}

export function DetailsTab({ deployment }: DetailsTabProps) {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="rounded-xl border border-border px-4">
        <DetailRow label="Deployment ID" value={deployment.id} mono />
        <DetailRow label="Name" value={deployment.name ?? "—"} />
        <DetailRow label="Status" value={deployment.status} />
        <DetailRow label="Source type" value={deployment.sourceType} />
        <DetailRow label="Attempts" value={deployment.attempts} />
        {deployment.imageTag && (
          <DetailRow label="Image tag" value={deployment.imageTag} mono />
        )}
        {deployment.containerId && (
          <DetailRow label="Container ID" value={deployment.containerId.slice(0, 12)} mono />
        )}
        {deployment.hostPort && (
          <DetailRow label="Host port" value={`:${deployment.hostPort}`} mono />
        )}
        {deployment.url && (
          <DetailRow
            label="URL"
            value={
              <a
                href={deployment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline underline-offset-2"
              >
                {deployment.url}
              </a>
            }
          />
        )}
        <DetailRow
          label="Created at"
          value={new Date(deployment.createdAt).toLocaleString()}
        />
        <DetailRow
          label="Updated at"
          value={new Date(deployment.updatedAt).toLocaleString()}
        />
      </div>

      {deployment.lastError && deployment.status === "failed" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm font-semibold text-red-600 uppercase tracking-wider">
              Last Error
            </p>
          </div>
          <p className="font-mono text-sm text-red-700 leading-relaxed break-all">
            {deployment.lastError}
          </p>
        </div>
      )}
    </div>
  );
}