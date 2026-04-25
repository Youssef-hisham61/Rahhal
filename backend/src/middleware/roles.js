const { query } = require("../db/pool");

function ownerOnly(req, res, next) {
  if (req.user.role !== "owner") {
    return res.status(403).json({
      message_ar: "غير مصرح لك بهذا الإجراء",
      message_en: "Forbidden — owner only",
    });
  }
  next();
}

function adminOrAbove(req, res, next) {
  if (!["owner", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      message_ar: "غير مصرح لك بهذا الإجراء",
      message_en: "Forbidden — admin or above required",
    });
  }
  next();
}

function workerOrAbove(req, res, next) {
  if (req.user.role === "viewer") {
    return res.status(403).json({
      message_ar: "غير مصرح لك بهذا الإجراء",
      message_en: "Forbidden — viewer cannot perform this action",
    });
  }
  next();
}

async function sameWarehouseOrAbove(req, res, next) {
  if (["owner", "admin"].includes(req.user.role)) return next();

  const requestedStoreId =
    req.params.store_id || req.body.store_id || req.query.store_id;
  if (!requestedStoreId) return next();

  if (!req.user.warehouse_id) {
    return res.status(403).json({
      message_ar: "غير مصرح لك بالوصول إلى هذا الفرع",
      message_en: "Forbidden — no warehouse assigned",
    });
  }

  try {
    const result = await query(
      "SELECT store_id FROM warehouses WHERE id = $1",
      [req.user.warehouse_id],
    );

    if (
      result.rowCount === 0 ||
      result.rows[0].store_id !== requestedStoreId
    ) {
      return res.status(403).json({
        message_ar: "غير مصرح لك بالوصول إلى هذا الفرع",
        message_en: "Forbidden — access restricted to your own store",
      });
    }

    next();
  } catch {
    return res.status(500).json({
      message_ar: "خطأ في الخادم",
      message_en: "Server error",
    });
  }
}

module.exports = { ownerOnly, adminOrAbove, workerOrAbove, sameWarehouseOrAbove };
