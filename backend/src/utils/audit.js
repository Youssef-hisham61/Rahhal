const { query } = require('../db/pool');

function getIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

async function writeAuditLog({ user_id, user_role, action, target_type, target_id, store_id, warehouse_id, old_value, new_value, ip_address }) {
  try {
    await query(
      `INSERT INTO audit_logs
         (user_id, user_role, action, target_type, target_id, store_id, warehouse_id, old_value, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        user_id,
        user_role,
        action,
        target_type,
        target_id,
        store_id ?? null,
        warehouse_id ?? null,
        old_value != null ? JSON.stringify(old_value) : null,
        new_value != null ? JSON.stringify(new_value) : null,
        ip_address ?? null,
      ],
    );
  } catch (err) {
    console.error('[audit] writeAuditLog error:', err.message);
  }
}

module.exports = { writeAuditLog, getIp };
