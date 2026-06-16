import { sql } from "drizzle-orm";
import { text, integer, sqliteTable, index } from "drizzle-orm/sqlite-core";

// 1. Users & Roles (Module 5)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  global_role: text("global_role", { enum: ["ADMIN", "STORE_CENTER", "USER"] }).notNull().default("USER"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const project_roles = sqliteTable("project_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_id: integer("user_id").notNull().references(() => users.id),
  project_id: text("project_id").notNull(), 
  role: text("role", { enum: ["STORE_SITE", "PROJECT_MANAGER", "VIEWER"] }).notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(), 
  name: text("name").notNull(), 
  type: text("type", { enum: ["SITE", "WAREHOUSE"] }).notNull().default("SITE"),
  status: text("status", { enum: ["ACTIVE", "ARCHIVED"] }).notNull().default("ACTIVE"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 2. Master Data: Categories & Sub-Categories
export const categories = sqliteTable("categories", {
  code: text("code").primaryKey(), 
  name: text("name").notNull(),    
});

export const sub_categories = sqliteTable("sub_categories", {
  code: text("code").primaryKey(), 
  category_code: text("category_code").notNull().references(() => categories.code),
  name: text("name").notNull(),    
});

// 3. Master Data: Equipment Catalog (Feature 2.1)
export const equipment_items = sqliteTable("equipment_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  item_code: text("item_code").notNull().unique(),
  name: text("name").notNull(),
  category_code: text("category_code").notNull().references(() => categories.code),
  sub_category_code: text("sub_category_code").notNull().references(() => sub_categories.code),
  unit: text("unit").notNull(),
  buy_price: integer("buy_price").notNull().default(0),
  rent_price: integer("rent_price").notNull().default(0),
  lead_time: text("lead_time"),
  remaining_stock: integer("remaining_stock").notNull().default(0), 
});

// 4. Planning Cycles
export const planning_cycles = sqliteTable("planning_cycles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cycle_number: text("cycle_number").notNull().unique(), 
  start_date: text("start_date").notNull(), 
  end_date: text("end_date").notNull(),     
  target_months: text("target_months").notNull(), 
  created_by: integer("created_by").references(() => users.id), 
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 4.1 Planning Jobs
export const planning_jobs = sqliteTable("planning_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cycle_id: integer("cycle_id").notNull().references(() => planning_cycles.id),
  project_id: text("project_id").notNull().references(() => projects.id),
  job_number: text("job_number").notNull().unique(), 
  status: text("status", { enum: ["OPEN", "SUBMITTED", "APPROVED", "REJECTED", "CLOSED"] }).notNull().default("OPEN"),
  is_unlocked: integer("is_unlocked").notNull().default(0),
  edit_requested: integer("edit_requested").notNull().default(0),
  updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 5. Project Asset Planning
export const project_plans = sqliteTable("project_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  project_id: text("project_id").notNull(),
  equipment_id: integer("equipment_id").notNull().references(() => equipment_items.id),
  month: text("month").notNull(), 
  required_qty: integer("required_qty").notNull().default(0),
  status: text("status", { enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "PROCURED"] }).notNull().default("DRAFT"),
  job_id: integer("job_id").references(() => planning_jobs.id), 
  created_by: integer("created_by").references(() => users.id), 
  approved_by: integer("approved_by").references(() => users.id), 
}, (table) => ({
  planProjIdx: index("plan_proj_idx").on(table.project_id),
  planEqIdx: index("plan_eq_idx").on(table.equipment_id),
  planMonthIdx: index("plan_month_idx").on(table.month),
}));

// 6. Site Inventory
export const project_inventory = sqliteTable("project_inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  project_id: text("project_id").notNull(),
  equipment_id: integer("equipment_id").notNull().references(() => equipment_items.id),
  cycle_id: integer("cycle_id").references(() => planning_cycles.id),
  qty: integer("qty").notNull().default(0),
}, (table) => ({
  invProjIdx: index("inv_proj_idx").on(table.project_id),
  invEqIdx: index("inv_eq_idx").on(table.equipment_id),
  invCycleIdx: index("inv_cycle_idx").on(table.cycle_id),
}));

// 7. Warehouse Procurement Decisions
export const center_decisions = sqliteTable("center_decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plan_id: integer("plan_id").notNull().references(() => project_plans.id),
  action_type: text("action_type", { enum: ["DISPATCH", "CIRCULATE", "SUBSTITUTE", "BUY", "RENT", "RECEIVE", "REJECT_RETURN"] }).notNull(),
  qty: integer("qty").notNull().default(0),
  notes: text("notes"),
  action_by: integer("action_by").references(() => users.id), 
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  decPlanIdx: index("dec_plan_idx").on(table.plan_id),
}));

// 8. Planning Activity Logs (New)
export const planning_logs = sqliteTable("planning_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  job_id: integer("job_id").references(() => planning_jobs.id),
  action: text("action").notNull(), // e.g., "PM_EDIT", "PM_APPROVE", "PM_REJECT"
  details: text("details").notNull(), // JSON string of changes
  user_id: integer("user_id").references(() => users.id),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
