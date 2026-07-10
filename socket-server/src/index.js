const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

const config = require('./config');
const { pubClient, subClient } = require('./services/redis');
const geoService = require('./services/geo');
const laravelRelay = require('./services/laravel');
const authService = require('./services/auth');
const rateLimit = require('./middleware/rateLimit');
const eventDedup = require('./middleware/eventDedup');

const registerDriverHandlers = require('./handlers/driver');
const registerRideHandlers = require('./handlers/ride');
const registerChatHandlers = require('./handlers/chat');
const registerDeliveryHandlers = require('./handlers/delivery');
const registerAdminHandlers = require('./handlers/admin');
const registerFoodOrderHandlers = require('./handlers/foodOrder');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
  },
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e6,
  connectTimeout: 10000,
});

let connectionCount = 0;
let totalConnectionsEver = 0;
const connectedSockets = new Map();
io.connectedSockets = connectedSockets;

io.adapter(createAdapter(pubClient, subClient));

laravelRelay.init(io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const result = await authService.validateToken(token);
    if (!result.valid) {
      const msg = {
        malformed: 'Invalid token format',
        not_sanctum: 'Token is not a Sanctum token',
        cached_invalid: 'Token previously rejected',
        unauthorized: 'Token unauthorized',
        expired: 'Token expired',
        timeout: 'Auth backend timeout',
        network_error: 'Auth backend unreachable',
        no_user: 'Token has no associated user',
      }[result.reason] || 'Invalid token';
      return next(new Error(msg));
    }

    const u = result.user;
    socket.data.userId = u.userId;
    socket.data.role = u.role;
    socket.data.tenantId = u.tenantId;
    socket.data.userName = u.name;
    socket.data.userEmail = u.email;
    socket.data.token = token;
    socket.data.authFromCache = !!result.fromCache;
    socket.data.connectedAt = Date.now();
    socket.data.latency = 0;

    next();
  } catch (err) {
    console.error('[Auth] unexpected error:', err);
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  connectionCount++;
  totalConnectionsEver++;
  const { userId, role } = socket.data;

  socket.use((packet, next) => rateLimit(socket, packet[0], next));
  socket.use((packet, next) => eventDedup(socket, packet[0], next));

  console.log(`[Connect] User ${userId} (${role}) connected. Total: ${connectionCount}`);

  socket.join(`user:${userId}`);
  connectedSockets.set(userId, socket);

  if (role === 'driver') {
    socket.join(`driver:${userId}`);
    socket.data.isOnline = false;
  }

  if (role === 'admin' || role === 'super-admin') {
    socket.join('admin');
  }

  registerDriverHandlers(socket, io);
  registerRideHandlers(socket, io);
  registerChatHandlers(socket, io);
  registerDeliveryHandlers(socket, io);
  registerAdminHandlers(socket, io);
  registerFoodOrderHandlers(socket, io);

  socket.on('client:ping', (timestamp) => {
    socket.emit('client:pong', timestamp);
  });

  socket.on('client:latency', (latencyMs) => {
    if (typeof latencyMs === 'number' && latencyMs >= 0 && latencyMs < 60000) {
      socket.data.latency = latencyMs;
    }
  });

  socket.on('error', (err) => {
    console.error(`[Error] User ${userId}:`, err.message);
  });

  socket.on('disconnect', (reason) => {
    connectionCount--;
    connectedSockets.delete(userId);
    console.log(`[Disconnect] User ${userId} (${role}). Reason: ${reason}. Total: ${connectionCount}`);
  });
});

if (config.health.enabled) {
  function getConnectionStats() {
    const sockets = io.sockets.sockets;
    let totalLatency = 0;
    let count = 0;
    const qualities = { excellent: 0, good: 0, poor: 0, unknown: 0 };

    for (const [, socket] of sockets) {
      const lat = socket.data.latency || 0;
      if (lat > 0) {
        totalLatency += lat;
        count++;
        if (lat <= 100) qualities.excellent++;
        else if (lat <= 300) qualities.good++;
        else qualities.poor++;
      } else {
        qualities.unknown++;
      }
    }

    return {
      avgLatencyMs: count > 0 ? Math.round(totalLatency / count) : 0,
      qualityDistribution: qualities,
    };
  }

  app.get(config.health.path, async (_req, res) => {
    try {
      const onlineDrivers = await geoService.getOnlineDriverCount();
      const stats = getConnectionStats();
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        connections: connectionCount,
        totalEver: totalConnectionsEver,
        onlineDrivers,
        ...stats,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(503).json({
        status: 'error',
        message: err.message,
      });
    }
  });

  app.get('/metrics', async (_req, res) => {
    try {
      const onlineDrivers = await geoService.getOnlineDriverCount();
      const mem = process.memoryUsage();
      const stats = getConnectionStats();
      res.json({
        connections: connectionCount,
        totalEver: totalConnectionsEver,
        onlineDrivers,
        uptime: process.uptime(),
        ...stats,
        memory: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
        pid: process.pid,
      });
    } catch (err) {
      res.status(503).json({ error: err.message });
    }
  });
}

const cleanupInterval = setInterval(async () => {
  try {
    const cleaned = await geoService.cleanupStaleLocations();
    if (cleaned > 0) {
      console.log(`[Cleanup] Removed ${cleaned} stale driver locations`);
    }
  } catch (err) {
    console.error('[Cleanup] Error:', err.message);
  }
}, config.location.cleanupIntervalMs);

const tokenRevalidateInterval = setInterval(async () => {
  try {
    await authService.revalidateConnectedTokens(io);
  } catch (err) {
    console.error('[Auth] Token revalidation interval error:', err.message);
  }
}, authService.TOKEN_REVALIDATE_INTERVAL_MS);

function gracefulShutdown(signal) {
  console.log(`[Shutdown] Received ${signal}. Shutting down gracefully...`);

  clearInterval(cleanupInterval);
  clearInterval(tokenRevalidateInterval);

  io.emit('server:shutdown', { message: 'Server is restarting. Please reconnect.' });

  io.close(() => {
    console.log('[Shutdown] Socket.io closed');
    pubClient.quit().catch(() => {});
    subClient.quit().catch(() => {});
    server.close(() => {
      console.log('[Shutdown] HTTP server closed');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('[Shutdown] Forced exit after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});

server.listen(config.port, () => {
  console.log(`[Server] EasyRyde Socket server running on port ${config.port}`);
  console.log(`[Server] Health check: ${config.health.path}`);
  console.log(`[Server] Metrics: /metrics`);
  console.log(`[Server] Token revalidation: every ${authService.TOKEN_REVALIDATE_INTERVAL_MS / 1000}s`);
});

module.exports = { server, io };
