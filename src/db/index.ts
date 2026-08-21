// Database connection — works in both local (pg) and serverless (neon-http)
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// Detect serverless environment (Netlify, Vercel, or explicit flag)
const isServerless =
  process.env.NETLIFY === "true" ||
  process.env.VERCEL === "1" ||
  process.env.USE_NEON === "true";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

if (isServerless) {
  // Serverless mode — use neon HTTP driver (no TCP connections)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require("@neondatabase/serverless");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/neon-http");
  const sql = neon(databaseUrl);
  db = drizzle(sql, { schema });
} else {
  // Local development — use pg driver (TCP connections)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/node-postgres");
  const globalForDb = globalThis as typeof globalThis & {
    __pool?: InstanceType<typeof Pool>;
  };
  const pool =
    globalForDb.__pool ?? new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__pool = pool;
  }
  db = drizzle(pool, { schema });
}

export { db };
