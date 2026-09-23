import { and, eq, gt, isNull } from "drizzle-orm";
import type { DatabaseClient } from "@shipyard/database";
import {
  authSessions,
  organizationMemberships,
  organizations,
  users
} from "@shipyard/database";
import type {
  AuthMembershipRecord,
  AuthOrganizationRecord,
  AuthSessionRecord,
  AuthStore,
  AuthUserRecord,
  SessionWithUser
} from "./service.js";

function slugifyOrganizationName(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  if (!normalized) {
    return "org";
  }

  return normalized;
}

function appendUniqueSuffix(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export function createDrizzleAuthStore(client: DatabaseClient): AuthStore {
  return {
    async findUserByEmail(email) {
      const [user] = await client.db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        displayName: user.displayName,
        createdAt: user.createdAt
      } satisfies AuthUserRecord;
    },

    async createUserWithOrganization(input) {
      return client.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            email: input.email,
            passwordHash: input.passwordHash,
            displayName: input.displayName
          })
          .returning();

        const baseSlug = slugifyOrganizationName(input.organizationName);
        const organizationSlug = appendUniqueSuffix(baseSlug);

        const [organization] = await tx
          .insert(organizations)
          .values({
            slug: organizationSlug,
            name: input.organizationName
          })
          .returning();

        const [membership] = await tx
          .insert(organizationMemberships)
          .values({
            organizationId: organization.id,
            userId: user.id,
            role: "owner"
          })
          .returning();

        return {
          user: {
            id: user.id,
            email: user.email,
            passwordHash: user.passwordHash,
            displayName: user.displayName,
            createdAt: user.createdAt
          } satisfies AuthUserRecord,
          organization: {
            id: organization.id,
            slug: organization.slug,
            name: organization.name
          } satisfies AuthOrganizationRecord,
          membership: {
            id: membership.id,
            organizationId: membership.organizationId,
            userId: membership.userId,
            role: membership.role
          } satisfies AuthMembershipRecord
        };
      });
    },

    async createSession(input) {
      const [session] = await client.db
        .insert(authSessions)
        .values({
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt
        })
        .returning();

      return {
        id: session.id,
        userId: session.userId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        createdAt: session.createdAt
      } satisfies AuthSessionRecord;
    },

    async findActiveSessionWithUserByTokenHash(tokenHash, now) {
      const [result] = await client.db
        .select({
          session: authSessions,
          user: users
        })
        .from(authSessions)
        .innerJoin(users, eq(users.id, authSessions.userId))
        .where(
          and(
            eq(authSessions.tokenHash, tokenHash),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, now)
          )
        )
        .limit(1);

      if (!result) {
        return null;
      }

      return {
        session: {
          id: result.session.id,
          userId: result.session.userId,
          tokenHash: result.session.tokenHash,
          expiresAt: result.session.expiresAt,
          revokedAt: result.session.revokedAt,
          createdAt: result.session.createdAt
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          passwordHash: result.user.passwordHash,
          displayName: result.user.displayName,
          createdAt: result.user.createdAt
        }
      } satisfies SessionWithUser;
    },

    async revokeSessionByTokenHash(tokenHash) {
      const result = await client.db
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt)));

      return result.rowCount > 0;
    }
  };
}
