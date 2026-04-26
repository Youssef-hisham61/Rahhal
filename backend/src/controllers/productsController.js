const { query } = require('../db/pool');
const { writeAuditLog, getIp } = require('../utils/audit');

// Base SELECT for list (no merchant prices)
const PRODUCT_LIST_SQL = `
  SELECT p.id, p.name, p.name_en, p.sku, p.barcode, p.expiry_date, p.archived, p.created_at,
         c.id AS category_id, c.name AS category_name, c.name_en AS category_name_en
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

function shapeProduct(row) {
  return {
    id: row.id,
    name: row.name,
    name_en: row.name_en,
    sku: row.sku,
    barcode: row.barcode,
    expiry_date: row.expiry_date,
    archived: row.archived,
    created_at: row.created_at,
    category: row.category_id
      ? { id: row.category_id, name: row.category_name, name_en: row.category_name_en }
      : null,
  };
}

// Aggregate flat rows (one per merchant) into products with merchants array
function aggregateWithMerchants(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, { ...shapeProduct(row), merchants: [] });
    }
    if (row.merchant_id) {
      map.get(row.id).merchants.push({
        merchant_id: row.merchant_id,
        merchant_name: row.merchant_name,
        merchant_name_en: row.merchant_name_en,
        current_price: parseFloat(row.current_price),
        price_since: row.price_since,
      });
    }
  }
  return Array.from(map.values());
}

async function generateSku(categoryId) {
  let prefix = 'PRD';
  if (categoryId) {
    const catRes = await query('SELECT name_en FROM categories WHERE id = $1', [categoryId]);
    if (catRes.rowCount > 0) {
      prefix = catRes.rows[0].name_en
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 3)
        .padEnd(3, 'X');
    }
  }
  for (let i = 0; i < 10; i++) {
    const digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    const sku = `${prefix}-${digits}`;
    const exists = await query('SELECT id FROM products WHERE sku = $1', [sku]);
    if (exists.rowCount === 0) return sku;
  }
  return `${prefix}-${Date.now()}`;
}

// GET /api/products
async function listProducts(req, res) {
  try {
    const { category_id, include_archived } = req.query;
    const conditions = [];
    const params = [];
    if (include_archived !== 'true') conditions.push('p.archived = false');
    if (category_id) {
      params.push(category_id);
      conditions.push(`p.category_id = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`${PRODUCT_LIST_SQL} ${where} ORDER BY p.name`, params);
    return res.json({ data: result.rows.map(shapeProduct) });
  } catch (err) {
    console.error('[products] listProducts error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// GET /api/products/search  — must be registered before /:id
async function searchProducts(req, res) {
  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: { ar: 'يجب تقديم نص للبحث', en: 'Search query is required' } });
  }
  const pattern = '%' + q.trim().toLowerCase() + '%';
  try {
    const result = await query(
      `WITH cp AS (
         SELECT DISTINCT ON (merchant_id, product_id)
           merchant_id, product_id, price, effective_date AS price_since
         FROM merchant_products
         ORDER BY merchant_id, product_id, effective_date DESC
       ),
       matching AS (
         SELECT id FROM products
         WHERE archived = false
           AND (LOWER(name)    LIKE $1
             OR LOWER(name_en) LIKE $1
             OR LOWER(sku)     LIKE $1
             OR (barcode IS NOT NULL AND LOWER(barcode) LIKE $1))
         ORDER BY name
         LIMIT 20
       )
       SELECT p.id, p.name, p.name_en, p.sku, p.barcode, p.expiry_date, p.archived, p.created_at,
              c.id AS category_id, c.name AS category_name, c.name_en AS category_name_en,
              m.id AS merchant_id, m.name AS merchant_name, m.name_en AS merchant_name_en,
              cp.price AS current_price, cp.price_since
       FROM matching
       JOIN products p ON p.id = matching.id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN cp ON cp.product_id = p.id
       LEFT JOIN merchants m ON m.id = cp.merchant_id AND m.archived = false
       ORDER BY p.name, m.name`,
      [pattern],
    );
    return res.json({ data: aggregateWithMerchants(result.rows) });
  } catch (err) {
    console.error('[products] searchProducts error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// GET /api/products/:id
async function getProduct(req, res) {
  const { id } = req.params;
  try {
    const result = await query(
      `WITH cp AS (
         SELECT DISTINCT ON (merchant_id, product_id)
           merchant_id, product_id, price, effective_date AS price_since
         FROM merchant_products
         ORDER BY merchant_id, product_id, effective_date DESC
       )
       SELECT p.id, p.name, p.name_en, p.sku, p.barcode, p.expiry_date, p.archived, p.created_at,
              c.id AS category_id, c.name AS category_name, c.name_en AS category_name_en,
              m.id AS merchant_id, m.name AS merchant_name, m.name_en AS merchant_name_en,
              cp.price AS current_price, cp.price_since
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN cp ON cp.product_id = p.id
       LEFT JOIN merchants m ON m.id = cp.merchant_id AND m.archived = false
       WHERE p.id = $1
       ORDER BY m.name`,
      [id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'المنتج غير موجود', en: 'Product not found' } });
    }
    return res.json({ data: aggregateWithMerchants(result.rows)[0] });
  } catch (err) {
    console.error('[products] getProduct error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// POST /api/products
async function createProduct(req, res) {
  const { name, name_en, category_id, sku: providedSku, barcode, expiry_date } = req.body;
  if (!name || !name_en || !category_id) {
    return res.status(400).json({ error: { ar: 'الاسم بالعربي والإنجليزي والفئة مطلوبة', en: 'name, name_en, and category_id are required' } });
  }
  try {
    const catCheck = await query('SELECT id FROM categories WHERE id = $1 AND archived = false', [category_id]);
    if (catCheck.rowCount === 0) {
      return res.status(400).json({ error: { ar: 'الفئة غير موجودة أو مؤرشفة', en: 'Category not found or archived' } });
    }

    let sku = providedSku?.trim() || null;
    if (sku) {
      const dupSku = await query('SELECT id FROM products WHERE LOWER(sku) = LOWER($1)', [sku]);
      if (dupSku.rowCount > 0) {
        return res.status(409).json({ error: { ar: 'رمز المنتج (SKU) موجود مسبقاً', en: 'SKU already exists' } });
      }
    } else {
      sku = await generateSku(category_id);
    }

    if (barcode) {
      const dupBarcode = await query('SELECT id FROM products WHERE barcode = $1', [barcode]);
      if (dupBarcode.rowCount > 0) {
        return res.status(409).json({ error: { ar: 'الباركود موجود مسبقاً', en: 'Barcode already exists' } });
      }
    }

    const inserted = await query(
      `INSERT INTO products (name, name_en, sku, barcode, category_id, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name, name_en, sku, barcode || null, category_id, expiry_date || null],
    );
    const productId = inserted.rows[0].id;

    const fullResult = await query(`${PRODUCT_LIST_SQL} WHERE p.id = $1`, [productId]);

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'product.create',
      target_type: 'product',
      target_id: productId,
      store_id: null,
      warehouse_id: null,
      new_value: { name, name_en, sku, category_id },
      ip_address: getIp(req),
    });
    return res.status(201).json({ data: shapeProduct(fullResult.rows[0]) });
  } catch (err) {
    console.error('[products] createProduct error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// PUT /api/products/:id
async function updateProduct(req, res) {
  const { id } = req.params;
  // sku is intentionally excluded — immutable after creation
  const { name, name_en, category_id, barcode, expiry_date } = req.body;
  const fieldsProvided = Object.keys(req.body).filter((k) =>
    ['name', 'name_en', 'category_id', 'barcode', 'expiry_date'].includes(k),
  );
  if (fieldsProvided.length === 0) {
    return res.status(400).json({ error: { ar: 'يجب تقديم حقل واحد على الأقل', en: 'At least one field is required' } });
  }
  try {
    const existing = await query(`${PRODUCT_LIST_SQL} WHERE p.id = $1 AND p.archived = false`, [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'المنتج غير موجود', en: 'Product not found' } });
    }
    const old = existing.rows[0];

    if (barcode !== undefined && barcode && barcode !== old.barcode) {
      const dupBarcode = await query('SELECT id FROM products WHERE barcode = $1 AND id != $2', [barcode, id]);
      if (dupBarcode.rowCount > 0) {
        return res.status(409).json({ error: { ar: 'الباركود موجود مسبقاً', en: 'Barcode already exists' } });
      }
    }

    if (category_id !== undefined && category_id !== old.category_id) {
      const catCheck = await query('SELECT id FROM categories WHERE id = $1 AND archived = false', [category_id]);
      if (catCheck.rowCount === 0) {
        return res.status(400).json({ error: { ar: 'الفئة غير موجودة أو مؤرشفة', en: 'Category not found or archived' } });
      }
    }

    const updates = [];
    const values = [];
    if (name !== undefined)        { updates.push(`name = $${values.length + 1}`);        values.push(name); }
    if (name_en !== undefined)     { updates.push(`name_en = $${values.length + 1}`);     values.push(name_en); }
    if (category_id !== undefined) { updates.push(`category_id = $${values.length + 1}`); values.push(category_id); }
    if (barcode !== undefined)     { updates.push(`barcode = $${values.length + 1}`);     values.push(barcode || null); }
    if (expiry_date !== undefined) { updates.push(`expiry_date = $${values.length + 1}`); values.push(expiry_date || null); }
    values.push(id);

    await query(`UPDATE products SET ${updates.join(', ')} WHERE id = $${values.length}`, values);

    const updated = await query(`${PRODUCT_LIST_SQL} WHERE p.id = $1`, [id]);
    const product = updated.rows[0];

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'product.update',
      target_type: 'product',
      target_id: id,
      store_id: null,
      warehouse_id: null,
      old_value: { name: old.name, name_en: old.name_en, category_id: old.category_id, barcode: old.barcode, expiry_date: old.expiry_date },
      new_value: { name: product.name, name_en: product.name_en, category_id: product.category_id, barcode: product.barcode, expiry_date: product.expiry_date },
      ip_address: getIp(req),
    });
    return res.json({ data: shapeProduct(product) });
  } catch (err) {
    console.error('[products] updateProduct error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// PUT /api/products/:id/archive
async function archiveProduct(req, res) {
  const { id } = req.params;
  try {
    const existing = await query('SELECT id, name, archived FROM products WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'المنتج غير موجود', en: 'Product not found' } });
    }
    if (existing.rows[0].archived) {
      return res.status(400).json({ error: { ar: 'المنتج مؤرشف مسبقاً', en: 'Product is already archived' } });
    }

    const invCheck = await query(
      'SELECT COALESCE(SUM(quantity), 0)::int AS total FROM inventory WHERE product_id = $1',
      [id],
    );
    if (invCheck.rows[0].total > 0) {
      return res.status(400).json({ error: { ar: 'لا يمكن أرشفة منتج يحتوي على مخزون', en: 'Cannot archive a product that still has inventory' } });
    }

    await query('UPDATE products SET archived = true WHERE id = $1', [id]);

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'product.archive',
      target_type: 'product',
      target_id: id,
      store_id: null,
      warehouse_id: null,
      old_value: { archived: false },
      new_value: { archived: true },
      ip_address: getIp(req),
    });

    const fullResult = await query(`${PRODUCT_LIST_SQL} WHERE p.id = $1`, [id]);
    return res.json({ data: shapeProduct(fullResult.rows[0]) });
  } catch (err) {
    console.error('[products] archiveProduct error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

module.exports = { listProducts, searchProducts, getProduct, createProduct, updateProduct, archiveProduct };
