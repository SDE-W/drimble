
jest.mock("@/shared/utils/metrics", () => ({
  measureDatabaseQuery: jest.fn(
    async (_op: unknown, fn: () => Promise<unknown>) => fn(),
  ),
  trackError: jest.fn(),
  trackHttpRequest: jest.fn(),
  measurePipelinePhase: jest.fn(
    async (_p: unknown, _d: unknown, fn: () => Promise<unknown>) => fn(),
  ),
  brimbleRegistry: { contentType: "text/plain", metrics: jest.fn(async () => "") },
  cacheHitsTotal: { inc: jest.fn() },
  cacheMissesTotal: { inc: jest.fn() },
  cacheErrorsTotal: { inc: jest.fn() },
  cacheOperationDuration: { startTimer: jest.fn(() => jest.fn()) },
  cacheInvalidationsTotal: { inc: jest.fn() },
  dbPoolCheckoutDuration: { observe: jest.fn() },
  dbPoolSize: { set: jest.fn() },
  dbPoolIdleConnections: { set: jest.fn() },
  dbPoolWaitingCount: { set: jest.fn() },
  serviceHealth: { set: jest.fn() },
}));
jest.mock("@/shared/utils/dlqMetrics", () => ({
  deadLetterCreatedCounter: { inc: jest.fn() },
  deadLetterResolvedCounter: { inc: jest.fn() },
}));
jest.mock("@/shared/utils/deploymentMetrics", () => ({
  deploymentCreatedCounter: { inc: jest.fn() },
  deploymentConflictCounter: { inc: jest.fn() },
  deploymentPublishErrorCounter: { inc: jest.fn() },
  deploymentNotFoundCounter: { inc: jest.fn() },
}));
jest.mock("@/shared/utils/sseMetrics", () => ({
  sseActiveConnections: { inc: jest.fn(), dec: jest.fn() },
  sseConnectionDuration: { observe: jest.fn() },
  sseReplaySize: { observe: jest.fn() },
}));
jest.mock("@/infra/messaging/producer", () => ({
  publishDeploymentRequested: jest.fn(async () => undefined),
  publishToExchange: jest.fn(),
}));
jest.mock("@/domains/deployment/events/bus", () => ({
  deploymentEventBus: {
    onLog: jest.fn(() => jest.fn()),
    onStatus: jest.fn(() => jest.fn()),
    emitLog: jest.fn(),
    emitStatus: jest.fn(),
  },
}));
jest.mock("@/infra/cache/cache.client", () => ({
  cacheGetJson: jest.fn(async () => null),
  cacheSetJson: jest.fn(async () => undefined),
  cacheDel: jest.fn(async () => undefined),
  cacheDelByPattern: jest.fn(async () => undefined),
  cacheGet: jest.fn(async () => null),
  cacheSet: jest.fn(async () => undefined),
}));

import { describe, it, expect, jest } from "@jest/globals";
import request from "supertest";
import http from "http";
import { getPool } from "../../infra/db/pool";
import buildApp from "./helpers/buildApp";
import { seedDeployment, seedDeploymentLogs } from "./helpers/seeders";

const app = buildApp();

