import { loadConfig } from "@shipyard/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createDatabaseClientFromConfig } from "./client.js";

export async function runMigrations(): Promise<void> {
  const config = loadConfig(process.env);
  const client = createDatabaseClientFromConfig(config);

  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const migrationsFolder = resolve(currentDir, "..", "drizzle");
    await migrate(client.db, { migrationsFolder });
  } finally {
    await client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigrations()
    .then(() => {
      console.log("Database migrations applied successfully.");
    })
    .catch((error) => {
      console.error("Failed to apply database migrations.");
      console.error(error instanceof Error ? error.message : "Unknown migration error");
      process.exit(1);
    });
}
