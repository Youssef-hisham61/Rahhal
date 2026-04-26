const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { getOnlineUsers } = require('../ws/socket');
const { writeAuditLog, getIp } = require('../utils/audit');

const BCRYPT_COST = 12;
const ALLOWED_ROLES = ['admin', 'worker', 'viewer'];

const USER_SELECT = `
  SELECT u.id, u.name_ar, u.name_en, u.email, u.role, u.active, u.created_at,
         w.id  AS warehouse_id,    w.name    AS warehouse_name,    w.name_en AS warehouse_name_en,
         s.id  AS store_id,        s.name    AS store_name,        s.name_en AS store_name_en,
         s.color AS store_color
  FROM users u
  LEFT JOIN warehouses w ON w.id = u.warehouse_id
  LEFT JOIN stores     s ON s.id = w.store_id
`;

function canActOn(actorRole, targetRole) {
  if (actorRole === 'owner') return ['admin', 'worker', 'viewer'].includes(targetRole);
  if (actorRole === 'admin') return ['worker', 'viewer'].includes(targetRole);
  return false;
}

async function getOnline(req, res) {
  return res.json({ online: getOnlineUsers(), last_updated: new Date() });
}

async function listUsers(req, res) {
  try {
    const result = await query(`${USER_SELECT} ORDER BY u.created_at DESC`);
    return res.json(result.rows);
  } catch (err) {
    console.error('[users] listUsers error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function createUser(req, res) {
  const { name_ar, name_en, email, password, role, warehouse_id } = req.body;

  if (!name_ar || !name_en || !email || !password || !role) {
    return res.status(400).json({ message_ar: 'جميع الحقول مطلوبة', message_en: 'name_ar, name_en, email, password, and role are required' });
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ message_ar: 'الدور غير صالح', message_en: 'role must be admin, worker, or viewer' });
  }

  if (req.user.role === 'admin' && role === 'admin') {
    return res.status(403).json({ message_ar: 'المدير لا يمكنه إنشاء مدير آخر', message_en: 'Admin cannot create another admin' });
  }

  if (role === 'admin' && warehouse_id) {
    return res.status(400).json({ message_ar: 'المدير لا يُسنَد إلى مخزن', message_en: 'Admin must not have a warehouse_id' });
  }

  if (['worker', 'viewer'].includes(role) && !warehouse_id) {
    return res.status(400).json({ message_ar: 'يجب تحديد مخزن للعامل أو المشاهد', message_en: 'warehouse_id is required for worker and viewer roles' });
  }

  try {
    const dupEmail = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (dupEmail.rowCount > 0) {
      return res.status(409).json({ message_ar: 'البريد الإلكتروني مستخدم مسبقاً', message_en: 'Email already in use' });
    }

    if (warehouse_id) {
      const wh = await query(`SELECT id FROM warehouses WHERE id = $1 AND archived = false`, [warehouse_id]);
      if (wh.rowCount === 0) {
        return res.status(400).json({ message_ar: 'المخزن غير موجود أو مؤرشف', message_en: 'Warehouse not found or archived' });
      }
    }

    const hash = await bcrypt.hash(password, BCRYPT_COST);
    const result = await query(
      `INSERT INTO users (name_ar, name_en, email, password_hash, role, warehouse_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name_ar, name_en, email, role, active, created_at, warehouse_id`,
      [name_ar, name_en, email, hash, role, warehouse_id ?? null],
    );
    const user = result.rows[0];

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'user.create',
      target_type: 'user',
      target_id: user.id,
      warehouse_id: warehouse_id ?? null,
      new_value: { name_ar, name_en, email, role },
      ip_address: getIp(req),
    });

    return res.status(201).json(user);
  } catch (err) {
    console.error('[users] createUser error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function getUser(req, res) {
  const { id } = req.params;
  try {
    const result = await query(`${USER_SELECT} WHERE u.id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message_ar: 'المستخدم غير موجود', message_en: 'User not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[users] getUser error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { name_ar, name_en, email } = req.body;

  if (!name_ar && !name_en && !email) {
    return res.status(400).json({ message_ar: 'لا توجد بيانات للتحديث', message_en: 'No fields to update' });
  }

  try {
    const target = await query(`SELECT id, name_ar, name_en, email, role FROM users WHERE id = $1`, [id]);
    if (target.rowCount === 0) {
      return res.status(404).json({ message_ar: 'المستخدم غير موجود', message_en: 'User not found' });
    }
    const old = target.rows[0];

    if (!canActOn(req.user.role, old.role)) {
      return res.status(403).json({ message_ar: 'غير مصرح لك بتعديل هذا المستخدم', message_en: 'Forbidden — insufficient permissions for this user' });
    }

    if (email && email !== old.email) {
      const dup = await query(`SELECT id FROM users WHERE email = $1 AND id != $2`, [email, id]);
      if (dup.rowCount > 0) {
        return res.status(409).json({ message_ar: 'البريد الإلكتروني مستخدم مسبقاً', message_en: 'Email already in use' });
      }
    }

    const updates = [];
    const values = [];
    if (name_ar) { updates.push(`name_ar = $${values.length + 1}`); values.push(name_ar); }
    if (name_en) { updates.push(`name_en = $${values.length + 1}`); values.push(name_en); }
    if (email)   { updates.push(`email = $${values.length + 1}`);   values.push(email); }
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING id, name_ar, name_en, email, role, active, created_at, warehouse_id`,
      values,
    );

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'user.update',
      target_type: 'user',
      target_id: id,
      old_value: { name_ar: old.name_ar, name_en: old.name_en, email: old.email },
      new_value: { name_ar: name_ar ?? old.name_ar, name_en: name_en ?? old.name_en, email: email ?? old.email },
      ip_address: getIp(req),
    });

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[users] updateUser error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function deactivateUser(req, res) {
  const { id } = req.params;
  if (req.user.id === id) {
    return res.status(400).json({ message_ar: 'لا يمكنك تعطيل حسابك الخاص', message_en: 'Cannot deactivate your own account' });
  }

  try {
    const target = await query(`SELECT id, role, active FROM users WHERE id = $1`, [id]);
    if (target.rowCount === 0) {
      return res.status(404).json({ message_ar: 'المستخدم غير موجود', message_en: 'User not found' });
    }
    const user = target.rows[0];

    if (user.role === 'owner') {
      return res.status(403).json({ message_ar: 'لا يمكن تعطيل حساب المالك', message_en: 'Cannot deactivate the owner account' });
    }
    if (!canActOn(req.user.role, user.role)) {
      return res.status(403).json({ message_ar: 'غير مصرح لك بهذا الإجراء', message_en: 'Forbidden — insufficient permissions' });
    }
    if (!user.active) {
      return res.status(409).json({ message_ar: 'الحساب معطّل مسبقاً', message_en: 'User is already deactivated' });
    }

    await query(`UPDATE users SET active = false WHERE id = $1`, [id]);

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'user.deactivate',
      target_type: 'user',
      target_id: id,
      old_value: { active: true },
      new_value: { active: false },
      ip_address: getIp(req),
    });

    return res.json({ message_ar: 'تم تعطيل الحساب', message_en: 'User deactivated' });
  } catch (err) {
    console.error('[users] deactivateUser error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function activateUser(req, res) {
  const { id } = req.params;

  try {
    const target = await query(`SELECT id, role, active FROM users WHERE id = $1`, [id]);
    if (target.rowCount === 0) {
      return res.status(404).json({ message_ar: 'المستخدم غير موجود', message_en: 'User not found' });
    }
    const user = target.rows[0];

    if (!canActOn(req.user.role, user.role)) {
      return res.status(403).json({ message_ar: 'غير مصرح لك بهذا الإجراء', message_en: 'Forbidden — insufficient permissions' });
    }
    if (user.active) {
      return res.status(409).json({ message_ar: 'الحساب مفعّل مسبقاً', message_en: 'User is already active' });
    }

    await query(`UPDATE users SET active = true WHERE id = $1`, [id]);

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'user.activate',
      target_type: 'user',
      target_id: id,
      old_value: { active: false },
      new_value: { active: true },
      ip_address: getIp(req),
    });

    return res.json({ message_ar: 'تم تفعيل الحساب', message_en: 'User activated' });
  } catch (err) {
    console.error('[users] activateUser error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function resetPassword(req, res) {
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ message_ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', message_en: 'new_password must be at least 8 characters' });
  }

  try {
    const target = await query(`SELECT id, role FROM users WHERE id = $1`, [id]);
    if (target.rowCount === 0) {
      return res.status(404).json({ message_ar: 'المستخدم غير موجود', message_en: 'User not found' });
    }
    const user = target.rows[0];

    if (req.user.id !== id && !canActOn(req.user.role, user.role)) {
      return res.status(403).json({ message_ar: 'غير مصرح لك بهذا الإجراء', message_en: 'Forbidden — insufficient permissions' });
    }

    const hash = await bcrypt.hash(new_password, BCRYPT_COST);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, id]);

    // Invalidate all sessions for this user
    await query(`DELETE FROM sessions WHERE user_id = $1`, [id]);

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'user.reset_password',
      target_type: 'user',
      target_id: id,
      ip_address: getIp(req),
    });

    return res.json({ message_ar: 'تم تغيير كلمة المرور', message_en: 'Password updated' });
  } catch (err) {
    console.error('[users] resetPassword error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

async function reassignWarehouse(req, res) {
  const { id } = req.params;
  const { warehouse_id } = req.body;

  if (!warehouse_id) {
    return res.status(400).json({ message_ar: 'warehouse_id مطلوب', message_en: 'warehouse_id is required' });
  }

  try {
    const target = await query(`SELECT id, role, warehouse_id FROM users WHERE id = $1`, [id]);
    if (target.rowCount === 0) {
      return res.status(404).json({ message_ar: 'المستخدم غير موجود', message_en: 'User not found' });
    }
    const user = target.rows[0];

    if (!['worker', 'viewer'].includes(user.role)) {
      return res.status(400).json({ message_ar: 'إعادة التعيين متاحة للعامل والمشاهد فقط', message_en: 'Warehouse reassignment is only for worker and viewer roles' });
    }
    if (!canActOn(req.user.role, user.role)) {
      return res.status(403).json({ message_ar: 'غير مصرح لك بهذا الإجراء', message_en: 'Forbidden — insufficient permissions' });
    }

    const wh = await query(`SELECT id FROM warehouses WHERE id = $1 AND archived = false`, [warehouse_id]);
    if (wh.rowCount === 0) {
      return res.status(400).json({ message_ar: 'المخزن غير موجود أو مؤرشف', message_en: 'Warehouse not found or archived' });
    }

    await query(`UPDATE users SET warehouse_id = $1 WHERE id = $2`, [warehouse_id, id]);

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: 'user.reassign_warehouse',
      target_type: 'user',
      target_id: id,
      warehouse_id: warehouse_id,
      old_value: { warehouse_id: user.warehouse_id },
      new_value: { warehouse_id },
      ip_address: getIp(req),
    });

    return res.json({ message_ar: 'تم تغيير المخزن', message_en: 'Warehouse reassigned' });
  } catch (err) {
    console.error('[users] reassignWarehouse error:', err.message);
    return res.status(500).json({ message_ar: 'خطأ في الخادم', message_en: 'Server error' });
  }
}

module.exports = { getOnline, listUsers, createUser, getUser, updateUser, deactivateUser, activateUser, resetPassword, reassignWarehouse };
