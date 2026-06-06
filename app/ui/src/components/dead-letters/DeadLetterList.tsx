import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {  RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeadLetterTable } from "./DeadLetterTable";
import { DeadLetterDetailPanel } from "./DeadLetterDetailPanel";
import { listDeadLetters } from "@/api/dead-letters";

const PAGE_SIZE = 4;

export function DeadLetterList() {
  const [page, setPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dead-letters", page],
    queryFn: () => listDeadLetters({ page, limit: PAGE_SIZE }),
    refetchInterval: 30_000,
  });

  const totalPages = Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE);

  return (
    <>
      {/* Sub-header with count and refresh */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <p className="text-[12px] text-muted-foreground">
          {data ? `${data.totalCount} total` : "Loading..."}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-[13px] font-medium text-foreground">
              Failed to load dead letters
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-4"
            >
              Try again
            </Button>
          </div>
        ) : (
          <DeadLetterTable
            data={data?.data ?? []}
            isLoading={isLoading}
            onRowClick={setSelectedJobId}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-6 py-3">
          <p className="text-[12px] text-muted-foreground">
            Page {page} of {totalPages} &mdash; {data?.totalCount} total
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex cursor-pointer h-10 w-10 items-center justify-center rounded-md border border-border text-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex cursor-pointer h-10 w-10 items-center justify-center rounded-md border border-border text-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ›
            </button>
          </div>
        </div>
      )}

      <DeadLetterDetailPanel
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
      />
    </>
  );
}