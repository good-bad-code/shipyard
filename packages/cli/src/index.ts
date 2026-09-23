#!/usr/bin/env node
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { SHIPYARD_VERSION } from "./version.js";

export interface CliIO {
  cwd: string;
  log: (line: string) => void;
  error: (line: string) => void;
  run: (command: string, args: string[], options?: { stdio?: "inherit" | "pipe" }) => Promise<number>;
}

const HELP_TEXT = `Shipyard v${SHIPYARD_VERSION}\n\nUsage:\n  shipyard [command]\n\nCommands:\n  dev       Validate local prerequisites and start dev services\n  --help    Show help\n  --version Show version`;

function defaultRun(command: string, args: string[], options?: { stdio?: "inherit" | "pipe" }): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options?.stdio ?? "inherit"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

const defaultIO: CliIO = {
  cwd: process.cwd(),
  log: (line) => console.log(line),
  error: (line) => console.error(line),
  run: defaultRun
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function runDev(io: CliIO): Promise<number> {
  io.log("🚢 Shipyard dev");
  io.log("Open-source foundation for shipping SaaS");
  io.log("");

  try {
    validateEnvironment(process.env);
  } catch (error) {
    io.error("Environment validation failed.");
    io.error(error instanceof Error ? error.message : "Unknown configuration error");
    io.error("Tip: copy .env.example to .env and adjust values.");
    return 1;
  }

  const hasEnvFile = await fileExists(`${io.cwd}/.env`);
  const hasEnvExample = await fileExists(`${io.cwd}/.env.example`);
  if (!hasEnvFile && hasEnvExample) {
    io.log("No .env file found. Using defaults from .env.example-compatible settings.");
    io.log("Create one with: cp .env.example .env");
    io.log("");
  }

  let code = await io.run("docker", ["--version"], { stdio: "pipe" });
  if (code !== 0) {
    io.error("Docker is required but not available.");
    io.error("Install Docker Desktop or Docker Engine and re-run `shipyard dev`.");
    return 1;
  }

  code = await io.run("docker", ["compose", "version"], { stdio: "pipe" });
  if (code !== 0) {
    io.error("Docker Compose (v2) is required but unavailable.");
    io.error("Install/enable Docker Compose and re-run `shipyard dev`.");
    return 1;
  }

  const composeExists = await fileExists(`${io.cwd}/docker-compose.yml`);
  if (!composeExists) {
    io.error("Could not find docker-compose.yml in the current directory.");
    io.error("Run `shipyard dev` from the repository root.");
    return 1;
  }

  io.log("Starting local dependencies (PostgreSQL, Redis, SMTP)...");
  code = await io.run("docker", ["compose", "up", "-d"], { stdio: "inherit" });
  if (code !== 0) {
    io.error("Failed to start local services.");
    io.error("Run `docker compose up` manually to inspect details.");
    return 1;
  }

  io.log("");
  io.log("Shipyard dev services started successfully.");
  io.log(`- PostgreSQL: localhost:${process.env.POSTGRES_PORT ?? "5432"}`);
  io.log(`- Redis:      localhost:${process.env.REDIS_PORT ?? "6379"}`);
  io.log(`- Mailpit UI: http://localhost:${process.env.MAILPIT_WEB_PORT ?? "8025"}`);
  io.log("");
  io.log("Next step: pnpm --filter @shipyard/status-api dev");

  return 0;
}

function validateEnvironment(env: NodeJS.ProcessEnv): void {
  const portKeys = ["POSTGRES_PORT", "REDIS_PORT", "SMTP_PORT", "MAILPIT_SMTP_PORT", "MAILPIT_WEB_PORT", "PORT"] as const;

  for (const key of portKeys) {
    if (!env[key]) {
      continue;
    }
    const numeric = Number(env[key]);
    if (!Number.isInteger(numeric) || numeric < 1 || numeric > 65535) {
      throw new Error(`${key} must be an integer between 1 and 65535.`);
    }
  }

  if (env.SMTP_FROM && !env.SMTP_FROM.includes("@")) {
    throw new Error("SMTP_FROM must be a valid email address.");
  }
}

export async function runCli(args: string[], io: CliIO = defaultIO): Promise<number> {
  const command = args[0];

  if (!command || command === "--help" || command === "help") {
    io.log(HELP_TEXT);
    return 0;
  }

  if (command === "--version" || command === "version") {
    io.log(SHIPYARD_VERSION);
    return 0;
  }

  if (command === "dev") {
    return runDev(io);
  }

  io.error(`Unknown command: ${command}`);
  io.error("Run `shipyard --help` for available commands.");
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = await runCli(process.argv.slice(2));
  process.exit(code);
}
