const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

async function runMigrations() {
  console.log("[migrate] running migrations...");
  const sql = fs.readFileSync(
    path.join(__dirname, "migrations", "001_initial_schema.sql"),
    "utf8",
  );
  await pool.query(sql);
  console.log("[migrate] done");
}

module.exports = runMigrations;
