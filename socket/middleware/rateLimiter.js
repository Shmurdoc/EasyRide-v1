const MAX_EVENTS = 10;
const WINDOW_MS = 1000;

export function rateLimiter(socket, next) {
  const bucket = {
    tokens: MAX_EVENTS,
    lastRefill: Date.now(),
  };

  socket._rateBucket = bucket;

  const originalEmit = socket.emit.bind(socket);
  socket.emit = function (event, ...args) {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;

    if (elapsed >= WINDOW_MS) {
      bucket.tokens = MAX_EVENTS;
      bucket.lastRefill = now;
    }

    if (bucket.tokens <= 0) {
      socket.emit("error", { message: "Rate limit exceeded" });
      return false;
    }

    bucket.tokens--;
    return originalEmit(event, ...args);
  };

  socket.onAny(() => {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;

    if (elapsed >= WINDOW_MS) {
      bucket.tokens = MAX_EVENTS;
      bucket.lastRefill = now;
    }

    if (bucket.tokens <= 0) {
      socket.disconnect(true);
      return;
    }

    bucket.tokens--;
  });

  next();
}
