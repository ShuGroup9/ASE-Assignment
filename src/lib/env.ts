import "server-only";
import { z } from "zod";
import { DATABASE_NAMES, databaseConfig, type DatabaseName } from "@/db/databases";

/**
 * Validated environment, checked once at start-up (src/instrumentation.ts).
 * Add new variables here AND to .env.example.
 */
const databaseUrlVars = Object.fromEntries(
  DATABASE_NAMES.map((name) => [databaseConfig(name).urlEnv, z.url().optional()]),
);

const schema = z
  .object({
    DEPLOY_ENV: z.enum(["local", "ci", "staging", "production"]).default("local"),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    MAIL_FROM: z.string().default("ASE Assignment <no-reply@app.local>"),
    APP_BASE_URL: z.url().default("http://localhost:3000"),
    // <NAME>_DATABASE_URL for every database in src/db/databases.ts
    ...databaseUrlVars,
  })
  .transform((raw) => {
    const vars = raw as Record<string, unknown>;
    const databaseUrls = Object.fromEntries(
      DATABASE_NAMES.map((name) => [name, vars[databaseConfig(name).urlEnv] as string | undefined]),
    ) as Record<DatabaseName, string | undefined>;
    return {
      DEPLOY_ENV: raw.DEPLOY_ENV,
      SMTP_HOST: raw.SMTP_HOST,
      SMTP_PORT: raw.SMTP_PORT,
      MAIL_FROM: raw.MAIL_FROM,
      APP_BASE_URL: raw.APP_BASE_URL,
      /** Connection string per database, e.g. databaseUrls.auth */
      databaseUrls,
    };
  });

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | undefined;

export function loadEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  const env = schema.parse(source);
  if (env.DEPLOY_ENV === "production") {
    const missing = DATABASE_NAMES.filter((name) => !env.databaseUrls[name]).map((name) => databaseConfig(name).urlEnv);
    if (missing.length > 0) {
      throw new Error(`Refusing to start: ${missing.join(", ")} must be set when DEPLOY_ENV=production.`);
    }
  }
  return env;
}

export function getEnv(): AppEnv {
  return (cached ??= loadEnv());
}
