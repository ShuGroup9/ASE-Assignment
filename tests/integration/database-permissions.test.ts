/**
 * The databases are separate by design (src/db/databases.ts, infra/postgres/init/*.sql):
 *   - each <name>_app role may connect to its OWN database, but not change the schema
 *     (reading/writing rows is covered by the per-table tests, e.g. example-item.test.ts);
 *   - no role can connect to another database at all.
 * Guards the init SQL against accidental privilege esca.
 */
import { afterEach, describe, expect, inject, it } from "vitest";
import { Client } from "pg";
import { DATABASE_NAMES, databaseConfig, type DatabaseName } from "@/db/databases";

const databases = inject("databases");
const open: Client[] = [];

/** Connect with one database's credentials, optionally to a different database. */
async function connect(name: DatabaseName, role: "app" | "owner", to: DatabaseName = name) {
  const url = new URL(databases[name][role]);
  url.pathname = `/${databaseConfig(to).database}`;
  const client = new Client({ connectionString: url.toString() });
  open.push(client);
  await client.connect();
  return client;
}

afterEach(async () => {
  await Promise.allSettled(open.splice(0).map((c) => c.end()));
});

describe.each(DATABASE_NAMES)("%s database", (name) => {
  const { app } = databaseConfig(name);

  it(`${app} can connect to its own database`, async () => {
    const client = await connect(name, "app");
    const { rows } = await client.query("SELECT current_database() AS db");
    expect(rows[0].db).toBe(databaseConfig(name).database);
  });

  it(`${app} cannot create, alter or drop tables`, async () => {
    const client = await connect(name, "app");
    await expect(client.query("CREATE TABLE sneaky (id int)")).rejects.toThrow(/permission denied/);

    const { rows } = await client.query<{ t: string }>(
      "SELECT quote_ident(tablename) AS t FROM pg_tables WHERE schemaname = 'public' LIMIT 1",
    );
    if (rows[0]) {
      await expect(client.query(`ALTER TABLE ${rows[0].t} ADD COLUMN x int`)).rejects.toThrow(/must be owner/);
      await expect(client.query(`DROP TABLE ${rows[0].t}`)).rejects.toThrow(/must be owner/);
    }
  });

  for (const other of DATABASE_NAMES.filter((n) => n !== name)) {
    it(`neither ${name} role can connect to the ${other} database`, async () => {
      await expect(connect(name, "app", other)).rejects.toThrow(/permission denied for database/);
      await expect(connect(name, "owner", other)).rejects.toThrow(/permission denied for database/);
    });
  }
});
