import assert from "node:assert/strict";
import test from "node:test";
import {
  auditEvents,
  authSessions,
  membershipRoleEnum,
  organizationMemberships,
  organizations,
  users
} from "../src/schema.js";

test("schema exports expected table names and membership roles", () => {
  assert.equal(users[Symbol.for("drizzle:Name")], "users");
  assert.equal(organizations[Symbol.for("drizzle:Name")], "organizations");
  assert.equal(organizationMemberships[Symbol.for("drizzle:Name")], "organization_memberships");
  assert.equal(authSessions[Symbol.for("drizzle:Name")], "auth_sessions");
  assert.equal(auditEvents[Symbol.for("drizzle:Name")], "audit_events");

  assert.deepEqual(membershipRoleEnum.enumValues, ["owner", "admin", "member"]);
});
