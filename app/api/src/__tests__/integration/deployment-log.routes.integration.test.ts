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
import buildApp from "./helpers/buildApp";
import {
  seedDeployment,
  seedDeploymentLog,
  seedDeploymentLogs,
} from "./helpers/seeders";

const app = buildApp();

describe("GET /api/v1/deployment-logs", () => {
  it("returns 400 when deploymentId is missing", async () => {
    const res = await request(app).get("/api/v1/deployment-logs");
    expect(res.status).toBe(400);
  });

  it("returns 404 when page is omitted and deployment does not exist", async () => {
    const res = await request(app)
      .get("/api/v1/deployment-logs")
      .query({ deploymentId: "00000000-0000-0000-0000-000000000000", limit: "20" });
    expect(res.status).toBe(404);
  });

  it("returns 404 when deployment does not exist", async () => {
    const res = await request(app)
      .get("/api/v1/deployment-logs")
      .query({
        deploymentId: "00000000-0000-0000-0000-000000000000",
        page: "1",
        limit: "20",
      });
    expect(res.status).toBe(404);
  });

  it("returns 200 with empty list when deployment exists but has no logs", async () => {
    const deployment = await seedDeployment();

    const res = await request(app)
      .get("/api/v1/deployment-logs")
      .query({ deploymentId: deployment.id, page: "1", limit: "20" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.totalCount).toBe(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  it("returns logs ordered by seq ASC", async () => {
    const deployment = await seedDeployment();
    await seedDeploymentLogs(deployment.id, 3, "build");

    const res = await request(app)
      .get("/api/v1/deployment-logs")
      .query({ deploymentId: deployment.id, page: "1", limit: "20" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    const seqs = res.body.data.map((l: { seq: number }) => l.seq);
    expect(seqs).toEqual([1, 2, 3]);
  });

  it("paginates correctly: page=2 limit=2 of 5 returns items 3-4", async () => {
    const deployment = await seedDeployment();
    await seedDeploymentLogs(deployment.id, 5);

    const res = await request(app)
      .get("/api/v1/deployment-logs")
      .query({ deploymentId: deployment.id, page: "2", limit: "2" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.totalCount).toBe(5);
    expect(res.body.page).toBe(2);
    // Items 3 and 4 by seq
    expect(res.body.data[0].seq).toBe(3);
    expect(res.body.data[1].seq).toBe(4);
  });

  it("returns empty data when page exceeds total", async () => {
    const deployment = await seedDeployment();
    await seedDeploymentLogs(deployment.id, 2);

    const res = await request(app)
      .get("/api/v1/deployment-logs")
      .query({ deploymentId: deployment.id, page: "10", limit: "20" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.totalCount).toBe(2);
  });

  it("filters by phase: returns only build logs", async () => {
    const deployment = await seedDeployment();
    await seedDeploymentLog({
      deploymentId: deployment.id,
      seq: 1,
      line: "cloning repo",
      phase: "clone",
    });
    await seedDeploymentLog({
      deploymentId: deployment.id,
      seq: 2,
      line: "building image",
      phase: "build",
    });
    await seedDeploymentLog({
      deploymentId: deployment.id,
      seq: 3,
      line: "starting container",
      phase: "run",
    });

    const res = await request(app)
      .get("/api/v1/deployment-logs")
      .query({ deploymentId: deployment.id, phase: "build", page: "1", limit: "20" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].phase).toBe("build");
    expect(res.body.data[0].line).toBe("building image");
    expect(res.body.totalCount).toBe(1);
  });

  it("filters by phase: returns only clone logs", async () => {
    const deployment = await seedDeployment();
    // Use startSeq offset so clone (1-3) and build (4-5) do not share seq numbers
    await seedDeploymentLogs(deployment.id, 3, "clone", 1);
    await seedDeploymentLogs(deployment.id, 2, "build", 4);

    const res = await request(app)
      .get("/api/v1/deployment-logs")
      .query({ deploymentId: deployment.id, phase: "clone", page: "1", limit: "20" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.every((l: { phase: string }) => l.phase === "clone")).toBe(true);
  });

  it("response shape includes id, deploymentId, seq, ts, line, phase", async () => {
    const deployment = await seedDeployment();
    await seedDeploymentLog({
      deploymentId: deployment.id,
      seq: 1,
      line: "test line",
      phase: "build",
    });

    const res = await request(app)
      .get("/api/v1/deployment-logs")
      .query({ deploymentId: deployment.id, page: "1", limit: "20" });

    expect(res.status).toBe(200);
    const log = res.body.data[0];
    expect(log).toHaveProperty("id");
    expect(log).toHaveProperty("deploymentId");
    expect(log).toHaveProperty("seq");
    expect(log).toHaveProperty("ts");
    expect(log).toHaveProperty("line");
    expect(log).toHaveProperty("phase");
    expect(log.deploymentId).toBe(deployment.id);
  });
});

describe("GET /api/v1/deployment-logs/count", () => {
  it("returns 400 when deploymentId is missing", async () => {
    const res = await request(app).get("/api/v1/deployment-logs/count");
    expect(res.status).toBe(400);
  });

  it("returns 404 when deployment does not exist", async () => {
    const res = await request(app)
      .get("/api/v1/deployment-logs/count")
      .query({ deploymentId: "00000000-0000-0000-0000-000000000000" });

    expect(res.status).toBe(404);
  });

  it("returns 0 when deployment has no logs", async () => {
    const deployment = await seedDeployment();

    const res = await request(app)
      .get("/api/v1/deployment-logs/count")
      .query({ deploymentId: deployment.id });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.deploymentId).toBe(deployment.id);
  });

  it("returns correct count after seeding logs", async () => {
    const deployment = await seedDeployment();
    await seedDeploymentLogs(deployment.id, 7);

    const res = await request(app)
      .get("/api/v1/deployment-logs/count")
      .query({ deploymentId: deployment.id });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(7);
  });

  it("count reflects only logs for requested deployment", async () => {
    const dep1 = await seedDeployment();
    const dep2 = await seedDeployment();
    await seedDeploymentLogs(dep1.id, 5);
    await seedDeploymentLogs(dep2.id, 3);

    const res = await request(app)
      .get("/api/v1/deployment-logs/count")
      .query({ deploymentId: dep1.id });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(5);
  });
});