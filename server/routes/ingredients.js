const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../auth');
const router = express.Router();
router.get('/', requireAdmin, (_req, res) => { const ingredients = db.prepare('SELECT * FROM ingredients ORDER BY name').all(); res.json({ ingredients }); });
router.patch('/:id/stock', requireAdmin, (req, res) => {
  const { delta, reason } = req.body || {}; const id = req.params.id; const d = Number(delta);
  if (!Number.isFinite(d) || d === 0) return res.status(400).json({ error: 'Delta inválido' });
  const ing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
  if (!ing) return res.status(404).json({ error: 'Ingrediente no existe' });
  const newStock = Math.max(0, ing.stock + d); const applied = newStock - ing.stock;
  const tx = db.transaction(() => {
    db.prepare('UPDATE ingredients SET stock = ? WHERE id = ?').run(newStock, id);
    db.prepare('INSERT INTO inventory_movements (ingredient_id, delta, reason, note) VALUES (?, ?, ?, ?)').run(id, applied, reason || (d > 0 ? 'entrada' : 'salida'), null);
  }); tx();
  res.json({ ok: true, ingredient: { ...ing, stock: newStock } });
});
router.patch('/:id/threshold', requireAdmin, (req, res) => {
  const { minStock } = req.body || {}; const v = Number(minStock);
  if (!Number.isFinite(v) || v < 0) return res.status(400).json({ error: 'Valor inválido' });
  const info = db.prepare('UPDATE ingredients SET min_stock = ? WHERE id = ?').run(v, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'No existe' });
  res.json({ ok: true });
});
router.get('/movements', requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = db.prepare(`SELECT m.*, i.name AS ingredient_name, i.emoji AS ingredient_emoji, i.unit FROM inventory_movements m LEFT JOIN ingredients i ON i.id = m.ingredient_id ORDER BY m.created_at DESC, m.id DESC LIMIT ?`).all(limit);
  res.json({ movements: rows });
});
module.exports = router;
