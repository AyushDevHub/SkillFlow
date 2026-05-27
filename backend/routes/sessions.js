const express = require("express");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "skillshare_secret_2024";

const db = () => global.__db;

// ─────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid token",
    });
  }
}

// ─────────────────────────────────────────────
// GET ALL SESSIONS
// ─────────────────────────────────────────────

router.get("/", (req, res) => {
  try {
    const { category, status, q } = req.query;

    let sql = `
      SELECT
        s.id,
        s.host_id,
        s.title,
        s.description,
        s.category,
        s.tags,
        s.status,
        s.viewer_count,
        s.created_at,
        s.ended_at,
        u.name as host_name,
        u.avatar_color as host_color
      FROM sessions s
      JOIN users u ON s.host_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (category && category !== "all") {
      sql += " AND s.category = ?";
      params.push(category);
    }

    if (status) {
      sql += " AND s.status = ?";
      params.push(status);
    }

    if (q) {
      sql += " AND (s.title LIKE ? OR s.description LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY s.created_at DESC";

    const sessions = db()
      .prepare(sql)
      .all(...params);

    const withCounts = sessions.map((s) => {
      const cc = db()
        .prepare(
          `
          SELECT COUNT(*) as c
          FROM comments
          WHERE session_id = ?
        `
        )
        .get(s.id);

      let parsedTags = [];

      try {
        parsedTags = JSON.parse(s.tags || "[]");
      } catch {
        parsedTags = [];
      }

      return {
        ...s,
        tags: parsedTags,
        comment_count: cc?.c || 0,
      };
    });

    res.json({
      sessions: withCounts,
    });
  } catch (err) {
    console.error("GET SESSIONS ERROR:", err);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// ─────────────────────────────────────────────
// GET SINGLE SESSION
// ─────────────────────────────────────────────

router.get("/:id", (req, res) => {
  try {
    const s = db()
      .prepare(
        `
        SELECT
          s.*,
          u.name as host_name,
          u.bio as host_bio,
          u.avatar_color as host_color
        FROM sessions s
        JOIN users u ON s.host_id = u.id
        WHERE s.id = ?
      `
      )
      .get(req.params.id);

    if (!s) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    let parsedTags = [];

    try {
      parsedTags = JSON.parse(s.tags || "[]");
    } catch {
      parsedTags = [];
    }

    res.json({
      session: {
        ...s,
        tags: parsedTags,
      },
    });
  } catch (err) {
    console.error("GET SESSION ERROR:", err);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// ─────────────────────────────────────────────
// CREATE SESSION
// ─────────────────────────────────────────────

router.post("/", auth, (req, res) => {
  try {
    const { title, description, category, tags } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        error: "Title and category required",
      });
    }

    const id = uuidv4();

    db()
      .prepare(
        `
        INSERT INTO sessions
        (
          id,
          host_id,
          title,
          description,
          category,
          tags
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        req.user.id,
        title,
        description || "",
        category,
        JSON.stringify(tags || [])
      );

    const s = db()
      .prepare(
        `
        SELECT
          s.*,
          u.name as host_name,
          u.avatar_color as host_color
        FROM sessions s
        JOIN users u ON s.host_id = u.id
        WHERE s.id = ?
      `
      )
      .get(id);

    if (!s) {
      return res.status(500).json({
        error: "Failed to create session",
      });
    }

    let parsedTags = [];

    try {
      parsedTags = JSON.parse(s.tags || "[]");
    } catch {
      parsedTags = [];
    }

    res.json({
      session: {
        ...s,
        tags: parsedTags,
      },
    });
  } catch (err) {
    console.error("CREATE SESSION ERROR:", err);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// ─────────────────────────────────────────────
// END SESSION
// ─────────────────────────────────────────────

router.patch("/:id/end", auth, (req, res) => {
  try {
    const s = db()
      .prepare(
        `
        SELECT *
        FROM sessions
        WHERE id = ?
      `
      )
      .get(req.params.id);

    if (!s) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    if (s.host_id !== req.user.id) {
      return res.status(403).json({
        error: "You are not the host",
      });
    }

    db()
      .prepare(
        `
        UPDATE sessions
        SET
          status = 'ended',
          ended_at = datetime('now')
        WHERE id = ?
      `
      )
      .run(req.params.id);

    res.json({
      success: true,
    });
  } catch (err) {
    console.error("END SESSION ERROR:", err);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
