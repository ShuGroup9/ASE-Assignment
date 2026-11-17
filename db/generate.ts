// noinspection ES6PreferShortImport

/**
 * `pnpm db:generate` - turns schema changes into SQL migrations, per database.
 *
 *   pnpm db:generate auth --name add_password_hash   one database, named migration
 *   pnpm db:generate auth --custom --name backfill   one database, empty migration for hand-written SQL
 *   pnpm db:generate                                 every database (only those whose schema changed get a file)
 */
import { spawnSync } from "node:child_process";
import { DATABASE_NAMES, isDatabaseName, type DatabaseName } from "../src/db/databases";

const args = process.argv.slice(2);
const first = args[0];
const names: readonly DatabaseName[] = isDatabaseName(first) ? [first] : DATABASE_NAMES;
const passThrough = isDatabaseName(first) ? args.slice(1) : args;

if (first && !first.startsWith("-") && !isDatabaseName(first)) {
  console.error(`Unknown database "${first}". Choose one of: ${DATABASE_NAMES.join(", ")}`);
  process.exit(1);
}
if (names.length > 1 && passThrough.length > 0) {
  console.error(`Name the database for --name/--custom, e.g. pnpm db:generate ${DATABASE_NAMES[0]} ${passThrough.join(" ")}`);
  process.exit(1);
}

for (const name of names) {
  console.log(`\n[generate] ${name}`);
  const result = spawnSync("pnpm", ["exec", "drizzle-kit", "generate", "--config=drizzle.config.ts", ...passThrough], {
    stdio: "inherit",
    env: { ...process.env, DB: name },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
