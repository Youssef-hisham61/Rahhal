-- Enums
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'supervisor', 'worker', 'viewer');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'dispatched');
CREATE TYPE transfer_status AS ENUM ('pending', 'approved', 'in_transit', 'received', 'confirmed', 'rejected');
CREATE TYPE shipment_status AS ENUM ('arriving', 'arrived', 'verified', 'rejected');
CREATE TYPE return_condition AS ENUM ('resellable', 'damaged');
CREATE TYPE return_status AS ENUM ('pending', 'approved_resellable', 'approved_damaged', 'rejected');
CREATE TYPE count_status AS ENUM ('scheduled', 'in_progress', 'completed');
CREATE TYPE alert_type AS ENUM ('low_stock', 'out_of_stock');

-- stores
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'green',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- warehouses
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  barcode VARCHAR(100) UNIQUE,
  category_id UUID REFERENCES categories(id),
  expiry_date DATE,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);

-- inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_qty INTEGER NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
  min_threshold INTEGER NOT NULL DEFAULT 0,
  UNIQUE(warehouse_id, product_id)
);

-- merchants
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  contact VARCHAR(200),
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role user_role NOT NULL DEFAULT 'worker',
  store_id UUID REFERENCES stores(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sessions (refresh tokens)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- release_requests
CREATE TABLE release_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status request_status NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES users(id),
  actioned_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actioned_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT no_self_approval CHECK (requested_by != actioned_by)
);

-- transfers
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status transfer_status NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  confirmed_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  reason TEXT
);

-- shipments
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  merchant_id UUID REFERENCES merchants(id),
  status shipment_status NOT NULL DEFAULT 'arriving',
  arrived_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- shipment_items
CREATE TABLE shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name_raw VARCHAR(200),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- returns
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  condition return_condition,
  status return_status NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES users(id),
  actioned_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actioned_at TIMESTAMPTZ,
  notes TEXT
);

-- audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  user_role user_role,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),
  target_id UUID,
  store_id UUID REFERENCES stores(id),
  warehouse_id UUID REFERENCES warehouses(id),
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(50)
);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- stock_alerts
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  product_id UUID NOT NULL REFERENCES products(id),
  alert_type alert_type NOT NULL,
  quantity INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- count_requests
CREATE TABLE count_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  assigned_to UUID NOT NULL REFERENCES users(id),
  scheduled_date DATE NOT NULL,
  status count_status NOT NULL DEFAULT 'scheduled',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- PostgreSQL trigger: notify on inventory change
CREATE OR REPLACE FUNCTION notify_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('rahhal_updates', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_change_trigger
AFTER INSERT OR UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION notify_inventory_change();
