
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { v4 as uuidv4 } from "uuid";

jest.mock("../../infra/db/pool");
jest.mock("../../infra/cache/cache.client");
jest.mock("../../infra/config/redis.client", () => ({
  getRedisClientSync: jest.fn(),
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
}));
jest.mock("../../infra/cache/cache.keys", () => ({
  CacheKeys: {
    deadLetter: (jobId: string) => `dead-letter:${jobId}`,
    deadLetterList: (
      page: number,
      limit: number,
      tenantId?: string,
      jobType?: string,
    ) => `dead-letter:list:${page}:${limit}:${tenantId ?? "all"}:${jobType ?? "all"}`,
  },
  CacheTTL: { DEAD_LETTER: 60, DEAD_LETTER_LIST: 30 },
  InvalidationPatterns: {
    allDeadLetterLists: () => "dead-letter:list:*",
  },
}));

import { getPool } from "../../infra/db/pool";
import * as cacheClient from "../../infra/cache/cache.client";
import { deadLetterRepository } from "../../domains/dead-letter/dead-letter.repository";

//  Typed mock helpers 

const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;
const mockCacheGetJson = cacheClient.cacheGetJson as jest.MockedFunction<typeof cacheClient.cacheGetJson>;
const mockCacheSetJson = cacheClient.cacheSetJson as jest.MockedFunction<typeof cacheClient.cacheSetJson>;
const mockCacheDel = cacheClient.cacheDel as jest.MockedFunction<typeof cacheClient.cacheDel>;
const mockCacheDelByPattern = cacheClient.cacheDelByPattern as jest.MockedFunction<typeof cacheClient.cacheDelByPattern>;

function makePoolQuery(rows: Record<string, unknown>[]) {
  return {
    query: jest.fn<()=> Promise<object>>().mockResolvedValue({ rows, rowCount: rows.length }),
    connect: jest.fn(),
  };
}

function makeDeadLetterRow(overrides: Record<string, unknown> = {}) {
  const jobId = uuidv4();
  return {
    id: uuidv4(),
    job_id: jobId,
    job_type: "DEPLOYMENT",
    tenant_id: "tenant-1",
    payload: {},
    attempts: 3,
    errors: [{ attempt: 3, error: "timeout", occurredAt: new Date() }],
    dead_at: new Date(),
    resolved_at: null,
    resolved_by: null,
    resolution: null,
    expires_at: new Date(Date.now() + 86400000 * 30),
    ...overrides,
  };
}

//  Tests 

