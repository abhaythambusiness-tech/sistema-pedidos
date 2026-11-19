const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../auth');
const { printTicket } = require('../printer');
const router = express.Router();
router.post('/:id', requireAdmin, async (req, res) => {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Pedido no existe' });
  const order = { id: row.id, createdAt: row.created_at, customerName: row.customer_name, source: row.source, items: JSON.parse(row.items_json), total: row.total };
  const lines = [];
  lines.push('================================'); lines.push('     ' + (db.prepare('SELECT value FROM settings WHERE key = ?').get('restaurantName')?.value || 'RESTAURANTE').toUpperCase()); lines.push('================================');
  lines.push('Ticket : ' + order.id); lines.push('Fecha  : ' + new Date(order.createdAt).toLocaleString()); lines.push('Cliente: ' + order.customerName); lines.push('--------------------------------');
  for (const it of order.items) {
    lines.push(`${it.quantity}x ${it.name}  $${it.lineTotal.toFixed(2)}`);
    if (it.removed?.length) lines.push('   SIN: ' + it.removed.join(', '));
    if (it.extras?.length) lines.push('   EXTRA: ' + it.extras.map((e) => e.name).join(', '));
    if (it.comments) lines.push('   NOTA: ' + it.comments);
  }
  lines.push('--------------------------------'); lines.push('TOTAL: $' + order.total.toFixed(2)); lines.push('================================');
  const result = await printTicket(order.id, lines.join('\n'));
  if (result.ok) db.prepare("UPDATE orders SET printed_at = datetime('now') WHERE id = ?").run(order.id);
  res.json({ print: result });
});
module.exports = router;
