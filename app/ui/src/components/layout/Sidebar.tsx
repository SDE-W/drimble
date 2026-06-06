import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Rocket,
  ScrollText,
  Boxes,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Deployments", href: "/deployments", icon: Rocket },
  { label: "Logs", href: "/logs", icon: ScrollText },
  { label: "Dead Letters", href: "/dead-letters", icon: AlertCircle },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
          <Boxes className="h-4 w-4 text-background" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Brimble
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.href);
            const isDeadLetters = item.href === "/dead-letters";

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isDeadLetters && "text-red-500"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-foreground flex items-center justify-center text-[11px] font-semibold text-background shrink-0">
            B
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-foreground">brimble-user</p>
            <p className="truncate text-[11px] text-muted-foreground">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}