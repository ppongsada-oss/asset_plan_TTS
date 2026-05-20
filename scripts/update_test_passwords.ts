import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import fs from "fs";
import path from "path";
import { eq, or } from "drizzle-orm";

async function run() {
  const d1Dir = path.join(process.cwd(), ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
  const files = fs.readdirSync(d1Dir).filter(f => f.endsWith(".sqlite"));
  
  // Find the database with the users table
  let dbPath = "";
  for (const f of files) {
    const p = path.join(d1Dir, f);
    const sqlite = new Database(p);
    try {
      sqlite.prepare("SELECT count(*) FROM users").get();
      dbPath = p;
      sqlite.close();
      break;
    } catch (e) {
      sqlite.close();
    }
  }

  if (!dbPath) {
    console.error("No database with 'users' table found.");
    process.exit(1);
  }

  console.log(`Updating passwords in: ${dbPath}`);
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);

  const newHash = await hashPassword("123456");
  console.log(`New Hash: ${newHash}`);

  const testEmails = [
    "admin@asset.com",
    "center@asset.com",
    "site@asset.com",
    "pm@gmail.com",
    "storesite@gmail.com",
    "p.pongsada@gmail.com",
    "storecenter@gmail.com"
  ];

  for (const email of testEmails) {
    const result = db.update(users)
      .set({ password_hash: newHash })
      .where(eq(users.email, email))
      .run();
    
    if (result.changes > 0) {
      console.log(`✅ Updated: ${email}`);
    } else {
      console.log(`❌ Not found: ${email}`);
    }
  }

  sqlite.close();
  console.log("Password update complete.");
}

run().catch(console.error);
