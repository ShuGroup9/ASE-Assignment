# Database guide

How the databases are set up, how to change them, and what to do when it fails.

**TL;DR; changing a schema**

```bash
# 1. edit src/db/<database>/schema.ts          (auth, session or engagement)
pnpm db:generate auth --name add_password_hash  # 2. writes db/migrations/auth/00NN_add_password_hash.sql
pnpm db:migrate                                 # 3. applies it to your local databases
# 4. commit the schema file AND everything new in db/migrations/<database>/ together
```

---

## 1. How it fits together

We have three separate databases, by design. They run on the same PostgreSQL server, but
nothing is shared between them:

| Database | Holds | App role | Schema | Migrations |
| --- | --- | --- | --- | --- |
| `auth_db` | Accounts, login attempts, reset tokens, audit log, OAuth tokens | `auth_app` | `src/db/auth/schema.ts` | `db/migrations/auth/` |
| `session_db` | Sign-in sessions (token hashes only) | `session_app` | `src/db/session/schema.ts` | `db/migrations/session/` |
| `engagement_db` | The main project data | `engagement_app` | `src/db/engagement/schema.ts` | `db/migrations/engagement/` |

The list lives in **`src/db/databases.ts`**. Everything else (scripts, settings, tests) reads it, and
the names follow one pattern:

| For database `<name>` | Pattern | Example |
| --- | --- | --- |
| PostgreSQL database | `<name>_db` | `auth_db` |
| Owner role (migrations only) | `<name>_owner` | `auth_owner` |
| App role (the running app) | `<name>_app` | `auth_app` |
| App connection setting | `<NAME>_DATABASE_URL` | `AUTH_DATABASE_URL` |
| Migration connection setting | `<NAME>_MIGRATE_URL` | `AUTH_MIGRATE_URL` |
| Dev/CI password | `<role>_dev` | `auth_app_dev` |

Each database goes through the same steps:

```
infra/postgres/init/NN-<name>.sql   run ONCE, when the Postgres container starts with an empty volume
        │                           creates <name>_db and its two roles
        V
src/db/<name>/schema.ts             the tables, written in TypeScript (Drizzle ORM)
        │  pnpm db:generate <name>  drizzle-kit compares the schema with the last snapshot
        V
db/migrations/<name>/*.sql          plain SQL, committed to git, applied in order
        │  pnpm db:migrate          connects as <name>_owner, runs the ones not yet applied
        V
<name>_db                           the app connects as <name>_app: db("<name>") in src/db/client.ts
```

| Piece | File | What it does |
| --- | --- | --- |
| Database list | `src/db/databases.ts` | The names, and the naming pattern above |
| Container | `infra/docker-compose.yml` | PostgreSQL 18 on `localhost:5432`, data kept in the `pgdata` volume |
| Bootstrap SQL | `infra/postgres/init/NN-<name>.sql` | Creates one database and its two roles. Files run in name order |
| Schemas | `src/db/<name>/schema.ts` | Table definitions, one file per database |
| Migration config | `drizzle.config.ts` | Points drizzle-kit at one database (chosen by `pnpm db:generate <name>`) |
| Migrations | `db/migrations/<name>/` | Generated SQL files + `meta/` (snapshots and `_journal.json`). Never hand-edit `meta/` |
| Scripts | `db/generate.ts`, `db/migrate.ts` | `pnpm db:generate`, `pnpm db:migrate`; migrate is also used by the integration tests |
| App client | `src/db/client.ts` | `db("auth")` etc. returns the shared Drizzle client for that database |
| Settings | `.env.local` (copy of `.env.example`) | `<NAME>_DATABASE_URL` and `<NAME>_MIGRATE_URL` for every database |

### What "separate" means here

- **Each role can only connect to its own database.** `auth_app` gets `permission denied` if it tries
  `session_db`, and so do the owner roles. If one connection string leaks, the other databases are safe.
