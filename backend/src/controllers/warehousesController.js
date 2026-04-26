const { query } = require('../db/pool');
const { writeAuditLog, getIp } = require('../utils/audit');

const WAREHOUSE_JOIN = `
  SELECT w.id, w.name, w.name_en, w.locked, w.archived, w.created_at,
         w.store_id,
         s.name     AS store_name,
         s.name_en  AS store_name_en,
         s.color    AS store_color
  FROM warehouses w
  JOIN stores s ON s.id = w.store_id
`;

async function getUserStoreId(warehouseId) {
  if (!warehouseId) return null;
  const res = await query('SELECT store_id FROM warehouses WHERE id = $1', [warehouseId]);
  return res.rowCount > 0 ? res.rows[0].store_id : null;
}

// GET /api/warehouses
async function listWarehouses(req, res) {
  try {
    const { store_id: qStoreId } = req.query;
    const { role, warehouse_id: userWarehouseId } = req.user;
    const isAdmin = ['owner', 'admin'].includes(role);

    let storeFilter = null;
    if (!isAdmin) {
      const userStoreId = await getUserStoreId(userWarehouseId);
      if (!userStoreId) return res.json({ data: [] });
      storeFilter = userStoreId;
    } else if (qStoreId) {
      storeFilter = qStoreId;
    }

    const conditions = ['w.archived = false'];
    const params = [];
    if (storeFilter) {
      params.push(storeFilter);
      conditions.push(`w.store_id = $${params.length}`);
    }

    const result = await query(
      `${WAREHOUSE_JOIN} WHERE ${conditions.join(' AND ')} ORDER BY s.name, w.name`,
      params,
    );

    return res.json({ data: result.rows });
  } catch (err) {
    console.error('[warehouses] listWarehouses error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// GET /api/warehouses/:id
async function getWarehouse(req, res) {
  const { id } = req.params;
  const { role, warehouse_id: userWarehouseId } = req.user;

  try {
    const result = await query(
      `${WAREHOUSE_JOIN} WHERE w.id = $1 AND w.archived = false`,
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'المخزن غير موجود', en: 'Warehouse not found' } });
    }

    const wh = result.rows[0];

    if (!['owner', 'admin'].includes(role)) {
      const userStoreId = await getUserStoreId(userWarehouseId);
      if (wh.store_id !== userStoreId) {
        return res.status(403).json({ error: { ar: 'غير مصرح لك بالوصول إلى هذا المخزن', en: 'Access denied to this warehouse' } });
      }
    }

    return res.json({ data: wh });
  } catch (err) {
    console.error('[warehouses] getWarehouse error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// POST /api/warehouses
async function createWarehouse(req, res) {
  const { name, name_en, store_id } = req.body;

  if (!name || !name_en || !store_id) {
    return res.status(400).json({ error: { ar: 'الاسم بالعربي والإنجليزي ورقم الفرع مطلوبة', en: 'name, name_en, and store_id are required' } });
  }
  if (name.length > 100 || name_en.length > 100) {
    return res.status(400).json({ error: { ar: 'الاسم يجب ألا يتجاوز 100 حرف', en: 'Name must not exceed 100 characters' } });
  }

  try {
    const storeCheck = await query(
      'SELECT id FROM stores WHERE id = $1 AND archived = false',
      [store_id],
    );
    if (storeCheck.rowCount === 0) {
      return res.status(400).json({ error: { ar: 'الفرع غير موجود أو مؤرشف', en: 'Store not found or archived' } });
    }

    const dup = await query(
      'SELECT id FROM warehouses WHERE LOWER(name) = LOWER($1) AND store_id = $2 AND archived = false',
      [name, store_id],
    );
    if (dup.rowCount > 0) {
      return res.status(409).json({ error: { ar: 'اسم المخزن موجود مسبقاً في هذا الفرع', en: 'Warehouse name already exists in this store' } });
    }

    const inserted = await query(
      `INSERT INTO warehouses (store_id, name, name_en, locked, archived)
       VALUES ($1, $2, $3, false, false)
       RETURNING id`,
      [store_id, name, name_en],
    );

    const whResult = await query(
      `${WAREHOUSE_JOIN} WHERE w.id = $1`,
      [inserted.rows[0].id],
    );
    const wh = whResult.rows[0];

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'warehouse.create',
      target_type: 'warehouse',
      target_id: wh.id,
      store_id: wh.store_id,
      warehouse_id: wh.id,
      new_value: { name: wh.name, name_en: wh.name_en, store_id: wh.store_id },
      ip_address: getIp(req),
    });

    return res.status(201).json({ data: wh });
  } catch (err) {
    console.error('[warehouses] createWarehouse error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// PUT /api/warehouses/:id
async function updateWarehouse(req, res) {
  const { id } = req.params;
  const { name, name_en } = req.body;

  if (!name && !name_en) {
    return res.status(400).json({ error: { ar: 'يجب تقديم حقل واحد على الأقل للتحديث', en: 'At least one field is required' } });
  }
  if (name    && name.length    > 100) return res.status(400).json({ error: { ar: 'الاسم يجب ألا يتجاوز 100 حرف',          en: 'Name must not exceed 100 characters' } });
  if (name_en && name_en.length > 100) return res.status(400).json({ error: { ar: 'الاسم الإنجليزي يجب ألا يتجاوز 100 حرف', en: 'English name must not exceed 100 characters' } });

  try {
    const existing = await query(
      `${WAREHOUSE_JOIN} WHERE w.id = $1 AND w.archived = false`,
      [id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'المخزن غير موجود', en: 'Warehouse not found' } });
    }
    const old = existing.rows[0];

    if (name && name.toLowerCase() !== old.name.toLowerCase()) {
      const dup = await query(
        'SELECT id FROM warehouses WHERE LOWER(name) = LOWER($1) AND store_id = $2 AND archived = false AND id != $3',
        [name, old.store_id, id],
      );
      if (dup.rowCount > 0) {
        return res.status(409).json({ error: { ar: 'اسم المخزن موجود مسبقاً في هذا الفرع', en: 'Warehouse name already exists in this store' } });
      }
    }

    const updates = [];
    const values  = [];
    if (name)    { updates.push(`name = $${values.length + 1}`);    values.push(name); }
    if (name_en) { updates.push(`name_en = $${values.length + 1}`); values.push(name_en); }
    values.push(id);

    await query(
      `UPDATE warehouses SET ${updates.join(', ')} WHERE id = $${values.length}`,
      values,
    );

    const updated = await query(`${WAREHOUSE_JOIN} WHERE w.id = $1`, [id]);
    const wh = updated.rows[0];

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'warehouse.update',
      target_type: 'warehouse',
      target_id: id,
      store_id: old.store_id,
      warehouse_id: id,
      old_value: { name: old.name, name_en: old.name_en },
      new_value: { name: wh.name, name_en: wh.name_en },
      ip_address: getIp(req),
    });

    return res.json({ data: wh });
  } catch (err) {
    console.error('[warehouses] updateWarehouse error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// PUT /api/warehouses/:id/lock  — toggles locked state
async function toggleLock(req, res) {
  const { id } = req.params;

  try {
    const existing = await query(
      `${WAREHOUSE_JOIN} WHERE w.id = $1 AND w.archived = false`,
      [id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'المخزن غير موجود', en: 'Warehouse not found' } });
    }
    const old = existing.rows[0];
    const newLocked = !old.locked;

    await query('UPDATE warehouses SET locked = $1 WHERE id = $2', [newLocked, id]);

    const updated = await query(`${WAREHOUSE_JOIN} WHERE w.id = $1`, [id]);
    const wh = updated.rows[0];

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: newLocked ? 'warehouse.lock' : 'warehouse.unlock',
      target_type: 'warehouse',
      target_id: id,
      store_id: old.store_id,
      warehouse_id: id,
      old_value: { locked: old.locked },
      new_value: { locked: newLocked },
      ip_address: getIp(req),
    });

    return res.json({ data: wh });
  } catch (err) {
    console.error('[warehouses] toggleLock error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// PUT /api/warehouses/:id/archive
async function archiveWarehouse(req, res) {
  const { id } = req.params;

  try {
    // Fetch without archived filter so we can detect already-archived
    const existing = await query(`${WAREHOUSE_JOIN} WHERE w.id = $1`, [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'المخزن غير موجود', en: 'Warehouse not found' } });
    }
    const old = existing.rows[0];

    if (old.archived) {
      return res.status(400).json({ error: { ar: 'المخزن مؤرشف مسبقاً', en: 'Warehouse is already archived' } });
    }

    const invCheck = await query(
      'SELECT COALESCE(SUM(quantity), 0)::int AS total FROM inventory WHERE warehouse_id = $1',
      [id],
    );
    if (invCheck.rows[0].total > 0) {
      return res.status(400).json({ error: { ar: 'لا يمكن أرشفة المخزن لأنه يحتوي على مخزون', en: 'Cannot archive a warehouse that still has inventory' } });
    }

    await query(
      'UPDATE warehouses SET archived = true, locked = true WHERE id = $1',
      [id],
    );

    const updated = await query(`${WAREHOUSE_JOIN} WHERE w.id = $1`, [id]);
    const wh = updated.rows[0];

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'warehouse.archive',
      target_type: 'warehouse',
      target_id: id,
      store_id: old.store_id,
      warehouse_id: id,
      old_value: { archived: false, locked: old.locked },
      new_value: { archived: true,  locked: true },
      ip_address: getIp(req),
    });

    return res.json({ data: wh });
  } catch (err) {
    console.error('[warehouses] archiveWarehouse error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

module.exports = {
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  toggleLock,
  archiveWarehouse,
};
