import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * ENGAGEMENT database; the main project data.
 */
export const exampleItem = pgTable("example_item", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
