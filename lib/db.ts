import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: pg.Pool | null = null;

function getPool() {
  if (_pool) return _pool;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  _pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  return _pool;
}

export function getDb() {
  if (_db) return _db;
  _db = drizzle(getPool(), { schema });
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof typeof _db];
  },
});

export type Database = ReturnType<typeof drizzle>;
