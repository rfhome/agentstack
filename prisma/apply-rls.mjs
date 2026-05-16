import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const sql = readFileSync(new URL("./rls.sql", import.meta.url), "utf8");

try {
  await pool.query(sql);
  console.log("✓ RLS policies applied successfully");
} catch (err) {
  console.error("✗ Failed:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
