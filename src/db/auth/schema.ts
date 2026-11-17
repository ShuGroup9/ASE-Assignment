import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * AUTH database; accounts and credentials.
 */
export const userAccount = pgTable("user_account", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
