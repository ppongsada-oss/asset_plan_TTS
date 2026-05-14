import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { users, project_roles, projects } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import fs from "fs";
import path from "path";

// Find the local D1 sqlite file
const d1Dir = path.join(process.cwd(), ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const files = fs.readdirSync(d1Dir).filter(f => f.endsWith(".sqlite"));
if (files.length === 0) {
  throw new Error("No local D1 sqlite database found.");
}
const dbPath = path.join(d1Dir, files[0]);

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

async function seed() {
  console.log("Seeding Database...");
  
  const pw = await hashPassword("123456");
  
  // Create Users
  const user1 = db.insert(users).values({ email: "admin@asset.com", password_hash: pw, global_role: "ADMIN" }).returning().get();
  const user2 = db.insert(users).values({ email: "center@asset.com", password_hash: pw, global_role: "STORE_CENTER" }).returning().get();
  const user3 = db.insert(users).values({ email: "site@asset.com", password_hash: pw, global_role: "USER" }).returning().get();
  
  // Create Projects
  db.insert(projects).values({ id: "P1", name: "P1 - โครงการคอนโด A" }).run();
  db.insert(projects).values({ id: "P2", name: "P2 - โครงการหมู่บ้าน B" }).run();
  
  // Assign Roles
  db.insert(project_roles).values({ user_id: user3.id, project_id: "P1", role: "STORE_SITE" }).run();
  db.insert(project_roles).values({ user_id: user3.id, project_id: "P2", role: "STORE_SITE" }).run();

  console.log("Seed complete.");
}

seed().catch(console.error);
