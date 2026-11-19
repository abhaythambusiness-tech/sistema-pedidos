const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../auth');
const router = express.Router();
function getIngredientsMap() { const list = db.prepare('SELECT * FROM ingredients').all(); const map = {}; for (const i of list) map[i.id] = i; return map; }
function parseProduct(p) { return { id: p.id, name: p.name, emoji: p.emoji, price: p.price, description: p.description, recipe: JSON.parse(p.recipe_json), removable: JSON.parse(p.removable_json), extras: JSON.parse(p.extras_json) }; }
function availableUnits(product, ingMap) {
  let min = Infinity;
  for (const [id, qty] of Object.entries(product.recipe)) { const ing = ingMap[id]; const possible = ing ? Math.floor(ing.stock / qty) : 0; if (possible < min) min = possible; }
  return min === Infinity ? 0 : Math.max(0, min);
}
router.get('/', (_req, res) => {
  const ingMap = getIngredientsMap(); const rows = db.prepare('SELECT * FROM products').all();
  const products = rows.map(parseProduct).map((p) => ({ ...p, availableUnits: availableUnits(p, ingMap) }));
  res.json({ products });
});
router.get('/admin', requireAdmin, (_req, res) => {
  const ingMap = getIngredientsMap(); const rows = db.prepare('SELECT * FROM products').all();
  const products = rows.map(parseProduct).map((p) => ({ ...p, availableUnits: availableUnits(p, ingMap), recipeDetail: Object.fromEntries(Object.entries(p.recipe).map(([id, qty]) => [id, { qty, ...ingMap[id] }])) }));
  res.json({ products });
});
module.exports = router;
