# Shipyard

**Shipyard** is an open-source foundation for shipping SaaS products without stitching together many hosted services on day one.

> v0.1 focus: a runnable local-first developer foundation, not a production-complete platform.

## Vision

Shipyard aims to provide a provider-agnostic SaaS runtime with strong defaults for auth, data, files, email, jobs, webhooks, admin tooling, and observability.

## What is in v0.1

- pnpm workspace TypeScript monorepo
- `shipyard` CLI foundation (`--help`, `--version`, `dev`)
- Local dependency stack via Docker Compose:
  - PostgreSQL
  - Redis
  - SMTP (Mailpit)
- Typed configuration package with validation (`@shipyard/config`)
- Shared core domain types (`@shipyard/core`)
- Minimal health/status API example (`@shipyard/status-api`)
- Demo package showing domain model shape (`@shipyard/demo`)
- Tests for config validation and CLI argument handling

## What is not implemented yet

- Authentication flows
- Billing integrations
- Object storage integrations
- Job workers/schedulers
- Admin dashboard UI
- Database migrations and persistence layer
- Production deployment orchestration

These are planned for subsequent PRs.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker with Docker Compose v2

## Quickstart

```bash
pnpm install
cp .env.example .env
pnpm build
pnpm test
pnpm --filter @shipyard/cli build
node packages/cli/dist/index.js dev
```

Health endpoint (separate terminal):

```bash
pnpm --filter @shipyard/status-api dev
# http://localhost:4000/health
```

## Monorepo layout

```text
apps/
  demo/          # demo domain objects and intended app shape
  status-api/    # minimal /health endpoint
packages/
  cli/           # shipyard command
  config/        # typed env loading/validation
  core/          # shared domain types
```

## Workspace commands

From repository root:

- `pnpm setup` – convenience alias for install
- `pnpm build` – build all workspaces
- `pnpm dev` – run CLI dev command
- `pnpm lint` – TypeScript no-emit checks
- `pnpm typecheck` – strict typechecks
- `pnpm test` – run workspace tests

## Architecture direction

Shipyard is evolving toward this layering:

1. CLI + developer workflows
2. Runtime modules (auth, data, files, email, jobs, webhooks, audit)
3. Provider abstraction layer
4. Deployable local/self-hosted infrastructure

v0.1 intentionally keeps this small and explicit so contributors can iterate safely.
