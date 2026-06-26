ALTER TABLE "template_blocks" ADD COLUMN "excluded_weekdays" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
-- Backfill labels onto work blocks from their task type before the type table is dropped (ADR 0003).
UPDATE "template_blocks" SET "label" = "task_types"."label"
  FROM "task_types"
  WHERE "template_blocks"."task_type_id" = "task_types"."id"
    AND "template_blocks"."kind" = 'work'
    AND ("template_blocks"."label" IS NULL OR "template_blocks"."label" = '');--> statement-breakpoint
-- Carry each type's weekday exclusions onto its work blocks (now a per-block property).
UPDATE "template_blocks" SET "excluded_weekdays" = "task_types"."excluded_weekdays"
  FROM "task_types"
  WHERE "template_blocks"."task_type_id" = "task_types"."id"
    AND "template_blocks"."kind" = 'work';--> statement-breakpoint
ALTER TABLE "template_blocks" DROP CONSTRAINT "template_blocks_task_type_id_task_types_id_fk";--> statement-breakpoint
ALTER TABLE "template_blocks" DROP COLUMN "task_type_id";--> statement-breakpoint
ALTER TABLE "day_blocks" DROP COLUMN "task_type_id";--> statement-breakpoint
DROP TABLE "task_types" CASCADE;
