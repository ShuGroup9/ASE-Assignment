import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";
import type { DatabaseName } from "./databases";
import * as auth from "./auth/schema";
import * as session from "./session/schema";
import * as engagement from "./engagement/schema";

/** Each database's Drizzle schema. A new entry in databases.ts won't compile until it is added here. */
const schemas = { auth, session, engagement } satisfies Record<DatabaseName, object>;

type Schemas = typeof schemas;
export type Database<N extends DatabaseName> = NodePgDatabase<Schemas[N]>;

/** Build a client for one database from a connection string (tests pass Testcontainers URLs). */
export function createDb<N extends DatabaseName>(name: N, connectionString: string): { db: Database<N>; pool: Pool } {
  const pool = new Pool({ connectionString });
  return { db: drizzle(pool, { schema: schemas[name] }) as unknown as Database<N>, pool };
}

const shared = new Map<DatabaseName, unknown>();

/**
 * The app's shared client for one database, connected as that database's least-privilege role.
 *
 *   const users = await db("auth").select().from(user);
 */
export function db<N extends DatabaseName>(name: N): Database<N> {
  if (!shared.has(name)) {
    const url = getEnv().databaseUrls[name];
    if (!url) throw new Error(`No connection string for the "${name}" database (see .env.example)`);
    shared.set(name, createDb(name, url).db);
  }
  return shared.get(name) as Database<N>;
}
