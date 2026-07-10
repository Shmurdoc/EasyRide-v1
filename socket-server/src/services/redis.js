const Redis = require('ioredis');
const config = require('../config');

function createRedisClient(label, options = {}) {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
    enableOfflineQueue: options.enableOfflineQueue ?? false,
    ...options,
  });

  client.on('error', (err) => {
    console.error(`[Redis:${label}] Error:`, err.message);
  });

  client.on('connect', () => {
    console.log(`[Redis:${label}] Connected`);
  });

  return client;
}

const pubClient = createRedisClient('pub', { enableOfflineQueue: true });
const subClient = createRedisClient('sub', { enableOfflineQueue: true });
const dataClient = createRedisClient('data');
const relayClient = createRedisClient('relay', { enableOfflineQueue: true, maxRetriesPerRequest: null });

module.exports = { pubClient, subClient, dataClient, relayClient };
