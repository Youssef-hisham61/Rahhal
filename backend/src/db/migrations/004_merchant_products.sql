CREATE TABLE IF NOT EXISTS merchant_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(merchant_id, product_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_merchant_products_merchant ON merchant_products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_products_product ON merchant_products(product_id);
