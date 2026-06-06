import { DeploymentPreview } from "./DeploymentPreview";
import { DeploymentMetaSidebar } from "./DeploymentMetaSidebar";
import type { IDeployment } from "@/types";

interface OverviewTabProps {
  deployment: IDeployment;
}

export function OverviewTab({ deployment }: OverviewTabProps) {
  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] items-start gap-6">
      <DeploymentMetaSidebar deployment={deployment} />
      <DeploymentPreview deployment={deployment} />
    </div>
  );
}
