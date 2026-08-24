const geoService = require('../services/geo');
const { dataClient } = require('../services/redis');
const config = require('../config');
const {
  createRideInfo,
  updateRideInfo,
  clearRideDriver,
  isParticipant,
  isDriver,
  isRideActive,
  isRideInProgress,
  logSecurityEvent,
  validateRideId,
  validateCoordinates,
} = require('../middleware/authorize');

const apiBaseUrl = config.appApiBaseUrl.replace(/\/$/, '');

async function callApi(method, path, token, body) {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { ok: false, status: response.status, body: text };
    }
    return { ok: true, data: await response.json() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = function registerRideHandlers(socket, io) {
  const { userId, role } = socket.data;

  socket.on('rider:book-ride', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { rideId, pickup, destination, category, fare } = data;

      if (!rideId || !pickup || !destination) {
        return socket.emit('error', { message: 'Missing required fields' });
      }

      if (!validateRideId(rideId)) {
        return socket.emit('error', { message: 'Invalid ride ID format' });
      }

      if (
        !pickup ||
        typeof pickup.lat !== 'number' ||
        typeof pickup.lng !== 'number'
      ) {
        return socket.emit('error', { message: 'Invalid pickup coordinates' });
      }

      if (
        !validateCoordinates(pickup.lat, pickup.lng) ||
        !validateCoordinates(destination.lat, destination.lng)
      ) {
        return socket.emit('error', { message: 'Invalid coordinates' });
      }

      if (category && typeof category === 'string' && category.length > 50) {
        return socket.emit('error', { message: 'Invalid category' });
      }

      if (fare !== undefined && fare !== null && fare !== '') {
        const fareNum = parseFloat(fare);
        if (isNaN(fareNum) || fareNum < 0 || fareNum > 100000) {
          return socket.emit('error', { message: 'Invalid fare' });
        }
      }

      if (role !== 'rider') {
        logSecurityEvent('BOOK_RIDE_WRONG_ROLE', socket, { rideId, role });
        return socket.emit('error', { message: 'Only riders can book rides' });
      }

      await createRideInfo(rideId, userId);

      await dataClient.hset(`ride:pending:${rideId}`, {
        rider_id: userId,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_address: pickup.address || '',
        dropoff_lat: destination.lat,
        dropoff_lng: destination.lng,
        dropoff_address: destination.address || '',
        category: category || 'standard',
        fare: fare || '',
        created_at: Date.now().toString(),
      });

      await dataClient.expire(`ride:pending:${rideId}`, 300);

      console.log(
        `[Ride] user=${userId} booked ride=${rideId} cat=${category || 'standard'}`
      );

      const nearbyDrivers = await geoService.findNearbyDrivers(
        pickup.lat,
        pickup.lng,
      );

      let notified = 0;
      for (const driver of nearbyDrivers) {
        io.to(`driver:${driver.driverId}`).emit('ride:request', {
          rideId,
          pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.address },
          destination: {
            lat: destination.lat,
            lng: destination.lng,
            address: destination.address,
          },
          category: category || 'standard',
          fare,
          riderId: userId,
          distance: driver.distance,
        });
        notified++;
      }

      socket.emit('ride:broadcast-complete', {
        rideId,
        driversNotified: notified,
      });
    } catch (err) {
      console.error(`[Ride:${userId}] book-ride error:`, err.message);
      socket.emit('error', { message: 'Failed to broadcast ride request' });
    }
  });

  const CLAIM_RIDE_LUA = `
    if redis.call("SET", KEYS[1], ARGV[1], "NX", "EX", ARGV[2]) then
      return 1
    else
      return 0
    end
  `;

  socket.on('driver:accept-ride', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { rideId, riderId } = data;

      if (!rideId || !riderId) {
        return socket.emit('error', { message: 'Missing rideId or riderId' });
      }

      if (!validateRideId(rideId)) {
        return socket.emit('error', { message: 'Invalid ride ID format' });
      }

      if (typeof riderId !== 'string' || riderId.length > 64) {
        return socket.emit('error', { message: 'Invalid riderId' });
      }

      if (role !== 'driver') {
        logSecurityEvent('ACCEPT_RIDE_WRONG_ROLE', socket, {
          rideId,
          riderId,
          role,
        });
        return socket.emit('error', {
          message: 'Only drivers can accept rides',
        });
      }

      const claimKey = `ride:claim:${rideId}`;
      const claimed = await dataClient.eval(
        CLAIM_RIDE_LUA,
        1,
        claimKey,
        userId,
        30
      );

      if (claimed !== 1) {
        return socket.emit('error', {
          message: 'Ride already accepted by another driver',
          code: 'RIDE_ALREADY_CLAIMED',
        });
      }

      await updateRideInfo(rideId, { driver_id: userId, status: 'claimed' });

      const apiResult = await callApi(
        'POST',
        `/api/v1/rides/${rideId}/driver-accept`,
        socket.data.token
      );
      if (!apiResult.ok) {
        console.error(
          `[Ride:${userId}] accept API error:`,
          apiResult.status || apiResult.error
        );
        await dataClient.del(claimKey).catch(() => {});
        await clearRideDriver(rideId).catch(() => {});
        socket.emit('error', {
          message: 'Failed to persist ride acceptance',
          code: 'ACCEPT_PERSIST_FAILED',
        });
        return;
      }

      try {
        await dataClient.del(`ride:pending:${rideId}`);
      } catch (delErr) {
        console.error(
          `[Ride:${userId}] failed to clear pending key:`,
          delErr.message
        );
      }

      socket.join(`ride:${rideId}`);
      socket.data.currentRideId = rideId;

      console.log(
        `[Ride] driver=${userId} accepted ride=${rideId} rider=${riderId}`
      );

      io.to(`user:${riderId}`).emit('ride:accepted', {
        rideId,
        driverId: userId,
        timestamp: Date.now(),
      });

      io.to('admin').emit('ride:status-change', {
        rideId,
        status: 'accepted',
        driverId: userId,
        riderId,
      });
    } catch (err) {
      console.error(`[Ride:${userId}] accept-ride error:`, err.message);
      socket.emit('error', { message: 'Failed to accept ride' });
    }
  });

  socket.on('driver:arrived', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { rideId, riderId } = data;

      if (!rideId || !riderId) {
        return socket.emit('error', {
          message: 'Missing rideId or riderId',
        });
      }

      if (!validateRideId(rideId)) {
        return socket.emit('error', { message: 'Invalid ride ID format' });
      }

      if (role !== 'driver') {
        logSecurityEvent('DRIVER_ARRIVED_WRONG_ROLE', socket, { rideId, role });
        return socket.emit('error', { message: 'Only drivers can signal arrival' });
      }

      const participant = await isParticipant(userId, rideId);
      if (!participant) {
        logSecurityEvent('DRIVER_ARRIVED_NOT_PARTICIPANT', socket, { rideId });
        return socket.emit('error', { message: 'Not a participant of this ride' });
      }

      const apiResult = await callApi(
        'POST',
        `/api/v1/rides/${rideId}/driver-arrived`,
        socket.data.token
      );
      if (!apiResult.ok) {
        console.error(
          `[Ride:${userId}] arrived API error:`,
          apiResult.status || apiResult.error
        );
        socket.emit('error', {
          message: 'Failed to persist driver arrival',
        });
        return;
      }

      io.to(`user:${riderId}`).emit('ride:arrived', {
        rideId,
        driverId: userId,
        timestamp: Date.now(),
      });

      io.to('admin').emit('ride:status-change', {
        rideId,
        status: 'arrived',
        driverId: userId,
        riderId,
      });
    } catch (err) {
      console.error(`[Ride:${userId}] arrived error:`, err.message);
      socket.emit('error', { message: 'Failed to notify arrival' });
    }
  });

  socket.on('ride:start', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { rideId, otherUserId } = data;

      if (!rideId || !otherUserId) {
        return socket.emit('error', {
          message: 'Missing rideId or otherUserId',
        });
      }

      if (!validateRideId(rideId)) {
        return socket.emit('error', { message: 'Invalid ride ID format' });
      }

      if (typeof otherUserId !== 'string' || otherUserId.length > 64) {
        return socket.emit('error', { message: 'Invalid otherUserId' });
      }

      const participant = await isParticipant(userId, rideId);
      if (!participant) {
        logSecurityEvent('RIDE_START_NOT_PARTICIPANT', socket, { rideId });
        return socket.emit('error', { message: 'Not a participant of this ride' });
      }

      await updateRideInfo(rideId, { status: 'in_progress' });

      const apiResult = await callApi(
        'POST',
        `/api/v1/rides/${rideId}/start`,
        socket.data.token
      );
      if (!apiResult.ok) {
        console.error(
          `[Ride:${userId}] start API error:`,
          apiResult.status || apiResult.error
        );
        socket.emit('error', { message: 'Failed to persist ride start' });
        return;
      }

      console.log(`[Ride] ride=${rideId} started by user=${userId}`);

      io.to(`user:${otherUserId}`).emit('ride:started', {
        rideId,
        [role === 'driver' ? 'driverId' : 'riderId']: userId,
        timestamp: Date.now(),
      });

      io.to('admin').emit('ride:status-change', {
        rideId,
        status: 'in_progress',
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(`[Ride:${userId}] start error:`, err.message);
      socket.emit('error', { message: 'Failed to start ride' });
    }
  });

  socket.on('ride:complete', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { rideId, otherUserId, fare } = data;

      if (!rideId || !otherUserId) {
        return socket.emit('error', {
          message: 'Missing rideId or otherUserId',
        });
      }

      if (!validateRideId(rideId)) {
        return socket.emit('error', { message: 'Invalid ride ID format' });
      }

      const participant = await isParticipant(userId, rideId);
      if (!participant) {
        logSecurityEvent('RIDE_COMPLETE_NOT_PARTICIPANT', socket, { rideId });
        return socket.emit('error', { message: 'Not a participant of this ride' });
      }

      if (fare !== undefined && fare !== null) {
        const fareNum = parseFloat(fare);
        if (isNaN(fareNum) || fareNum < 0 || fareNum > 100000) {
          return socket.emit('error', { message: 'Invalid fare' });
        }
      }

      await updateRideInfo(rideId, { status: 'completed' });

      const apiResult = await callApi(
        'POST',
        `/api/v1/rides/${rideId}/complete`,
        socket.data.token
      );
      if (!apiResult.ok) {
        console.error(
          `[Ride:${userId}] complete API error:`,
          apiResult.status || apiResult.error
        );
        socket.emit('error', {
          message: 'Failed to persist ride completion',
        });
        return;
      }

      console.log(`[Ride] ride=${rideId} completed by user=${userId}`);

      io.to(`user:${otherUserId}`).emit('ride:completed', {
        rideId,
        [role === 'driver' ? 'driverId' : 'riderId']: userId,
        fare,
        timestamp: Date.now(),
      });

      io.to('admin').emit('ride:status-change', {
        rideId,
        status: 'completed',
        fare,
        timestamp: Date.now(),
      });

      socket.leave(`ride:${rideId}`);
      socket.data.currentRideId = null;
    } catch (err) {
      console.error(`[Ride:${userId}] complete error:`, err.message);
      socket.emit('error', { message: 'Failed to complete ride' });
    }
  });

  socket.on('ride:cancel', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { rideId, otherUserId, reason } = data;

      if (!rideId || !otherUserId) {
        return socket.emit('error', {
          message: 'Missing rideId or otherUserId',
        });
      }

      if (!validateRideId(rideId)) {
        return socket.emit('error', { message: 'Invalid ride ID format' });
      }

      const participant = await isParticipant(userId, rideId);
      if (!participant) {
        logSecurityEvent('RIDE_CANCEL_NOT_PARTICIPANT', socket, { rideId });
        return socket.emit('error', { message: 'Not a participant of this ride' });
      }

      if (reason !== undefined && reason !== null && typeof reason === 'string' && reason.length > 500) {
        return socket.emit('error', { message: 'Reason too long (max 500 chars)' });
      }

      await updateRideInfo(rideId, { status: 'cancelled' });

      const apiResult = await callApi(
        'POST',
        `/api/v1/rides/${rideId}/cancel`,
        socket.data.token,
        {
          cancellation_reason: reason || 'Cancelled via app',
        }
      );
      if (!apiResult.ok) {
        console.error(
          `[Ride:${userId}] cancel API error:`,
          apiResult.status || apiResult.error
        );
        socket.emit('error', {
          message: 'Failed to persist ride cancellation',
        });
        return;
      }

      await dataClient.del(`ride:pending:${rideId}`);

      console.log(
        `[Ride] ride=${rideId} cancelled by user=${userId} reason=${reason || ''}`
      );

      io.to(`user:${otherUserId}`).emit('ride:cancelled', {
        rideId,
        cancelledBy: userId,
        reason: reason || '',
        timestamp: Date.now(),
      });

      io.to('admin').emit('ride:status-change', {
        rideId,
        status: 'cancelled',
        cancelledBy: userId,
        reason,
        timestamp: Date.now(),
      });

      socket.leave(`ride:${rideId}`);
      socket.data.currentRideId = null;
    } catch (err) {
      console.error(`[Ride:${userId}] cancel error:`, err.message);
      socket.emit('error', { message: 'Failed to cancel ride' });
    }
  });

  socket.on('ride:send-location', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { rideId, latitude, longitude } = data;

      if (!rideId) {
        return socket.emit('error', { message: 'Missing rideId' });
      }

      if (!validateRideId(rideId)) {
        return socket.emit('error', { message: 'Invalid ride ID format' });
      }

      if (!validateCoordinates(latitude, longitude)) {
        logSecurityEvent('INVALID_LOCATION_DATA', socket, {
          rideId,
          latitude,
          longitude,
        });
        return socket.emit('error', { message: 'Invalid coordinates' });
      }

      if (role !== 'driver') {
        logSecurityEvent('SEND_LOCATION_WRONG_ROLE', socket, {
          rideId,
          role,
        });
        return socket.emit('error', {
          message: 'Only drivers can send location updates',
        });
      }

      const rideIsDriver = await isDriver(userId, rideId);
      if (!rideIsDriver) {
        logSecurityEvent('SEND_LOCATION_NOT_DRIVER', socket, { rideId });
        return socket.emit('error', {
          message: 'You are not the driver of this ride',
        });
      }

      const rideInProgress = await isRideInProgress(rideId);
      if (!rideInProgress) {
        logSecurityEvent('SEND_LOCATION_RIDE_NOT_IN_PROGRESS', socket, {
          rideId,
        });
        return socket.emit('error', {
          message: 'Ride is not in progress',
        });
      }

      io.to(`ride:${rideId}`).emit('ride:location-update', {
        userId,
        latitude,
        longitude,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(`[Ride:${userId}] send-location error:`, err.message);
    }
  });

  socket.on('join:ride', async (rideId) => {
    try {
      if (!validateRideId(rideId)) {
        logSecurityEvent('JOIN_RIDE_INVALID_ID', socket, { rideId });
        return socket.emit('error', { message: 'Invalid ride ID format' });
      }

      const participant = await isParticipant(userId, rideId);
      if (!participant) {
        logSecurityEvent('JOIN_RIDE_NOT_PARTICIPANT', socket, { rideId });
        return socket.emit('error', {
          message: 'You are not a participant of this ride',
        });
      }

      socket.join(`ride:${rideId}`);

      console.log(
        `[Ride] user=${userId} (${role}) joined ride room=${rideId}`
      );

      const messages = await dataClient.lrange(`chat:${rideId}`, 0, 49);
      const parsed = messages.map((m) => JSON.parse(m)).reverse();
      socket.emit('chat:history', { rideId, messages: parsed });
    } catch (err) {
      console.error(`[Ride:${userId}] join-ride error:`, err.message);
    }
  });

  socket.on('leave:ride', (rideId) => {
    if (!validateRideId(rideId)) {
      return;
    }

    socket.leave(`ride:${rideId}`);
  });
};
