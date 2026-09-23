import type { DatabaseClient } from "./client.js";

export interface DatabaseReadinessResult {
  status: "up" | "down";
  detail: string;
}

export async function checkDatabaseReadiness(
  client: DatabaseClient,
  timeoutMs = 750
): Promise<DatabaseReadinessResult> {
  try {
    await Promise.race([
      client.db.execute("select 1"),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Database readiness timed out")), timeoutMs);
      })
    ]);

    return {
      status: "up",
      detail: "query-ok"
    };
  } catch (error) {
    return {
      status: "down",
      detail: error instanceof Error ? error.message : "Database unavailable"
    };
  }
}
