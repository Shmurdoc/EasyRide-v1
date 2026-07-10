export function registerChatHandlers(chatNamespace) {
  chatNamespace.on("connection", (socket) => {
    console.log(`[chat] Client connected: ${socket.id} (role: ${socket.user?.role})`);

    socket.on("chat:join", (data) => {
      const { rideId } = data;
      if (!rideId) return socket.emit("error", { message: "Missing rideId" });

      socket.join(`chat:${rideId}`);
      console.log(`[chat] ${socket.id} joined chat:${rideId}`);
    });

    socket.on("chat:leave", (data) => {
      const { rideId } = data;
      if (!rideId) return socket.emit("error", { message: "Missing rideId" });

      socket.leave(`chat:${rideId}`);
      console.log(`[chat] ${socket.id} left chat:${rideId}`);
    });

    socket.on("chat:message", (data) => {
      const { rideId, message } = data;
      if (!rideId || !message) {
        return socket.emit("error", { message: "Missing rideId or message" });
      }

      if (typeof message !== "string" || message.trim().length === 0) {
        return socket.emit("error", { message: "Message cannot be empty" });
      }

      if (message.length > 1000) {
        return socket.emit("error", { message: "Message exceeds 1000 character limit" });
      }

      const chatMessage = {
        rideId,
        sender: socket.user?.id,
        senderRole: socket.user?.role,
        message: message.trim(),
        timestamp: Date.now(),
      };

      chatNamespace.to(`chat:${rideId}`).emit("chat:message", chatMessage);
    });

    socket.on("chat:typing", (data) => {
      const { rideId } = data;
      if (!rideId) return socket.emit("error", { message: "Missing rideId" });

      socket.to(`chat:${rideId}`).emit("chat:typing", {
        rideId,
        sender: socket.user?.id,
        senderRole: socket.user?.role,
        timestamp: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`[chat] Client disconnected: ${socket.id}`);
    });
  });
}
