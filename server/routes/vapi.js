const express = require('express');
const db = require('../db');
const { printTicket } = require('../printer');
const router = express.Router();
router.post('/webhook', async (req, res) => {
  const expected = process.env.VAPI_WEBHOOK_TOKEN;
  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected) return res.status(500).json({ error: 'VAPI_WEBHOOK_TOKEN no configurado' });
  if (provided !== expected) return res.status(401).json({ error: 'Token inválido' });
  const { items, customerPhone, callId, customerName } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items requerido' });
  try {
    const products = db.prepare('SELECT * FROM products').all(); const productsMap = Object.fromEntries(products.map((p) => [p.id, p]));
    const normalized = []; let total = 0;
    for (const it of items) {
      const p = productsMap[it.productId]; if (!p) throw new Error(`Producto no existe: ${it.productId}`);
      const qty = Math.max(1, Number(it.quantity) || 1); const extrasJson = JSON.parse(p.extras_json); let unitPrice = p.price; const extras = [];
      for (const exId of it.extras || []) { const ex = extrasJson.find((e) => e.id === exId); if (ex) { unitPrice += ex.price; extras.push({ id: ex.id, name: ex.name, price: ex.price }); } }
      const lineTotal = +(unitPrice * qty).toFixed(2); total += lineTotal;
      normalized.push({ productId: p.id, name: p.name, emoji: p.emoji, unitPrice, quantity: qty, removed: it.removed || [], extras, comments: it.comments || '', lineTotal });
    }
    const order = { id: 'VOC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(), createdAt: new Date().toISOString(), customerName: customerName || (`Llamada ${customerPhone || ''}`.trim() || 'Cliente voz'), source: 'voice', items: normalized, total: +total.toFixed(2) };
    const tx = db.transaction(() => {
      const needed = {};
      for (const it of order.items) {
        const p = productsMap[it.productId]; const recipe = JSON.parse(p.recipe_json);
        for (const [ingId, qty] of Object.entries(recipe)) { if (it.removed?.includes(ingId)) continue; needed[ingId] = (needed[ingId] || 0) + qty * it.quantity; }
        for (const ex of it.extras) { const extrasJson = JSON.parse(p.extras_json); const full = extrasJson.find((e) => e.id === ex.id); if (full) needed[full.ingredient] = (needed[full.ingredient] || 0) + full.qty * it.quantity; }
      }
      for (const [ingId, qty] of Object.entries(needed)) { const ing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(ingId); if (!ing || qty > ing.stock) throw new Error(`Stock insuficiente: ${ingId}`); }
      db.prepare(`INSERT INTO orders (id, customer_name, source, items_json, total) VALUES (?, ?, ?, ?, ?)`).run(order.id, order.customerName, order.source, JSON.stringify(order.items), order.total);
      for (const [ingId, qty] of Object.entries(needed)) { db.prepare('UPDATE ingredients SET stock = stock - ? WHERE id = ?').run(qty, ingId); db.prepare(`INSERT INTO inventory_movements (ingredient_id, delta, reason, order_id) VALUES (?, ?, 'voz', ?)`).run(ingId, -qty, order.id); }
    }); tx();
    const lines = [];
    lines.push('================================'); const restaurantName = db.prepare('SELECT value FROM settings WHERE key = ?').get('restaurantName')?.value || 'RESTAURANTE'; lines.push('     ' + restaurantName.toUpperCase()); lines.push('================================');
    lines.push('Canal  : VOZ'); lines.push('Ticket : ' + order.id); lines.push('Cliente: ' + order.customerName); lines.push('--------------------------------');
    for (const it of order.items) {
      lines.push(`${it.quantity}x ${it.name}  $${it.lineTotal.toFixed(2)}`);
      if (it.removed?.length) lines.push('   SIN: ' + it.removed.join(', '));
      if (it.extras?.length) lines.push('   EXTRA: ' + it.extras.map((e) => e.name).join(', '));
      if (it.comments) lines.push('   NOTA: ' + it.comments);
    }
    lines.push('--------------------------------'); lines.push('TOTAL: $' + order.total.toFixed(2)); lines.push('================================');
    await printTicket(order.id, lines.join('\n'));
    res.status(201).json({ ok: true, orderId: order.id, total: order.total, message: 'Pedido creado e impreso' });
  } catch (e) { console.error('[vapi] error:', e.message); res.status(400).json({ ok: false, error: e.message }); }
});
module.exports = router;
