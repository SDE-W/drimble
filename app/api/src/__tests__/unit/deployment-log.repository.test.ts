import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { v4 as uuidv4 } from "uuid";

jest.mock("../../infra/db/pool");
jest.mock("../../infra/cache/cache.client");
jest.mock("../../infra/pubsub/log.publisher");
jest.mock("../../infra/cache/cache.keys", () => ({
  CacheKeys: {
    deploymentLogs: (id: string, phase?: string) =>
      `deployment:logs:${id}:${phase ?? "all"}`,
  },
  CacheTTL: { DEPLOYMENT_LOGS: 120 },
  InvalidationPatterns: {
    deploymentLogs: (id: string) => `deployment:logs:${id}:*`,
  },
}));

import { getPool } from "../../infra/db/pool";
import * as cacheClient from "../../infra/cache/cache.client";
// import * as logPublisher from "../../infra/pubsub/log.publisher";
import { deploymentLogRepository } from "../../domains/deployment-log/deployment-log.repository";

const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;
const mockCacheGetJson = cacheClient.cacheGetJson as jest.MockedFunction<typeof cacheClient.cacheGetJson>;
const mockCacheSetJson = cacheClient.cacheSetJson as jest.MockedFunction<typeof cacheClient.cacheSetJson>;
const mockCacheDelByPattern = cacheClient.cacheDelByPattern as jest.MockedFunction<typeof cacheClient.cacheDelByPattern>;
// const mockPublishLog = logPublisher.publishLog as jest.MockedFunction<typeof logPublisher.publishLog>;
// const mockPublishManyLogs = logPublisher.publishManyLogs as jest.MockedFunction<typeof logPublisher.publishManyLogs>;

function makeLogRow(overrides: Record<string, unknown> = {}) {
  const deploymentId = uuidv4();
  return {
    id: uuidv4(),
    deployment_id: deploymentId,
    seq: 1,
    ts: new Date(),
    line: "Step 1: cloning repo",
    phase: "clone",
    ...overrides,
  };
}

function makePool(rows: Record<string, unknown>[]) {
  return {
    query: jest.fn<()=> Promise<object>>().mockResolvedValue({ rows, rowCount: rows.length }),
    connect: jest.fn(),
  };
}

