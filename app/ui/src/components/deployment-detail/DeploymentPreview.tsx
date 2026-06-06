import { useState } from "react";
import { ExternalLink, RefreshCw, Monitor } from "lucide-react";
import type { IDeployment } from "@/types";
import { LogStream } from "@/components/logs/LogStream";

interface DeploymentPreviewProps {
  deployment: IDeployment;
}

export function DeploymentPreview({ deployment }: DeploymentPreviewProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const isRunning = deployment.status === "running" && !!deployment.url;

  if (isRunning) {
    return (
      <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 bg-background">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
            <div className="h-3 w-3 rounded-full bg-emerald-400/60" />
          </div>
          <div className="flex-1 mx-3 flex items-center gap-2 rounded-md bg-muted px-3 py-1">
            <Monitor className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {deployment.url}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIframeKey((k) => k + 1)}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted transition-colors"
            >
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
            </button>
            <a
              href={deployment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          </div>
        </div>

        {/* iframe */}
        <div className="relative w-full" style={{ height: 320 }}>
          <iframe
            key={iframeKey}
            src={deployment.url}
            className="w-full h-full border-0"
            title="Deployment preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-zinc-950">
        <span className="text-sm font-mono text-zinc-500">
          Build output
        </span>
        <span className="text-sm font-mono text-zinc-600">
          {deployment.status}
        </span>
      </div>
      <LogStream
        deploymentId={deployment.id}
        enabled={true}
        className="rounded-none border-0"
      />
    </div>
  );
}