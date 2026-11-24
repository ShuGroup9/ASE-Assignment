/**
 * @file tests/integration/seed-demo.test.ts
 * @description Demo seed: fixture is valid, users land in auth_db with verifiable Argon2id hashes,
 *              re-running updates instead of duplicating, and production is refused.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 */
import { describe, expect, it } from "vitest";
import { verify } from "@node-rs/argon2";
import { user } from "@/db/auth/schema";
import { DEFAULT_DEMO_PASSWORD, demoPassword, loadDemoUsers, seedDemoUsers } from "../../db/seed-demo";
import { useTestDatabase } from "../helpers/db";

describe("demo fixture (demo/users.json)", () => {
  const users = loadDemoUsers();

  it("has at least one student, supervisor and admin", () => {
    expect(new Set(users.map((u) => u.role))).toEqual(new Set(["student", "supervisor", "admin"]));
  });

  it("includes the personas from the UI mockups", () => {
    expect(users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: "j.smith@student.example.ac.uk", displayName: "Joe Smith", role: "student" }),
        expect.objectContaining({ email: "a.john@example.ac.uk", displayName: "Dr A John", role: "supervisor" }),
      ]),
    );
  });
});

describe("demoPassword()", () => {
  it("uses the default locally and in CI", () => {
    expect(demoPassword({ DEPLOY_ENV: "local" })).toBe(DEFAULT_DEMO_PASSWORD);
    expect(demoPassword({ DEPLOY_ENV: "ci" })).toBe(DEFAULT_DEMO_PASSWORD);
    expect(demoPassword({})).toBe(DEFAULT_DEMO_PASSWORD);
  });

  it("refuses production, even with a password", () => {
    expect(() => demoPassword({ DEPLOY_ENV: "production", DEMO_PASSWORD: "a-long-password-123" })).toThrow(/production/);
  });

  it("requires an explicit password in staging", () => {
    expect(() => demoPassword({ DEPLOY_ENV: "staging" })).toThrow(/DEMO_PASSWORD/);
    expect(demoPassword({ DEPLOY_ENV: "staging", DEMO_PASSWORD: "staging-demo-pass" })).toBe("staging-demo-pass");
  });

  it("rejects a short password", () => {
    expect(() => demoPassword({ DEMO_PASSWORD: "short" })).toThrow(/12 characters/);
  });
});

describe("seedDemoUsers()", () => {
  const t = useTestDatabase("auth");
  const users = loadDemoUsers();

  it("inserts every demo user with a verifiable Argon2id hash", async () => {
    expect(await seedDemoUsers(t.db, users, DEFAULT_DEMO_PASSWORD)).toBe(users.length);

    const rows = await t.db.select().from(user);
    expect(rows).toHaveLength(users.length);

    const joe = rows.find((r) => r.email === "j.smith@student.example.ac.uk")!;
    expect(joe.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await verify(joe.passwordHash, DEFAULT_DEMO_PASSWORD)).toBe(true);
    expect(await verify(joe.passwordHash, "wrong-password")).toBe(false);
  });

  it("salts each user separately", async () => {
    await seedDemoUsers(t.db, users, DEFAULT_DEMO_PASSWORD);

    const hashes = (await t.db.select({ h: user.passwordHash }).from(user)).map((r) => r.h);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("is idempotent: re-running updates the same rows and resets the password", async () => {
    await seedDemoUsers(t.db, users, DEFAULT_DEMO_PASSWORD);
    await seedDemoUsers(t.db, users, "another-demo-password");

    const rows = await t.db.select().from(user);
    expect(rows).toHaveLength(users.length);
    expect(await verify(rows[0].passwordHash, "another-demo-password")).toBe(true);
  });
});
