const MAX_CACHE_SIZE = 500;
const EVENT_TTL_MS = 10000;

const seenEvents = new Map();

setInterval(() => {
  const cutoff = Date.now() - EVENT_TTL_MS;
  for (const [key, timestamp] of seenEvents) {
    if (timestamp < cutoff) {
      seenEvents.delete(key);
    }
  }
}, EVENT_TTL_MS);

function makeKey(userId, event, data) {
  const eventId = data?.eventId || data?.id;
  if (eventId) {
    return `${userId}:${event}:${eventId}`;
  }
  const rideId = data?.rideId;
  if (rideId) {
    const action = data?.action || '';
    return `${userId}:${event}:${rideId}:${action}`;
  }
  return null;
}

module.exports = function eventDedup(socket, event, next) {
  if (event === 'connect' || event === 'disconnect') {
    return next();
  }

  const args = Array.prototype.slice.call(arguments, 2);
  const data = args[0];
  const key = makeKey(socket.data.userId, event, data);

  if (key) {
    const seen = seenEvents.get(key);
    if (seen && Date.now() - seen < EVENT_TTL_MS) {
      console.warn(`[EventDedup] Duplicate event dropped: ${key}`);
      return;
    }
    seenEvents.set(key, Date.now());

    if (seenEvents.size > MAX_CACHE_SIZE) {
      const cutoff = Date.now() - EVENT_TTL_MS;
      for (const [k, v] of seenEvents) {
        if (v < cutoff) seenEvents.delete(k);
      }
    }
  }

  next();
};
