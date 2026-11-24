/**
 * @file tests/integration/auth-schema.test.ts
 * @description Auth schema constraints against real PostgreSQL as auth_app: defaults, uniqueness, hash/email checks,
 *              foreign keys, bytea round trip, and audit_event being append-only.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 * @see 3_3_data_model | AC-S1-04.2 | T-S1-13
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditEvent, loginAttempt, oauthToken, passwordResetToken, user } from "@/db/auth/schema";
import { useTestDatabase } from "../helpers/db";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const ARGON2_HASH = "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$aGFzaGhhc2hoYXNoaGFzaA";

async function pgError(query: PromiseLike<unknown>): Promise<string> {
  try {
    await query;
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string } };
    return e.cause?.code ?? e.code ?? "unknown";
  }
  throw new Error("expected the query to fail");
}
const UNIQUE = "23505";
const CHECK = "23514";
const FOREIGN_KEY = "23503";
const NOT_ALLOWED = "42501";

describe("auth schema", () => {
  const t = useTestDatabase("auth");

  async function insertUser(overrides: Partial<typeof user.$inferInsert> = {}) {
    const [row] = await t.db
      .insert(user)
      .values({
        email: `user-${randomBytes(4).toString("hex")}@example.ac.uk`,
        displayName: "Joe Smith",
        role: "student",
        passwordHash: ARGON2_HASH,
        ...overrides,
      })
      .returning();
    return row;
  }

  describe("app_user", () => {
    it("fills id, status and created_at by default", async () => {
      const row = await insertUser();

      expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(row.status).toBe("active");
      expect(row.createdAt).toBeInstanceOf(Date);
    });

    it("rejects a duplicate email", async () => {
      await insertUser({ email: "j.smith@student.example.ac.uk" });

      expect(await pgError(insertUser({ email: "j.smith@student.example.ac.uk" }))).toBe(UNIQUE);
    });

    it("rejects an email that is not lowercase (keeps uniqueness case-insensitive)", async () => {
      expect(await pgError(insertUser({ email: "J.Smith@Student.example.ac.uk" }))).toBe(CHECK);
    });

    it("rejects a password_hash that is not Argon2id", async () => {
      expect(await pgError(insertUser({ passwordHash: "plaintext-password" }))).toBe(CHECK);
    });
  });

  describe("login_attempt", () => {
    it("stores attempts keyed by a SHA-256 email hash", async () => {
      await t.db.insert(loginAttempt).values({ emailHash: sha256("j.smith@student.example.ac.uk"), success: false });

      const [row] = await t.db.select().from(loginAttempt);
      expect(row.id).toBe(1);
      expect(row.attemptedAt).toBeInstanceOf(Date);
    });

    it("rejects a raw email in email_hash", async () => {
      const raw = "j.smith@student.example.ac.uk".padEnd(64, "x");
      expect(await pgError(t.db.insert(loginAttempt).values({ emailHash: raw, success: false }))).toBe(CHECK);
    });
  });

  describe("password_reset_token", () => {
    it("links to the user and the admin who issued it", async () => {
      const student = await insertUser();
      const admin = await insertUser({ role: "admin" });

      await t.db.insert(passwordResetToken).values({
        userId: student.id,
        createdBy: admin.id,
        tokenHash: sha256("raw-token"),
        expiresAt: new Date(Date.now() + 30 * 60000),
      });

      const [row] = await t.db.select().from(passwordResetToken);
      expect(row).toMatchObject({ userId: student.id, createdBy: admin.id, usedAt: null });
    });

    it("rejects an unknown user", async () => {
      const admin = await insertUser({ role: "admin" });
      const query = t.db.insert(passwordResetToken).values({
        userId: "00000000-0000-4000-8000-000000000000",
        createdBy: admin.id,
        tokenHash: sha256("x"),
        expiresAt: new Date(),
      });

      expect(await pgError(query)).toBe(FOREIGN_KEY);
    });

    it("rejects a reused token hash and a raw token", async () => {
      const u = await insertUser();
      const row = { userId: u.id, createdBy: u.id, expiresAt: new Date() };
      await t.db.insert(passwordResetToken).values({ ...row, tokenHash: sha256("same") });

      expect(await pgError(t.db.insert(passwordResetToken).values({ ...row, tokenHash: sha256("same") }))).toBe(UNIQUE);
      expect(await pgError(t.db.insert(passwordResetToken).values({ ...row, tokenHash: "A".repeat(64) }))).toBe(CHECK);
    });
  });

  describe("audit_event", () => {
    it("records an event with the actor, and an anonymous one", async () => {
      const u = await insertUser({ role: "supervisor" });

      await t.db.insert(auditEvent).values([
        { actorUserId: u.id, actorRole: "supervisor", action: "VIEW_TEAM", targetType: "team", targetId: "08", outcome: "denied", source: "S2" },
        { action: "SIGN_IN", targetType: "user", outcome: "denied", source: "S1" },
      ]);

      const rows = await t.db.select().from(auditEvent).orderBy(auditEvent.id);
      expect(rows.map((r) => r.id)).toEqual([1, 2]);
      expect(rows[0].occurredAt).toBeInstanceOf(Date);
      expect(rows[1]).toMatchObject({ actorUserId: null, actorRole: null });
    });

    it("rejects an unknown source", async () => {
      const query = t.db.insert(auditEvent).values({
        action: "SIGN_IN",
        targetType: "user",
        outcome: "success",
        source: "S9" as "S1",
      });

      expect(await pgError(query)).toBe(CHECK);
    });

    it("rejects an actor role without an actor", async () => {
      const query = t.db
        .insert(auditEvent)
        .values({ actorRole: "admin", action: "SIGN_IN", targetType: "user", outcome: "success", source: "S1" });

      expect(await pgError(query)).toBe(CHECK);
    });

    describe("[T-S1-13] append-only for auth_app", () => {
      async function seedEvent() {
        await t.db.insert(auditEvent).values({ action: "SIGN_IN", targetType: "user", outcome: "success", source: "S1" });
      }

      it("refuses UPDATE", async () => {
        await seedEvent();
        expect(await pgError(t.db.update(auditEvent).set({ outcome: "denied" }).where(eq(auditEvent.id, 1)))).toBe(NOT_ALLOWED);
      });

      it("refuses DELETE", async () => {
        await seedEvent();
        expect(await pgError(t.db.delete(auditEvent).where(eq(auditEvent.id, 1)))).toBe(NOT_ALLOWED);
      });

      it("refuses TRUNCATE", async () => {
        expect(await pgError(t.pool.query("TRUNCATE audit_event"))).toBe(NOT_ALLOWED);
      });

      it("keeps the row unchanged after a refused UPDATE", async () => {
        await seedEvent();
        await pgError(t.db.update(auditEvent).set({ outcome: "denied" }));

        const [row] = await t.db.select().from(auditEvent);
        expect(row.outcome).toBe("success");
      });
    });
  });

  describe("oauth_token", () => {
    it("round-trips encrypted bytes", async () => {
      const u = await insertUser();
      const ciphertext = randomBytes(48);

      await t.db.insert(oauthToken).values({ userId: u.id, provider: "github", accessTokenEnc: ciphertext, scopes: "repo read:user" });

      const [row] = await t.db.select().from(oauthToken);
      expect(Buffer.isBuffer(row.accessTokenEnc)).toBe(true);
      expect(row.accessTokenEnc.equals(ciphertext)).toBe(true);
      expect(row.refreshTokenEnc).toBeNull();
    });

    it("allows one token per user and provider", async () => {
      const u = await insertUser();
      const row = { userId: u.id, accessTokenEnc: randomBytes(8), scopes: "" };
      await t.db.insert(oauthToken).values({ ...row, provider: "github" });
      await t.db.insert(oauthToken).values({ ...row, provider: "trello" });

      expect(await pgError(t.db.insert(oauthToken).values({ ...row, provider: "github" }))).toBe(UNIQUE);
    });
  });
});
