const { query } = require('../db/pool');
const { writeAuditLog, getIp } = require('../utils/audit');

// GET /api/categories
async function listCategories(req, res) {
  try {
    const includeArchived = req.query.include_archived === 'true';
    const sql = includeArchived
      ? 'SELECT id, name, name_en, archived, created_at FROM categories ORDER BY name'
      : 'SELECT id, name, name_en, archived, created_at FROM categories WHERE archived = false ORDER BY name';
    const result = await query(sql, []);
    return res.json({ data: result.rows });
  } catch (err) {
    console.error('[categories] listCategories error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// POST /api/categories
async function createCategory(req, res) {
  const { name, name_en } = req.body;
  if (!name || !name_en) {
    return res.status(400).json({ error: { ar: 'الاسم بالعربي والإنجليزي مطلوبان', en: 'name and name_en are required' } });
  }
  if (name.length > 100 || name_en.length > 100) {
    return res.status(400).json({ error: { ar: 'الاسم يجب ألا يتجاوز 100 حرف', en: 'Name must not exceed 100 characters' } });
  }
  try {
    const dup = await query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND archived = false',
      [name],
    );
    if (dup.rowCount > 0) {
      return res.status(409).json({ error: { ar: 'الفئة موجودة مسبقاً', en: 'Category already exists' } });
    }
    const inserted = await query(
      'INSERT INTO categories (name, name_en) VALUES ($1, $2) RETURNING id, name, name_en, archived, created_at',
      [name, name_en],
    );
    const cat = inserted.rows[0];
    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'category.create',
      target_type: 'category',
      target_id: cat.id,
      store_id: null,
      warehouse_id: null,
      new_value: { name: cat.name, name_en: cat.name_en },
      ip_address: getIp(req),
    });
    return res.status(201).json({ data: cat });
  } catch (err) {
    console.error('[categories] createCategory error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// PUT /api/categories/:id
async function updateCategory(req, res) {
  const { id } = req.params;
  const { name, name_en } = req.body;
  if (!name && !name_en) {
    return res.status(400).json({ error: { ar: 'يجب تقديم حقل واحد على الأقل', en: 'At least one field is required' } });
  }
  try {
    const existing = await query(
      'SELECT id, name, name_en FROM categories WHERE id = $1 AND archived = false',
      [id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'الفئة غير موجودة', en: 'Category not found' } });
    }
    const old = existing.rows[0];

    if (name && name.toLowerCase() !== old.name.toLowerCase()) {
      const dup = await query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND archived = false AND id != $2',
        [name, id],
      );
      if (dup.rowCount > 0) {
        return res.status(409).json({ error: { ar: 'الفئة موجودة مسبقاً', en: 'Category name already exists' } });
      }
    }

    const updates = [];
    const values = [];
    if (name)    { updates.push(`name = $${values.length + 1}`);    values.push(name); }
    if (name_en) { updates.push(`name_en = $${values.length + 1}`); values.push(name_en); }
    values.push(id);

    const updated = await query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, name, name_en, archived, created_at`,
      values,
    );
    const cat = updated.rows[0];

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'category.update',
      target_type: 'category',
      target_id: id,
      store_id: null,
      warehouse_id: null,
      old_value: { name: old.name, name_en: old.name_en },
      new_value: { name: cat.name, name_en: cat.name_en },
      ip_address: getIp(req),
    });
    return res.json({ data: cat });
  } catch (err) {
    console.error('[categories] updateCategory error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

// PUT /api/categories/:id/archive
async function archiveCategory(req, res) {
  const { id } = req.params;
  try {
    const existing = await query(
      'SELECT id, name, name_en, archived FROM categories WHERE id = $1',
      [id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: { ar: 'الفئة غير موجودة', en: 'Category not found' } });
    }
    const cat = existing.rows[0];
    if (cat.archived) {
      return res.status(400).json({ error: { ar: 'الفئة مؤرشفة مسبقاً', en: 'Category is already archived' } });
    }

    const activeProducts = await query(
      'SELECT COUNT(*) AS cnt FROM products WHERE category_id = $1 AND archived = false',
      [id],
    );
    if (parseInt(activeProducts.rows[0].cnt) > 0) {
      return res.status(400).json({ error: { ar: 'لا يمكن أرشفة فئة تحتوي على منتجات نشطة', en: 'Cannot archive a category that has active products' } });
    }

    const updated = await query(
      'UPDATE categories SET archived = true WHERE id = $1 RETURNING id, name, name_en, archived, created_at',
      [id],
    );

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'category.archive',
      target_type: 'category',
      target_id: id,
      store_id: null,
      warehouse_id: null,
      old_value: { archived: false },
      new_value: { archived: true },
      ip_address: getIp(req),
    });
    return res.json({ data: updated.rows[0] });
  } catch (err) {
    console.error('[categories] archiveCategory error:', err.message);
    return res.status(500).json({ error: { ar: 'خطأ في الخادم', en: 'Server error' } });
  }
}

module.exports = { listCategories, createCategory, updateCategory, archiveCategory };
