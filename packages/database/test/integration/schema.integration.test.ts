import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadConfig } from "@shipyard/config";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createDatabaseClient, createDatabaseClientFromConfig } from "../../src/client.js";
import { runMigrations } from "../../src/migrate.js";
import { authSessions, organizationMemberships, organizations, users } from "../../src/schema.js";

const shouldRun = process.env.SHIPYARD_RUN_DB_INTEGRATION === "1";

test(
  "integration: migrations and unique constraints work against PostgreSQL",
  { skip: !shouldRun },
  async () => {
    if (!process.env.DATABASE_URL) {
      const config = loadConfig(process.env);
      process.env.DATABASE_URL = config.database.url;
    }

    await runMigrations();

    const client = createDatabaseClientFromConfig(loadConfig(process.env));

    try {
      const email = `user-${randomUUID()}@example.com`;
      const slug = `org-${randomUUID().slice(0, 8)}`;

      const [createdUser] = await client.db
        .insert(users)
        .values({
          email,
          passwordHash: "hashed-password",
          displayName: "Ship User"
        })
        .returning();

      assert.ok(createdUser);

      const [createdOrganization] = await client.db
        .insert(organizations)
        .values({
          slug,
          name: "Ship Org"
        })
        .returning();

      assert.ok(createdOrganization);

      await client.db.insert(organizationMemberships).values({
        organizationId: createdOrganization.id,
        userId: createdUser.id,
        role: "owner"
      });

      await assert.rejects(
        () =>
          client.db.insert(organizationMemberships).values({
            organizationId: createdOrganization.id,
            userId: createdUser.id,
            role: "member"
          }),
        /organization_memberships_org_user_unique/
      );

      const [session] = await client.db
        .insert(authSessions)
        .values({
          userId: createdUser.id,
          tokenHash: randomUUID().replace(/-/g, ""),
          expiresAt: new Date(Date.now() + 60_000)
        })
        .returning();

      assert.ok(session);

      const activeSessions = await client.db
        .select()
        .from(authSessions)
        .where(
          and(
            eq(authSessions.userId, createdUser.id),
            isNull(authSessions.revokedAt),
            sql`${authSessions.expiresAt} > now()`
          )
        );

      assert.equal(activeSessions.length, 1);
    } finally {
      await client.close();
    }
  }
);

test(
  "integration: createDatabaseClient does not connect on import",
  { skip: !shouldRun },
  async () => {
    const client = createDatabaseClient({
      connectionString: process.env.DATABASE_URL ?? "******127.0.0.1:5432/shipyard"
    });

    await client.close();
    assert.ok(true);
  }
);
