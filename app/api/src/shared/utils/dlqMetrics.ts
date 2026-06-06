import client from "prom-client";
import { brimbleRegistry } from "./metrics";
const deadLetterCreatedCounter = new client.Counter({
  name: "brimble_dead_letter_created_total",
  help: "Dead letter entries created",
  registers: [brimbleRegistry],
  labelNames: ["job_type"],
});

const deadLetterResolvedCounter = new client.Counter({
  name: "brimble_dead_letter_resolved_total",
  help: "Dead letter entries resolved",
  registers: [brimbleRegistry],
  labelNames: ["job_type"],
});

export { deadLetterCreatedCounter, deadLetterResolvedCounter };
