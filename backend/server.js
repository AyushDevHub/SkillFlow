const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { initDb } = require("./db");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────
// START SERVER AFTER DATABASE INITIALIZES
// ─────────────────────────────────────────────────────

async function startServer() {
  try {
    // Initialize DB first
    await initDb();

    console.log("Database initialized");

    // Routes
    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/sessions", require("./routes/sessions"));
    app.use("/api/comments", require("./routes/comments"));

    // ─────────────────────────────────────────────────
    // WebRTC + Socket.io
    // ─────────────────────────────────────────────────

    const rooms = new Map();

    io.on("connection", (socket) => {
      socket.on("host:join", ({ sessionId, user }) => {
        if (!rooms.has(sessionId)) {
          rooms.set(sessionId, {
            hostSocketId: socket.id,
            viewers: new Set(),
            userMap: new Map(),
          });
        }

        const room = rooms.get(sessionId);

        room.hostSocketId = socket.id;
        room.userMap.set(socket.id, user);

        socket.join(sessionId);

        socket.emit("host:ready", {
          viewerCount: room.viewers.size,
        });
      });

      socket.on("viewer:join", ({ sessionId, user }) => {
        const room = rooms.get(sessionId);

        if (!room) {
          return socket.emit("error", {
            message: "Session not live",
          });
        }

        room.viewers.add(socket.id);
        room.userMap.set(socket.id, user);

        socket.join(sessionId);

        io.to(room.hostSocketId).emit("viewer:new", {
          viewerId: socket.id,
          user,
        });

        io.to(sessionId).emit("viewer:count", {
          count: room.viewers.size,
        });

        global.__db
          .prepare("UPDATE sessions SET viewer_count = ? WHERE id = ?")
          .run(room.viewers.size, sessionId);
      });

      // WebRTC Signaling

      socket.on("webrtc:offer", ({ viewerId, offer }) => {
        io.to(viewerId).emit("webrtc:offer", {
          hostId: socket.id,
          offer,
        });
      });

      socket.on("webrtc:answer", ({ hostId, answer }) => {
        io.to(hostId).emit("webrtc:answer", {
          viewerId: socket.id,
          answer,
        });
      });

      socket.on("webrtc:ice", ({ targetId, candidate }) => {
        io.to(targetId).emit("webrtc:ice", {
          fromId: socket.id,
          candidate,
        });
      });

      // Chat

      socket.on("chat:message", ({ sessionId, message, user }) => {
        io.to(sessionId).emit("chat:message", {
          id: Date.now(),
          message,
          user,
          timestamp: new Date().toISOString(),
        });
      });

      // End Session

      socket.on("session:end", ({ sessionId }) => {
        io.to(sessionId).emit("session:ended");

        rooms.delete(sessionId);

        global.__db
          .prepare(
            "UPDATE sessions SET status='ended', ended_at=datetime('now') WHERE id=?"
          )
          .run(sessionId);
      });

      // Disconnect

      socket.on("disconnect", () => {
        rooms.forEach((room, sessionId) => {
          // Host disconnected

          if (room.hostSocketId === socket.id) {
            io.to(sessionId).emit("session:ended");

            rooms.delete(sessionId);

            global.__db
              .prepare(
                "UPDATE sessions SET status='ended', ended_at=datetime('now') WHERE id=?"
              )
              .run(sessionId);
          }

          // Viewer disconnected
          else if (room.viewers.has(socket.id)) {
            room.viewers.delete(socket.id);

            room.userMap.delete(socket.id);

            io.to(sessionId).emit("viewer:count", {
              count: room.viewers.size,
            });

            io.to(room.hostSocketId).emit("viewer:left", {
              viewerId: socket.id,
            });

            global.__db
              .prepare("UPDATE sessions SET viewer_count = ? WHERE id = ?")
              .run(room.viewers.size, sessionId);
          }
        });
      });
    });

    // ─────────────────────────────────────────────────
    // Start HTTP Server
    // ─────────────────────────────────────────────────

    const PORT = process.env.PORT || 4000;

    server.listen(PORT, () => {
      console.log(`SkillFlow server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Server startup failed:", err);
  }
}

startServer();
