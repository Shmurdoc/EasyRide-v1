import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required");
  process.exit(1);
}

export function authenticateSocket(socket, next) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.query?.token;

  if (!token) {
    return next(new Error("Authentication token required"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error("Invalid or expired token"));
  }
}

export function requireAdmin(socket, next) {
  if (!socket.user || socket.user.role !== "admin") {
    return next(new Error("Admin access required"));
  }
  next();
}
