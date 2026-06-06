import { useState } from "react";
import { GitBranch, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/CustomToast";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { createDeployment } from "@/api/deployments";
import type { DeploymentSource } from "@/types";

interface DeployFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (deploymentId: string) => void;
}

const PIPELINE_STEPS = [
  "Clone repository",
  "Build image with Railpack",
  "Start container",
  "Register Caddy route",
];

export function DeployForm({ open, onOpenChange, onSuccess }: DeployFormProps) {
  const [sourceRef, setSourceRef] = useState("");
  const [name, setName] = useState("");
  const [sourceType] = useState<DeploymentSource>("git");
  const [loading, setLoading] = useState(false);

  const isValid = sourceRef.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;
    setLoading(true);
    try {
      const result = await createDeployment({
        sourceType,
        sourceRef: sourceRef.trim(),
        name: name.trim() || undefined,
      });
      showToast("Deployment queued successfully", "success");
      onOpenChange(false);
      setSourceRef("");
      setName("");
      onSuccess?.(result.id);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to create deployment",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResponsiveModal
      isOpen={open}
      onClose={() => !loading && onOpenChange(false)}
      width={580}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 h-[72px] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center text-white justify-center rounded-lg bg-foreground shrink-0">
            B
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              New Deployment
            </h2>
            <p className="text-sm text-muted-foreground">brimble-paas</p>
          </div>
        </div>
        <button
          onClick={() => !loading && onOpenChange(false)}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <form id="deploy-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">
              Repository URL
            </label>
            <div className="relative">
              <GitBranch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://github.com/user/repo"
                value={sourceRef}
                onChange={(e) => setSourceRef(e.target.value)}
                className="pl-8"
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">
              Project name{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              type="text"
              placeholder="my-project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Brimble will clone your repository, detect the framework, run{" "}
              <code className="bg-muted rounded px-1 text-foreground text-sm">
                npm install
              </code>{" "}
              and{" "}
              <code className="bg-muted rounded px-1 text-foreground text-sm">
                npm run build
              </code>
              , then serve the output via Caddy.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Pipeline steps
            </p>
            {PIPELINE_STEPS.map((step, i) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <span className="text-[13px] text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="border-t border-border h-[72px] px-6 flex items-center justify-between shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={() => !loading && onOpenChange(false)}
          disabled={loading}
          className="text-[13px]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="deploy-form"
          disabled={!isValid || loading}
          className="text-[13px] gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              Deploy now
            </>
          )}
        </Button>
      </div>
    </ResponsiveModal>
  );
}