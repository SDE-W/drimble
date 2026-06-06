import client from "prom-client";
import { brimbleRegistry } from "./metrics";

const containerStartDuration = new client.Histogram({
  name: "brimble_container_start_duration_seconds",
  help: "Time to start a container",
  buckets: [0.5, 1, 2, 5, 10, 30],
  registers: [brimbleRegistry],
  labelNames: ["status"],
});

const containerStopTotal = new client.Counter({
  name: "brimble_container_stop_total",
  help: "Container stop/remove operations",
  registers: [brimbleRegistry],
  labelNames: ["status"],
});

export {
    containerStartDuration,
    containerStopTotal
}