import { defineConfig } from "drizzle-kit";
import { DATABASE_NAMES, databaseConfig, isDatabaseName } from "./src/db/databases";

/**
 * drizzle-kit config for ONE database, chosen by the DB env var.
 * Do not call drizzle-kit directly; use `pnpm db:generate <database>` (db/generate.ts sets DB).
 */
const name = process.env.DB;
if (!isDatabaseName(name)) {
  throw new Error(`Set DB to one of: ${DATABASE_NAMES.join(", ")} (use pnpm db:generate <database>)`);
}
const config = databaseConfig(name);

export default defineConfig({
  dialect: "postgresql",
  schema: `./${config.schemaPath}`,
  out: `./${config.migrationsDir}`,
  dbCredentials: { url: process.env[config.migrateUrlEnv] ?? "" },
});
