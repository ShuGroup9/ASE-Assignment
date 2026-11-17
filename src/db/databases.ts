/**
 * THE LIST OF DATABASES. Each one is completely separate by design:
 *
 *   its own PostgreSQL database   <name>_db
 *   its own roles                 <name>_owner (migrations only) and <name>_app (the running app)
 *   its own schema                src/db/<name>/schema.ts
 *   its own migrations            db/migrations/<name>/
 *   its own connection settings   <NAME>_DATABASE_URL and <NAME>_MIGRATE_URL
 *
 */
export const DATABASE_NAMES = ["auth", "session", "engagement"] as const;

export type DatabaseName = (typeof DATABASE_NAMES)[number];

export interface DatabaseConfig {
  name: DatabaseName;
  /** PostgreSQL database name. */
  database: string;
  /** Owns the schema. Used by migrations, drizzle-kit and test resets; never by the running app. */
  owner: string;
  /** Least-privilege role the running app connects as: read/write rows, no schema changes.
   *  (Named `_app`, not `_user`: `session_user` is a reserved role name in PostgreSQL.) */
  app: string;
  /** Env var holding the app's connection string (as `app`). */
  urlEnv: string;
  /** Env var holding the migration connection string (as `owner`). */
  migrateUrlEnv: string;
  /** Drizzle schema file, relative to the repo root. */
  schemaPath: string;
  /** Generated migrations, relative to the repo root. */
  migrationsDir: string;
}

export function isDatabaseName(value: unknown): value is DatabaseName {
  return typeof value === "string" && (DATABASE_NAMES as readonly string[]).includes(value);
}

export function databaseConfig(name: DatabaseName): DatabaseConfig {
  const env = name.toUpperCase();
  return {
    name,
    database: `${name}_db`,
    owner: `${name}_owner`,
    app: `${name}_app`,
    urlEnv: `${env}_DATABASE_URL`,
    migrateUrlEnv: `${env}_MIGRATE_URL`,
    schemaPath: `src/db/${name}/schema.ts`,
    migrationsDir: `db/migrations/${name}`,
  };
}

/**
 * DEV/CI ONLY connection string. Passwords follow the `<role>_dev` convention used in
 * infra/postgres/init/*.sql. Staging/production get real URLs from secrets.
 */
export function devDatabaseUrl(name: DatabaseName, role: "owner" | "app", host = "localhost", port = 5432) {
  const config = databaseConfig(name);
  const login = config[role];
  return `postgres://${login}:${login}_dev@${host}:${port}/${config.database}`;
}
