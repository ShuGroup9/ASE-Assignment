/**
 * @file src/db/session/schema.ts
 * @description SESSION database schema; one row per sign-in session,
 *              keyed by SHA-256 of the cookie token (user_id is a logical reference to auth_db, no FK).
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 */

import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
