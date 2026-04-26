const { query } = require('../db/pool');
const { writeAuditLog, getIp } = require('../utils/audit');

// CTE + join for current price per merchant+product pair
const PRICES_SQL = `
  WITH cp AS (
    SELECT DISTINCT ON (merchant_id, product_id)
      merchant_id, product_id, price, effective_date AS price_since
    FROM merchant_products
    ORDER BY merchant_id, product_id, effective_date DESC
  )
  SELECT cp.merchant_id, cp.product_id, cp.price AS current_price, cp.price_since,
         p.name AS product_name, p.name_en AS product_name_en,
         c.name AS category_name
  FROM cp
  JOIN products p ON p.id = cp.product_id AND p.archived = false
  LEFT JOIN categories c ON c.id = p.category_id
`;

function buildMerchant(merchant, priceRows) {
  return {
    ...merchant,
    products: priceRows
      .filter((r) => r.merchant_id === merchant.id)
      .map((r) => ({
        product_id: r.product_id,
        product_name: r.product_name,
        product_name_en: r.product_name_en,
        category_name: r.category_name,
        current_price: parseFloat(r.current_price),
        price_since: r.price_since,
      })),
  };
}

// GET /api/merchants
async function listMerchants(req, res) {
  try {
    const includeArchived = req.query.include_archived === 'true';
    const merchantsResult = await query(
      `SELECT id, name, name_en, contact, archived, created_at FROM merchants${includeArchived ? '' : ' WHERE archived = false'} ORDER BY name`,
      [],
    );
    const merchantIds = merchantsResult.rows.map((m) => m.id);
    let priceRows = [];
    if (merchantIds.length > 0) {
      const pricesResult = await query(
        `${PRICES_SQL} WHERE cp.merchant_id = ANY($1) ORDER BY cp.merchant_id, p.name`,
        [merchantIds],
      );
      priceRows = pricesResult.rows;
    }
    return res.json({ data: merchantsResult.rows.map((m) => buildMerchant(m, priceRows)) });
  } catch (err) {
    console.error('[merchants] listMerchants error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// GET /api/merchants/:id
async function getMerchant(req, res) {
  const { id } = req.params;
  try {
    const merchantResult = await query(
      'SELECT id, name, name_en, contact, archived, created_at FROM merchants WHERE id = $1',
      [id],
    );
    if (merchantResult.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'التاجر غير موجود', en: 'Merchant not found' } });
    }
    const pricesResult = await query(
      `${PRICES_SQL} WHERE cp.merchant_id = $1 ORDER BY p.name`,
      [id],
    );
    return res.json({ data: buildMerchant(merchantResult.rows[0], pricesResult.rows) });
  } catch (err) {
    console.error('[merchants] getMerchant error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// POST /api/merchants
async function createMerchant(req, res) {
  const { name, name_en, contact } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: { ar: 'اسم التاجر مطلوب', en: 'Merchant name is required' } });
  }
  if (name.length > 200) {
    return res.status(400).json({ error: { ar: 'الاسم يجب ألا يتجاوز 200 حرف', en: 'Name must not exceed 200 characters' } });
  }
  try {
    const inserted = await query(
      'INSERT INTO merchants (name, name_en, contact) VALUES ($1, $2, $3) RETURNING id, name, name_en, contact, archived, created_at',
      [name.trim(), name_en?.trim() || null, contact?.trim() || null],
    );
    const merchant = inserted.rows[0];
    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'merchant.create',
      target_type: 'merchant',
      target_id: merchant.id,
      store_id: null,
      warehouse_id: null,
      new_value: { name: merchant.name, name_en: merchant.name_en, contact: merchant.contact },
      ip_address: getIp(req),
    });
    return res.status(201).json({ data: { ...merchant, products: [] } });
  } catch (err) {
    console.error('[merchants] createMerchant error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// PUT /api/merchants/:id
async function updateMerchant(req, res) {
  const { id } = req.params;
  const fieldsProvided = Object.keys(req.body).filter((k) => ['name', 'name_en', 'contact'].includes(k));
  if (fieldsProvided.length === 0) {
    return res.status(400).json({ error: { ar: 'يجب تقديم حقل واحد على الأقل', en: 'At least one field is required' } });
  }
  const { name, name_en, contact } = req.body;
  if (name !== undefined && !name?.trim()) {
    return res.status(400).json({ error: { ar: 'اسم التاجر لا يمكن أن يكون فارغاً', en: 'Merchant name cannot be empty' } });
  }
  if (name && name.length > 200) {
    return res.status(400).json({ error: { ar: 'الاسم يجب ألا يتجاوز 200 حرف', en: 'Name must not exceed 200 characters' } });
  }
  try {
    const existing = await query(
      'SELECT id, name, name_en, contact, archived FROM merchants WHERE id = $1',
      [id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'التاجر غير موجود', en: 'Merchant not found' } });
    }
    const old = existing.rows[0];
    if (old.archived) {
      return res.status(400).json({ error: { ar: 'التاجر مؤرشف ولا يمكن تعديله', en: 'Merchant is archived' } });
    }

    const updates = [];
    const values = [];
    if (name !== undefined)    { updates.push(`name = $${values.length + 1}`);    values.push(name.trim()); }
    if (name_en !== undefined) { updates.push(`name_en = $${values.length + 1}`); values.push(name_en?.trim() || null); }
    if (contact !== undefined) { updates.push(`contact = $${values.length + 1}`); values.push(contact?.trim() || null); }
    values.push(id);

    const updated = await query(
      `UPDATE merchants SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, name, name_en, contact, archived, created_at`,
      values,
    );
    const merchant = updated.rows[0];

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'merchant.update',
      target_type: 'merchant',
      target_id: id,
      store_id: null,
      warehouse_id: null,
      old_value: { name: old.name, name_en: old.name_en, contact: old.contact },
      new_value: { name: merchant.name, name_en: merchant.name_en, contact: merchant.contact },
      ip_address: getIp(req),
    });
    return res.json({ data: merchant });
  } catch (err) {
    console.error('[merchants] updateMerchant error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// PUT /api/merchants/:id/archive
async function archiveMerchant(req, res) {
  const { id } = req.params;
  try {
    const existing = await query(
      'SELECT id, name, archived FROM merchants WHERE id = $1',
      [id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'التاجر غير موجود', en: 'Merchant not found' } });
    }
    const old = existing.rows[0];
    if (old.archived) {
      return res.status(400).json({ error: { ar: 'التاجر مؤرشف مسبقاً', en: 'Merchant is already archived' } });
    }

    const updated = await query(
      'UPDATE merchants SET archived = true WHERE id = $1 RETURNING id, name, name_en, contact, archived, created_at',
      [id],
    );

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'merchant.archive',
      target_type: 'merchant',
      target_id: id,
      store_id: null,
      warehouse_id: null,
      old_value: { archived: false },
      new_value: { archived: true },
      ip_address: getIp(req),
    });
    return res.json({ data: { ...updated.rows[0], products: [] } });
  } catch (err) {
    console.error('[merchants] archiveMerchant error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

module.exports = { listMerchants, getMerchant, createMerchant, updateMerchant, archiveMerchant };
