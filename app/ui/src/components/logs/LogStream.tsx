import { useEffect, useRef } from "react";
import { RefreshCw, Terminal, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useLogStream } from "@/hooks/useLogStream";
import { cn } from "@/lib/utils";
import type { LogPhase } from "@/types";

interface LogStreamProps {
  deploymentId: string;
  enabled?: boolean;
  className?: string;
}

const phaseColors: Record<LogPhase, string> = {
  clone: "text-blue-400",
  build: "text-yellow-300",
  run: "text-emerald-400",
  register: "text-purple-400",
  system: "text-zinc-500",
};

const phaseLabels: Record<LogPhase, string> = {
  clone: "CLONE",
  build: "BUILD",
  run: "RUN",
  register: "REG",
  system: "SYS",
};

export function LogStream({
  deploymentId,
  enabled = true,
  className,
}: LogStreamProps) {
  const { logs, status, error, reconnect } = useLogStream({
    deploymentId,
    enabled,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);

  // Auto-scroll to bottom unless user has scrolled up
  useEffect(() => {
    if (isUserScrolling.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isUserScrolling.current = !isAtBottom;
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden",
        className,
      )}
    >
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-zinc-700" />
            <div className="h-3 w-3 rounded-full bg-zinc-700" />
            <div className="h-3 w-3 rounded-full bg-zinc-700" />
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <Terminal className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-sm  text-zinc-500">
              deployment/{deploymentId.slice(0, 8)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status indicator */}
          {status === "connecting" && (
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />
              <span className="text-sm text-zinc-500 ">
                connecting
              </span>
            </div>
          )}
          {status === "streaming" && (
            <div className="flex items-center gap-1.5">
              <Wifi className="h-3 w-3 text-emerald-500" />
              <span className="text-sm text-zinc-500 ">live</span>
            </div>
          )}
          {status === "done" && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-zinc-600" />
              <span className="text-sm text-zinc-500 ">done</span>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-1.5">
              <WifiOff className="h-3 w-3 text-red-500" />
              <button
                onClick={reconnect}
                className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300  transition-colors"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                reconnect
              </button>
            </div>
          )}

          <span className="text-sm text-zinc-600 ">
            {logs.length} lines
          </span>
        </div>
      </div>

      {/* Log output */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4  text-[12px] leading-5 min-h-[300px] max-h-[500px]"
      >
        {logs.length === 0 && status === "connecting" && (
          <div className="flex items-center gap-2 text-zinc-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Waiting for logs...</span>
          </div>
        )}

        {logs.length === 0 && status === "done" && (
          <span className="text-zinc-600">No logs available.</span>
        )}

        {error && (
          <div className="text-red-400 mb-2">
            <span className="text-zinc-600">[error] </span>
            {error}
          </div>
        )}

        {logs.map((log) => (
          <div
            key={`${log.deploymentId}-${log.seq}`}
            className="flex gap-3 group"
          >
            {/* Line number */}
            <span className="w-8 shrink-0 text-right text-zinc-700 select-none group-hover:text-zinc-600">
              {log.seq}
            </span>

            {/* Phase tag */}
            <span
              className={cn(
                "w-10 shrink-0 text-sm font-semibold tracking-wider",
                phaseColors[log.phase] ?? "text-zinc-500",
              )}
            >
              {phaseLabels[log.phase] ?? log.phase.toUpperCase()}
            </span>

            {/* Log line */}
            <span className="text-zinc-200 break-all whitespace-pre-wrap flex-1">
              {log.line}
            </span>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
