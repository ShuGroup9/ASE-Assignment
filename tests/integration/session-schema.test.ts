/**
 * @file tests/integration/session-schema.test.ts
 * @description Session schema against real PostgreSQL as session_app: token hash as primary key, uuid user id
 *              without a foreign key, timezone-aware timestamps and their checks.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 * @see 3_3_data_model | AC-S1-03.1, AC-S1-03.5
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { session } from "@/db/session/schema";
import { useTestDatabase } from "../helpers/db";

const newTokenHash = () => createHash("sha256").update(randomBytes(32)).digest("hex");

async function pgError(query: PromiseLike<unknown>): Promise<string> {
  try {
    await query;
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string } };
    return e.cause?.code ?? e.code ?? "unknown";
  }
  throw new Error("expected the query to fail");
}

describe("session schema", () => {
  const t = useTestDatabase("session");
  const inADay = () => new Date(Date.now() + 24 * 3_600_000);

  it("stores a session keyed by the token hash, with created/last-seen defaults", async () => {
    const idHash = newTokenHash();
    const userId = randomUUID();

    await t.db.insert(session).values({ idHash, userId, expiresAt: inADay() });

    const [row] = await t.db.select().from(session).where(eq(session.idHash, idHash));
    expect(row).toMatchObject({ idHash, userId, revokedAt: null });
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.lastSeenAt).toBeInstanceOf(Date);
  });

  it("lets the app revoke and touch a session", async () => {
    const idHash = newTokenHash();
    await t.db.insert(session).values({ idHash, userId: randomUUID(), expiresAt: inADay() });

    const now = new Date();
    await t.db.update(session).set({ lastSeenAt: now, revokedAt: now }).where(eq(session.idHash, idHash));

    const [row] = await t.db.select().from(session);
    expect(row.revokedAt?.getTime()).toBe(now.getTime());
  });

  it("rejects a raw token instead of its SHA-256 hash", async () => {
    const raw = randomBytes(48).toString("base64url").slice(0, 64);

    expect(await pgError(t.db.insert(session).values({ idHash: raw, userId: randomUUID(), expiresAt: inADay() }))).toBe("23514");
  });

  it("rejects a duplicate token hash", async () => {
    const row = { idHash: newTokenHash(), userId: randomUUID(), expiresAt: inADay() };
    await t.db.insert(session).values(row);

    expect(await pgError(t.db.insert(session).values(row))).toBe("23505");
  });

  it("rejects an expiry that is not after creation", async () => {
    const createdAt = new Date();

    expect(
      await pgError(t.db.insert(session).values({ idHash: newTokenHash(), userId: randomUUID(), createdAt, expiresAt: createdAt })),
    ).toBe("23514");
  });

  it("rejects a user id that is not a uuid (old integer ids)", async () => {
    const query = t.pool.query("INSERT INTO session (id_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [
      newTokenHash(),
      "42",
    ]);

    expect(await pgError(query)).toBe("22P02");
  });
});
