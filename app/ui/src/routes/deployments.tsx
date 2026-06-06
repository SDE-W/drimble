import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { DeploymentList } from "@/components/deployments/DeploymentList";
import { TopHeader } from "@/components/layout/TopHeader";

export const Route = createFileRoute("/deployments")({
  component: DeploymentsLayout,
});

// eslint-disable-next-line react-refresh/only-export-components
function DeploymentsLayout() {
  const matchRoute = useMatchRoute();
  const isDetail = matchRoute({ to: "/deployments/$id" });

  if (isDetail) {
    return <Outlet />;
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopHeader title="Deployments" subtitle="brimble-paas" />
      <DeploymentList />
    </div>
  );
}