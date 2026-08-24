const config = require('../config');

const windows = new Map();

const EVENT_LIMITS = {
  'join:ride': { max: 10, windowMs: 60000 },
  'leave:ride': { max: 10, windowMs: 60000 },
  'ride:send-location': { max: 30, windowMs: 60000 },
  'chat:send': { max: 30, windowMs: 60000 },
  'chat:typing': { max: 20, windowMs: 60000 },
  'chat:stop-typing': { max: 20, windowMs: 60000 },
  'rider:book-ride': { max: 5, windowMs: 60000 },
  'driver:accept-ride': { max: 10, windowMs: 60000 },
  'ride:start': { max: 5, windowMs: 60000 },
  'ride:complete': { max: 5, windowMs: 60000 },
  'ride:cancel': { max: 10, windowMs: 60000 },
  'admin:broadcast-message': { max: 20, windowMs: 60000 },
  'admin:force-disconnect': { max: 5, windowMs: 60000 },
  'food-order:join': { max: 10, windowMs: 60000 },
  'driver:location-update': { max: 60, windowMs: 60000 },
  'driver:toggle-online': { max: 10, windowMs: 60000 },
  'rider:request-delivery': { max: 5, windowMs: 60000 },
  'driver:accept-delivery': { max: 10, windowMs: 60000 },
  'driver:delivery-status': { max: 10, windowMs: 60000 },
  'driver:delivery-location': { max: 30, windowMs: 60000 },
};

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of windows) {
    if (now - data.start > config.rateLimit.windowMs * 2) {
      windows.delete(key);
    }
  }
}, config.rateLimit.windowMs * 2);

function checkEventLimit(userId, event) {
  const limit = EVENT_LIMITS[event];
  if (!limit) return true;

  const key = `evt:${userId}:${event}`;
  const now = Date.now();

  let entry = windows.get(key);
  if (!entry || now - entry.start > limit.windowMs) {
    entry = { start: now, count: 0 };
    windows.set(key, entry);
  }

  entry.count++;

  if (entry.count > limit.max) {
    return false;
  }

  return true;
}

module.exports = function rateLimit(socket, event, next) {
  const userId = socket.data.userId || socket.id;

  const globalKey = socket.data.userId || socket.id;
  const now = Date.now();

  let entry = windows.get(globalKey);
  if (!entry || now - entry.start > config.rateLimit.windowMs) {
    entry = { start: now, count: 0 };
    windows.set(globalKey, entry);
  }

  entry.count++;

  if (entry.count > config.rateLimit.maxEvents) {
    console.warn(`[RateLimit] User ${globalKey} exceeded global limit (${entry.count} events)`);
    socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
    return;
  }

  if (!checkEventLimit(userId, event)) {
    const limit = EVENT_LIMITS[event];
    console.warn(
      `[RateLimit] User ${userId} exceeded event limit for ${event} (${limit.max}/${limit.windowMs}ms)`
    );
    socket.emit('error', { message: `Rate limit exceeded for ${event}. Please slow down.` });
    return;
  }

  next();
};
