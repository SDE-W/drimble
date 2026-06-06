import { useEffect, useRef, useState, useCallback } from "react";
import type { IDeploymentLog } from "@/types";
import { BASE_URL } from "@/api/client";

type StreamStatus = "connecting" | "streaming" | "done" | "error";

interface UseLogStreamOptions {
  deploymentId: string;
  enabled?: boolean;
}

interface UseLogStreamResult {
  logs: IDeploymentLog[];
  status: StreamStatus;
  error: string | null;
  reconnect: () => void;
  clear: () => void;
}

export function useLogStream({
  deploymentId,
  enabled = true,
}: UseLogStreamOptions): UseLogStreamResult {
  const [logs, setLogs] = useState<IDeploymentLog[]>([]);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnects = 5;
  const connectRef = useRef<() => void>(() => {});

  const openConnection = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = `${BASE_URL}/api/v1/deployments/${deploymentId}/logs`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("log", (e: MessageEvent) => {
      try {
        const log = JSON.parse(e.data) as IDeploymentLog;
        setLogs((prev) => {
          const exists = prev.some((l) => l.seq === log.seq);
          if (exists) return prev;
          return [...prev, log].sort((a, b) => a.seq - b.seq);
        });
        setStatus("streaming");
        reconnectAttempts.current = 0;
      } catch {
        // malformed
      }
    });

    es.addEventListener("status", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { status: string };
        if (data.status === "running" || data.status === "failed") {
          setStatus("done");
          es.close();
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener("done", () => {
      setStatus("done");
      es.close();
    });

    es.onerror = () => {
      if (reconnectAttempts.current >= maxReconnects) {
        setStatus("error");
        setError("Connection lost. Max reconnect attempts reached.");
        es.close();
        return;
      }
      reconnectAttempts.current += 1;
      setStatus("connecting");
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 16000);
      setTimeout(() => {
        if (esRef.current === es) {
          connectRef.current();
        }
      }, delay);
    };
  }, [deploymentId]);

  useEffect(() => {
    connectRef.current = openConnection;
  }, [openConnection]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    setLogs([]);
    setStatus("connecting");
    setError(null);
    connectRef.current();
  }, []);

  const clear = useCallback(() => setLogs([]), []);

  useEffect(() => {
    if (!enabled || !deploymentId) return;
    const timer = setTimeout(() => {
      openConnection();
    }, 0);
    return () => {
      clearTimeout(timer);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [deploymentId, enabled, openConnection]);

  return { logs, status, error, reconnect, clear };
}