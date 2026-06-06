import client from "prom-client";
import { brimbleRegistry } from "./metrics";

const sseActiveConnections = new client.Gauge({
  name: "brimble_sse_active_connections",
  help: "Number of currently open SSE log-stream connections",
  registers: [brimbleRegistry],
});

const sseConnectionDuration = new client.Histogram({
  name: "brimble_sse_connection_duration_seconds",
  help: "How long each SSE connection stayed open",
  buckets: [1, 5, 15, 30, 60, 120, 300, 600],
  registers: [brimbleRegistry],
  labelNames: ["exit_reason"],
});

const sseReplaySize = new client.Histogram({
  name: "brimble_sse_replay_log_lines",
  help: "Number of persisted log lines replayed to a new SSE subscriber",
  buckets: [0, 5, 10, 25, 50, 100, 250, 500],
  registers: [brimbleRegistry],
});


export {
    sseActiveConnections,
    sseConnectionDuration,
    sseReplaySize
}