const jwt = require("jsonwebtoken");
const { query } = require("../db/pool");

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message_ar: "غير مصرح — الرمز مفقود",
      message_en: "Unauthorized — token missing",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      role: payload.role,
      store_id: payload.store_id,
      name_ar: payload.name_ar,
      name_en: payload.name_en,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      message_ar: "غير مصرح — الرمز منتهي أو غير صالح",
      message_en: "Unauthorized — token expired or invalid",
    });
  }
}

async function refreshToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return null;
  }

  const result = await query(
    "SELECT id FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()",
    [token],
  );

  if (result.rowCount === 0) return null;

  return payload;
}

module.exports = { authenticate, refreshToken };
