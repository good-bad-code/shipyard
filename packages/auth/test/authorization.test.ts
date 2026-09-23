import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAuthorized,
  AuthorizationError,
  hasRequiredRole,
  isRoleAllowed
} from "../src/authorization.js";

test("hasRequiredRole applies owner/admin/member hierarchy", () => {
  assert.equal(hasRequiredRole("owner", "admin"), true);
  assert.equal(hasRequiredRole("admin", "member"), true);
  assert.equal(hasRequiredRole("member", "owner"), false);
});

test("isRoleAllowed validates explicit allow lists", () => {
  assert.equal(isRoleAllowed("admin", ["owner", "admin"]), true);
  assert.equal(isRoleAllowed("member", ["owner", "admin"]), false);
});

test("assertAuthorized throws AuthorizationError for insufficient role", () => {
  assert.throws(() => assertAuthorized({ actorRole: "member", minimumRole: "admin" }), AuthorizationError);
  assert.doesNotThrow(() => assertAuthorized({ actorRole: "owner", minimumRole: "admin" }));
});
