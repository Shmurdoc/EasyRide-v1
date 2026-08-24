const geoService = require('../services/geo');
const { logSecurityEvent } = require('../middleware/authorize');

function validateDeliveryId(deliveryId) {
  return (
    typeof deliveryId === 'string' &&
    deliveryId.length > 0 &&
    deliveryId.length <= 64 &&
    /^[a-zA-Z0-9_-]+$/.test(deliveryId)
  );
}

module.exports = function registerDeliveryHandlers(socket, io) {
  const { userId } = socket.data;

  socket.on('rider:request-delivery', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { deliveryId, pickup, destination, description } = data;

      if (!deliveryId || !pickup || !destination) {
        return socket.emit('error', { message: 'Missing required fields' });
      }

      if (!validateDeliveryId(deliveryId)) {
        return socket.emit('error', {
          message: 'Invalid delivery ID format',
        });
      }

      if (
        !pickup ||
        typeof pickup.lat !== 'number' ||
        typeof pickup.lng !== 'number'
      ) {
        return socket.emit('error', {
          message: 'Invalid pickup coordinates',
        });
      }

      if (
        pickup.lat < -90 || pickup.lat > 90 ||
        pickup.lng < -180 || pickup.lng > 180
      ) {
        return socket.emit('error', {
          message: 'Pickup coordinates out of range',
        });
      }

      if (
        !destination ||
        typeof destination.lat !== 'number' ||
        typeof destination.lng !== 'number'
      ) {
        return socket.emit('error', {
          message: 'Invalid destination coordinates',
        });
      }

      if (
        destination.lat < -90 || destination.lat > 90 ||
        destination.lng < -180 || destination.lng > 180
      ) {
        return socket.emit('error', {
          message: 'Destination coordinates out of range',
        });
      }

      const nearbyDrivers = await geoService.findNearbyDrivers(
        pickup.lat,
        pickup.lng,
      );

      let notified = 0;
      for (const driver of nearbyDrivers) {
        io.to(`driver:${driver.driverId}`).emit('delivery:request', {
          deliveryId,
          pickup: {
            lat: pickup.lat,
            lng: pickup.lng,
            address: pickup.address,
          },
          destination: {
            lat: destination.lat,
            lng: destination.lng,
            address: destination.address,
          },
          description: description || '',
          senderId: userId,
          distance: driver.distance,
        });
        notified++;
      }

      socket.emit('delivery:broadcast-complete', {
        deliveryId,
        driversNotified: notified,
      });
    } catch (err) {
      console.error(`[Delivery:${userId}] request error:`, err.message);
      socket.emit('error', {
        message: 'Failed to broadcast delivery request',
      });
    }
  });

  socket.on('driver:accept-delivery', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { deliveryId, senderId } = data;

      if (!deliveryId || !senderId) {
        return socket.emit('error', {
          message: 'Missing deliveryId or senderId',
        });
      }

      if (!validateDeliveryId(deliveryId)) {
        return socket.emit('error', {
          message: 'Invalid delivery ID format',
        });
      }

      if (typeof senderId !== 'string' || senderId.length > 64) {
        return socket.emit('error', { message: 'Invalid senderId' });
      }

      socket.join(`delivery:${deliveryId}`);

      io.to(`user:${senderId}`).emit('delivery:accepted', {
        deliveryId,
        driverId: userId,
        timestamp: Date.now(),
      });

      io.to('admin').emit('delivery:status-change', {
        deliveryId,
        status: 'accepted',
        driverId: userId,
        senderId,
      });
    } catch (err) {
      console.error(`[Delivery:${userId}] accept error:`, err.message);
      socket.emit('error', { message: 'Failed to accept delivery' });
    }
  });

  socket.on('driver:delivery-status', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { deliveryId, senderId, status } = data;

      if (!deliveryId || !status) {
        return socket.emit('error', {
          message: 'Missing deliveryId or status',
        });
      }

      if (!validateDeliveryId(deliveryId)) {
        return socket.emit('error', {
          message: 'Invalid delivery ID format',
        });
      }

      if (typeof status !== 'string' || status.length > 50) {
        return socket.emit('error', { message: 'Invalid status' });
      }

      io.to(`user:${senderId}`).emit('delivery:status', {
        deliveryId,
        status,
        driverId: userId,
        timestamp: Date.now(),
      });

      io.to('admin').emit('delivery:status-change', {
        deliveryId,
        status,
        driverId: userId,
        senderId,
        timestamp: Date.now(),
      });

      if (status === 'delivered') {
        socket.leave(`delivery:${deliveryId}`);
      }
    } catch (err) {
      console.error(`[Delivery:${userId}] status error:`, err.message);
      socket.emit('error', {
        message: 'Failed to update delivery status',
      });
    }
  });

  socket.on('driver:delivery-location', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { deliveryId, latitude, longitude } = data;

      if (!deliveryId) return;

      if (!validateDeliveryId(deliveryId)) return;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return socket.emit('error', { message: 'Invalid coordinates' });
      }

      if (
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180
      ) {
        return socket.emit('error', {
          message: 'Coordinates out of range',
        });
      }

      io.to(`delivery:${deliveryId}`).emit('delivery:location', {
        driverId: userId,
        latitude,
        longitude,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(
        `[Delivery:${userId}] location error:`,
        err.message
      );
    }
  });
};
