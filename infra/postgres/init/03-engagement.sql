-- engagement database (the main project data). DEV/CI PASSWORDS ONLY (password = <role>_dev, see src/db/databases.ts).
-- Run automatically by the postgres container on first start (empty volume); CI runs it with psql.
--
--  engagement_owner : owns the schema, used ONLY by migrations (pnpm db:migrate)
--  engagement_app  : what the running app connects as (read/write rows, no schema changes)
--
-- No other role may connect to engagement_db: the databases are separate by design.

CREATE ROLE engagement_owner LOGIN PASSWORD 'engagement_owner_dev';
CREATE ROLE engagement_app   LOGIN PASSWORD 'engagement_app_dev';

CREATE DATABASE engagement_db OWNER engagement_owner;
REVOKE ALL ON DATABASE engagement_db FROM PUBLIC;
GRANT CONNECT ON DATABASE engagement_db TO engagement_app;

\connect engagement_db
ALTER SCHEMA public OWNER TO engagement_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO engagement_app;
ALTER DEFAULT PRIVILEGES FOR ROLE engagement_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO engagement_app;
ALTER DEFAULT PRIVILEGES FOR ROLE engagement_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO engagement_app;
