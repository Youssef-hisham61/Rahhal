-- Idempotent: replaces store_id with warehouse_id on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);
ALTER TABLE users DROP COLUMN IF EXISTS store_id;
