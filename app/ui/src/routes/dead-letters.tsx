import { createFileRoute } from "@tanstack/react-router";
import { TopHeader } from "@/components/layout/TopHeader";
import { DeadLetterList } from "@/components/dead-letters/DeadLetterList";

export const Route = createFileRoute("/dead-letters")({
  component: DeadLettersRoute,
});

// eslint-disable-next-line react-refresh/only-export-components
function DeadLettersRoute() {
  return (
    <div className="flex flex-col">
      <TopHeader title="Dead Letters" subtitle="Failed jobs requiring attention" />
      <DeadLetterList />
    </div>
  );
}