- **No joins or foreign keys across databases**: Postgres can't do them. To link data, store the
  other database's id as a plain column (see `userId` in `src/db/session/schema.ts`) and look it up
  in code with that database's client.
- **No transaction covers two databases.** If one operation writes to two of them, write to the one
  that matters most first, and make the second write safe to retry.
- `tests/integration/database-permissions.test.ts` checks all of this for every database.

### Two roles per database (least privilege)

| Role | Used by | Can |
| --- | --- | --- |
| `<name>_owner` | `pnpm db:migrate`, drizzle-kit, test resets | Everything in its own database: owns it and its `public` schema |
| `<name>_app` | The running app (`<NAME>_DATABASE_URL`) | `SELECT`, `INSERT`, `UPDATE`, `DELETE` on its own database's tables. **No** `CREATE`, `ALTER`, `DROP` |

New tables made by migrations give the `_app` role access automatically (the `ALTER DEFAULT
PRIVILEGES` lines in the init SQL), so you don't need to write `GRANT`s for normal tables.

The roles end in `_app`, not `_user`, because `session_user` is a reserved name in PostgreSQL.
The passwords in the repo (`auth_app_dev`, ...) are for local and CI only.

### Where it runs

| Environment | Databases come from | Setup |
| --- | --- | --- |
| Your machine | `pnpm infra:up` (Docker Compose) | Init SQL runs on first start; you run `pnpm db:migrate` |
| Integration tests | Testcontainers (a fresh container per test run) | `tests/integration/global-setup.ts` runs the init SQL + every database's migrations |
| CI e2e job | GitHub Actions `services: postgres` | The workflow runs every init SQL file, then `pnpm db:migrate` |

All three use the same init SQL and the same migrations, so if it works in one it works in the others.

---

## 2. First-time setup

```bash
cp .env.example .env.local
pnpm infra:up       # starts Postgres (all three databases), Mailpit, nginx
pnpm db:migrate     # creates the tables in every database
```

Connect with any SQL client (DataGrip, `psql`, other.) as a database's owner, e.g.:

```
postgres://auth_owner:auth_owner_dev@localhost:5432/auth_db
postgres://session_owner:session_owner_dev@localhost:5432/session_db
postgres://engagement_owner:engagement_owner_dev@localhost:5432/engagement_db
```

Useful commands:

| Command | Does |
| --- | --- |
| `pnpm infra:up` / `pnpm infra:down` | Start / stop containers (data is kept) |
| `pnpm infra:reset` | **Deletes all local data**, recreates containers, re-runs the init SQL. Then run `pnpm db:migrate` |
| `pnpm db:generate <name> --name <what_changed>` | Create a migration for one database from its schema changes |
| `pnpm db:generate` | Check every database and create migrations for any whose schema changed (default names) |
| `pnpm db:migrate` | Apply pending migrations to every database |
| `pnpm db:migrate <name>` | Apply pending migrations to one database |

---

## 3. Using the databases in the source code

Only server code may touch the databases (`src/db/client.ts` imports `server-only`, so importing
it from a Client Component will fail the build).

```ts
// e.g. in a Server Component, route handler or server action
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { user } from "@/db/auth/schema";
import { session } from "@/db/session/schema";

const [account] = await db("auth").select().from(user).where(eq(user.email, email));
await db("session").insert(session).values({ idHash: sha256(token), userId: account.id, expiresAt });
```

**Always import tables from the same database you query** (`db("auth")` with `@/db/auth/schema`).
TypeScript won't stop `db("auth").select().from(session)`; it fails when it runs, with
`relation "session" does not exist`. (Drizzle's relational `db("auth").query.*` API does only
know the auth tables.)

Drizzle builds parameterised SQL, so values are never pasted into the query string. If you need
raw SQL, use the `sql` template tag (`` sql`... ${value}` ``) ; **never** string concatenation.

Docs: <https://orm.drizzle.team/docs/select>, `/insert`, `/update`, `/delete`, `/joins`, `/transactions`.

---

## 4. Changing a schema

