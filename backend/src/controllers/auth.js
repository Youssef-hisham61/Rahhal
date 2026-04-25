const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db/pool");
const { refreshToken: verifyRefreshToken } = require("../middleware/auth");

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_JOIN_QUERY = `
  SELECT
    u.id, u.name_ar, u.name_en, u.email, u.role, u.warehouse_id, u.active, u.created_at,
    w.name AS warehouse_name,
    w.name_en AS warehouse_name_en,
    s.id AS store_id,
    s.name AS store_name,
    s.name_en AS store_name_en,
    s.color AS store_color
  FROM users u
  LEFT JOIN warehouses w ON u.warehouse_id = w.id
  LEFT JOIN stores s ON w.store_id = s.id
  WHERE u.id = $1`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      warehouse_id: user.warehouse_id,
      name_ar: user.name_ar,
      name_en: user.name_en,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY },
  );
}

function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY,
  });
}

function getExpiresAt(expiry) {
  // converts '7d' → a Date object 7 days from now
  const units = { m: 60, h: 3600, d: 86400 };
  const match = expiry.match(/^(\d+)([mhd])$/);
  if (!match) throw new Error("Invalid expiry format");
  const seconds = parseInt(match[1]) * units[match[2]];
  return new Date(Date.now() + seconds * 1000);
}

async function writeAuditLog({ user_id, user_role, action, store_id, ip_address }) {
  await query(
    `INSERT INTO audit_logs (user_id, user_role, action, store_id, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [user_id, user_role, action, store_id || null, ip_address || null],
  );
}

// ─── Controllers ──────────────────────────────────────────────────────────────

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message_ar: "البريد الإلكتروني وكلمة المرور مطلوبان",
      message_en: "Email and password are required",
    });
  }

  try {
    const result = await query(
      `SELECT
         u.id, u.name_ar, u.name_en, u.email, u.password_hash, u.role, u.warehouse_id, u.active,
         w.name AS warehouse_name,
         w.name_en AS warehouse_name_en,
         s.id AS store_id,
         s.name AS store_name,
         s.name_en AS store_name_en,
         s.color AS store_color
       FROM users u
       LEFT JOIN warehouses w ON u.warehouse_id = w.id
       LEFT JOIN stores s ON w.store_id = s.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()],
    );

    const user = result.rows[0];

    // always run bcrypt even if user not found — prevents timing attacks
    const dummyHash =
      "$2b$12$invalidhashfortimingprotection000000000000000000000000";
    const passwordMatch = await bcrypt.compare(
      password,
      user ? user.password_hash : dummyHash,
    );

    if (!user || !passwordMatch) {
      return res.status(401).json({
        message_ar: "بيانات الدخول غير صحيحة",
        message_en: "Invalid credentials",
      });
    }

    if (!user.active) {
      return res.status(401).json({
        message_ar: "هذا الحساب معطل",
        message_en: "Account is deactivated",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt = getExpiresAt(process.env.JWT_REFRESH_EXPIRY);
    const ip = req.ip || req.headers["x-forwarded-for"] || null;

    await query(
      `INSERT INTO sessions (user_id, refresh_token, ip_address, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, refreshToken, ip, expiresAt],
    );

    await writeAuditLog({
      user_id: user.id,
      user_role: user.role,
      action: "login",
      store_id: user.store_id,
      ip_address: ip,
    });

    return res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name_ar: user.name_ar,
        name_en: user.name_en,
        email: user.email,
        role: user.role,
        warehouse_id: user.warehouse_id,
        warehouse_name: user.warehouse_name,
        warehouse_name_en: user.warehouse_name_en,
        store_id: user.store_id,
        store_name: user.store_name,
        store_name_en: user.store_name_en,
        store_color: user.store_color,
      },
    });
  } catch (err) {
    console.error("[auth] login error:", err.message);
    return res.status(500).json({
      message_ar: "خطأ في الخادم",
      message_en: "Server error",
    });
  }
}

async function refresh(req, res) {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      message_ar: "رمز التحديث مطلوب",
      message_en: "Refresh token is required",
    });
  }

  try {
    const payload = await verifyRefreshToken(refresh_token);

    if (!payload) {
      return res.status(401).json({
        message_ar: "رمز التحديث غير صالح أو منتهي",
        message_en: "Refresh token invalid or expired",
      });
    }

    const result = await query(USER_JOIN_QUERY, [payload.id]);
    const user = result.rows[0];

    if (!user || !user.active) {
      return res.status(401).json({
        message_ar: "الحساب غير موجود أو معطل",
        message_en: "Account not found or deactivated",
      });
    }

    const accessToken = generateAccessToken(user);

    return res.json({ access_token: accessToken });
  } catch (err) {
    console.error("[auth] refresh error:", err.message);
    return res.status(500).json({
      message_ar: "خطأ في الخادم",
      message_en: "Server error",
    });
  }
}

async function logout(req, res) {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      message_ar: "رمز التحديث مطلوب",
      message_en: "Refresh token is required",
    });
  }

  try {
    await query(
      `DELETE FROM sessions WHERE refresh_token = $1 AND user_id = $2`,
      [refresh_token, req.user.id],
    );

    const ip = req.ip || req.headers["x-forwarded-for"] || null;

    await writeAuditLog({
      user_id: req.user.id,
      user_role: req.user.role,
      action: "logout",
      store_id: null,
      ip_address: ip,
    });

    return res.json({
      message_ar: "تم تسجيل الخروج بنجاح",
      message_en: "Logged out successfully",
    });
  } catch (err) {
    console.error("[auth] logout error:", err.message);
    return res.status(500).json({
      message_ar: "خطأ في الخادم",
      message_en: "Server error",
    });
  }
}

async function me(req, res) {
  try {
    const result = await query(USER_JOIN_QUERY, [req.user.id]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        message_ar: "المستخدم غير موجود",
        message_en: "User not found",
      });
    }

    return res.json(user);
  } catch (err) {
    console.error("[auth] me error:", err.message);
    return res.status(500).json({
      message_ar: "خطأ في الخادم",
      message_en: "Server error",
    });
  }
}

module.exports = { login, refresh, logout, me };
