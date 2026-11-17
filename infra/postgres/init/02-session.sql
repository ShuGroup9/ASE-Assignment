-- session database (sign-in sessions). DEV/CI PASSWORDS ONLY (password = <role>_dev, see src/db/databases.ts).
-- Run automatically by the postgres container on first start (empty volume); CI runs it with psql.
--
--  session_owner : owns the schema, used ONLY by migrations (pnpm db:migrate)
--  session_app  : what the running app connects as (read/write rows, no schema changes)
--
-- No other role may connect to session_db: the databases are separate by design.

CREATE ROLE session_owner LOGIN PASSWORD 'session_owner_dev';
CREATE ROLE session_app   LOGIN PASSWORD 'session_app_dev';

CREATE DATABASE session_db OWNER session_owner;
REVOKE ALL ON DATABASE session_db FROM PUBLIC;
GRANT CONNECT ON DATABASE session_db TO session_app;

\connect session_db
ALTER SCHEMA public OWNER TO session_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO session_app;
ALTER DEFAULT PRIVILEGES FOR ROLE session_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO session_app;
ALTER DEFAULT PRIVILEGES FOR ROLE session_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO session_app;
