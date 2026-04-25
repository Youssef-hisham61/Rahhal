const { query } = require("../db/pool");

async function publicStores(req, res) {
  try {
    const result = await query(
      `SELECT id, name, name_en, color FROM stores WHERE archived = false ORDER BY name`,
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("[stores] publicStores error:", err.message);
    return res.status(500).json({ message_ar: "خطأ في الخادم", message_en: "Server error" });
  }
}

module.exports = { publicStores };
