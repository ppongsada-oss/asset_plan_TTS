CREATE TABLE `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `global_role` text DEFAULT 'USER' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

CREATE TABLE `projects` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL
);

CREATE TABLE `project_roles` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL,
  `project_id` text NOT NULL,
  `role` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `categories` (
  `code` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL
);

CREATE TABLE `sub_categories` (
  `code` text PRIMARY KEY NOT NULL,
  `category_code` text NOT NULL,
  `name` text NOT NULL,
  FOREIGN KEY (`category_code`) REFERENCES `categories`(`code`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `equipment_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `item_code` text NOT NULL,
  `name` text NOT NULL,
  `category_code` text NOT NULL,
  `sub_category_code` text NOT NULL,
  `unit` text NOT NULL,
  `buy_price` integer DEFAULT 0 NOT NULL,
  `rent_price` integer DEFAULT 0 NOT NULL,
  `lead_time` text,
  `remaining_stock` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`category_code`) REFERENCES `categories`(`code`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`sub_category_code`) REFERENCES `sub_categories`(`code`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `equipment_items_item_code_unique` ON `equipment_items` (`item_code`);

CREATE TABLE `planning_cycles` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `cycle_number` text NOT NULL,
  `start_date` text NOT NULL,
  `end_date` text NOT NULL,
  `target_months` text NOT NULL,
  `created_by` integer,
  `created_at` text DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `planning_cycles_cycle_number_unique` ON `planning_cycles` (`cycle_number`);

CREATE TABLE `planning_jobs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `cycle_id` integer NOT NULL,
  `project_id` text NOT NULL,
  `job_number` text NOT NULL,
  `status` text DEFAULT 'OPEN' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`cycle_id`) REFERENCES `planning_cycles`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `planning_jobs_job_number_unique` ON `planning_jobs` (`job_number`);

CREATE TABLE `project_plans` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `project_id` text NOT NULL,
  `equipment_id` integer NOT NULL,
  `month` text NOT NULL,
  `required_qty` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'DRAFT' NOT NULL,
  `job_id` integer,
  `created_by` integer,
  `approved_by` integer,
  FOREIGN KEY (`equipment_id`) REFERENCES `equipment_items`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`job_id`) REFERENCES `planning_jobs`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `project_inventory` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `project_id` text NOT NULL,
  `equipment_id` integer NOT NULL,
  `qty` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`equipment_id`) REFERENCES `equipment_items`(`id`) ON UPDATE no action ON DELETE no action
);

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
