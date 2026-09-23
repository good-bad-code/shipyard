import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../src/password.js";

test("hashPassword hashes and verifyPassword validates", async () => {
  const plain = "StrongPass123";
  const hashed = await hashPassword(plain, 4);

  assert.notEqual(hashed, plain);
  assert.equal(await verifyPassword(plain, hashed), true);
  assert.equal(await verifyPassword("wrong-password", hashed), false);
});

test("hashPassword enforces minimum requirements", async () => {
  await assert.rejects(() => hashPassword("short", 4), /at least 10/);
  await assert.rejects(() => hashPassword("alllettersonly", 4), /one letter and one number/);
});
