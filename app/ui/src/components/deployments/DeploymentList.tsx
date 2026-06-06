import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, PaintBucket } from "lucide-react";
import { DeploymentRow } from "./DeploymentRow";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listDeployments } from "@/api/deployments";
import type { DeploymentStatus } from "@/types";

const STATUS_FILTERS: { label: string; value: DeploymentStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Ready", value: "running" },
  { label: "Building", value: "building" },
  { label: "Error", value: "failed" },
  { label: "Queued", value: "pending" },
];

const PAGE_SIZE = 5;

export function DeploymentList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeploymentStatus | "all">(
    "all",
  );
  const [deployFormOpen, setDeployFormOpen] = useState(false);
  const [page, setPage] = useState(1);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilter(value: DeploymentStatus | "all") {
    setStatusFilter(value);
    setPage(1);
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["deployments"],
    queryFn: listDeployments,
    refetchInterval: 5000,
  });

  const filtered = (data ?? []).filter((d) => {
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesSearch =
      search.trim() === "" ||
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.sourceRef.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3 py-3">
      {/* Filters */}
      <div className="w-full">
        <div className="flex w-full max-w-custom mx-auto  items-center gap-3 border-b border-border px-6 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search deployments..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleStatusFilter(f.value)}
                className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full p-4">
        <div className="w-full max-w-custom mx-auto p-4 border rounded-2xl">
          {isLoading && (
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32 ml-auto" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <span className="text-red-500 text-lg">!</span>
              </div>
              <p className="text-lg font-medium text-foreground">
                Failed to load deployments
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Make sure the API is running on port 3000
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <PaintBucket className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {search || statusFilter !== "all"
                  ? "No deployments match your filters"
                  : "No deployments yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "Deploy your first project to get started"}
              </p>
              {statusFilter === "all" && !search && (
                <Button size="lg" onClick={() => setDeployFormOpen(true)}>
                  New Deployment
                </Button>
              )}
            </div>
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <div>
              {paginated.map((deployment) => (
                <DeploymentRow key={deployment.id} deployment={deployment} />
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-6 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - page) <= 1,
                      )
                      .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                          acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span
                            key={`ellipsis-${i}`}
                            className="px-1 text-sm text-muted-foreground"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setPage(p as number)}
                            className={`flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors ${
                              page === p
                                ? "bg-foreground text-background"
                                : "border border-border hover:bg-muted"
                            }`}
                          >
                            {p}
                          </button>
                        ),
                      )}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* List */}
    </div>
  );
}
