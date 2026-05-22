import { Server } from "socket.io";
import socketAuth from "../middlewares/socket.middleware.js";
import { saveMessage } from "../services/saveMessage.js";
import dotenv from "dotenv";

dotenv.config();

const onlineUsers = new Map();

const addUserSocket = (userId, socketId) => {
  const existing = onlineUsers.get(userId) || new Set();
  existing.add(socketId);
  onlineUsers.set(userId, existing);
};

const removeUserSocket = (userId, socketId) => {
  const existing = onlineUsers.get(userId);
  if (!existing) return;

  existing.delete(socketId);

  if (existing.size === 0) {
    onlineUsers.delete(userId);
  } else {
    onlineUsers.set(userId, existing);
  }
};

const emitToUser = (io, userId, event, payload) => {
  const socketIds = onlineUsers.get(userId);
  if (!socketIds) return false;

  socketIds.forEach((id) => io.to(id).emit(event, payload));
  return true;
};

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:8080",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    addUserSocket(userId, socket.id);

    console.log("online users", onlineUsers);
    console.log(`User connected: ${socket.id}, user: ${socket.user.username}`);


    socket.on("chat message", async (data) => {
      try {
        const { content, conversationId, receiverId, tempId } = data;

        if (!content || typeof content !== "string") {
          throw new Error("Invalid message content");
        }

        const savedMessage = await saveMessage({
          senderId: userId,
          conversationId,
          content,
        });

        const messagePayload = {
          id: savedMessage.id,
          content: savedMessage.content,
          conversationId,
          createdAt: savedMessage.createdAt,
          tempId,
          sender: {
            id: userId,
            username: socket.user.username,
          },
        };

        socket.emit("chat message", messagePayload);

        emitToUser(io, receiverId, "chat message", messagePayload);
      } catch (error) {
        console.error("Error handling chat message:", error);
        socket.emit("error", { message: error.message });
      }
    });


    socket.on("offer", (data) => {
      const { to, offer } = data || {};

      const sent = emitToUser(io, to, "offer", {
        from: userId,
        fromUsername: socket.user.username,
        offer,
      });

      if (!sent) {
        socket.emit("user-offline", { to });
      }
    });


    socket.on("answer", (data) => {
      const { to, answer } = data || {};

      emitToUser(io, to, "answer", {
        from: userId,
        answer,
      });
    });


    socket.on("call user", (data) => {
      const { receiverId, signalData, from, name } = data;

      emitToUser(io, receiverId, "incoming call", {
        signal: signalData,
        from,
        name,
      });
    });

    socket.on("answer call", (data) => {
      const { to, signalData } = data;

      emitToUser(io, to, "call accepted", {
        signal: signalData,
        from: userId,
      });
    });

    socket.on("refuse call", (data) => {
      const { to } = data;

      emitToUser(io, to, "call refused", {
        from: userId,
      });
    });

    socket.on("ice-candidate", (data) => {
      const { to, candidate } = data;

      emitToUser(io, to, "ice-candidate", {
        from: userId,
        candidate,
      });
    });

    socket.on("end-call", (data) => {
      const { to } = data || {};

      emitToUser(io, to, "call-ended", {
        from: userId,
      });
    });

    socket.on("reject-call", (data) => {
      const { to, reason } = data || {};

      emitToUser(io, to, "call-rejected", {
        from: userId,
        reason: reason || "rejected",
      });
    });

    socket.on("disconnect", () => {
      removeUserSocket(userId, socket.id);
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};