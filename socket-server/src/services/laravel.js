const { relayClient } = require('./redis');

let ioRef = null;

function parseChannelName(channel) {
  const stripped = channel.replace(/^laravel_database_/, '');

  if (stripped.includes('user:')) {
    const match = stripped.match(/user:(.+)/);
    return match ? { type: 'user', id: match[1] } : null;
  }
  if (stripped.includes('driver:')) {
    const match = stripped.match(/driver:(.+)/);
    return match ? { type: 'driver', id: match[1] } : null;
  }
  if (stripped.includes('ride:')) {
    const match = stripped.match(/ride:(.+)/);
    return match ? { type: 'ride', id: match[1] } : null;
  }
  if (stripped.includes('delivery:')) {
    const match = stripped.match(/delivery:(.+)/);
    return match ? { type: 'delivery', id: match[1] } : null;
  }
  if (stripped.includes('admin')) {
    return { type: 'admin', id: null };
  }

  return null;
}

function resolveRoom(parsed) {
  if (!parsed) return null;
  switch (parsed.type) {
    case 'user':
    case 'driver':
    case 'ride':
    case 'delivery':
      return `${parsed.type}:${parsed.id}`;
    case 'admin':
      return 'admin';
    default:
      return null;
  }
}

module.exports = {
  init(io) {
    ioRef = io;

    async function waitReady(client) {
      if (client.status === 'ready') return;
      return new Promise((resolve) => {
        client.once('ready', resolve);
      });
    }

    async function startRelay() {
      await waitReady(relayClient);
      console.log('[LaravelRelay] relayClient is READY, subscribing...');
      relayClient.psubscribe('laravel_database_*', (err) => {
        if (err) {
          console.error('[LaravelRelay] psubscribe error:', err.message);
        } else {
          console.log('[LaravelRelay] Subscribed to Laravel broadcasts (dedicated relay connection)');
        }
      });
    }

    startRelay();

    relayClient.on('pmessage', (_pattern, channel, message) => {
      const channelStr = String(channel);
      const msgStr = String(message);
      console.log('[LaravelRelay] RAW pmessage on channel:', channelStr.substring(0, 80), 'msg len:', msgStr.length);
      try {
        const parsed = JSON.parse(msgStr);
        const eventName = parsed.event;
        const eventData = parsed.data;

        if (!eventName || !ioRef) {
          console.log('[LaravelRelay] SKIP: eventName=', eventName, 'ioRef=', !!ioRef);
          return;
        }

        const channelInfo = parseChannelName(channelStr);
        const room = resolveRoom(channelInfo);
        console.log('[LaravelRelay] EMITTING', eventName, 'to room:', room, 'data keys:', Object.keys(eventData || {}));

        if (room) {
          const parts = room.split(':');
          const targetUserId = parts[1];
          const targetSocket = ioRef.connectedSockets?.get(targetUserId);
          if (targetSocket && targetSocket.connected) {
            targetSocket.emit(eventName, eventData);
            console.log('[LaravelRelay] DIRECT EMIT OK to', targetUserId, 'event:', eventName);
          } else {
            console.log('[LaravelRelay] Socket not found for', targetUserId, '- falling back to room emit');
            ioRef.to(room).emit(eventName, eventData);
            console.log('[LaravelRelay] ROOM EMIT OK');
          }
        } else {
          console.log('[LaravelRelay] SKIP: no room for channel', channelStr.substring(0, 60));
        }
      } catch (err) {
        console.error('[LaravelRelay] Parse error:', err.message, 'raw:', msgStr.substring(0, 100));
      }
    });
  },
};
