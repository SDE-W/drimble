import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-[220px] min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}