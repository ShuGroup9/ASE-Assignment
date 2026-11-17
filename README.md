# ASE\-Assignment

Service for education sector for tracking individual contributions to a group software project.

## Getting started

```bash
git clone https://github.com/ShuGroup9/ASE\-Assignment.git
cd ASE\-Assignment
./scripts/install-hooks.sh  # once per clone
```

Needs Node 24 (`.nvmrc`), pnpm (`npm i -g pnpm`) and Docker.

```bash
pnpm install
cp .env.example .env.local
pnpm infra:up       # PostgreSQL, Mailpit, Nginx (infra/docker-compose.yml)
pnpm db:migrate
pnpm dev            # http://localhost:3000  (HTTPS via Nginx: https://localhost:8443)
```

The HTTPS proxy uses a self-signed localhost certificate (made on first `pnpm infra:up`), so the browser shows a warning once; accept it for local development.

Mailpit catches all outgoing email: http://localhost:8025

## Guides

- [Testing guide](docs/testing.md): types of tests and how to run them
- [Database guide](docs/database.md): how the database is set up, and all its quirks

## Contributing
Work happens on `feature/*` branches off `develop`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow and commit format.

## Stack
 - Next.js (App Router, server-side rendering, no page caching)
 - TypeScript
 - React
 - Bootstrap
 - PostgreSQL with Drizzle ORM (`pg` driver) 
 - Vitest
 - Testcontainers
 - Playwright + axe-core
 - OWASP ZAP
 - Mailpit
 - Nginx

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
| `pnpm test:e2e` | Playwright against a production build (run `pnpm build` first) |
| `pnpm db:generate <database>` | Create a migration from `src/db/<database>/schema.ts` |
| `pnpm db:migrate` | Apply migrations (as the `app_owner` role) |
| `pnpm infra:up` / `pnpm infra:down` | Start / stop local services |
| `pnpm infra:reset` | Delete local data and recreate the services |

