-- auth database (accounts and credentials). DEV/CI PASSWORDS ONLY (password = <role>_dev, see src/db/databases.ts).
-- Run automatically by the postgres container on first start (empty volume); CI runs it with psql.
--
--  auth_owner : owns the schema, used ONLY by migrations (pnpm db:migrate)
--  auth_app  : what the running app connects as (read/write rows, no schema changes)
--
-- No other role may connect to auth_db: the databases are separate by design.

CREATE ROLE auth_owner LOGIN PASSWORD 'auth_owner_dev';
CREATE ROLE auth_app   LOGIN PASSWORD 'auth_app_dev';

CREATE DATABASE auth_db OWNER auth_owner;
REVOKE ALL ON DATABASE auth_db FROM PUBLIC;
GRANT CONNECT ON DATABASE auth_db TO auth_app;

\connect auth_db
ALTER SCHEMA public OWNER TO auth_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO auth_app;
ALTER DEFAULT PRIVILEGES FOR ROLE auth_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO auth_app;
ALTER DEFAULT PRIVILEGES FOR ROLE auth_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO auth_app;
