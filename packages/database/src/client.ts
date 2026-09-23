import type { ShipyardConfig } from "@shipyard/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema.js";

export interface DatabaseClient {
  pool: Pool;
  db: ReturnType<typeof drizzle<typeof schema>>;
  close: () => Promise<void>;
}

export interface CreateDatabaseClientOptions {
  connectionString: string;
  pool?: Omit<PoolConfig, "connectionString">;
}

export function createDatabaseClient(options: CreateDatabaseClientOptions): DatabaseClient {
  const pool = new Pool({
    connectionString: options.connectionString,
    ...options.pool
  });

  const db = drizzle(pool, { schema });

  return {
    pool,
    db,
    close: async () => {
      await pool.end();
    }
  };
}

export function createDatabaseClientFromConfig(
  config: Pick<ShipyardConfig, "database">,
  options?: Omit<CreateDatabaseClientOptions, "connectionString">
): DatabaseClient {
  return createDatabaseClient({
    connectionString: config.database.url,
    ...options
  });
}
