const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../auth');
const { printTicket } = require('../printer');
const router = express.Router();
const getSetting = (k, d) => db.prepare('SELECT value FROM settings WHERE key = ?').get(k)?.value ?? d;
function parseProduct(row) { return { id: row.id, name: row.name, emoji: row.emoji, price: row.price, description: row.description, recipe: JSON.parse(row.recipe_json), removable: JSON.parse(row.removable_json), extras: JSON.parse(row.extras_json) }; }
function computeNeeded(items) {
  const products = db.prepare('SELECT * FROM products').all().map(parseProduct);
  const needed = {};
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId); if (!p) throw new Error(`Producto no existe: ${it.productId}`);
    for (const [ingId, qty] of Object.entries(p.recipe)) { if (it.removed?.includes(ingId)) continue; needed[ingId] = (needed[ingId] || 0) + qty * (it.quantity || 1); }
    for (const exId of it.extras || []) { const ex = (p.extras || []).find((e) => e.id === exId); if (ex) needed[ex.ingredient] = (needed[ex.ingredient] || 0) + ex.qty * (it.quantity || 1); }
  }
  return needed;
}
function formatTicketText(order) {
  const s = getSetting('restaurantName', 'Restaurante Demo'); const lines = [];
  lines.push('================================'); lines.push('     ' + s.toUpperCase()); lines.push('================================');
  lines.push('Ticket : ' + order.id); lines.push('Fecha  : ' + new Date(order.createdAt).toLocaleString()); lines.push('Cliente: ' + order.customerName); lines.push('--------------------------------');
  for (const it of order.items) {
    lines.push(`${it.quantity}x ${it.name}  $${it.lineTotal.toFixed(2)}`);
    if (it.removed?.length) { const names = it.removed.map((id) => db.prepare('SELECT name FROM ingredients WHERE id = ?').get(id)?.name || id); lines.push('   SIN: ' + names.join(', ')); }
    if (it.extras?.length) lines.push('   EXTRA: ' + it.extras.map((e) => e.name).join(', '));
    if (it.comments) lines.push('   NOTA: ' + it.comments);
  }
  lines.push('--------------------------------'); lines.push('TOTAL: $' + order.total.toFixed(2)); lines.push('================================'); lines.push('     ¡Gracias por su pedido!');
  return lines.join('\n');
}
function buildOrderPayload(items, customerName, source) {
  const products = db.prepare('SELECT * FROM products').all().map(parseProduct); const normalized = []; let total = 0;
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId); if (!p) throw new Error(`Producto no existe: ${it.productId}`);
    const qty = Math.max(1, Number(it.quantity) || 1); let unitPrice = p.price; const extrasResolved = [];
    for (const exId of it.extras || []) { const ex = (p.extras || []).find((e) => e.id === exId); if (ex) { unitPrice += ex.price; extrasResolved.push({ id: ex.id, name: ex.name, price: ex.price }); } }
    const lineTotal = +(unitPrice * qty).toFixed(2); total += lineTotal;
    normalized.push({ productId: p.id, name: p.name, emoji: p.emoji, unitPrice, quantity: qty, removed: it.removed || [], extras: extrasResolved, comments: it.comments || '', lineTotal });
  }
  return { id: 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(), createdAt: new Date().toISOString(), customerName: customerName || 'Cliente web', source, items: normalized, total: +total.toFixed(2) };
}
function createOrderTx(payload) {
  const needed = computeNeeded(payload.items); const ingMap = {};
  for (const r of db.prepare('SELECT * FROM ingredients').all()) ingMap[r.id] = r;
  for (const [ingId, qty] of Object.entries(needed)) {
    const ing = ingMap[ingId]; if (!ing) throw new Error(`Ingrediente desconocido: ${ingId}`);
    if (qty > ing.stock) throw new Error(`Stock insuficiente de ${ing.name} (necesitas ${qty}, hay ${ing.stock})`);
  }
  db.prepare(`INSERT INTO orders (id, customer_name, source, items_json, total) VALUES (?, ?, ?, ?, ?)`).run(payload.id, payload.customerName, payload.source, JSON.stringify(payload.items), payload.total);
  for (const [ingId, qty] of Object.entries(needed)) {
    db.prepare('UPDATE ingredients SET stock = stock - ? WHERE id = ?').run(qty, ingId);
    db.prepare(`INSERT INTO inventory_movements (ingredient_id, delta, reason, order_id) VALUES (?, ?, 'venta', ?)`).run(ingId, -qty, payload.id);
  }
  return payload;
}
router.post('/', async (req, res) => {
  const { items, customerName } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Sin items' });
  try {
    const payload = buildOrderPayload(items, customerName, 'web'); const tx = db.transaction(createOrderTx); const saved = tx(payload);
    const text = formatTicketText(saved); const result = await printTicket(saved.id, text);
    if (result.ok) db.prepare("UPDATE orders SET printed_at = datetime('now') WHERE id = ?").run(saved.id);
    res.status(201).json({ order: saved, ticket: text, print: result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.get('/', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200').all();
  const orders = rows.map((r) => ({ id: r.id, createdAt: r.created_at, customerName: r.customer_name, source: r.source, items: JSON.parse(r.items_json), total: r.total, status: r.status, printedAt: r.printed_at }));
  res.json({ orders });
});
router.get('/:id/ticket', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'No existe' });
  const order = { id: row.id, createdAt: row.created_at, customerName: row.customer_name, source: row.source, items: JSON.parse(row.items_json), total: row.total };
  res.json({ ticket: formatTicketText(order) });
});
module.exports = router;
