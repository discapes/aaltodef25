ALTER TABLE "resource_groups" ADD COLUMN "setup_time_hours" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "setup_time_hours" real DEFAULT 0 NOT NULL;