# EasyRyde Socket Server

Real-time WebSocket server for the EasyRyde ride-hailing platform. Handles live ride tracking, driver location updates, chat, food order notifications, and admin monitoring.

## Purpose

- **Ride tracking** — Real-time location updates between riders and drivers during active rides
- **Driver location** — Geospatial index (Redis GeoSet) of online drivers for proximity-based matching
- **Admin monitoring** — Live ride status, driver locations, force-disconnect capability
- **Chat** — In-ride messaging between riders and drivers (Redis-backed, 24h TTL)
- **Food delivery** — Restaurant order notifications and driver location tracking for food orders
- **Laravel relay** — Subscribes to Laravel Redis pub/sub broadcasts and forwards events to connected sockets

## How to Run

### Docker (recommended)

```bash
docker compose up socket-server
```

### Local development

```bash
cd socket-server
cp .env.example .env   # edit with your values
npm install
npm run dev             # uses --watch for auto-reload
```

### Production

```bash
npm install --production
npm start               # runs node src/index.js
```

Requires Node.js >= 18.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP/WS listen port |
| `CLIENT_URL` | `http://localhost:8000` | Allowed CORS origin |
| `JWT_SECRET` | *(required, min 32 chars)* | Shared secret with Laravel backend for token validation |
| `APP_API_BASE_URL` | `http://nginx:8080` | Laravel backend URL for persisting ride state |
| `APP_API_TOKEN` | `null` | Optional service-to-service token |
| `REDIS_HOST` | `redis` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | *(empty)* | Redis password |
| `REDIS_DB` | `0` | Redis database number |
| `STALE_LOCATION_TTL` | `300` | Seconds before a driver location is considered stale |
| `CLEANUP_INTERVAL_MS` | `60000` | How often to clean stale driver locations (ms) |
| `DRIVER_RADIUS_KM` | `10` | Radius for "nearby drivers" search |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `60` | Max events per window per socket |
| `HEALTH_CHECK_ENABLED` | `true` | Enable `/health` endpoint |
| `HEALTH_CHECK_PATH` | `/health` | Health check URL path |
| `LOG_LEVEL` | `info` | Logging level |

## Socket Events

### Ride Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `rider:book-ride` | Client → Server | Rider requests a new ride with pickup/destination/category |
| `ride:broadcast-complete` | Server → Client | Confirms ride request was broadcast to nearby drivers |
| `ride:request` | Server → Driver | New ride request forwarded to nearby drivers |
| `driver:accept-ride` | Client → Server | Driver accepts a ride (uses Lua-based Redis lock) |
| `ride:accepted` | Server → Client | Notifies rider that a driver accepted |
| `driver:arrived` | Client → Server | Driver signals arrival at pickup |
| `ride:arrived` | Server → Client | Notifies rider that driver has arrived |
| `ride:start` | Client → Server | Either party starts the ride |
| `ride:started` | Server → Client | Notifies the other party the ride started |
| `ride:complete` | Client → Server | Either party completes the ride |
| `ride:completed` | Server → Client | Notifies the other party the ride is completed |
| `ride:cancel` | Client → Server | Either party cancels the ride |
| `ride:cancelled` | Server → Client | Notifies the other party of cancellation |
| `ride:send-location` | Client → Server | Driver sends GPS location during active ride |
| `ride:location-update` | Server → Room | Broadcasts driver location to ride room |
| `join:ride` | Client → Server | Join a ride room (participant-verified) |
| `leave:ride` | Client → Server | Leave a ride room |

### Driver Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `driver:location-update` | Client → Server | Driver reports current GPS position (updates Redis GeoSet) |
| `driver:toggle-online` | Client → Server | Driver goes online/offline |
| `driver:online-status` | Server → Client | Confirms online status change |
| `driver:nearby-requests` | Client → Server | Driver requests pending ride requests nearby |
| `driver:nearby-requests:result` | Server → Client | List of pending rides within radius |
| `driver:location` | Server → Ride Room | Broadcasts driver location to riders during ride |

