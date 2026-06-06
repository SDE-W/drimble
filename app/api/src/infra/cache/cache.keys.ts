export const CacheTTL = {
  DEPLOYMENT: 30,
  DEPLOYMENT_LIST: 20,
  DEPLOYMENT_LOGS: 120,
  DEAD_LETTER: 60,
  DEAD_LETTER_LIST: 30,
} as const;

//  Key builders

export const CacheKeys = {
  deployment: (id: string) => `deployment:${id}`,
  deploymentList: (page: number, limit: number, status?: string) =>
    `deployment:list:${page}:${limit}:${status ?? "all"}`,
  deploymentLogs: (deploymentId: string, phase?: string) =>
    `deployment:logs:${deploymentId}:${phase ?? "all"}`,
  
  deadLetter: (jobId: string) => `dead-letter:${jobId}`,
  deadLetterList: (
    page: number,
    limit: number,
    tenantId?: string,
    jobType?: string,
  ) =>
    `dead-letter:list:${page}:${limit}:${tenantId ?? "all"}:${jobType ?? "all"}`,
} as const;
export const InvalidationPatterns = {
  allDeploymentLists: () => `deployment:list:*`,
  deploymentLogs: (deploymentId: string) => `deployment:logs:${deploymentId}:*`,

  allDeadLetterLists: () => `dead-letter:list:*`,
} as const;
