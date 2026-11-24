-- @file db/migrations/auth/0002_audit_append_only.sql
-- @description Makes audit_event append-only for the app role: INSERT and SELECT only, no UPDATE, DELETE or TRUNCATE.
-- @owner Kuba Gorski (@gitbob2000)
-- @slice Slice1
-- @see AC-S1-04.2 | T-S1-13
--
-- infra/postgres/init/01-auth.sql gives auth_app SELECT, INSERT, UPDATE, DELETE on every new table by default.
-- Migrations run as auth_owner (the table owner), which may take those back for this one table.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "audit_event" FROM "auth_app";