//  POST /api/v1/deployments 
describe("POST /api/v1/deployments", () => {
  it("creates a git deployment and returns 202 with the deployment", async () => {
    const res = await request(app)
      .post("/api/v1/deployments")
      .send({
        sourceType: "git",
        sourceRef: "https://github.com/brimble/test-repo",
        name: "my-app",
      });

    expect(res.status).toBe(202);
    expect(res.body.id).toBeDefined();
    expect(res.body.sourceType).toBe("git");
    expect(res.body.sourceRef).toBe("https://github.com/brimble/test-repo");
    expect(res.body.name).toBe("my-app");
    expect(res.body.status).toBe("pending");

    // Assert persisted to DB
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT * FROM deployments WHERE id = $1",
      [res.body.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].source_type).toBe("git");
  });

  it("creates deployment without optional name", async () => {
    const res = await request(app)
      .post("/api/v1/deployments")
      .send({
        sourceType: "git",
        sourceRef: "https://github.com/brimble/no-name-repo",
      });

    expect(res.status).toBe(202);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("pending");
  });

  it("returns 400 when sourceType is missing", async () => {
    const res = await request(app)
      .post("/api/v1/deployments")
      .send({ sourceRef: "https://github.com/test/repo" });

    expect(res.status).toBe(400);

    // Assert nothing written to DB
    const pool = getPool();
    const { rows } = await pool.query("SELECT COUNT(*) as count FROM deployments");
    expect(parseInt(rows[0].count as string, 10)).toBe(0);
  });

  it("returns 400 when sourceRef is missing", async () => {
    const res = await request(app)
      .post("/api/v1/deployments")
      .send({ sourceType: "git" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when sourceType is not git or upload", async () => {
    const res = await request(app)
      .post("/api/v1/deployments")
      .send({ sourceType: "ftp", sourceRef: "ftp://example.com/repo" });

    expect(res.status).toBe(400);
  });

  it("persists deployment with pending status regardless of input status", async () => {
    // Status must always start as pending - cannot be set by caller
    const res = await request(app)
      .post("/api/v1/deployments")
      .send({
        sourceType: "git",
        sourceRef: "https://github.com/test/repo",
        status: "running", // caller tries to inject status
      });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe("pending");

    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT status FROM deployments WHERE id = $1",
      [res.body.id],
    );
    expect(rows[0].status).toBe("pending");
  });
});

//  GET /api/v1/deployments 

