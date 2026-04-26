const { query, pool } = require('../db/pool');
const { writeAuditLog, getIp } = require('../utils/audit');

const VALID_COLORS = ['green', 'orange', 'blue'];

const LIST_QUERY = `
  SELECT s.id, s.name, s.name_en, s.color, s.archived, s.created_at,
         COUNT(w.id)::int AS warehouse_count
  FROM stores s
  LEFT JOIN warehouses w ON w.store_id = s.id
  GROUP BY s.id
  ORDER BY s.name
`;

async function publicStores(req, res) {
  try {
    const result = await query(
      `SELECT id, name, name_en, color FROM stores WHERE archived = false ORDER BY name`,
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('[stores] publicStores error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function listStores(req, res) {
  try {
    const result = await query(LIST_QUERY);
    return res.json(result.rows);
  } catch (err) {
    console.error('[stores] listStores error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function createStore(req, res) {
  const { name, name_en, color } = req.body;

  if (!name || !name_en || !color) {
    return res.status(400).json({ message_ar: 'الاسم واللون مطلوبان', message_en: 'name, name_en, and color are required' });
  }
  if (!VALID_COLORS.includes(color)) {
    return res.status(400).json({ message_ar: 'اللون غير صالح', message_en: 'color must be green, orange, or blue' });
  }

  try {
    const dup = await query(`SELECT id FROM stores WHERE name = $1`, [name]);
    if (dup.rowCount > 0) {
      return res.status(409).json({ message_ar: 'اسم الفرع موجود مسبقاً', message_en: 'Store name already exists' });
    }

    const result = await query(
      `INSERT INTO stores (name, name_en, color) VALUES ($1, $2, $3) RETURNING *`,
      [name, name_en, color],
    );
    const store = result.rows[0];

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'store.create',
      target_type: 'store',
      target_id: store.id,
      new_value: { name, name_en, color },
      ip_address: getIp(req),
    });

    return res.status(201).json(store);
  } catch (err) {
    console.error('[stores] createStore error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function getStore(req, res) {
  const { id } = req.params;
  try {
    const storeResult = await query(`SELECT * FROM stores WHERE id = $1`, [id]);
    if (storeResult.rowCount === 0) {
      return res.status(404).json({ message_ar: 'الفرع غير موجود', message_en: 'Store not found' });
    }

    const warehousesResult = await query(
      `SELECT id, name, name_en, locked, archived, created_at FROM warehouses WHERE store_id = $1 ORDER BY name`,
      [id],
    );

    return res.json({ ...storeResult.rows[0], warehouses: warehousesResult.rows });
  } catch (err) {
    console.error('[stores] getStore error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function updateStore(req, res) {
  const { id } = req.params;
  const { name, name_en, color } = req.body;

  if (!name && !name_en && !color) {
    return res.status(400).json({ message_ar: 'لا توجد بيانات للتحديث', message_en: 'No fields to update' });
  }
  if (color && !VALID_COLORS.includes(color)) {
    return res.status(400).json({ message_ar: 'اللون غير صالح', message_en: 'color must be green, orange, or blue' });
  }

  try {
    const storeResult = await query(`SELECT * FROM stores WHERE id = $1`, [id]);
    if (storeResult.rowCount === 0) {
      return res.status(404).json({ message_ar: 'الفرع غير موجود', message_en: 'Store not found' });
    }
    const old = storeResult.rows[0];

    if (name && name !== old.name) {
      const dup = await query(`SELECT id FROM stores WHERE name = $1 AND id != $2`, [name, id]);
      if (dup.rowCount > 0) {
        return res.status(409).json({ message_ar: 'اسم الفرع موجود مسبقاً', message_en: 'Store name already exists' });
      }
    }

    const updates = [];
    const values = [];
    if (name)    { updates.push(`name = $${values.length + 1}`);    values.push(name); }
    if (name_en) { updates.push(`name_en = $${values.length + 1}`); values.push(name_en); }
    if (color)   { updates.push(`color = $${values.length + 1}`);   values.push(color); }
    values.push(id);

    const result = await query(
      `UPDATE stores SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'store.update',
      target_type: 'store',
      target_id: id,
      old_value: { name: old.name, name_en: old.name_en, color: old.color },
      new_value: { name: name ?? old.name, name_en: name_en ?? old.name_en, color: color ?? old.color },
      ip_address: getIp(req),
    });

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[stores] updateStore error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function archiveStore(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const storeResult = await query(`SELECT * FROM stores WHERE id = $1`, [id]);
    if (storeResult.rowCount === 0) {
      return res.status(404).json({ message_ar: 'الفرع غير موجود', message_en: 'Store not found' });
    }
    if (storeResult.rows[0].archived) {
      return res.status(409).json({ message_ar: 'الفرع مؤرشف مسبقاً', message_en: 'Store is already archived' });
    }

    await client.query('BEGIN');

    await client.query(
      `UPDATE warehouses SET archived = true WHERE store_id = $1 AND archived = false`,
      [id],
    );

    await client.query(
      `UPDATE users SET active = false
       WHERE warehouse_id IN (SELECT id FROM warehouses WHERE store_id = $1)
         AND role IN ('worker', 'viewer')`,
      [id],
    );

    await client.query(`UPDATE stores SET archived = true WHERE id = $1`, [id]);

    await client.query('COMMIT');

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'store.archive',
      target_type: 'store',
      target_id: id,
      old_value: { archived: false },
      new_value: { archived: true },
      ip_address: getIp(req),
    });

    return res.json({ message_ar: 'تم أرشفة الفرع', message_en: 'Store archived' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[stores] archiveStore error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  } finally {
    client.release();
  }
}

module.exports = { publicStores, listStores, createStore, getStore, updateStore, archiveStore };
