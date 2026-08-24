const { dataClient } = require('../services/redis');

const RIDE_INFO_KEY = 'ride:info:';
const RIDE_INFO_TTL = 86400;

async function getRideInfo(rideId) {
  const key = RIDE_INFO_KEY + rideId;
  const info = await dataClient.hgetall(key);
  if (!info || !info.rider_id) return null;
  return info;
}

async function getRideParticipantInfo(rideId) {
  const info = await getRideInfo(rideId);
  if (info) return info;

  const pendingKey = `ride:pending:${rideId}`;
  const claimKey = `ride:claim:${rideId}`;

  const [pending, driverId] = await Promise.all([
    dataClient.hgetall(pendingKey),
    dataClient.get(claimKey),
  ]);

  if (!pending && !driverId) return null;

  return {
    rider_id: pending?.rider_id || null,
    driver_id: driverId || null,
    status: driverId ? 'claimed' : 'pending',
  };
}

async function isRider(userId, rideId) {
  const info = await getRideParticipantInfo(rideId);
  return info && info.rider_id === String(userId);
}

async function isDriver(userId, rideId) {
  const info = await getRideParticipantInfo(rideId);
  return info && info.driver_id === String(userId);
}

async function isParticipant(userId, rideId) {
  const info = await getRideParticipantInfo(rideId);
  if (!info) return false;
  return info.rider_id === String(userId) || info.driver_id === String(userId);
}

async function isRideActive(rideId) {
  const info = await getRideInfo(rideId);
  if (info) return info.status === 'claimed' || info.status === 'in_progress';

  const claimKey = `ride:claim:${rideId}`;
  const driverId = await dataClient.get(claimKey);
  return !!driverId;
}

async function isRideInProgress(rideId) {
  const info = await getRideInfo(rideId);
  if (info) return info.status === 'in_progress';

  return false;
}

async function updateRideInfo(rideId, fields) {
  const key = RIDE_INFO_KEY + rideId;
  const updates = { updated_at: Date.now().toString() };
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) {
      updates[k] = String(v);
    }
  }
  await dataClient.hset(key, updates);
  await dataClient.expire(key, RIDE_INFO_TTL);
}

async function clearRideDriver(rideId) {
  const key = RIDE_INFO_KEY + rideId;
  await dataClient.hdel(key, 'driver_id');
  await updateRideInfo(rideId, { status: 'pending' });
}

async function createRideInfo(rideId, riderId) {
  await updateRideInfo(rideId, { rider_id: riderId, status: 'pending' });
}

function logSecurityEvent(event, socket, details) {
  const { userId, role } = socket.data;
  console.warn(
    `[SECURITY] ${event} | user=${userId} role=${role} sid=${socket.id} ${JSON.stringify(details)}`
  );
}

function validateRideId(rideId) {
  return (
    typeof rideId === 'string' &&
    rideId.length > 0 &&
    rideId.length <= 64 &&
    /^[a-zA-Z0-9_-]+$/.test(rideId)
  );
}

function validateCoordinates(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}

module.exports = {
  getRideInfo,
  isRider,
  isDriver,
  isParticipant,
  isRideActive,
  isRideInProgress,
  updateRideInfo,
  createRideInfo,
  clearRideDriver,
  logSecurityEvent,
  validateRideId,
  validateCoordinates,
};
