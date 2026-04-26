const { query } = require('../db/pool');
const { writeAuditLog, getIp } = require('../utils/audit');

// GET /api/merchant-products/history/:merchantId/:productId
async function getPriceHistory(req, res) {
  const { merchantId, productId } = req.params;
  try {
    const result = await query(
      `SELECT mp.id, mp.merchant_id, mp.product_id, mp.price, mp.effective_date, mp.created_at,
              u.name_ar AS created_by_name_ar, u.name_en AS created_by_name_en
       FROM merchant_products mp
       LEFT JOIN users u ON u.id = mp.created_by
       WHERE mp.merchant_id = $1 AND mp.product_id = $2
       ORDER BY mp.effective_date DESC`,
      [merchantId, productId],
    );
    return res.json({ data: result.rows.map((r) => ({ ...r, price: parseFloat(r.price) })) });
  } catch (err) {
    console.error('[merchant-products] getPriceHistory error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// POST /api/merchant-products
async function setPriceEntry(req, res) {
  const { merchant_id, product_id, price, effective_date } = req.body;
  if (!merchant_id || !product_id || price === undefined || price === null) {
    return res.status(400).json({ error: { ar: 'التاجر والمنتج والسعر مطلوبة', en: 'merchant_id, product_id, and price are required' } });
  }
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: { ar: 'السعر غير صالح', en: 'Invalid price value' } });
  }
  const effDate = effective_date || new Date().toISOString().split('T')[0];

  try {
    const merchantCheck = await query('SELECT id FROM merchants WHERE id = $1 AND archived = false', [merchant_id]);
    if (merchantCheck.rowCount === 0) {
      return res.status(400).json({ error: { ar: 'التاجر غير موجود أو مؤرشف', en: 'Merchant not found or archived' } });
    }
    const productCheck = await query('SELECT id FROM products WHERE id = $1 AND archived = false', [product_id]);
    if (productCheck.rowCount === 0) {
      return res.status(400).json({ error: { ar: 'المنتج غير موجود أو مؤرشف', en: 'Product not found or archived' } });
    }

    const inserted = await query(
      `INSERT INTO merchant_products (merchant_id, product_id, price, effective_date, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, merchant_id, product_id, price, effective_date, created_at`,
      [merchant_id, product_id, parsedPrice, effDate, req.user.id],
    );
    const entry = inserted.rows[0];

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'merchant_product.price_set',
      target_type: 'merchant_product',
      target_id: entry.id,
      store_id: null,
      warehouse_id: null,
      new_value: { merchant_id, product_id, price: parsedPrice, effective_date: effDate },
      ip_address: getIp(req),
    });
    return res.status(201).json({ data: { ...entry, price: parseFloat(entry.price) } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { ar: 'يوجد سعر لهذا التاجر والمنتج في نفس التاريخ', en: 'A price entry already exists for this merchant, product, and date' } });
    }
    console.error('[merchant-products] setPriceEntry error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// DELETE /api/merchant-products/:id
async function deletePriceEntry(req, res) {
  const { id } = req.params;
  try {
    const existing = await query(
      'SELECT id, merchant_id, product_id, price, effective_date FROM merchant_products WHERE id = $1',
      [id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'إدخال السعر غير موجود', en: 'Price entry not found' } });
    }
    const entry = existing.rows[0];

    const countResult = await query(
      'SELECT COUNT(*) AS cnt FROM merchant_products WHERE merchant_id = $1 AND product_id = $2',
      [entry.merchant_id, entry.product_id],
    );
    if (parseInt(countResult.rows[0].cnt) <= 1) {
      return res.status(400).json({ error: { ar: 'لا يمكن حذف آخر سعر للتاجر والمنتج', en: 'Cannot remove the last price entry for this merchant and product' } });
    }

    await query('DELETE FROM merchant_products WHERE id = $1', [id]);

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'merchant_product.price_removed',
      target_type: 'merchant_product',
      target_id: id,
      store_id: null,
      warehouse_id: null,
      old_value: {
        merchant_id: entry.merchant_id,
        product_id: entry.product_id,
        price: parseFloat(entry.price),
        effective_date: entry.effective_date,
      },
      ip_address: getIp(req),
    });
    return res.json({ data: { id } });
  } catch (err) {
    console.error('[merchant-products] deletePriceEntry error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

module.exports = { getPriceHistory, setPriceEntry, deletePriceEntry };
