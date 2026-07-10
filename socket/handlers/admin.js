export function registerAdminHandlers(adminNamespace) {
  adminNamespace.on("connection", (socket) => {
    console.log(`[admin] Admin connected: ${socket.id} (user: ${socket.user?.id})`);

    socket.join("admin");

    socket.on("admin:ride:subscribe", (data) => {
      const { rideId } = data;
      if (!rideId) return socket.emit("error", { message: "Missing rideId" });

      socket.join(`admin:ride:${rideId}`);
      console.log(`[admin] ${socket.id} subscribed to ride:${rideId}`);
    });

    socket.on("admin:ride:unsubscribe", (data) => {
      const { rideId } = data;
      if (!rideId) return socket.emit("error", { message: "Missing rideId" });

      socket.leave(`admin:ride:${rideId}`);
      console.log(`[admin] ${socket.id} unsubscribed from ride:${rideId}`);
    });

    socket.on("admin:active-rides", () => {
      socket.emit("admin:active-rides", {
        message: "Active ride list requested",
        timestamp: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`[admin] Admin disconnected: ${socket.id}`);
    });
  });
}
