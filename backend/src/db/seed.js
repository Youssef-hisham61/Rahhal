const bcrypt = require("bcryptjs");
const { pool } = require("./pool");

async function seedOwner() {
  const { OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME_AR, OWNER_NAME_EN } =
    process.env;

  if (!OWNER_EMAIL || !OWNER_PASSWORD || !OWNER_NAME_AR || !OWNER_NAME_EN) {
    console.warn("[seed] owner env vars missing, skipping");
    return;
  }

  const existing = await pool.query("SELECT id FROM users WHERE role = $1", [
    "owner",
  ]);

  if (existing.rows.length > 0) {
    console.log("[seed] owner already exists, skipping");
    return;
  }

  const hash = await bcrypt.hash(OWNER_PASSWORD, 12);

  await pool.query(
    `INSERT INTO users (name_ar, name_en, email, password_hash, role, store_id, active)
     VALUES ($1, $2, $3, $4, 'owner', NULL, true)`,
    [OWNER_NAME_AR, OWNER_NAME_EN, OWNER_EMAIL, hash],
  );

  console.log("[seed] owner created:", OWNER_EMAIL);
}

module.exports = seedOwner;