First decide **which database** the data belongs in. Everything below is per database.

### Add a table

```ts
// src/db/engagement/schema.ts
import { integer, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const team = pgTable("team", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamMember = pgTable("team_member", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => team.id, { onDelete: "cascade" }), // same database: OK
  userId: uuid("user_id").notNull(), // auth database: plain id, no .references()
});
```

```bash
pnpm db:generate engagement --name add_team
pnpm db:migrate
```

Open the generated `db/migrations/engagement/00NN_add_team.sql` and **read it** before committing;
it's the SQL that will run against every copy of that database.

Conventions: table and column names in `snake_case` (the first argument), TypeScript names in
`camelCase`. Always store times as `timestamp(..., { withTimezone: true })`.

### Add, change or remove a column

Edit the table in that database's `schema.ts`, then `pnpm db:generate <name>` + `pnpm db:migrate` as above.

- **Adding a `notNull()` column to a table that already has rows** needs a `.default(...)`, or the
  migration fails on any database that has data.
- **Renaming:** drizzle-kit asks in the terminal whether a column/table was renamed or
  dropped and re-created. Pick **rename**, or the data is lost.
- **Removing** a column deletes its data on every database. Make sure nothing still reads it.
- **Moving a table to another database** is a drop in one and a create in the other: the data
  does not move by itself. Talk to the team first.

### Data changes, extra grants, or SQL Drizzle can't express

Create an empty migration for that database and write the SQL yourself:

```bash
pnpm db:generate engagement --custom --name backfill_team_names
# edit db/migrations/engagement/00NN_backfill_team_names.sql
```

### Rules

1. **Never edit or delete a migration that has been merged into `develop`.** Other people's
   databases (and CI) have already run it. Fix mistakes with a *new* migration.
2. **Commit the schema file and its `db/migrations/<name>/` changes in the same commit.** CI runs the migrations, not the schema.
3. **Never** hand-edit files in `db/migrations/<name>/meta/`.
4. One migration per logical change, with a descriptive `--name`.

### Two people changed the same schema at the same time

drizzle-kit numbers migrations per database (`db/migrations/auth/0003_...`), so two branches can both
create the same number for the same database, and git shows a conflict in that database's
`meta/_journal.json`. (Changes to *different* databases never conflict.) To fix it on your branch
(the one not merged yet):

1. Delete your new migration `.sql` file and its `meta/00NN_snapshot.json`, and take `develop`'s
   version of `meta/_journal.json`.
2. Merge or rebase `develop` (your schema changes stay).
3. Run `pnpm db:generate <name> --name <same name>` again; it now creates the next number on top of theirs.
4. `pnpm infra:reset && pnpm db:migrate` so your local databases match.

---

## 5. Troubleshooting

| Problem | Fix |
| --- | --- |
| `ECONNREFUSED 127.0.0.1:5432` | Containers aren't running: `pnpm infra:up` (is Docker running?) |
| `relation "x" does not exist` | You haven't applied the latest migrations (`pnpm db:migrate`), or you're querying the wrong database: check which `db("<name>")` and which schema file the table is in |
| `permission denied for database "x_db"` | The connection string points one database's role at another database. Check the `<NAME>_DATABASE_URL` values in `.env.local` |
| `password authentication failed` / `role ... does not exist` / `database "x_db" does not exist` | Your volume was created before the init SQL existed or changed: `pnpm infra:reset && pnpm db:migrate` |
| `permission denied for schema public` when the **app** runs | The app is trying to change the schema; that belongs in a migration |
| `[migrate] <name>: no migrations yet` | `db/migrations/<name>/` is empty: run `pnpm db:generate <name> --name init` |
| `Set AUTH_MIGRATE_URL, ...` | Your `.env.local` is missing settings; copy the new lines from `.env.example` |
| Port 5432 already in use | Another Postgres is running on your machine; stop it, or change the left-hand port in `infra/docker-compose.yml` and in every URL in `.env.local` |
