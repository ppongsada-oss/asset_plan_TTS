CREATE TABLE `center_decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`action_type` text NOT NULL,
	`notes` text,
	`action_by` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`plan_id`) REFERENCES `project_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`action_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `equipment_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`sub_category` text NOT NULL,
	`unit` text NOT NULL,
	`buy_price` integer DEFAULT 0 NOT NULL,
	`rent_price` integer DEFAULT 0 NOT NULL,
	`lead_time` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_items_item_code_unique` ON `equipment_items` (`item_code`);--> statement-breakpoint
CREATE TABLE `project_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`equipment_id` integer NOT NULL,
	`month` text NOT NULL,
	`required_qty` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_by` integer,
	`approved_by` integer,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`project_id` text NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`global_role` text DEFAULT 'USER' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);