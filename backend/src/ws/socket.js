const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const { query } = require("../db/pool");

// userId → { ws, userId, name_ar, name_en, role, warehouse_id, ... }
const clients = new Map();

const USER_JOIN_QUERY = `
  SELECT
    u.id, u.name_ar, u.name_en, u.role, u.warehouse_id,
    w.name AS warehouse_name,
    w.name_en AS warehouse_name_en,
    s.id AS store_id,
    s.name AS store_name,
    s.name_en AS store_name_en,
    s.color AS store_color
  FROM users u
  LEFT JOIN warehouses w ON u.warehouse_id = w.id
  LEFT JOIN stores s ON w.store_id = s.id
  WHERE u.id = $1 AND u.active = true`;

function broadcast(data) {
  const payload = JSON.stringify(data);
  for (const entry of clients.values()) {
    if (entry.ws.readyState === 1) entry.ws.send(payload);
  }
}

function broadcastToAdmins(data) {
  const payload = JSON.stringify(data);
  for (const entry of clients.values()) {
    if (["owner", "admin"].includes(entry.role) && entry.ws.readyState === 1) {
      entry.ws.send(payload);
    }
  }
}

function getOnlineUsers() {
  return Array.from(clients.values()).map(({ ws, ...rest }) => rest);
}

function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.userId = null;

    ws.send(JSON.stringify({ type: "connected" }));

    // Must send { type: 'auth', token: '...' } within 5 seconds
    const authTimeout = setTimeout(() => {
      if (!ws.userId) ws.terminate();
    }, 5000);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      if (msg.type !== "auth" || !msg.token) return;

      let payload;
      try {
        payload = jwt.verify(msg.token, process.env.JWT_SECRET);
      } catch {
        ws.send(JSON.stringify({ type: "auth_error", message_en: "Invalid token" }));
        ws.terminate();
        return;
      }

      try {
        const result = await query(USER_JOIN_QUERY, [payload.id]);
        const user = result.rows[0];

        if (!user) {
          ws.terminate();
          return;
        }

        clearTimeout(authTimeout);
        ws.userId = user.id;

        // If this user already has a connection, replace it (second tab scenario)
        if (clients.has(user.id)) {
          const prev = clients.get(user.id);
          clients.set(user.id, buildEntry(ws, user)); // update first
          prev.ws.terminate();                         // then terminate old
        } else {
          clients.set(user.id, buildEntry(ws, user));
        }

        ws.send(JSON.stringify({ type: "auth_ok" }));
        broadcastToAdmins({ type: "presence_update", online: getOnlineUsers() });
      } catch (err) {
        console.error("[ws] auth error:", err.message);
        ws.terminate();
      }
    });

    ws.on("close", () => {
      clearTimeout(authTimeout);
      // Only remove from Map if this ws is still the current one for the user
      if (ws.userId && clients.get(ws.userId)?.ws === ws) {
        clients.delete(ws.userId);
        broadcastToAdmins({ type: "presence_update", online: getOnlineUsers() });
      }
    });

    ws.on("error", () => {
      clearTimeout(authTimeout);
      if (ws.userId && clients.get(ws.userId)?.ws === ws) {
        clients.delete(ws.userId);
        broadcastToAdmins({ type: "presence_update", online: getOnlineUsers() });
      }
    });
  });

  const heartbeat = setInterval(() => {
    for (const [userId, entry] of clients) {
      if (!entry.ws.isAlive) {
        clients.delete(userId);
        entry.ws.terminate();
        broadcastToAdmins({ type: "presence_update", online: getOnlineUsers() });
        continue;
      }
      entry.ws.isAlive = false;
      entry.ws.ping();
    }
  }, 30000);

  wss.on("close", () => clearInterval(heartbeat));

  return wss;
}

function buildEntry(ws, user) {
  return {
    ws,
    userId: user.id,
    name_ar: user.name_ar,
    name_en: user.name_en,
    role: user.role,
    warehouse_id: user.warehouse_id,
    warehouse_name: user.warehouse_name,
    warehouse_name_en: user.warehouse_name_en,
    store_id: user.store_id,
    store_name: user.store_name,
    store_name_en: user.store_name_en,
    store_color: user.store_color,
    connectedAt: new Date().toISOString(),
  };
}

module.exports = { initWebSocket, broadcast, broadcastToAdmins, getOnlineUsers };
