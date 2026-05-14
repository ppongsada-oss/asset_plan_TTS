ALTER TABLE `project_inventory` ADD `cycle_id` integer REFERENCES planning_cycles(id);--> statement-breakpoint
CREATE INDEX `inv_proj_idx` ON `project_inventory` (`project_id`);--> statement-breakpoint
CREATE INDEX `inv_eq_idx` ON `project_inventory` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `inv_cycle_idx` ON `project_inventory` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `dec_plan_idx` ON `center_decisions` (`plan_id`);--> statement-breakpoint
CREATE INDEX `plan_proj_idx` ON `project_plans` (`project_id`);--> statement-breakpoint
CREATE INDEX `plan_eq_idx` ON `project_plans` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `plan_month_idx` ON `project_plans` (`month`);