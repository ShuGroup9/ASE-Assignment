CREATE TABLE "session" (
	"id_hash" char(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "session_id_hash_sha256" CHECK ("session"."id_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "session_expires_after_created" CHECK ("session"."expires_at" > "session"."created_at")
);
--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");