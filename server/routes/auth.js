const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, requireAuth } = require('../auth');
const router = express.Router();
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Credenciales inválidas' });
  res.json({ token: sign(user), user: { username: user.username, role: user.role } });
});
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
module.exports = router;
