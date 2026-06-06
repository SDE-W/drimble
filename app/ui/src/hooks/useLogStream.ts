import { useEffect, useRef, useState, useCallback } from "react";
import type { IDeploymentLog } from "../types";
import { BASE_URL } from "../api/client";

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

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setStatus("connecting");
    setError(null);

    const url = `${BASE_URL}/api/v1/deployments/${deploymentId}/logs`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("log", (e: MessageEvent) => {
      try {
        const log = JSON.parse(e.data) as IDeploymentLog;
        setLogs((prev) => {
          // deduplicate by seq
          const exists = prev.some((l) => l.seq === log.seq);
          if (exists) return prev;
          return [...prev, log].sort((a, b) => a.seq - b.seq);
        });
        setStatus("streaming");
        reconnectAttempts.current = 0;
      } catch {
        // malformed event - ignore
      }
    });

    es.addEventListener("status", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { status: string };
        if (data.status === "running" || data.status === "failed") {
          setStatus("done");
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

      // exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 16000);
      setTimeout(() => {
        if (esRef.current === es) {
          connect();
        }
      }, delay);
    };
  }, [deploymentId]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    setLogs([]);
    connect();
  }, [connect]);

  const clear = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    if (!enabled || !deploymentId) return;

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [deploymentId, enabled, connect]);

  return { logs, status, error, reconnect, clear };
}