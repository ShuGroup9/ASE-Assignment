# ASE-Assignment

A service for the education sector that tracks individual contributions to a group software project.

## Getting started

> [!WARNING]
> This project assumes you are working on **Linux** or **macOS**. If you are on **Windows**, use [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) or [Git Bash for Windows](https://gitforwindows.org/).

### Prerequisites

- **Node 24** (pinned in `.nvmrc`; run `nvm use` if you use nvm)
- **pnpm**: `npm i -g pnpm`
- **Docker**: needed for local services and integration tests

### 1. Clone and install hooks

```bash
git clone https://github.com/ShuGroup9/ASE-Assignment.git
cd ASE-Assignment
./scripts/install-hooks.sh
```

> [!IMPORTANT]
> Run `install-hooks.sh` once after every fresh clone. The hooks enforce the commit format described in [CONTRIBUTING.md](CONTRIBUTING.md).

### 2. Install dependencies and configure

```bash
pnpm install
cp .env.example .env.local
```

### 3. Start services and the app

```bash
pnpm infra:up       # PostgreSQL, Mailpit, Nginx (infra/docker-compose.yml)
pnpm db:migrate
pnpm dev
```

| Service | URL |
| --- | --- |
| App | http://localhost:3000 |
| App over HTTPS (via Nginx) | https://localhost:8443 |
| Mailpit (catches all outgoing email) | http://localhost:8025 |

> [!NOTE]
> The HTTPS proxy uses a self-signed localhost certificate, generated on the first `pnpm infra:up`. Your browser will show a security warning once; accept it for local development.

> [!TIP]
> No real emails are sent locally. Anything the app sends will shows up in Mailpit.

## Guides

- [Testing guide](docs/testing.md): types of tests and how to run them
- [Database guide](docs/database.md): how the database is set up, and all its quirks

## Contributing

Work happens on `feature/*` branches off `develop`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow and commit format.

## Stack

| Area | Tools |
| --- | --- |
| Framework | Next.js (App Router, server-side rendering, no page caching), React, TypeScript |
| UI | Bootstrap |
| Database | PostgreSQL with Drizzle ORM (`pg` driver) |
| Testing | Vitest, Testcontainers, Playwright + axe-core |
| Security | OWASP ZAP |
| Local infra | Docker, Nginx, Mailpit |

## Project layout

| Path | What lives there |
| --- | --- |
| `src/app/` | Routes, layouts and route handlers |
| `src/db/` | The database list (`databases.ts`), one schema folder per database (`auth/`, `session/`, `engagement/`) and the client |
| `src/lib/` | Shared server code (env validation, mailer) |
| `db/` | Generated migrations and the migration runner |
| `infra/` | Docker Compose, Postgres init SQL, Nginx, ZAP rules |
| `tests/unit/` | Fast tests of plain logic, no I/O |
| `tests/component/` | React component tests (jsdom) |
| `tests/integration/` | Real PostgreSQL via Testcontainers (requires Docker) |
| `tests/e2e/` | Playwright browser + axe accessibility tests |

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Run, build, serve the app |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript checks |
| `pnpm test` | All Vitest suites (`test:unit`, `test:component`, `test:integration`) |
| `pnpm test:e2e` | Playwright against a production build |
| `pnpm db:generate <database>` | Create a migration from `src/db/<database>/schema.ts` |
| `pnpm db:migrate` | Apply migrations (as the `app_owner` role) |
| `pnpm infra:up` / `pnpm infra:down` | Start / stop local services |
| `pnpm infra:reset` | Delete local data and recreate the services |

> [!IMPORTANT]
> `pnpm test:e2e` runs against a production build, so run `pnpm build` first or you'll be testing stale code.

> [!CAUTION]
> `pnpm infra:reset` **permanently deletes** your local database and Mailpit data. Only use it when you want a clean slate.
