require("dotenv").config();
const http = require("http");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { pool } = require("./db/pool");
const { initWebSocket, broadcast } = require("./ws/socket");
const usersRouter = require("./routes/users");
const storesRouter = require("./routes/stores");
const runMigrations = require("./db/migrate");
const seedOwner = require("./db/seed");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());

const placeholder = (req, res) => res.json({ message: "route coming soon" });

const authRouter = require("./routes/auth");
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/stores", storesRouter);
app.use("/api/warehouses", placeholder);
app.use("/api/categories", placeholder);
app.use("/api/products", placeholder);
app.use("/api/inventory", placeholder);
app.use("/api/requests", placeholder);
app.use("/api/transfers", placeholder);
app.use("/api/shipments", placeholder);
app.use("/api/returns", placeholder);
app.use("/api/audit", placeholder);
app.use("/api/notifications", placeholder);
app.use("/api/alerts", placeholder);
app.use("/api/reports", placeholder);

const server = http.createServer(app);
initWebSocket(server);

async function startPgListener() {
  const client = await pool.connect();
  await client.query("LISTEN rahhal_updates");
  client.on("notification", (msg) => {
    try {
      broadcast(JSON.parse(msg.payload));
    } catch {
      broadcast({ raw: msg.payload });
    }
  });
}

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await runMigrations();
    await seedOwner();
    server.listen(PORT, () => {
      console.log(`[server] running on port ${PORT}`);
      startPgListener().catch((err) =>
        console.error("[pg-listen] error:", err.message),
      );
    });
  } catch (err) {
    console.error("[startup] fatal error:", err.message);
    process.exit(1);
  }
}

start();

process.on("SIGTERM", async () => {
  console.log("[server] SIGTERM received, shutting down...");
  server.close();
  await pool.end();
  process.exit(0);
});
