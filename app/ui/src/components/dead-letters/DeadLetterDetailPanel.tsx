import { useState } from "react";
import { X, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { getDeadLetter, resolveDeadLetter } from "@/api/dead-letters";
import { showToast } from "@/components/ui/CustomToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { IDeadLetter } from "@/types";

interface DeadLetterDetailPanelProps {
  jobId: string | null;
  onClose: () => void;
}

function ErrorHistory({ errors }: { errors: IDeadLetter["errors"] }) {
  return (
    <div className="space-y-2">
      {errors.map((e, i) => (
        <div key={i} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
              Attempt {e.attempt}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(e.occurredAt), "MMM d, HH:mm:ss")}
            </span>
          </div>
          <p className="text-sm text-red-700 break-all leading-relaxed">
            {e.error}
          </p>
        </div>
      ))}
    </div>
  );
}

function ResolveForm({
  jobId,
  onResolved,
}: {
  jobId: string;
  onResolved: () => void;
}) {
  const [resolution, setResolution] = useState("");
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => resolveDeadLetter(jobId, resolution),
    onSuccess: () => {
      showToast("Dead letter resolved", "success");
      queryClient.invalidateQueries({ queryKey: ["dead-letters"] });
      queryClient.invalidateQueries({ queryKey: ["dead-letter", jobId] });
      onResolved();
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : "Failed to resolve",
        "error"
      );
    },
  });

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <p className="text-[13px] font-semibold text-foreground">Resolve</p>
      <p className="text-sm text-muted-foreground">
        Describe how this was resolved or why it is being dismissed.
      </p>
      <Input
        placeholder="Resolution notes..."
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        disabled={isPending}
      />
      <Button
        size="lg"
        disabled={resolution.trim().length < 3 || isPending}
        onClick={() => mutate()}
        className="w-full gap-2 text-[13px]"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Resolving...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark as resolved
          </>
        )}
      </Button>
    </div>
  );
}

export function DeadLetterDetailPanel({
  jobId,
  onClose,
}: DeadLetterDetailPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["dead-letter", jobId],
    queryFn: () => getDeadLetter(jobId!),
    enabled: !!jobId,
  });

  return (
    <ResponsiveModal isOpen={!!jobId} onClose={onClose} width={520}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 h-18 shrink-0">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Dead Letter
            </h2>
            <p className="text-xs text-muted-foreground truncate max-w-65">
              {jobId}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Metadata */}
            <div className="rounded-xl border border-border p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Job ID
                </p>
                <p className="text-sm text-foreground break-all leading-relaxed">
                  {data.jobId}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Job Type
                </p>
                <p className="text-[13px] text-foreground">{data.jobType}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  <Clock className="h-3 w-3" /> Dead At
                </div>
                <p className="text-sm text-foreground">
                  {format(new Date(data.deadAt), "MMM d, yyyy HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Attempts
                </p>
                <p className="text-[13px] text-foreground">{data.attempts}</p>
              </div>
            </div>

            {/* Error history */}
            <div>
              <p className="text-[13px] font-semibold text-foreground mb-2.5">
                Error History
              </p>
              <ErrorHistory errors={data.errors} />
            </div>

            {/* Resolve or resolved state */}
            {data.resolvedAt ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm font-semibold text-emerald-700">
                    Resolved
                  </p>
                </div>
                <p className="text-sm text-emerald-700">{data.resolution}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {format(new Date(data.resolvedAt), "MMM d, yyyy HH:mm")}
                </p>
              </div>
            ) : (
              <ResolveForm jobId={data.jobId} onResolved={onClose} />
            )}
          </>
        ) : null}
      </div>
    </ResponsiveModal>
  );
}