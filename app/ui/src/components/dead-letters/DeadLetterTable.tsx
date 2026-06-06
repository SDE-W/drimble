import { formatDistanceToNow, format } from "date-fns";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { IDeadLetter } from "@/types";

interface DeadLetterTableProps {
  data: IDeadLetter[];
  isLoading: boolean;
  onRowClick: (jobId: string) => void;
}

function StatusDot({ resolved }: { resolved: boolean }) {
  return resolved ? (
    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      Resolved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      Unresolved
    </span>
  );
}

export function DeadLetterTable({ data, isLoading, onRowClick }: DeadLetterTableProps) {
  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-[14px] font-medium text-foreground">No dead letters</p>
        <p className="text-sm text-muted-foreground mt-1">
          All jobs are processing successfully
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[200px]" />
          <col className="w-[130px]" />
          <col className="w-[60px]" />
          <col />
          <col className="w-[110px]" />
          <col className="w-[130px]" />
        </colgroup>

        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-6 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Job ID
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Type
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tries
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Last Error
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Dead At
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {data.map((item) => {
            const lastError =
              item?.errors[item?.errors.length - 1]?.error ?? "Unknown error";

            return (
              <tr
                key={item?.id}
                onClick={() => onRowClick(item?.jobId)}
                className="hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 align-top">
                  <p className="text-sm text-foreground break-all leading-relaxed">
                    {item?.jobId}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    tenant: {item?.tenantId}
                  </p>
                </td>
                <td className="px-3 py-4 align-top">
                  <span className="text-sm text-foreground">{item?.jobType}</span>
                </td>
                <td className="px-3 py-4 align-top">
                  <span className="text-sm text-foreground">
                    {item?.attempts}
                  </span>
                </td>
                <td className="px-3 py-4 align-top">
                  <p className="text-xs text-muted-foreground break-words leading-relaxed">
                    {lastError}
                  </p>
                </td>
                <td className="px-3 py-4 align-top">
                  <StatusDot resolved={!!item?.resolvedAt} />
                </td>
                <td className="px-6 py-4 align-top text-right">
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(item?.deadAt), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(item?.deadAt), "MMM d, HH:mm")}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}