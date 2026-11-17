/** EXAMPLE integration test; real PostgreSQL (Testcontainers), engagement database, connected as engagement_app. */
import { describe, expect, it } from "vitest";
import { exampleItem } from "@/db/engagement/schema";
import { useTestDatabase } from "../helpers/db";

describe("example_item table", () => {
  const t = useTestDatabase("engagement");

  it("stores and reads back a row", async () => {
    await t.db.insert(exampleItem).values({ title: "Hello" });

    const rows = await t.db.select().from(exampleItem);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, title: "Hello" });
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });

  it("starts every test with empty tables and ids from 1", async () => {
    expect(await t.db.select().from(exampleItem)).toEqual([]);

    const [row] = await t.db.insert(exampleItem).values({ title: "Again" }).returning();
    expect(row.id).toBe(1);
  });
});
