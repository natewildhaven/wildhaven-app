import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({ connectionString })
  : null;

export const db = connectionString && pool
  ? drizzle(pool, { schema })
  : null;

export * from "./schema/index";
export { eq, sql, and, count, inArray, asc, desc, or } from "drizzle-orm";