describe("GET /api/v1/deployments", () => {
  it("returns 200 with empty array when no deployments exist", async () => {
    const res = await request(app).get("/api/v1/deployments");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it("returns all deployments", async () => {
    await seedDeployment({ name: "app-1", sourceType: "git" });
    await seedDeployment({ name: "app-2", sourceType: "git" });
    await seedDeployment({ name: "app-3", sourceType: "git" });

    const res = await request(app).get("/api/v1/deployments");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it("response items contain required fields", async () => {
    await seedDeployment({ name: "shape-test", sourceType: "git" });

    const res = await request(app).get("/api/v1/deployments");

    expect(res.status).toBe(200);
    const item = res.body[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("sourceType");
    expect(item).toHaveProperty("sourceRef");
    expect(item).toHaveProperty("status");
    expect(item).toHaveProperty("createdAt");
  });

  it("returns deployments of all statuses", async () => {
    await seedDeployment({ status: "pending" });
    await seedDeployment({ status: "running" });
    await seedDeployment({ status: "failed" });

    const res = await request(app).get("/api/v1/deployments");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const statuses = res.body.map((d: { status: string }) => d.status);
    expect(statuses).toContain("pending");
    expect(statuses).toContain("running");
    expect(statuses).toContain("failed");
  });
});

//  GET /api/v1/deployments/:id 

describe("GET /api/v1/deployments/:id", () => {
  it("returns 200 with the deployment when found", async () => {
    const seeded = await seedDeployment({ name: "find-me", sourceType: "git" });

    const res = await request(app).get(`/api/v1/deployments/${seeded.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seeded.id);
    expect(res.body.name).toBe("find-me");
  });

  it("returns 404 when id does not exist", async () => {
    const res = await request(app).get(
      "/api/v1/deployments/00000000-0000-0000-0000-000000000000",
    );

    expect(res.status).toBe(404);
  });

  it("returns full deployment shape", async () => {
    const seeded = await seedDeployment({
      sourceType: "git",
      sourceRef: "https://github.com/test/repo",
      status: "running",
    });

    const res = await request(app).get(`/api/v1/deployments/${seeded.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seeded.id);
    expect(res.body.sourceType).toBe("git");
    expect(res.body.sourceRef).toBe("https://github.com/test/repo");
    expect(res.body.status).toBe("running");
    expect(res.body.attempts).toBe(0);
    expect(res.body).toHaveProperty("createdAt");
    expect(res.body).toHaveProperty("updatedAt");
  });

  it("cache hit: second request does not change the response", async () => {
    const seeded = await seedDeployment({ name: "cached-dep" });

    const res1 = await request(app).get(`/api/v1/deployments/${seeded.id}`);
    const res2 = await request(app).get(`/api/v1/deployments/${seeded.id}`);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.id).toBe(res2.body.id);
    expect(res1.body.name).toBe(res2.body.name);
  });
});

//  GET /api/v1/deployments/:id/logs (SSE) 

describe("GET /api/v1/deployments/:id/logs (SSE)", () => {
  function collectSSEEvents(
    deploymentId: string,
    durationMs = 600,
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const server = app.listen(0, () => {
        const port = (server.address() as { port: number }).port;
        const events: string[] = [];

        const req = http.request(
          {
            host: "localhost",
            port,
            path: `/api/v1/deployments/${deploymentId}/logs`,
            method: "GET",
            headers: { Accept: "text/event-stream" },
          },
          (res) => {
            res.setEncoding("utf-8");
            res.on("data", (chunk: string) => {
              events.push(...chunk.split("\n").filter(Boolean));
            });
            res.on("error", reject);
          },
        );

        req.on("error", reject);
        req.end();

        setTimeout(() => {
          req.destroy();
          server.close(() => resolve(events));
        }, durationMs);
      });
    });
  }

  it("returns 404 for non-existent deployment", async () => {
    const res = await request(app).get(
      "/api/v1/deployments/00000000-0000-0000-0000-000000000000/logs",
    );
    expect(res.status).toBe(404);
  });

  it("opens SSE connection with correct headers", async () => {
    const deployment = await seedDeployment({ status: "building" });

    const res = await request(app)
      .get(`/api/v1/deployments/${deployment.id}/logs`)
      .buffer(false)
      .parse((_res, callback) => {
        callback(null, null);
      });

    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.headers["cache-control"]).toBe("no-cache");
    expect(res.headers["connection"]).toBe("keep-alive");
  });

  it("replays existing logs as catch-up events", async () => {
    const deployment = await seedDeployment({ status: "building" });
    await seedDeploymentLogs(deployment.id, 4, "build");

    const events = await collectSSEEvents(deployment.id);

    const logEvents = events.filter((e) => e.startsWith("event: log"));
    expect(logEvents).toHaveLength(4);
  });

  it("sends done event immediately for terminal deployment", async () => {
    const deployment = await seedDeployment({ status: "running" });
    await seedDeploymentLogs(deployment.id, 2);

    const events = await collectSSEEvents(deployment.id);

    const doneEvents = events.filter((e) => e.startsWith("event: done"));
    expect(doneEvents).toHaveLength(1);
  });

  it("sends done event for failed deployment", async () => {
    const deployment = await seedDeployment({ status: "failed" });

    const events = await collectSSEEvents(deployment.id);

    const doneEvents = events.filter((e) => e.startsWith("event: done"));
    expect(doneEvents).toHaveLength(1);
  });

  it("data events contain deploymentId, seq, line, phase fields", async () => {
    const deployment = await seedDeployment({ status: "running" });
    await seedDeploymentLogs(deployment.id, 1, "clone");

    const events = await collectSSEEvents(deployment.id);

    const dataLines = events.filter((e) => e.startsWith("data:"));
    expect(dataLines.length).toBeGreaterThan(0);

    const firstData = JSON.parse(dataLines[0].replace("data: ", "").trim()) as Record<string, unknown>;
    expect(firstData).toHaveProperty("deploymentId");
    expect(firstData).toHaveProperty("seq");
    expect(firstData).toHaveProperty("line");
    expect(firstData).toHaveProperty("phase");
  });
});

