import { drizzle } from 'drizzle-orm/d1';

export interface Env {
  DB: D1Database;
}

export function getDb(env: Env) {
  return drizzle(env.DB);
}
