/**
 * @file src/db/session/schema.ts
 * @description SESSION database schema; one row per sign-in session,
 *              keyed by SHA-256 of the cookie token (user_id is a logical reference to auth_db, no FK).
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 * @see 3_3_data_model | AC-S1-03.1, AC-S1-03.5
 */

import { sql } from "drizzle-orm";
import { char, check, index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const session = pgTable(
  "session",
  {
    idHash: char("id_hash", { length: 64 }).primaryKey(),
    userId: uuid("user_id").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    lastSeenAt: timestamptz("last_seen_at").notNull().defaultNow(),
    expiresAt: timestamptz("expires_at").notNull(),
    revokedAt: timestamptz("revoked_at"),
  },
  (t) => [
    index("session_user_id_idx").on(t.userId),
    index("session_expires_at_idx").on(t.expiresAt),
    check("session_id_hash_sha256", sql`${t.idHash} ~ '^[0-9a-f]{64}$'`),
    check("session_expires_after_created", sql`${t.expiresAt} > ${t.createdAt}`),
  ],
);
