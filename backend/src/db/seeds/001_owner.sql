-- Safe to run multiple times — skips insert if owner already exists
DO $$
DECLARE
  owner_email TEXT := current_setting('app.owner_email', true);
  owner_name  TEXT := current_setting('app.owner_name', true);
  owner_hash  TEXT := current_setting('app.owner_hash', true);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'owner') THEN
    INSERT INTO users (name, email, password_hash, role, store_id, active)
    VALUES (owner_name, owner_email, owner_hash, 'owner', NULL, true);
    RAISE NOTICE 'Owner account created: %', owner_email;
  ELSE
    RAISE NOTICE 'Owner account already exists — skipping seed';
  END IF;
END $$;
