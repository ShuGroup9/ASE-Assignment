/**
 * `pnpm db:migrate` - applies pending migrations to every database (or the ones named):
 *
 *   pnpm db:migrate              all databases in src/db/databases.ts
 *   pnpm db:migrate auth         just one
 *
 * Connects as each database's <name>_owner role via <NAME>_MIGRATE_URL (.env.local locally).
 * Also used by tests/integration/global-setup.ts to migrate the Testcontainers databases.
 */
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DATABASE_NAMES, databaseConfig, isDatabaseName, type DatabaseName } from "../src/db/databases";

const root = path.resolve(import.meta.dirname, "..");

export async function migrateDatabase(name: DatabaseName, url: string) {
  const migrationsFolder = path.join(root, databaseConfig(name).migrationsDir);
  // drizzle-kit writes meta/_journal.json alongside the first migration.
  if (!fs.existsSync(path.join(migrationsFolder, "meta", "_journal.json"))) {
    console.warn(`[migrate] ${name}: no migrations yet - run pnpm db:generate ${name}`);
    return;
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

async function main(args: string[]) {
  const unknown = args.filter((a) => !isDatabaseName(a));
  if (unknown.length) throw new Error(`Unknown database(s): ${unknown.join(", ")}. Choose from: ${DATABASE_NAMES.join(", ")}`);
  const names = args.length ? (args as DatabaseName[]) : DATABASE_NAMES;

  const missing = names.map((n) => databaseConfig(n).migrateUrlEnv).filter((v) => !process.env[v]);
  if (missing.length) throw new Error(`Set ${missing.join(", ")} (see .env.example)`);

  for (const name of names) {
    await migrateDatabase(name, process.env[databaseConfig(name).migrateUrlEnv]!);
    console.log(`[migrate] ${name} up to date`);
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
