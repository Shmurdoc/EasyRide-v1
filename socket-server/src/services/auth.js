const { dataClient } = require('./redis');

const CACHE_TTL_SECONDS = 60;
const CACHE_PREFIX = 'auth:token:';
const TOKEN_REVALIDATE_INTERVAL_MS = 55_000;

async function validateToken(token) {
  if (!token || typeof token !== 'string' || token.length < 10) {
    return { valid: false, reason: 'malformed' };
  }

  if (token.split('|').length !== 2) {
    return { valid: false, reason: 'not_sanctum' };
  }

  const cacheKey = CACHE_PREFIX + token;
  try {
    const cached = await dataClient.get(cacheKey);
    if (cached) {
      if (cached === 'INVALID') {
        return { valid: false, reason: 'cached_invalid' };
      }
      const parsed = JSON.parse(cached);
      if (parsed.expires_at && parsed.expires_at < Date.now()) {
        return { valid: false, reason: 'expired' };
      }
      return { valid: true, user: parsed, fromCache: true };
    }
  } catch (err) {
    console.warn('[Auth] cache read failed:', err.message);
  }

  return await validateTokenAgainstBackend(token);
}

async function validateTokenAgainstBackend(token) {
  const apiBaseUrl = (process.env.APP_API_BASE_URL || 'http://nginx:8080').replace(/\/$/, '');
  const url = `${apiBaseUrl}/api/v1/auth/me`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.status === 401) {
      await cacheInvalid(token);
      return { valid: false, reason: 'unauthorized' };
    }

    if (!response.ok) {
      return { valid: false, reason: `http_${response.status}` };
    }

    const body = await response.json();
    const user = body.user || body.data?.user || body;
    if (!user || !user.id) {
      return { valid: false, reason: 'no_user' };
    }

    const result = {
      userId: user.id,
      role: user.role || 'rider',
      tenantId: user.tenant_id || null,
      name: user.name,
      email: user.email,
      expires_at: Date.now() + (CACHE_TTL_SECONDS * 1000),
    };

    await cacheValid(token, result);
    return { valid: true, user: result, fromCache: false };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { valid: false, reason: 'timeout' };
    }
    console.error('[Auth] token validation failed:', err.message);
    return { valid: false, reason: 'network_error' };
  }
}

async function revalidateConnectedTokens(io) {
  const SCAN_PATTERN = CACHE_PREFIX + '*';
  const SCAN_COUNT = 50;
  let cursor = '0';
  let evictedCount = 0;
  let refreshedCount = 0;

  try {
    do {
      const [nextCursor, keys] = await dataClient.scan(cursor, 'MATCH', SCAN_PATTERN, 'COUNT', SCAN_COUNT);
      cursor = nextCursor;

      for (const key of keys) {
        if (key.endsWith(':INVALID')) continue;

        try {
          const cached = await dataClient.get(key);
          if (!cached || cached === 'INVALID') continue;

          const parsed = JSON.parse(cached);
          if (!parsed.userId || !parsed.expires_at) continue;

          const isNearExpiry = parsed.expires_at - Date.now() < 15_000;

          if (isNearExpiry) {
            const token = key.replace(CACHE_PREFIX, '');
            const result = await validateTokenAgainstBackend(token);

            if (!result.valid) {
              const sockets = await io.in(`user:${parsed.userId}`).fetchSockets();
              for (const sock of sockets) {
                if (sock.data.token === token) {
                  sock.emit('auth:token-expired', { reason: result.reason });
                  sock.disconnect(true);
                  evictedCount++;
                }
              }
            } else {
              refreshedCount++;
            }
          }
        } catch (err) {
          console.warn('[Auth] revalidate scan key error:', err.message);
        }
      }
    } while (cursor !== '0');

    if (evictedCount > 0 || refreshedCount > 0) {
      console.log(`[Auth] Token revalidation: ${refreshedCount} refreshed, ${evictedCount} evicted`);
    }
  } catch (err) {
    console.error('[Auth] Token revalidation scan failed:', err.message);
  }
}

async function cacheValid(token, payload) {
  try {
    await dataClient.set(
      CACHE_PREFIX + token,
      JSON.stringify(payload),
      'EX',
      CACHE_TTL_SECONDS
    );
  } catch (err) {
    console.warn('[Auth] cache write failed:', err.message);
  }
}

async function cacheInvalid(token) {
  try {
    await dataClient.set(CACHE_PREFIX + token, 'INVALID', 'EX', 30);
  } catch (err) {
    console.warn('[Auth] invalid cache write failed:', err.message);
  }
}

async function invalidateToken(token) {
  try {
    await dataClient.del(CACHE_PREFIX + token);
  } catch (err) {
    console.warn('[Auth] cache invalidate failed:', err.message);
  }
}

module.exports = {
  validateToken,
  invalidateToken,
  revalidateConnectedTokens,
  CACHE_TTL_SECONDS,
  TOKEN_REVALIDATE_INTERVAL_MS,
};
