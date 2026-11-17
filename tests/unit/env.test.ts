/** EXAMPLE unit test; pure logic, no database or browser. */
import { describe, expect, it } from "vitest";
import { loadEnv } from "@/lib/env";

const allDatabases = {
  AUTH_DATABASE_URL: "postgres://auth_app:x@db:5432/auth_db",
  SESSION_DATABASE_URL: "postgres://session_app:x@db:5432/session_db",
  ENGAGEMENT_DATABASE_URL: "postgres://engagement_app:x@db:5432/engagement_db",
};

describe("loadEnv", () => {
  it("applies defaults for local development", () => {
    const env = loadEnv({});
    expect(env.DEPLOY_ENV).toBe("local");
    expect(env.SMTP_PORT).toBe(1025);
  });

  it("collects one connection string per database", () => {
    expect(loadEnv(allDatabases).databaseUrls).toEqual({
      auth: allDatabases.AUTH_DATABASE_URL,
      session: allDatabases.SESSION_DATABASE_URL,
      engagement: allDatabases.ENGAGEMENT_DATABASE_URL,
    });
  });

  it("refuses to start in production unless every database is configured", () => {
    const { SESSION_DATABASE_URL: _missing, ...partial } = allDatabases;
    expect(() => loadEnv({ DEPLOY_ENV: "production", ...partial })).toThrow(/SESSION_DATABASE_URL/);
    expect(loadEnv({ DEPLOY_ENV: "production", ...allDatabases }).DEPLOY_ENV).toBe("production");
  });

  it("rejects an unknown DEPLOY_ENV (typo protection)", () => {
    expect(() => loadEnv({ DEPLOY_ENV: "prod" })).toThrow();
  });
});
