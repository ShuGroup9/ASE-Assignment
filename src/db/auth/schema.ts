/**
 * @file src/db/auth/schema.ts
 * @description AUTH database schema; users, login attempts, password reset tokens, append-only audit events
 *              and encrypted OAuth tokens.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 * @see 3_3_data_model | C-S1-01, AC-S1-01.3, AC-S1-04.1, AC-S1-04.2, AC-S1-06.2
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  customType,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** A PostgreSQL bytea column. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/** Timestamps are always stored with time zone and read back as Date (UTC). */
const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

/** 64 lowercase hex chars, i.e. a SHA-256 digest. Stops a raw token or email being stored by mistake. */
const isSha256Hex = (column: unknown) => sql`${column} ~ '^[0-9a-f]{64}$'`;

/**
 * Enums
 */

export const userRole = pgEnum("user_role", ["student", "supervisor", "admin"]);
export const userStatus = pgEnum("user_status", ["active", "locked", "disabled"]);
export const auditOutcome = pgEnum("audit_outcome", ["success", "denied", "locked"]);
export const oauthProvider = pgEnum("oauth_provider", ["github", "trello"]);

export type UserRole = (typeof userRole.enumValues)[number];
export type UserStatus = (typeof userStatus.enumValues)[number];
export type AuditOutcome = (typeof auditOutcome.enumValues)[number];
export type OAuthProvider = (typeof oauthProvider.enumValues)[number];

// Which slice wrote an audit entry.
export const AUDIT_SOURCES = ["S1", "S2", "S3", "S4"] as const;
export type AuditSource = (typeof AUDIT_SOURCES)[number];

/**
 * USER
 */

// Table is `app_user`, not `user`: USER is a reserved word in PostgreSQL
export const user = pgTable(
  "app_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    displayName: text("display_name").notNull(),
    role: userRole("role").notNull(),
    status: userStatus("status").notNull().default("active"),
    /** Argon2id PHC string, e.g. $argon2id$v=19$m=19456,t=2,p=1$... */
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("app_user_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("app_user_password_hash_argon2id", sql`${t.passwordHash} LIKE '$argon2id$%'`),
  ],
);

/**
 * LOGIN_ATTEMPT
 */

export const loginAttempt = pgTable(
  "login_attempt",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    emailHash: char("email_hash", { length: 64 }).notNull(),
    attemptedAt: timestamptz("attempted_at").notNull().defaultNow(),
    success: boolean("success").notNull(),
  },
  (t) => [
    index("login_attempt_email_hash_attempted_at_idx").on(t.emailHash, t.attemptedAt),
    check("login_attempt_email_hash_sha256", isSha256Hex(t.emailHash)),
  ],
);

/**
 * PASSWORD_RESET_TOKEN
 */

export const passwordResetToken = pgTable(
  "password_reset_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => user.id),
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
    createdBy: uuid("created_by").notNull().references(() => user.id),
    expiresAt: timestamptz("expires_at").notNull(),
    usedAt: timestamptz("used_at"),
  },
  (t) => [
    index("password_reset_token_user_id_idx").on(t.userId),
    check("password_reset_token_token_hash_sha256", isSha256Hex(t.tokenHash)),
  ],
);

/**
 * AUDIT_EVENT
 */

export const auditEvent = pgTable(
  "audit_event",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamptz("occurred_at").notNull().defaultNow(),
    actorUserId: uuid("actor_user_id").references(() => user.id),
    actorRole: userRole("actor_role"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    outcome: auditOutcome("outcome").notNull(),
    source: text("source").notNull().$type<AuditSource>(),
  },
  (t) => [
    index("audit_event_occurred_at_idx").on(t.occurredAt),
    index("audit_event_actor_user_id_occurred_at_idx").on(t.actorUserId, t.occurredAt),
    check(
      "audit_event_source_valid",
      sql`${t.source} IN (${sql.raw(AUDIT_SOURCES.map((s) => `'${s}'`).join(", "))})`,
    ),
    check("audit_event_actor_role_with_actor", sql`${t.actorRole} IS NULL OR ${t.actorUserId} IS NOT NULL`),
  ],
);

/**
 * OAUTH_TOKEN
 */

// GitHub / Trello tokens for S3, encrypted with AES-256-GCM by the TokenVault before they get here.
export const oauthToken = pgTable(
  "oauth_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => user.id),
    provider: oauthProvider("provider").notNull(),
    accessTokenEnc: bytea("access_token_enc").notNull(),
    refreshTokenEnc: bytea("refresh_token_enc"),
    scopes: text("scopes").notNull(),
    expiresAt: timestamptz("expires_at"),
  },
  (t) => [unique("oauth_token_user_id_provider_unique").on(t.userId, t.provider)],
);
