// noinspection ES6PreferShortImport
/**
 * Runs ONCE before the integration suite (vitest.config.ts -> integration project -> globalSetup).
 *
 * Starts throwaway containers with Testcontainers and hands their addresses to the tests:
 *   - PostgreSQL, created exactly like dev/CI: infra/postgres/init/*.sql (one database + roles per
 *     entry in src/db/databases.ts), then each database's migrations applied as its <name>_owner.
 *   - Mailpit, a fake SMTP server with an HTTP API for reading the emails that were sent.
 *
 * Tests read these with the helpers in tests/helpers/ (useTestDatabase, useMailpit), never directly.
 * Everything is removed again when the run ends.
 */
import path from "node:path";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";
import { migrateDatabase } from "../../db/migrate";
import { DATABASE_NAMES, devDatabaseUrl, type DatabaseName } from "../../src/db/databases";

// Keep in step with infra/docker-compose.yml and the CI service images.
const POSTGRES_IMAGE = "postgres:18.7-alpine";
const MAILPIT_IMAGE = "axllent/mailpit:v1.34";

const root = path.resolve(import.meta.dirname, "../..");

export interface TestDatabaseUrls {
  /** <name>_app; least-privilege role the running app uses. Tests use this. */
  app: string;
  /** <name>_owner; owns the schema; used for migrations and resetting data between tests. */
  owner: string;
}

declare module "vitest" {
  export interface ProvidedContext {
    databases: Record<DatabaseName, TestDatabaseUrls>;
    mailpit: { smtpHost: string; smtpPort: number; apiUrl: string };
  }
}

export default async function setup(project: TestProject) {
  let postgres: StartedPostgreSqlContainer | undefined;
  let mailpit: StartedTestContainer | undefined;

  try {
    [postgres, mailpit] = await Promise.all([
      new PostgreSqlContainer(POSTGRES_IMAGE)
        // The image runs these on first start, the same way infra/docker-compose.yml mounts them.
        .withCopyDirectoriesToContainer([
          { source: path.join(root, "infra/postgres/init"), target: "/docker-entrypoint-initdb.d" },
        ])
        .start(),
      new GenericContainer(MAILPIT_IMAGE).withExposedPorts(1025, 8025).start(),
    ]);

    const host = postgres.getHost();
    const port = postgres.getMappedPort(5432);
    const databases = Object.fromEntries(
      DATABASE_NAMES.map((name) => [
        name,
        { app: devDatabaseUrl(name, "app", host, port), owner: devDatabaseUrl(name, "owner", host, port) },
      ]),
    ) as Record<DatabaseName, TestDatabaseUrls>;

    for (const name of DATABASE_NAMES) {
      await migrateDatabase(name, databases[name].owner);
    }

    project.provide("databases", databases);
    project.provide("mailpit", {
      smtpHost: mailpit.getHost(),
      smtpPort: mailpit.getMappedPort(1025),
      apiUrl: `http://${mailpit.getHost()}:${mailpit.getMappedPort(8025)}/api/v1`,
    });
  } catch (err) {
    await Promise.allSettled([postgres?.stop(), mailpit?.stop()]);
    throw err;
  }

  return async () => {
    await Promise.allSettled([postgres?.stop(), mailpit?.stop()]);
  };
}
