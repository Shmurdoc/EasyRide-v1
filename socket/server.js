import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

import { authenticateSocket, requireAdmin } from "./middleware/auth.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { registerRideHandlers } from "./handlers/rides.js";
import { registerChatHandlers } from "./handlers/chat.js";
import { registerAdminHandlers } from "./handlers/admin.js";

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:8080";

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: CORS_ORIGIN }));
app.use(helmet());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

async function setupRedisAdapter() {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  try {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log("[redis] Adapter connected successfully");
  } catch (err) {
    console.warn("[redis] Redis unavailable, running without adapter:", err.message);
  }
}

const ridesNamespace = io.of("/rides");
const chatNamespace = io.of("/chat");
const adminNamespace = io.of("/admin");

ridesNamespace.use(authenticateSocket);
ridesNamespace.use(rateLimiter);

chatNamespace.use(authenticateSocket);
chatNamespace.use(rateLimiter);

adminNamespace.use(authenticateSocket);
adminNamespace.use(requireAdmin);
adminNamespace.use(rateLimiter);

registerRideHandlers(io, ridesNamespace);
registerChatHandlers(chatNamespace);
registerAdminHandlers(adminNamespace);

async function start() {
  await setupRedisAdapter();

  httpServer.listen(PORT, '127.0.0.1', () => {
    console.log(`[easyryde-socket] Server running on port ${PORT}`);
    console.log(`[easyryde-socket] CORS origin: ${CORS_ORIGIN}`);
    console.log("[easyryde-socket] Namespaces: /rides, /chat, /admin");
  });
}

function gracefulShutdown(signal) {
  console.log(`\n[easyryde-socket] ${signal} received, shutting down...`);
  io.close(() => {
    httpServer.close(() => {
      console.log("[easyryde-socket] Server closed");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error("[easyryde-socket] Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

start().catch((err) => {
  console.error("[easyryde-socket] Failed to start:", err);
  process.exit(1);
});
