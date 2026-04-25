const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "postgres",
  port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error("[db] query error:", err.message, { text, params });
    throw err;
  }
}

module.exports = { pool, query };
