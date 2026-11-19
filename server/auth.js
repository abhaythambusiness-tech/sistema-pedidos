const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
function sign(user) { return jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '7d' }); }
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Falta token' });
  try { req.user = jwt.verify(token, SECRET); next(); } catch { return res.status(401).json({ error: 'Token inválido o expirado' }); }
}
function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });
    next();
  });
}
module.exports = { sign, requireAuth, requireAdmin, SECRET };