### Chat Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:send` | Client → Server | Send a message in a ride chat |
| `chat:message` | Server → Room | Broadcasts message to ride participants |
| `chat:typing` | Client → Server | Typing indicator |
| `chat:stop-typing` | Client → Server | Stop typing indicator |
| `chat:history` | Server → Client | Last 50 messages when joining a ride room |

### Delivery Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `rider:request-delivery` | Client → Server | Rider requests a delivery |
| `delivery:request` | Server → Driver | Broadcasts delivery to nearby drivers |
| `driver:accept-delivery` | Client → Server | Driver accepts a delivery |
| `delivery:accepted` | Server → Client | Notifies sender of acceptance |
| `driver:delivery-status` | Client → Server | Driver updates delivery status |
| `delivery:status` | Server → Client | Status update to sender |
| `driver:delivery-location` | Client → Server | Driver sends location during delivery |
| `delivery:location` | Server → Room | Broadcasts driver location for delivery |

### Food Order Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `food-order:join` | Client → Server | Join a food order room |
| `food-order:leave` | Client → Server | Leave a food order room |
| `restaurant:new-order` | Client → Server | New order notification to restaurant |
| `food-order:new` | Server → Room | Broadcasts new order to restaurant/admin |
| `food-order:status-update` | Client → Server | Update order status |
| `food-order:status` | Server → Client | Status update to customer/driver/admin |
| `food-order:driver-location` | Client → Server | Driver location during food delivery |
| `food-order:location` | Server → Room | Broadcasts driver location for food order |
| `food-order:driver-assigned` | Client → Server | Driver assigned to food order |
| `food-order:driver-coming` | Server → Customer | Notifies customer a driver is on the way |

### Admin Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `admin:broadcast-message` | Client → Server | Admin broadcasts arbitrary event to any room |
| `admin:broadcast-sent` | Server → Client | Confirms broadcast was sent |
| `admin:driver-location` | Client → Server | Admin queries a driver's current location |
| `admin:driver-location:result` | Server → Client | Returns driver location |
| `admin:online-drivers` | Client → Server | Admin queries count of online drivers |
| `admin:online-drivers:result` | Server → Client | Returns online driver count |
| `admin:active-rides` | Client → Server | Admin queries all pending rides |
| `admin:active-rides:result` | Server → Client | Returns list of active rides |
| `admin:force-disconnect` | Client → Server | Admin disconnects a target user |
| `admin:disconnected-user` | Server → Client | Confirms user was disconnected |

### System Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `client:ping` | Client → Server | Latency measurement |
| `client:pong` | Server → Client | Latency response |
| `client:latency` | Client → Server | Client reports measured latency |
| `server:shutdown` | Server → All | Broadcast before graceful shutdown |
| `auth:force_disconnect` | Server → Client | Token invalidated (e.g. logout) |

## Redis Pub/Sub Relay (Laravel Integration)

The socket server subscribes to Laravel's Redis broadcast channels via a dedicated relay connection:

1. **Laravel broadcasts events** using `event(new RideAccepted(...))` which publishes to Redis channels like `laravel_database_user:{userId}`, `laravel_database_ride:{rideId}`, etc.

2. **The relay subscribes** to all `laravel_database_*` channels using `psubscribe`.

3. **On each message**, the relay parses the channel name to determine the target room type (`user`, `driver`, `ride`, `delivery`, `admin`) and forwards the event to the correct Socket.IO room.

4. **Token invalidation** — Laravel publishes to `auth:token:invalidate` on user logout. The socket server subscribes directly to this channel, invalidates the cached token, and disconnects all sockets using that token.

This means any event Laravel broadcasts via Redis is automatically relayed to connected clients without additional socket-server code.

## Architecture

```
Mobile Apps (rider/driver/admin) ←WebSocket→ Socket Server ←Redis→ Laravel Backend
                                                           ←Redis Pub/Sub→ Laravel Events
```

- **Redis adapter** (`@socket.io/redis-adapter`) enables horizontal scaling — multiple socket server instances share state via Redis
- **ioredis** for data operations (GeoSet for driver locations, hashes for ride state, lists for chat)
- **Lua scripts** for atomic ride claiming (`SET NX EX`)
- **Rate limiting** per socket (configurable window + max events)
- **Event deduplication** middleware prevents duplicate processing
