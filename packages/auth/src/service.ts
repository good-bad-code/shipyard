import { createHash, randomBytes } from "node:crypto";
import type { OrganizationRole } from "@shipyard/core";
import { z } from "zod";
import { AuthError } from "./errors.js";
import { hashPassword, validatePasswordStrength, verifyPassword } from "./password.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  displayName: z.string().min(1).max(120),
  organizationName: z.string().min(1).max(120)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const sessionTokenSchema = z.string().min(24).max(1024);

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: Date;
}

export interface AuthOrganizationRecord {
  id: string;
  slug: string;
  name: string;
}

export interface AuthMembershipRecord {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface SessionWithUser {
  session: AuthSessionRecord;
  user: AuthUserRecord;
}

export interface RegisterResult {
  user: AuthUserRecord;
  organization: AuthOrganizationRecord;
  membership: AuthMembershipRecord;
  sessionToken: string;
  sessionExpiresAt: Date;
}

export interface LoginResult {
  user: AuthUserRecord;
  sessionToken: string;
  sessionExpiresAt: Date;
}

export interface AuthStore {
  findUserByEmail: (email: string) => Promise<AuthUserRecord | null>;
  createUserWithOrganization: (input: {
    email: string;
    passwordHash: string;
    displayName: string;
    organizationName: string;
  }) => Promise<{
    user: AuthUserRecord;
    organization: AuthOrganizationRecord;
    membership: AuthMembershipRecord;
  }>;
  createSession: (input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) => Promise<AuthSessionRecord>;
  findActiveSessionWithUserByTokenHash: (tokenHash: string, now: Date) => Promise<SessionWithUser | null>;
  revokeSessionByTokenHash: (tokenHash: string) => Promise<boolean>;
}

export interface AuthServiceOptions {
  bcryptRounds?: number;
  minimumPasswordLength?: number;
  sessionTtlMs?: number;
}

const DEFAULT_OPTIONS: Required<AuthServiceOptions> = {
  bcryptRounds: 12,
  minimumPasswordLength: 10,
  sessionTtlMs: 1000 * 60 * 60 * 24 * 30
};

const DUMMY_PASSWORD_HASH = "$2a$12$U6w3IbYG9w7nT3m4Q7aQx.P6ZX0hgqP/d9vywgq6Z9erjRzCQXDpW";

export class AuthService {
  private readonly options: Required<AuthServiceOptions>;

  constructor(
    private readonly store: AuthStore,
    options: AuthServiceOptions = {}
  ) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };
  }

  async register(input: unknown): Promise<RegisterResult> {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthError("INVALID_INPUT", "Invalid registration input.");
    }

    const email = normalizeEmail(parsed.data.email);

    try {
      validatePasswordStrength(parsed.data.password, this.options.minimumPasswordLength);
    } catch {
      throw new AuthError("INVALID_INPUT", "Invalid registration input.");
    }

    const existing = await this.store.findUserByEmail(email);
    if (existing) {
      throw new AuthError("REGISTRATION_FAILED", "Unable to complete registration.");
    }

    const passwordHash = await hashPassword(parsed.data.password, this.options.bcryptRounds);

    const created = await this.store.createUserWithOrganization({
      email,
      passwordHash,
      displayName: parsed.data.displayName,
      organizationName: parsed.data.organizationName
    });

    const session = await this.createSession(created.user.id);

    return {
      user: created.user,
      organization: created.organization,
      membership: created.membership,
      sessionToken: session.sessionToken,
      sessionExpiresAt: session.expiresAt
    };
  }

  async login(input: unknown): Promise<LoginResult> {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await this.store.findUserByEmail(email);
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;

    const passwordMatches = await verifyPassword(parsed.data.password, passwordHash);
    if (!user || !passwordMatches) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }

    const session = await this.createSession(user.id);
    return {
      user,
      sessionToken: session.sessionToken,
      sessionExpiresAt: session.expiresAt
    };
  }

  async logout(sessionToken: string): Promise<boolean> {
    const tokenHash = hashSessionToken(sessionTokenSchema.parse(sessionToken));
    return this.store.revokeSessionByTokenHash(tokenHash);
  }

  async getCurrentUser(sessionToken: string): Promise<AuthUserRecord | null> {
    const tokenHash = hashSessionToken(sessionTokenSchema.parse(sessionToken));
    const session = await this.store.findActiveSessionWithUserByTokenHash(tokenHash, new Date());

    return session?.user ?? null;
  }

  private async createSession(userId: string): Promise<{ sessionToken: string; expiresAt: Date }> {
    const sessionToken = randomBytes(32).toString("base64url");
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + this.options.sessionTtlMs);

    await this.store.createSession({
      userId,
      tokenHash,
      expiresAt
    });

    return {
      sessionToken,
      expiresAt
    };
  }
}

export function hashSessionToken(sessionToken: string): string {
  return createHash("sha256").update(sessionToken, "utf8").digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
