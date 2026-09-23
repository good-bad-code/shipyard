import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/index.js";

test("loadConfig returns safe local defaults", () => {
  const config = loadConfig({});

  assert.equal(config.database.host, "127.0.0.1");
  assert.equal(config.database.port, 5432);
  assert.equal(config.redis.port, 6379);
  assert.equal(config.email.from, "noreply@shipyard.local");
});

test("loadConfig rejects invalid ports", () => {
  assert.throws(() => loadConfig({ POSTGRES_PORT: "99999" }), /Number must be less than or equal to 65535/);
});