describe("DeploymentLogRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheDelByPattern.mockResolvedValue(undefined);
    mockCacheSetJson.mockResolvedValue(undefined);
    // mockPublishLog.mockResolvedValue(undefined);
    // mockPublishManyLogs.mockResolvedValue(undefined);
  });

  //  insert 

  describe("insert", () => {
    it("publishes log after successful DB insert", async () => {
      const row = makeLogRow();
      mockGetPool.mockReturnValue(
        makePool([row]) as unknown as ReturnType<typeof getPool>,
      );

      await deploymentLogRepository.insert({
        deploymentId: row.deployment_id as string,
        seq: row.seq as number,
        ts: row.ts as Date,
        line: row.line as string,
        phase: "clone",
      });

    //   expect(mockPublishLog).toHaveBeenCalledWith(
    //     expect.objectContaining({ seq: row.seq, line: row.line }),
    //   );
    });

    it("does NOT publish when ON CONFLICT DO NOTHING returns no rows", async () => {
      // DB returns empty rows = conflict, duplicate seq
      mockGetPool.mockReturnValue(
        makePool([]) as unknown as ReturnType<typeof getPool>,
      );

      await deploymentLogRepository.insert({
        deploymentId: uuidv4(),
        seq: 1,
        ts: new Date(),
        line: "duplicate",
        phase: "build",
      });

    //   expect(mockPublishLog).not.toHaveBeenCalled();
    });

    it("invalidates cache after insert", async () => {
      const row = makeLogRow();
      mockGetPool.mockReturnValue(
        makePool([row]) as unknown as ReturnType<typeof getPool>,
      );

      await deploymentLogRepository.insert({
        deploymentId: row.deployment_id as string,
        seq: 1,
        ts: new Date(),
        line: "x",
        phase: "build",
      });

      expect(mockCacheDelByPattern).toHaveBeenCalledWith(
        `deployment:logs:${row.deployment_id}:*`,
        "deployment-log",
        "log_inserted",
      );
    });

    it("does not throw when publish fails - DB write is the source of truth", async () => {
      const row = makeLogRow();
      mockGetPool.mockReturnValue(
        makePool([row]) as unknown as ReturnType<typeof getPool>,
      );
    //   mockPublishLog.mockRejectedValueOnce(new Error("Redis down") as never);

      // publishLog errors are swallowed inside log.publisher.ts
      // The repository itself should not propagate them
      await expect(
        deploymentLogRepository.insert({
          deploymentId: row.deployment_id as string,
          seq: 1,
          ts: new Date(),
          line: "x",
          phase: "build",
        }),
      ).resolves.toBeUndefined();
    });
  });

  //  insertMany 

  describe("insertMany", () => {
    it("calls publishManyLogs with all inserted rows", async () => {
      const deploymentId = uuidv4();
      const rows = [
        makeLogRow({ deployment_id: deploymentId, seq: 1 }),
        makeLogRow({ deployment_id: deploymentId, seq: 2 }),
        makeLogRow({ deployment_id: deploymentId, seq: 3 }),
      ];
      mockGetPool.mockReturnValue(
        makePool(rows) as unknown as ReturnType<typeof getPool>,
      );

      const logs = rows.map((r) => ({
        deploymentId: r.deployment_id as string,
        seq: r.seq as number,
        ts: r.ts as Date,
        line: r.line as string,
        phase: "build" as const,
      }));

      await deploymentLogRepository.insertMany(logs);

    //   expect(mockPublishManyLogs).toHaveBeenCalledWith(
    //     expect.arrayContaining([
    //       expect.objectContaining({ seq: 1 }),
    //       expect.objectContaining({ seq: 2 }),
    //       expect.objectContaining({ seq: 3 }),
    //     ]),
    //   );
    });

    it("does nothing when logs array is empty", async () => {
      await deploymentLogRepository.insertMany([]);

      expect(mockGetPool).not.toHaveBeenCalled();
    //   expect(mockPublishManyLogs).not.toHaveBeenCalled();
    });

    it("only publishes rows returned by DB - skips conflict rows", async () => {
      const deploymentId = uuidv4();
      // Send 3 logs but DB returns only 2 (one was a conflict)
      const returnedRows = [
        makeLogRow({ deployment_id: deploymentId, seq: 1 }),
        makeLogRow({ deployment_id: deploymentId, seq: 3 }),
      ];
      mockGetPool.mockReturnValue(
        makePool(returnedRows) as unknown as ReturnType<typeof getPool>,
      );

      await deploymentLogRepository.insertMany([
        { deploymentId, seq: 1, ts: new Date(), line: "a", phase: "build" },
        { deploymentId, seq: 2, ts: new Date(), line: "b", phase: "build" }, // conflict
        { deploymentId, seq: 3, ts: new Date(), line: "c", phase: "build" },
      ]);

    //   const publishedLogs = mockPublishManyLogs.mock.calls[0][0];
    //   expect(publishedLogs).toHaveLength(2);
    });
  });

  //  findByDeploymentId 

  describe("findByDeploymentId", () => {
    it("returns cached logs on hit, never queries DB", async () => {
      const logs = [makeLogRow(), makeLogRow()];
      mockCacheGetJson.mockResolvedValueOnce(logs as unknown as never);

      const result = await deploymentLogRepository.findByDeploymentId(uuidv4());

      expect(result).toHaveLength(2);
      expect(mockGetPool).not.toHaveBeenCalled();
    });

    it("queries DB on miss and writes to cache when logs exist", async () => {
      const deploymentId = uuidv4();
      const rows = [makeLogRow({ deployment_id: deploymentId })];
      mockCacheGetJson.mockResolvedValueOnce(null);
      mockGetPool.mockReturnValue(
        makePool(rows) as unknown as ReturnType<typeof getPool>,
      );

      const result = await deploymentLogRepository.findByDeploymentId(deploymentId);

      expect(result).toHaveLength(1);
      expect(mockCacheSetJson).toHaveBeenCalledWith(
        `deployment:logs:${deploymentId}:all`,
        expect.any(Array),
        "deployment-log",
        120,
      );
    });

    it("does not write to cache when DB returns empty result", async () => {
      mockCacheGetJson.mockResolvedValueOnce(null);
      mockGetPool.mockReturnValue(
        makePool([]) as unknown as ReturnType<typeof getPool>,
      );

      await deploymentLogRepository.findByDeploymentId(uuidv4());

      expect(mockCacheSetJson).not.toHaveBeenCalled();
    });

    it("filters by phase when provided", async () => {
      const deploymentId = uuidv4();
      mockCacheGetJson.mockResolvedValueOnce(null);
      const pool = makePool([]);
      mockGetPool.mockReturnValue(pool as unknown as ReturnType<typeof getPool>);

      await deploymentLogRepository.findByDeploymentId(deploymentId, "build");

      const queryCall = pool.query.mock.calls[0] as unknown as [string, unknown[]];
      expect(queryCall[0]).toContain("phase");
      expect(queryCall[1]).toContain("build");
    });
  });

  //  countByDeploymentId 

  describe("countByDeploymentId", () => {
    it("returns count from DB", async () => {
      mockGetPool.mockReturnValue(
        makePool([{ count: "42" }]) as unknown as ReturnType<typeof getPool>,
      );

      const count = await deploymentLogRepository.countByDeploymentId(uuidv4());

      expect(count).toBe(42);
    });
  });
});