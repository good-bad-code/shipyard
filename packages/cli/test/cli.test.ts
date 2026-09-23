import test from "node:test";
import assert from "node:assert/strict";
import { runCli, type CliIO } from "../src/index.js";

function createMockIO(resultMap: Record<string, number> = {}): {
  io: CliIO;
  logs: string[];
  errors: string[];
} {
  const logs: string[] = [];
  const errors: string[] = [];

  return {
    logs,
    errors,
    io: {
      cwd: process.cwd(),
      log: (line) => logs.push(line),
      error: (line) => errors.push(line),
      run: async (command, args) => {
        const key = `${command} ${args.join(" ")}`;
        return resultMap[key] ?? 0;
      }
    }
  };
}

test("--version prints version and exits 0", async () => {
  const { io, logs } = createMockIO();
  const code = await runCli(["--version"], io);

  assert.equal(code, 0);
  assert.equal(logs[0], "0.1.0");
});

test("unknown command exits 1 with help instruction", async () => {
  const { io, errors } = createMockIO();
  const code = await runCli(["wat"], io);

  assert.equal(code, 1);
  assert.match(errors.join("\n"), /Run `shipyard --help`/);
});

test("dev fails with actionable message when docker is missing", async () => {
  const { io, errors } = createMockIO({ "docker --version": 1 });
  const code = await runCli(["dev"], io);

  assert.equal(code, 1);
  assert.match(errors.join("\n"), /Docker is required but not available/);
});
