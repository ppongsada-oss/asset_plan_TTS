import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

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
  project_id: text("project_id").notNull(), // e.g., "P1"
  role: text("role", { enum: ["STORE_SITE", "PROJECT_MANAGER", "VIEWER"] }).notNull(),
});

// 2. Master Data: Equipment Catalog (Feature 2.1)
export const equipment_items = sqliteTable("equipment_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  item_code: text("item_code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  sub_category: text("sub_category").notNull(),
  unit: text("unit").notNull(),
  buy_price: integer("buy_price").notNull().default(0),
  rent_price: integer("rent_price").notNull().default(0),
  lead_time: text("lead_time"),
});

// 3. Project Asset Planning (Site Workflow - Feature 4.1)
export const project_plans = sqliteTable("project_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  project_id: text("project_id").notNull(),
  equipment_id: integer("equipment_id").notNull().references(() => equipment_items.id),
  month: text("month").notNull(), // e.g., "2026-02"
  required_qty: integer("required_qty").notNull().default(0),
  status: text("status", { enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PROCURED"] }).notNull().default("DRAFT"),
  created_by: integer("created_by").references(() => users.id), // Store Site User
  approved_by: integer("approved_by").references(() => users.id), // PM User
});

// 4. Warehouse Procurement Decisions (Center Workflow - Feature 3.1)
export const center_decisions = sqliteTable("center_decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plan_id: integer("plan_id").notNull().references(() => project_plans.id),
  action_type: text("action_type", { enum: ["CIRCULATE", "SUBSTITUTE", "BUY", "RENT"] }).notNull(),
  notes: text("notes"),
  action_by: integer("action_by").references(() => users.id), // Store Center User
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
