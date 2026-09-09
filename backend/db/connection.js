// db/connection.js
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const dbHost = process.env.DB_HOST || process.env.NEON_HOST || (process.env.NODE_ENV === "production" ? "postgres-service" : "localhost");
const useSSL = process.env.DB_SSL === "true" || process.env.NEON_SSL === "true" || dbHost.includes("neon.tech") || dbHost.includes("aws.neon");

const pool = new Pool({
  host: dbHost,
  database: process.env.DB_NAME || process.env.NEON_DB || "neondb",
  user: process.env.DB_USER || process.env.NEON_USER || "neondb_owner",
  password: process.env.DB_PASSWORD || process.env.NEON_PASSWORD || "autoflow_sec_pass_2026",
  port: parseInt(process.env.DB_PORT || process.env.NEON_PORT || "5432", 10),
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL Database");
});

pool.on("error", (err) => {
  console.error("Unexpected DB error:", err);
});

// Test connection once
(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB Time:", res.rows[0].now);
  } catch (err) {
    console.error("DB Connection Failed:", err.message);
  }
})();

module.exports = pool;