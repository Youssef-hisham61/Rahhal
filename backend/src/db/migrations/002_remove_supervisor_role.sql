-- Idempotent: removes 'supervisor' from user_role enum if it still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'supervisor'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    UPDATE users SET role = 'worker' WHERE role::text = 'supervisor';
    UPDATE audit_logs SET user_role = NULL WHERE user_role::text = 'supervisor';

    ALTER TYPE user_role RENAME TO user_role_old;
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'worker', 'viewer');

    ALTER TABLE users
      ALTER COLUMN role DROP DEFAULT,
      ALTER COLUMN role TYPE user_role USING role::text::user_role,
      ALTER COLUMN role SET DEFAULT 'worker';

    ALTER TABLE audit_logs
      ALTER COLUMN user_role TYPE user_role USING user_role::text::user_role;

    DROP TYPE user_role_old;
  END IF;
END $$;
