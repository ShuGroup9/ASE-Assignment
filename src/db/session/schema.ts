import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * SESSION database; sign-in sessions.
 */
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
