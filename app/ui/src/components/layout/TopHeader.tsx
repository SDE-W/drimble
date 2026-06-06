import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";
import { listDeployments } from "@/api/deployments";
import { DeployForm } from "../deployments/DeployForm";
interface TopHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopHeader({ title, subtitle, actions }: TopHeaderProps) {
  const [deployFormOpen, setDeployFormOpen] = useState(false);
  // const [page, setPage] = useState(1);

  const { refetch, isFetching } = useQuery({
    queryKey: ["deployments"],
    queryFn: listDeployments,
    refetchInterval: 5000,
  });

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
            />
          </button>
          <Button
            onClick={() => setDeployFormOpen(true)}
            size="sm"
            className="gap-1.5 text-[13px] h-8"
          >
            Deploy
          </Button>
        </div>
      </header>
      <DeployForm
        open={deployFormOpen}
        onOpenChange={setDeployFormOpen}
        onSuccess={() => refetch()}
      />
    </>
  );
}
