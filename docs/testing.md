# Testing guide

Types of tests we have, how to run them, and how to write new ones.

**TL;DR**

```bash
pnpm test:unit          # fast, run all the time
pnpm test:component     # React components
pnpm test:integration   # real database + email (needs Docker running)
pnpm build && pnpm test:e2e   # real browser + accessibility
pnpm test               # unit + component + integration
```

Every PR runs all of them in CI (`.github/workflows/ci.yml`); a red job blocks the merge.

---

## 1. Which kind of test?

| Kind | Folder | Tool | Runs against | Use it for |
| --- | --- | --- | --- | --- |
| **Unit** | `tests/unit/` | Vitest (Node) | Plain functions, nothing else | Validation, calculations, permission rules, parsing; any logic you can call with inputs and check outputs |
| **Component** | `tests/component/` | Vitest + Testing Library (jsdom) | One React component, in a simulated browser | What a component shows for given props/state; clicks and form input on that component |
| **Integration** | `tests/integration/` | Vitest + Testcontainers | Real PostgreSQL + real SMTP (Mailpit) in Docker | Queries, migrations, constraints, database permissions, sending email, route handlers that hit the database |
| **End-to-end** | `tests/e2e/` | Playwright + axe-core | The whole built app in Chromium | User journeys across pages, keyboard use, accessibility, small screens |

File names: Vitest files end in `.test.ts` (`.test.tsx` for components); Playwright files end in
`.spec.ts`. Mirror the source path where it helps, e.g. `src/lib/env.ts` -> `tests/unit/env.test.ts`.

---

## 2. Running tests

| Command | Notes |
| --- | --- |
| `pnpm test:unit` | No setup needed |
| `pnpm test:component` | No setup needed |
| `pnpm test:integration` | **Docker must be running.** First run downloads images, so it's slow may take a while. You do not need `pnpm infra:up`; the tests start their own containers |
| `pnpm test:e2e` | Run `pnpm build` first. Playwright starts `pnpm start` itself, or reuses an app already running on :3000 (e.g. `pnpm dev`) |
| `pnpm exec vitest --project unit` | Watch mode: re-runs on save |
| `pnpm exec vitest run tests/unit/env.test.ts` | One file |
| `pnpm exec vitest run -t "refuses to start"` | Tests whose name matches |
| `pnpm exec playwright test --ui` | Playwright's interactive runner; best for writing/debugging e2e |
| `pnpm exec playwright test --project=chromium` | Skip the 320px project while iterating |
| `pnpm exec vitest run --project unit --coverage` | Coverage report in `reports/coverage/` |

First time on a machine: `pnpm exec playwright install chromium` to download the browser.

Reports go to `reports/` (git-ignored). When a Playwright test fails, it saves a trace:
`pnpm exec playwright show-trace test-results/<test>/trace.zip` and replays it step by step.

---

## 3. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Could not find a working container runtime strategy` | Docker isn't running. Start Docker Desktop (Windows: with the WSL 2 backend) |
| Integration tests time out on first run | Images are downloading; run again, or `docker pull postgres:18.7-alpine axllent/mailpit:v1.34` first |
| `relation "x" does not exist` in an integration test | You changed `src/db/<name>/schema.ts` but didn't run `pnpm db:generate <name>`; tests use the migrations, not the schema. Also check you passed the right database to `useTestDatabase("<name>")` |
| `Executable doesn't exist` (Playwright) | `pnpm exec playwright install chromium` |
| E2E: `Could not find a production build` | `pnpm build` first |
| E2E passes locally but not in CI | You probably had `pnpm dev` running (Playwright reuses it). Stop it, `pnpm build`, run again |
