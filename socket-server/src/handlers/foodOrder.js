const { dataClient } = require('../services/redis');
const { logSecurityEvent } = require('../middleware/authorize');

function validateOrderId(orderId) {
  return (
    typeof orderId === 'string' &&
    orderId.length > 0 &&
    orderId.length <= 64 &&
    /^[a-zA-Z0-9_-]+$/.test(orderId)
  );
}

module.exports = function registerFoodOrderHandlers(socket, io) {
  const { userId, role } = socket.data;

  socket.on('food-order:join', async (orderId) => {
    try {
      if (!validateOrderId(orderId)) {
        logSecurityEvent('FOOD_ORDER_JOIN_INVALID_ID', socket, { orderId });
        return socket.emit('error', { message: 'Invalid order ID format' });
      }

      socket.join(`food-order:${orderId}`);
    } catch (err) {
      console.error(`[FoodOrder:${userId}] join error:`, err.message);
    }
  });

  socket.on('food-order:leave', (orderId) => {
    if (!validateOrderId(orderId)) return;
    socket.leave(`food-order:${orderId}`);
  });

  socket.on('restaurant:new-order', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { orderId, restaurantId } = data;

      if (!orderId || !restaurantId) {
        return socket.emit('error', {
          message: 'Missing orderId or restaurantId',
        });
      }

      if (!validateOrderId(orderId)) {
        return socket.emit('error', { message: 'Invalid order ID format' });
      }

      if (
        typeof restaurantId !== 'string' ||
        restaurantId.length > 64
      ) {
        return socket.emit('error', { message: 'Invalid restaurantId' });
      }

      io.to(`restaurant:${restaurantId}`).emit('food-order:new', {
        orderId,
        restaurantId,
        timestamp: Date.now(),
      });

      io.to('admin').emit('food-order:new', {
        orderId,
        restaurantId,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(
        `[FoodOrder:${userId}] restaurant:new-order error:`,
        err.message
      );
    }
  });

  socket.on('food-order:status-update', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { orderId, status, customerId, driverId } = data;

      if (!orderId || !status) {
        return socket.emit('error', {
          message: 'Missing orderId or status',
        });
      }

      if (!validateOrderId(orderId)) {
        return socket.emit('error', { message: 'Invalid order ID format' });
      }

      if (typeof status !== 'string' || status.length > 50) {
        return socket.emit('error', { message: 'Invalid status' });
      }

      io.to(`food-order:${orderId}`).emit('food-order:status', {
        orderId,
        status,
        timestamp: Date.now(),
      });

      if (customerId) {
        io.to(`user:${customerId}`).emit('food-order:status', {
          orderId,
          status,
          timestamp: Date.now(),
        });
      }

      if (driverId) {
        io.to(`user:${driverId}`).emit('food-order:status', {
          orderId,
          status,
          timestamp: Date.now(),
        });
      }

      io.to('admin').emit('food-order:status', {
        orderId,
        status,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(
        `[FoodOrder:${userId}] status-update error:`,
        err.message
      );
    }
  });

  socket.on('food-order:driver-location', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { orderId, latitude, longitude } = data;

      if (!orderId) return;

      if (!validateOrderId(orderId)) return;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return socket.emit('error', { message: 'Invalid coordinates' });
      }

      if (
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180
      ) {
        return socket.emit('error', { message: 'Coordinates out of range' });
      }

      io.to(`food-order:${orderId}`).emit('food-order:location', {
        driverId: userId,
        latitude,
        longitude,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(
        `[FoodOrder:${userId}] driver-location error:`,
        err.message
      );
    }
  });

  socket.on('food-order:driver-assigned', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { orderId, customerId, driverId } = data;

      if (!orderId || !customerId) {
        return socket.emit('error', {
          message: 'Missing orderId or customerId',
        });
      }

      if (!validateOrderId(orderId)) {
        return socket.emit('error', { message: 'Invalid order ID format' });
      }

      io.to(`user:${customerId}`).emit('food-order:driver-coming', {
        orderId,
        driverId,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(
        `[FoodOrder:${userId}] driver-assigned error:`,
        err.message
      );
    }
  });
};
