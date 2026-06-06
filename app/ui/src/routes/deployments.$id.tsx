import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DeploymentDetailHeader } from "@/components/deployment-detail/DeploymentDetailHeader";
import { DetailTabBar } from "@/components/deployment-detail/DetailTabBar";
import { OverviewTab } from "@/components/deployment-detail/OverviewTab";
import { BuildLogsTab } from "@/components/deployment-detail/BuildLogsTab";
import { DetailsTab } from "@/components/deployment-detail/DetailsTab";
import { getDeployment } from "@/api/deployments";
import type { DetailTab } from "@/components/deployment-detail/types";

export const Route = createFileRoute("/deployments/$id")({
  component: DeploymentDetailPage,
});

// eslint-disable-next-line react-refresh/only-export-components
function DeploymentDetailPage() {
  const { id } = Route.useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const { data: deployment, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["deployment", id],
    queryFn: () => getDeployment(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (
        status === "building" ||
        status === "deploying" ||
        status === "pending"
      ) {
        return 3000;
      }
      return false;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="border-b border-border p-6 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <p className="text-[13px] text-muted-foreground">
          Deployment not found.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <DeploymentDetailHeader
        deployment={deployment}
        onRefresh={refetch}
        isFetching={isFetching}
      />
      <DetailTabBar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1">
        {activeTab === "overview" && <OverviewTab deployment={deployment} />}
        {activeTab === "logs" && (
          <BuildLogsTab
            deploymentId={id}
            deployStatus={deployment.status}
          />
        )}
        {activeTab === "details" && <DetailsTab deployment={deployment} />}
      </div>
    </div>
  );
}