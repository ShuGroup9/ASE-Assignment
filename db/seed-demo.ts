// noinspection ES6PreferShortImport

/**
 * @file db/seed-demo.ts
 * @description Seeds local/demo auth users (student, supervisor, admin) with Argon2id-hashed demo passwords. Refuses to run in production.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 *
 *   pnpm db:seed:demo                         seeds demo/users.json into auth_db
 *   DEMO_PASSWORD='...' pnpm db:seed:demo     choose the password (required outside local/ci)
 *
 * Idempotent: re-running updates the same users (matched by id) and resets their password.
 * Connects as auth_app via AUTH_DATABASE_URL, like the running app; never as the owner.
 */
import fs from "node:fs";
import path from "node:path";
import { hash } from "@node-rs/argon2";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { z } from "zod";
import * as authSchema from "../src/db/auth/schema";
import { user } from "../src/db/auth/schema";

const root = path.resolve(import.meta.dirname, "..");
export const DEMO_USERS_FILE = path.join(root, "demo/users.json");

// Local/CI default only. Anywhere else DEMO_PASSWORD must be set explicitly.
export const DEFAULT_DEMO_PASSWORD = "Demo-Password-1!";

// OWASP minimum for Argon2id. Keep in step with src/lib/auth/password-hasher.ts.
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

const demoUsersSchema = z.object({
  users: z
    .array(
      z.object({
        id: z.uuid(),
        email: z
          .email()
          .refine((e) => e === e.toLowerCase(), "email must be lowercase (app_user_email_lowercase check)"),
        displayName: z.string().min(1),
        role: z.enum(authSchema.userRole.enumValues),
        status: z.enum(authSchema.userStatus.enumValues).default("active"),
      }),
    )
    .min(1),
});

export type DemoUser = z.infer<typeof demoUsersSchema>["users"][number];

// Read and validate the fixture (also checks ids and emails are unique).
export function loadDemoUsers(file = DEMO_USERS_FILE): DemoUser[] {
  const { users } = demoUsersSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  for (const key of ["id", "email"] as const) {
    const seen = new Set<string>();
    for (const u of users) {
      if (seen.has(u[key])) throw new Error(`Duplicate ${key} in ${path.basename(file)}: ${u[key]}`);
      seen.add(u[key]);
    }
  }
  return users;
}

/// Which password to use, or why seeding must not run here.
export function demoPassword(env: Record<string, string | undefined> = process.env): string {
  const deployEnv = env.DEPLOY_ENV ?? "local";
  if (deployEnv === "production") {
    throw new Error("Refusing to seed demo users when DEPLOY_ENV=production.");
  }
  const password = env.DEMO_PASSWORD;
  if (!password) {
    if (deployEnv === "local" || deployEnv === "ci") return DEFAULT_DEMO_PASSWORD;
    throw new Error(`Set DEMO_PASSWORD to seed demo users when DEPLOY_ENV=${deployEnv}.`);
  }
  if (password.length < 12) throw new Error("DEMO_PASSWORD must be at least 12 characters.");
  return password;
}

// Insert or update every demo user. Each gets its own salted hash.
export async function seedDemoUsers(
  db: NodePgDatabase<typeof authSchema>,
  users: DemoUser[],
  password: string,
): Promise<number> {
  const rows = await Promise.all(
    users.map(async (u) => ({ ...u, passwordHash: await hash(password, ARGON2_OPTIONS) })),
  );

  await db
    .insert(user)
    .values(rows)
    .onConflictDoUpdate({
      target: user.id,
      set: {
        email: sql`excluded.email`,
        displayName: sql`excluded.display_name`,
        role: sql`excluded.role`,
        status: sql`excluded.status`,
        passwordHash: sql`excluded.password_hash`,
      },
    });

  return rows.length;
}

async function main() {
  const password = demoPassword();
  const url = process.env.AUTH_DATABASE_URL;
  if (!url) throw new Error("Set AUTH_DATABASE_URL (see .env.example)");

  const users = loadDemoUsers();
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const count = await seedDemoUsers(drizzle(pool, { schema: authSchema }), users, password);
    console.log(`[seed-demo] ${count} demo users ready. Sign in with any of:`);
    for (const u of users) console.log(`  ${u.role.padEnd(10)} ${u.status.padEnd(8)} ${u.email}`);
    if (!process.env.DEMO_PASSWORD) console.log(`  password: ${DEFAULT_DEMO_PASSWORD}`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("seed-demo.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
