const { dataClient } = require('../services/redis');
const {
  isParticipant,
  isRideActive,
  logSecurityEvent,
  validateRideId,
} = require('../middleware/authorize');

const CHAT_MAX_LENGTH = 100;
const CHAT_MAX_LENGTH_MS = 24 * 60 * 60 * 1000;

module.exports = function registerChatHandlers(socket, io) {
  const { userId } = socket.data;

  socket.on('chat:send', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const { rideId, message, receiverId } = data;

      if (!rideId || !message || !receiverId) {
        return socket.emit('error', {
          message: 'Missing rideId, message, or receiverId',
        });
      }

      if (!validateRideId(rideId)) {
        return socket.emit('error', { message: 'Invalid ride ID format' });
      }

      if (typeof receiverId !== 'string' || receiverId.length > 64) {
        return socket.emit('error', { message: 'Invalid receiverId' });
      }

      if (
        typeof message !== 'string' ||
        message.trim().length === 0 ||
        message.length > 1000
      ) {
        return socket.emit('error', { message: 'Invalid message content' });
      }

      const participant = await isParticipant(userId, rideId);
      if (!participant) {
        logSecurityEvent('CHAT_SEND_NOT_PARTICIPANT', socket, {
          rideId,
          receiverId,
        });
        return socket.emit('error', {
          message: 'You are not a participant of this ride',
        });
      }

      const rideActive = await isRideActive(rideId);
      if (!rideActive) {
        logSecurityEvent('CHAT_SEND_RIDE_NOT_ACTIVE', socket, { rideId });
        return socket.emit('error', {
          message: 'Ride is not active',
        });
      }

      const sanitized = message.trim()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const msg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        rideId,
        senderId: userId,
        receiverId,
        message: sanitized,
        timestamp: new Date().toISOString(),
      };

      await dataClient.lpush(`chat:${rideId}`, JSON.stringify(msg));
      await dataClient.ltrim(`chat:${rideId}`, 0, CHAT_MAX_LENGTH - 1);
      await dataClient.expire(
        `chat:${rideId}`,
        Math.floor(CHAT_MAX_LENGTH_MS / 1000)
      );

      io.to(`ride:${rideId}`).emit('chat:message', msg);
    } catch (err) {
      console.error(`[Chat:${userId}] send error:`, err.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('chat:typing', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return;
      }

      const { rideId, receiverId } = data;

      if (!rideId || !receiverId) return;

      if (!validateRideId(rideId)) return;

      const participant = await isParticipant(userId, rideId);
      if (!participant) return;

      io.to(`user:${receiverId}`).emit('chat:typing', {
        rideId,
        userId,
        isTyping: true,
      });
    } catch (err) {
      console.error(`[Chat:${userId}] typing error:`, err.message);
    }
  });

  socket.on('chat:stop-typing', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return;
      }

      const { rideId, receiverId } = data;

      if (!rideId || !receiverId) return;

      if (!validateRideId(rideId)) return;

      const participant = await isParticipant(userId, rideId);
      if (!participant) return;

      io.to(`user:${receiverId}`).emit('chat:typing', {
        rideId,
        userId,
        isTyping: false,
      });
    } catch (err) {
      console.error(`[Chat:${userId}] stop-typing error:`, err.message);
    }
  });
};
