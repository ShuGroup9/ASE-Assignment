/**
 * @file src/db/auth/schema.ts
 * @description AUTH database schema; users, login attempts, password reset tokens, append-only audit events
 *              and encrypted OAuth tokens.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 */

import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const userAccount = pgTable("user_account", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
