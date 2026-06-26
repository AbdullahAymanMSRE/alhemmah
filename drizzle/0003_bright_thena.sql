ALTER TABLE "day_blocks" ADD COLUMN "tracked_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "day_blocks" ADD COLUMN "running_since" timestamp;