describe("DeadLetterRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheDelByPattern.mockResolvedValue(undefined);
    mockCacheDel.mockResolvedValue(undefined);
    mockCacheSetJson.mockResolvedValue(undefined);
  });

  //  findByJobId 

  describe("findByJobId", () => {
    it("returns cached value and never queries DB on cache hit", async () => {
      const row = makeDeadLetterRow();
      mockCacheGetJson.mockResolvedValueOnce(row as unknown as never);

      const result = await deadLetterRepository.findByJobId(row.job_id as string);

      expect(result).toEqual(row);
      expect(mockGetPool).not.toHaveBeenCalled();
    });

    it("queries DB on cache miss and writes result to cache", async () => {
      const row = makeDeadLetterRow();
      mockCacheGetJson.mockResolvedValueOnce(null);
      mockGetPool.mockReturnValue(
        makePoolQuery([row]) as unknown as ReturnType<typeof getPool>,
      );

      const result = await deadLetterRepository.findByJobId(row.job_id as string);

      expect(result?.jobId).toBe(row.job_id);
      expect(mockCacheSetJson).toHaveBeenCalledWith(
        `dead-letter:${row.job_id}`,
        expect.objectContaining({ jobId: row.job_id }),
        "dead-letter",
        60,
      );
    });

    it("returns null and does not write to cache when DB returns no rows", async () => {
      mockCacheGetJson.mockResolvedValueOnce(null);
      mockGetPool.mockReturnValue(
        makePoolQuery([]) as unknown as ReturnType<typeof getPool>,
      );

      const result = await deadLetterRepository.findByJobId(uuidv4());

      expect(result).toBeNull();
      expect(mockCacheSetJson).not.toHaveBeenCalled();
    });
  });

  //  findUnresolved 

  describe("findUnresolved", () => {
    it("returns cached paginated result on hit", async () => {
      const cached = { data: [makeDeadLetterRow()], totalCount: 1, page: 1, limit: 20 };
      mockCacheGetJson.mockResolvedValueOnce(cached as unknown as never);

      const result = await deadLetterRepository.findUnresolved(
        undefined, undefined, 1, 20,
      );

      expect(result.totalCount).toBe(1);
      expect(mockGetPool).not.toHaveBeenCalled();
    });

    it("queries DB with correct LIMIT and OFFSET on cache miss", async () => {
      const row = makeDeadLetterRow();
      mockCacheGetJson.mockResolvedValueOnce(null);

      const pool = makePoolQuery([row]);
      // findUnresolved calls pool.query twice: data + count
      pool.query
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ count: "1" }], rowCount: 1 } as never);
      mockGetPool.mockReturnValue(pool as unknown as ReturnType<typeof getPool>);

      const result = await deadLetterRepository.findUnresolved(
        undefined, undefined, 2, 10,
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalCount).toBe(1);

      // Assert OFFSET = (2-1)*10 = 10 is passed to the query
      const dataQueryCall = pool.query.mock.calls[0] as unknown as [string, unknown[]];
      expect(dataQueryCall[1]).toContain(10); // LIMIT
      expect(dataQueryCall[1]).toContain(10); // OFFSET
    });

    it("filters by tenantId when provided", async () => {
      mockCacheGetJson.mockResolvedValueOnce(null);
      const pool = makePoolQuery([]);
      pool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ count: "0" }], rowCount: 1 } as never);
      mockGetPool.mockReturnValue(pool as unknown as ReturnType<typeof getPool>);

      await deadLetterRepository.findUnresolved("tenant-abc", undefined, 1, 20);

      const dataQuery = pool.query.mock.calls[0] as unknown as [string, unknown[]];
      expect(dataQuery[0]).toContain("tenant_id");
      expect(dataQuery[1]).toContain("tenant-abc");
    });

    it("writes result to cache after DB query", async () => {
      const row = makeDeadLetterRow();
      mockCacheGetJson.mockResolvedValueOnce(null);
      const pool = makePoolQuery([row]);
      pool.query
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ count: "1" }], rowCount: 1 } as never);
      mockGetPool.mockReturnValue(pool as unknown as ReturnType<typeof getPool>);

      await deadLetterRepository.findUnresolved(undefined, undefined, 1, 20);

      expect(mockCacheSetJson).toHaveBeenCalledWith(
        expect.stringContaining("dead-letter:list:"),
        expect.objectContaining({ totalCount: 1 }),
        "dead-letter",
        30,
      );
    });
  });

  //  create 

  describe("create", () => {
    it("inserts and returns mapped dead letter", async () => {
      const row = makeDeadLetterRow();
      mockGetPool.mockReturnValue(
        makePoolQuery([row]) as unknown as ReturnType<typeof getPool>,
      );

      const result = await deadLetterRepository.create({
        jobId: row.job_id as string,
        jobType: "DEPLOYMENT",
        tenantId: "tenant-1",
        payload: {},
        attempts: 3,
        errors: [],
      });

      expect(result.jobId).toBe(row.job_id);
      expect(result.jobType).toBe("DEPLOYMENT");
    });

    it("invalidates list cache after insert when no transaction client", async () => {
      const row = makeDeadLetterRow();
      mockGetPool.mockReturnValue(
        makePoolQuery([row]) as unknown as ReturnType<typeof getPool>,
      );

      await deadLetterRepository.create({
        jobId: row.job_id as string,
        jobType: "DEPLOYMENT",
        tenantId: "t1",
        payload: {},
        attempts: 1,
        errors: [],
      });

      expect(mockCacheDelByPattern).toHaveBeenCalledWith(
        "dead-letter:list:*",
        "dead-letter",
        "dead_letter_created",
      );
    });

    it("does NOT invalidate cache when transaction client is passed", async () => {
      const row = makeDeadLetterRow();
      const txClient = {
        query: jest.fn<()=> Promise<object>>().mockResolvedValue({ rows: [row], rowCount: 1 }),
      };

      await deadLetterRepository.create(
        {
          jobId: row.job_id as string,
          jobType: "DEPLOYMENT",
          tenantId: "t1",
          payload: {},
          attempts: 1,
          errors: [],
        },
        txClient as never,
      );

      // Cache invalidation must NOT happen inside a transaction - it happens
      // post-COMMIT in the service layer
      expect(mockCacheDelByPattern).not.toHaveBeenCalled();
    });
  });

  //  resolve 

  describe("resolve", () => {
    it("returns null and skips cache ops when no matching unresolved row", async () => {
      mockGetPool.mockReturnValue(
        makePoolQuery([]) as unknown as ReturnType<typeof getPool>,
      );

      const result = await deadLetterRepository.resolve(
        uuidv4(), "system", "manual fix",
      );

      expect(result).toBeNull();
      expect(mockCacheDel).not.toHaveBeenCalled();
      expect(mockCacheDelByPattern).not.toHaveBeenCalled();
    });

    it("invalidates per-record and list cache on successful resolve", async () => {
      const row = makeDeadLetterRow({
        resolved_at: new Date(),
        resolved_by: "system",
        resolution: "manual fix",
      });
      mockGetPool.mockReturnValue(
        makePoolQuery([row]) as unknown as ReturnType<typeof getPool>,
      );

      await deadLetterRepository.resolve(
        row.job_id as string, "system", "manual fix",
      );

      expect(mockCacheDel).toHaveBeenCalledWith(
        [`dead-letter:${row.job_id}`],
        "dead-letter",
      );
      expect(mockCacheDelByPattern).toHaveBeenCalledWith(
        "dead-letter:list:*",
        "dead-letter",
        "dead_letter_resolved",
      );
    });

    it("does NOT invalidate cache when transaction client is passed", async () => {
      const row = makeDeadLetterRow({ resolved_at: new Date() });
      const txClient = {
        query: jest.fn<()=> Promise<object>>().mockResolvedValue({ rows: [row], rowCount: 1 }),
      };

      await deadLetterRepository.resolve(
        row.job_id as string, "system", "fix", txClient as never,
      );

      expect(mockCacheDel).not.toHaveBeenCalled();
    });
  });
});