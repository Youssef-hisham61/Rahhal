require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../pool');

async function seedOwner() {
  const { OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME } = process.env;

  if (!OWNER_EMAIL || !OWNER_PASSWORD || !OWNER_NAME) {
    console.error('Missing OWNER_EMAIL, OWNER_PASSWORD, or OWNER_NAME in .env');
    process.exit(1);
  }

  const hash = await bcrypt.hash(OWNER_PASSWORD, 12);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, store_id, active)
     SELECT $1, $2, $3, 'owner', NULL, true
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'owner')`,
    [OWNER_NAME, OWNER_EMAIL, hash]
  );

  if (result.rowCount > 0) {
    console.log(`Owner account created: ${OWNER_EMAIL}`);
  } else {
    console.log('Owner account already exists — skipping seed');
  }

  await pool.end();
}

seedOwner().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
