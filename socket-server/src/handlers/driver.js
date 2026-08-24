const geoService = require('../services/geo');
const { isDriver, logSecurityEvent, validateRideId, validateCoordinates } = require('../middleware/authorize');

module.exports = function registerDriverHandlers(socket, io) {
  const { userId } = socket.data;

  socket.on('driver:location-update', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { rideId, latitude, longitude } = data;

      if (!validateCoordinates(latitude, longitude)) {
        return socket.emit('error', { message: 'Invalid coordinates' });
      }

      await geoService.updateDriverLocation(userId, latitude, longitude);

      if (rideId) {
        if (!validateRideId(rideId)) {
          return socket.emit('error', { message: 'Invalid ride ID format' });
        }

        const rideIsDriver = await isDriver(userId, rideId);
        if (!rideIsDriver) {
          logSecurityEvent('DRIVER_LOCATION_NOT_DRIVER_OF_RIDE', socket, {
            rideId,
          });
          return socket.emit('error', {
            message: 'You are not the driver of this ride',
          });
        }

        io.to(`ride:${rideId}`).emit('driver:location', {
          driverId: userId,
          latitude,
          longitude,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error(`[Driver:${userId}] location-update error:`, err.message);
      socket.emit('error', { message: 'Failed to update location' });
    }
  });

  socket.on('driver:toggle-online', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { isOnline } = data;

      if (typeof isOnline !== 'boolean') {
        return socket.emit('error', {
          message: 'isOnline must be a boolean',
        });
      }

      if (isOnline) {
        const loc = await geoService.getDriverLocation(userId);
        if (loc) {
          await geoService.updateDriverLocation(
            userId,
            loc.latitude,
            loc.longitude
          );
        }
        socket.data.isOnline = true;
      } else {
        await geoService.removeDriverLocation(userId);
        socket.data.isOnline = false;
      }

      socket.emit('driver:online-status', { isOnline: !!isOnline });
    } catch (err) {
      console.error(
        `[Driver:${userId}] toggle-online error:`,
        err.message
      );
      socket.emit('error', {
        message: 'Failed to toggle online status',
      });
    }
  });

  socket.on('driver:nearby-requests', async () => {
    try {
      const loc = await geoService.getDriverLocation(userId);
      if (!loc) {
        return socket.emit('driver:nearby-requests:result', { rides: [] });
      }

      const { dataClient } = require('../services/redis');
      const { scanKeys } = require('../utils/scanKeys');
      const rideKeys = await scanKeys(dataClient, 'ride:pending:*');
      const rides = [];

      for (const key of rideKeys.slice(0, 20)) {
        try {
          const rideData = await dataClient.hgetall(key);
          if (rideData && rideData.pickup_lat && rideData.pickup_lng) {
            rides.push({
              rideId: key.replace('ride:pending:', ''),
              pickup_lat: parseFloat(rideData.pickup_lat),
              pickup_lng: parseFloat(rideData.pickup_lng),
              category: rideData.category || 'standard',
              rider_id: rideData.rider_id,
            });
          }
        } catch (_) {
          console.warn(
            `[Driver:${userId}] Failed to fetch ride data for key=${key}:`,
            _.message
          );
        }
      }

      socket.emit('driver:nearby-requests:result', { rides });
    } catch (err) {
      console.error(
        `[Driver:${userId}] nearby-requests error:`,
        err.message
      );
      socket.emit('error', {
        message: 'Failed to fetch nearby requests',
      });
    }
  });

  socket.on('disconnect', async () => {
    try {
      if (socket.data.isOnline) {
        await geoService.removeDriverLocation(userId);
      }
    } catch (err) {
      console.error(
        `[Driver:${userId}] disconnect cleanup error:`,
        err.message
      );
    }
  });
};
