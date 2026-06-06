import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

export default async function globalTeardown(): Promise<void> {
  const container = (global as Record<string, unknown>)
    .__PG_CONTAINER__ as StartedPostgreSqlContainer | undefined;

  if (container) {
    await container.stop();
    console.log("[globalTeardown] PostgreSQL container stopped");
  }
}