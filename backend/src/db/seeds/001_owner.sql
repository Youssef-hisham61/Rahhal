-- Run via: node backend/src/db/seeds/seed.js
-- This file is executed by seed.js which bcrypt-hashes the password first.
INSERT INTO users (name, email, password_hash, role, store_id, active)
SELECT $1, $2, $3, 'owner', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'owner');
