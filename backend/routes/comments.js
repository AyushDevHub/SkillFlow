const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'skillshare_secret_2024';
const db = () => global.__db;

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

router.get('/:sessionId', (req, res) => {
  const comments = db().prepare('SELECT c.id, c.session_id, c.user_id, c.text, c.created_at, u.name as user_name, u.avatar_color FROM comments c JOIN users u ON c.user_id = u.id WHERE c.session_id = ? ORDER BY c.created_at ASC').all(req.params.sessionId);
  res.json({ comments });
});

router.post('/:sessionId', auth, (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' });
  const session = db().prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const id = uuidv4();
  db().prepare('INSERT INTO comments (id, session_id, user_id, text) VALUES (?, ?, ?, ?)').run(id, req.params.sessionId, req.user.id, text.trim());
  const comment = db().prepare('SELECT c.*, u.name as user_name, u.avatar_color FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(id);
  res.json({ comment });
});

module.exports = router;
