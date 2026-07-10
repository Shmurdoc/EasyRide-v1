export function registerRideHandlers(io, ridesNamespace) {
  ridesNamespace.on("connection", (socket) => {
    console.log(`[rides] Client connected: ${socket.id} (role: ${socket.user?.role})`);

    socket.on("driver:location", (data) => {
      const { rideId, lat, lng } = data;

      if (!rideId || lat == null || lng == null) {
        return socket.emit("error", { message: "Missing rideId, lat, or lng" });
      }

      const room = `ride:${rideId}`;

      ridesNamespace.to(room).emit("driver:location", {
        rideId,
        lat,
        lng,
        driverId: socket.user?.id,
        timestamp: Date.now(),
      });

      ridesNamespace.to("admin").emit("admin:ride:update", {
        type: "location",
        rideId,
        lat,
        lng,
        driverId: socket.user?.id,
        timestamp: Date.now(),
      });
    });

    socket.on("ride:join", (data) => {
      const { rideId } = data;
      if (!rideId) return socket.emit("error", { message: "Missing rideId" });

      socket.join(`ride:${rideId}`);
      console.log(`[rides] ${socket.id} joined ride:${rideId}`);
    });

    socket.on("ride:leave", (data) => {
      const { rideId } = data;
      if (!rideId) return socket.emit("error", { message: "Missing rideId" });

      socket.leave(`ride:${rideId}`);
      console.log(`[rides] ${socket.id} left ride:${rideId}`);
    });

    socket.on("ride:accept", (data) => {
      const { rideId, driver } = data;
      if (!rideId || !driver) {
        return socket.emit("error", { message: "Missing rideId or driver info" });
      }

      const room = `ride:${rideId}`;

      ridesNamespace.to(room).emit("ride:accept", {
        rideId,
        driver,
        timestamp: Date.now(),
      });

      ridesNamespace.to("admin").emit("admin:ride:update", {
        type: "accepted",
        rideId,
        driver,
        timestamp: Date.now(),
      });
    });

    socket.on("ride:complete", (data) => {
      const { rideId, fare } = data;
      if (!rideId) return socket.emit("error", { message: "Missing rideId" });

      const room = `ride:${rideId}`;

      ridesNamespace.to(room).emit("ride:complete", {
        rideId,
        fare,
        timestamp: Date.now(),
      });

      ridesNamespace.to("admin").emit("admin:ride:update", {
        type: "completed",
        rideId,
        fare,
        timestamp: Date.now(),
      });

      socket.leave(room);
    });

    socket.on("ride:cancel", (data) => {
      const { rideId, reason } = data;
      if (!rideId) return socket.emit("error", { message: "Missing rideId" });

      const room = `ride:${rideId}`;

      ridesNamespace.to(room).emit("ride:cancel", {
        rideId,
        reason: reason || "No reason provided",
        cancelledBy: socket.user?.id,
        timestamp: Date.now(),
      });

      ridesNamespace.to("admin").emit("admin:ride:update", {
        type: "cancelled",
        rideId,
        reason,
        cancelledBy: socket.user?.id,
        timestamp: Date.now(),
      });
    });

    socket.on("sos:alert", (data) => {
      const { rideId, lat, lng } = data;
      if (!rideId) return socket.emit("error", { message: "Missing rideId" });

      console.log(`[SOS] Emergency alert from ${socket.id} for ride ${rideId}`);

      const alert = {
        rideId,
        lat,
        lng,
        riderId: socket.user?.id,
        timestamp: Date.now(),
      };

      ridesNamespace.to(`ride:${rideId}`).emit("sos:alert", alert);
      ridesNamespace.to("admin").emit("sos:alert", alert);

      ridesNamespace.to("admin").emit("admin:ride:update", {
        type: "sos",
        ...alert,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[rides] Client disconnected: ${socket.id}`);
    });
  });
}
