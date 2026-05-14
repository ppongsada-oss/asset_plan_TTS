ALTER TABLE `projects` ADD `type` text DEFAULT 'SITE' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `status` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `created_at` text DEFAULT '2026-05-06 00:00:00';