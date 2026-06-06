import { createFileRoute } from "@tanstack/react-router";
import { TopHeader } from "@/components/layout/TopHeader";
import { LogsPage } from "@/components/logs/LogsPage";

export const Route = createFileRoute("/logs")({
  component: LogsRoute,
});

// eslint-disable-next-line react-refresh/only-export-components
function LogsRoute() {
  return (
    <div className="flex flex-col">
      <TopHeader title="Logs" subtitle="All deployment logs" />
      <LogsPage />
    </div>
  );
}