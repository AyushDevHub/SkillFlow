const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { initDb } = require("./db");

const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────
// ENV
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 4000;

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ─────────────────────────────────────────────
// SOCKET.IO
// ─────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

// ─────────────────────────────────────────────
// ROOT ROUTE
// ─────────────────────────────────────────────

app.get("/", (_, res) => {
  res.send("SkillFlow Backend Running");
});

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────

app.get("/health", (_, res) => {
  res.json({
    ok: true,
    message: "SkillFlow backend healthy",
  });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

async function startServer() {
  try {
    // Initialize Database

    await initDb();

    console.log("Database initialized");

    // Routes

    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/sessions", require("./routes/sessions"));
    app.use("/api/comments", require("./routes/comments"));

    // ─────────────────────────────────────────
    // ROOMS
    // ─────────────────────────────────────────

    const rooms = new Map();

    // ─────────────────────────────────────────
    // SOCKET CONNECTION
    // ─────────────────────────────────────────

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      // ───────────────────────────────────────
      // HOST JOIN
      // ───────────────────────────────────────

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

        console.log("Host joined:", sessionId);
      });

      // ───────────────────────────────────────
      // VIEWER JOIN
      // ───────────────────────────────────────

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

        console.log("Viewer joined:", sessionId);
      });

      // ───────────────────────────────────────
      // WEBRTC SIGNALING
      // ───────────────────────────────────────

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

      // ───────────────────────────────────────
      // CHAT
      // ───────────────────────────────────────

      socket.on("chat:message", ({ sessionId, message, user }) => {
        io.to(sessionId).emit("chat:message", {
          id: Date.now(),
          message,
          user,
          timestamp: new Date().toISOString(),
        });
      });

      // ───────────────────────────────────────
      // SESSION END
      // ───────────────────────────────────────

      socket.on("session:end", ({ sessionId }) => {
        io.to(sessionId).emit("session:ended");

        rooms.delete(sessionId);

        global.__db
          .prepare(
            `
            UPDATE sessions
            SET
              status='ended',
              ended_at=datetime('now')
            WHERE id=?
            `
          )
          .run(sessionId);

        console.log("Session ended:", sessionId);
      });

      // ───────────────────────────────────────
      // DISCONNECT
      // ───────────────────────────────────────

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        rooms.forEach((room, sessionId) => {
          // Host disconnected

          if (room.hostSocketId === socket.id) {
            io.to(sessionId).emit("session:ended");

            rooms.delete(sessionId);

            global.__db
              .prepare(
                `
                UPDATE sessions
                SET
                  status='ended',
                  ended_at=datetime('now')
                WHERE id=?
                `
              )
              .run(sessionId);

            console.log("Host disconnected:", sessionId);
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
              .prepare(
                `
                UPDATE sessions
                SET viewer_count = ?
                WHERE id = ?
                `
              )
              .run(room.viewers.size, sessionId);

            console.log("Viewer left:", sessionId);
          }
        });
      });
    });

    // ─────────────────────────────────────────
    // START LISTENING
    // ─────────────────────────────────────────

    server.listen(PORT, () => {
      console.log(`SkillFlow server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Server startup failed:", err);
  }
}

startServer();
