# Real-Time Communication Flow — EasyRyde

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Socket.IO real-time communication between all clients and the server. Ride matching, GPS tracking, chat, and system events.

---

## 2. Architecture

```
Rider/Driver/Admin Apps (Socket.IO Client)
        |
        | WebSocket (wss://socket.easyryde.co.za)
        v
Socket.IO Server (Node.js, Port 3001)
        |
        +---> Redis GEO (driver locations)
        +---> Laravel API (token validation)
        +---> Redis Pub/Sub (horizontal scaling)
```

---

## 3. Connection Lifecycle

**Connect:**
1. Client connects with Sanctum token in handshake auth
2. Server checks Redis cache for token validation
3. Cache miss calls Laravel API GET /auth/me
4. Valid token: Join rooms (user:{id}, driver:{id})
5. Invalid token: Connection rejected (401)
6. Token cached in Redis for 60 seconds

**Disconnect:**
1. Remove from room memberships
2. If driver: Remove from Redis GEO, set offline
3. Remove connection from memory

---

## 4. Room Structure

| Room | Members | Purpose |
|------|---------|---------|
| user:{userId} | Single user | Per-user events |
| driver:{userId} | Single driver | Driver-specific events |
| ride:{rideId} | Rider + Driver | Ride-specific events |
| delivery:{deliveryId} | Rider + Driver | Delivery events |
| admin | All admins | System-wide broadcasts |

---

## 5. Event Catalog

### Client to Server Events

| Event | Actor | Payload | Server Action |
|-------|-------|---------|---------------|
| driver:location-update | Driver | lat, lng | Redis GEOADD |
| driver:toggle-online | Driver | is_online | Add/remove from GEO |
| rider:book-ride | Rider | rideId, pickup, dropoff, category | Find nearby drivers |
| driver:accept-ride | Driver | rideId, riderId | Lua atomic claim |
| driver:arrived | Driver | rideId, riderId | Notify rider |
| ride:start | Driver | rideId, otherUserId | Notify rider |
| ride:complete | Driver | rideId, otherUserId | Notify rider |
| ride:cancel | Either | rideId, reason | Notify both parties |
| chat:send | Either | rideId, message | Store + broadcast |
| chat:typing | Either | rideId | Broadcast indicator |

### Server to Client Events

| Event | Target | Payload | Room |
|-------|--------|---------|------|
| ride:request | Driver | ride details | driver:{driverId} |
| ride:accepted | Rider | rideId, driver info | ride:{rideId} |
| ride:arrived | Rider | rideId | ride:{rideId} |
| ride:started | Rider | rideId | ride:{rideId} |
| ride:completed | Rider | rideId | ride:{rideId} |
| ride:cancelled | Both | rideId, reason | ride:{rideId} |
| ride:location | Rider | lat, lng | ride:{rideId} |
| ride:status-change | Admin | rideId, status | admin |
| chat:message | Both | message object | ride:{rideId} |

---

## 6. Critical Flows

### 6.1 Ride Matching

1. Socket receives rider:book-ride
2. Redis GEOSEARCH driver:location BYRADIUS 5000m
3. For each nearby driver, emit ride:request
4. Start 15-second timeout
5. If timeout: ride status expires, notify rider

### 6.2 Atomic Ride Claim (Race Condition Prevention)

1. Socket receives driver:accept-ride
2. Lua script runs atomically in Redis:
   - Check ride status == "pending"
   - If yes: set status = "accepted", set driver
   - If no: return error (already claimed)
3. On success: POST /rides/{id}/driver-accept to persist
4. On failure: Emit error to driver

### 6.3 GPS Tracking

1. Driver emits driver:location-update every 50m
2. Server stores in Redis GEO (GEOADD driver:location)
3. Server broadcasts ride:location to rider room
4. Rider sees driver marker move on map

---

## 7. Rate Limiting

| Resource | Limit | Window |
|----------|-------|--------|
| Events per socket | 60 | 1 minute |
| Location updates | Unrestricted | - |
| Chat messages | 30 | 1 minute |

---

## 8. Reconnection Strategy

| Attempt | Delay | Max |
|---------|-------|-----|
| 1 | 1s | - |
| 2 | 2s | - |
| 3 | 4s | - |
| 4 | 8s | - |
| 5+ | 30s | 30s |

On reconnect: Re-authenticate, rejoin rooms, resume listeners.

---

## 9. Failure Scenarios

| Failure | Impact | Recovery |
|---------|--------|----------|
| Socket server down | All real-time broken | Restart server |
| Redis down | Events lost, GEO queries fail | Restart Redis |
| Token expired mid-session | Connection rejected | Re-login |
| Network drop | Client disconnects | Auto-reconnect |
| Room not joined | Events not received | Rejoin on reconnect |

---

## 10. Known Gaps

1. No message acknowledgment (fire-and-forget)
2. No event ordering guarantee
3. No message persistence (chat messages in Redis only, 24h TTL)
4. No typing indicator timeout (user must explicitly stop)
5. Socket server not in docker-compose (separate deployment)
