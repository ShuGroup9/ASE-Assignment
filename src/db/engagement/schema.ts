/**
 * ENGAGEMENT database; the main project data.
 */

/** team_member: added by S1 for AccessPolicy (read-only from S1). Owner of the table: S2. */

import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const exampleItem = pgTable("example_item", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
