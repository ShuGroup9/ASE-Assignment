/**
 * Database helper for integration tests.
 *
 *   describe("something", () => {
 *     const t = useTestDatabase("engagement");   // call once, at the top of the describe block
 *     it("works", async () => {
 *       await t.db.insert(exampleItem).values({ title: "Hi" });
 *     });
 *   });
 *
 * - `t.db` is a Drizzle client for that ONE database, connected as its <name>_app role.
 *   The same least-privilege role the app uses. Need two databases? Call useTestDatabase twice.
 * - Every table in that database is emptied (and id sequences reset) BEFORE each test, so tests never
 *   see each other's rows and can run in any order. Seed what you need inside the test or a beforeEach.
 */
import { afterAll, beforeEach, inject } from "vitest";
import { Pool } from "pg";
import { createDb } from "@/db/client";
import type { DatabaseName } from "@/db/databases";

export function useTestDatabase<N extends DatabaseName>(name: N) {
  const urls = inject("databases")[name];
  const app = createDb(name, urls.app);
  const owner = new Pool({ connectionString: urls.owner, max: 1 });

  beforeEach(async () => {
    await resetDatabase(owner);
  });

  afterAll(async () => {
    await Promise.all([app.pool.end(), owner.end()]);
  });

  return { db: app.db, pool: app.pool, urls };
}

/** TRUNCATE every table in the public schema. Drizzle's migration log lives in the `drizzle` schema, so it is kept. */
async function resetDatabase(owner: Pool) {
  const { rows } = await owner.query<{ name: string }>(
    "SELECT quote_ident(tablename) AS name FROM pg_tables WHERE schemaname = 'public'",
  );
  if (rows.length === 0) return;
  await owner.query(`TRUNCATE ${rows.map((r) => r.name).join(", ")} RESTART IDENTITY CASCADE`);
}
