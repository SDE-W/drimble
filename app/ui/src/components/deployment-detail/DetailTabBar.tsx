import { cn } from "@/lib/utils";
import { DETAIL_TABS, type DetailTab } from "./types";

interface DetailTabBarProps {
  active: DetailTab;
  onChange: (tab: DetailTab) => void;
}

export function DetailTabBar({ active, onChange }: DetailTabBarProps) {
  return (
    <div className="flex items-center border-b border-border px-6 bg-background">
      {DETAIL_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative px-4 py-3 cursor-pointer text-sm font-medium transition-colors",
            active === tab.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
          {active === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
}