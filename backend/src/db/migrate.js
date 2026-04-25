const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

async function runMigrations() {
  const dir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`[migrate] running ${files.length} migration(s)...`);
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await pool.query(sql);
    console.log(`[migrate] applied ${file}`);
  }
  console.log("[migrate] done");
}

module.exports = runMigrations;
