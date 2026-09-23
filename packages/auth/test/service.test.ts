import assert from "node:assert/strict";
import test from "node:test";
import type {
  AuthMembershipRecord,
  AuthOrganizationRecord,
  AuthSessionRecord,
  AuthStore,
  AuthUserRecord,
  SessionWithUser
} from "../src/service.js";
import { AuthError, AuthService, hashSessionToken } from "../src/index.js";

function createInMemoryStore(): AuthStore {
  const users = new Map<string, AuthUserRecord>();
  const usersByEmail = new Map<string, string>();
  const organizations = new Map<string, AuthOrganizationRecord>();
  const memberships = new Map<string, AuthMembershipRecord>();
  const sessions = new Map<string, AuthSessionRecord>();

  let sequence = 0;
  const nextId = () => `id-${++sequence}`;

  return {
    async findUserByEmail(email) {
      const id = usersByEmail.get(email);
      return id ? users.get(id) ?? null : null;
    },
    async createUserWithOrganization(input) {
      if (usersByEmail.has(input.email)) {
        throw new Error("duplicate email");
      }

      const userId = nextId();
      const orgId = nextId();
      const membershipId = nextId();

      const user: AuthUserRecord = {
        id: userId,
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        createdAt: new Date()
      };
      const organization: AuthOrganizationRecord = {
        id: orgId,
        slug: input.organizationName.toLowerCase().replace(/\s+/g, "-"),
        name: input.organizationName
      };
      const membership: AuthMembershipRecord = {
        id: membershipId,
        organizationId: orgId,
        userId,
        role: "owner"
      };

      users.set(userId, user);
      usersByEmail.set(input.email, userId);
      organizations.set(orgId, organization);
      memberships.set(membershipId, membership);

      return { user, organization, membership };
    },
    async createSession(input) {
      const session: AuthSessionRecord = {
        id: nextId(),
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
        createdAt: new Date()
      };
      sessions.set(session.id, session);
      return session;
    },
    async findActiveSessionWithUserByTokenHash(tokenHash, now) {
      const session = Array.from(sessions.values()).find((candidate) => candidate.tokenHash === tokenHash);
      if (!session || session.revokedAt || session.expiresAt <= now) {
        return null;
      }

      const user = users.get(session.userId);
      if (!user) {
        return null;
      }

      return { session, user } satisfies SessionWithUser;
    },
    async revokeSessionByTokenHash(tokenHash) {
      const session = Array.from(sessions.values()).find((candidate) => candidate.tokenHash === tokenHash);
      if (!session || session.revokedAt) {
        return false;
      }
      session.revokedAt = new Date();
      return true;
    }
  };
}

test("register stores hashed password and returns an owner membership", async () => {
  const service = new AuthService(createInMemoryStore(), { bcryptRounds: 4 });

  const result = await service.register({
    email: "USER@example.com",
    password: "StrongPassword123",
    displayName: "Ship User",
    organizationName: "Ship Org"
  });

  assert.equal(result.user.email, "user@example.com");
  assert.equal(result.membership.role, "owner");
  assert.ok(result.sessionToken.length > 24);
});

test("register rejects weak password", async () => {
  const service = new AuthService(createInMemoryStore(), { bcryptRounds: 4 });

  await assert.rejects(
    () =>
      service.register({
        email: "user@example.com",
        password: "weak",
        displayName: "Ship User",
        organizationName: "Ship Org"
      }),
    (error: unknown) => error instanceof AuthError && error.code === "INVALID_INPUT"
  );
});

test("login returns generic error for unknown account", async () => {
  const service = new AuthService(createInMemoryStore(), { bcryptRounds: 4 });

  await assert.rejects(
    () => service.login({ email: "missing@example.com", password: "StrongPassword123" }),
    (error: unknown) => error instanceof AuthError && error.code === "INVALID_CREDENTIALS"
  );
});

test("logout invalidates existing session token", async () => {
  const service = new AuthService(createInMemoryStore(), { bcryptRounds: 4 });

  const registration = await service.register({
    email: "user@example.com",
    password: "StrongPassword123",
    displayName: "Ship User",
    organizationName: "Ship Org"
  });

  const beforeLogout = await service.getCurrentUser(registration.sessionToken);
  assert.ok(beforeLogout);

  const revoked = await service.logout(registration.sessionToken);
  assert.equal(revoked, true);

  const afterLogout = await service.getCurrentUser(registration.sessionToken);
  assert.equal(afterLogout, null);
});

test("hashSessionToken returns deterministic hash", () => {
  const token = "abc123token";
  assert.equal(hashSessionToken(token), hashSessionToken(token));
});
