let cart = []; let productsCache = [];
document.addEventListener('DOMContentLoaded', async () => { await reloadProducts(); setupCartUI(); });
async function reloadProducts() { try { const data = await API.get('/api/products'); productsCache = data.products; renderProducts(); } catch (e) { toast('Error al cargar: ' + e.message, 'error'); } }
function renderProducts() {
  const grid = document.getElementById('product-grid'); grid.innerHTML = '';
  for (const p of productsCache) {
    const units = p.availableUnits; let alert = null;
    if (units <= 0) alert = { level: 'out', message: 'Agotado' }; else if (units <= 5) alert = { level: 'low', message: units === 1 ? '¡Última unidad!' : `¡Últimas ${units} unidades!` };
    const card = document.createElement('article'); card.className = 'product-card' + (units <= 0 ? ' is-out' : '');
    card.innerHTML = `<div class="product-emoji">${p.emoji}</div><h3 class="product-name">${p.name}</h3><p class="product-desc">${p.description}</p>${alert ? `<div class="stock-alert stock-alert--${alert.level}"><span class="stock-alert__icon">${alert.level === 'out' ? '⛔' : '⏳'}</span><span>${alert.message}</span></div>` : ''}<div class="product-footer"><span class="price">$${p.price.toFixed(2)}</span><button class="btn btn-primary" ${units <= 0 ? 'disabled' : ''}>${units <= 0 ? 'Agotado' : 'Agregar'}</button></div>`;
    if (units > 0) card.querySelector('button').addEventListener('click', () => openProductModal(p)); grid.appendChild(card);
  }
}
function openProductModal(product) {
  const extras = (product.extras || []); const removable = (product.removable || []);
  const modal = document.createElement('div'); modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><button class="modal-close">✕</button><div class="modal-header"><div class="product-emoji product-emoji--lg">${product.emoji}</div><div><h2>${product.name}</h2><p class="muted small">${product.description}</p></div></div>${removable.length ? `<section class="modal-section"><h4>Quitar ingredientes</h4><div class="chip-list">${removable.map((id) => `<label class="chip"><input type="checkbox" checked data-remove="${id}"><span>${id}</span></label>`).join('')}</div></section>` : ''}${extras.length ? `<section class="modal-section"><h4>Agregar extras</h4><div class="chip-list">${extras.map((ex) => `<label class="chip"><input type="checkbox" data-extra="${ex.id}"><span>${ex.name} <b>+$${ex.price.toFixed(2)}</b></span></label>`).join('')}</div></section>` : ''}<section class="modal-section"><h4>Comentarios</h4><textarea id="modal-comments" rows="2"></textarea></section><section class="modal-section modal-section--row"><div class="qty"><button id="qty-minus" class="qty-btn">−</button><span id="qty-value">1</span><button id="qty-plus" class="qty-btn">+</button></div><div class="modal-total">Total: <b id="modal-total">$${product.price.toFixed(2)}</b></div></section><button id="modal-add" class="btn btn-primary btn-block">Agregar al pedido</button></div>`;
  document.body.appendChild(modal); modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  let qty = 1; const qtyValue = modal.querySelector('#qty-value'); const totalEl = modal.querySelector('#modal-total');
  const updateTotal = () => { let total = product.price; modal.querySelectorAll('[data-extra]:checked').forEach((cb) => { const ex = extras.find((e) => e.id === cb.dataset.extra); if (ex) total += ex.price; }); totalEl.textContent = `$${(total * qty).toFixed(2)}`; qtyValue.textContent = qty; };
  modal.querySelector('#qty-minus').addEventListener('click', () => { if (qty > 1) { qty--; updateTotal(); } }); modal.querySelector('#qty-plus').addEventListener('click', () => { if (qty < 50) { qty++; updateTotal(); } }); modal.querySelectorAll('[data-extra]').forEach((cb) => cb.addEventListener('change', updateTotal));
  modal.querySelector('#modal-add').addEventListener('click', () => {
    const removed = []; modal.querySelectorAll('[data-remove]').forEach((cb) => { if (!cb.checked) removed.push(cb.dataset.remove); }); const selectedExtras = []; modal.querySelectorAll('[data-extra]:checked').forEach((cb) => selectedExtras.push(cb.dataset.extra)); const comments = modal.querySelector('#modal-comments').value.trim();
    let unitPrice = product.price; for (const exId of selectedExtras) { const ex = extras.find((e) => e.id === exId); if (ex) unitPrice += ex.price; }
    cart.push({ productId: product.id, name: product.name, emoji: product.emoji, unitPrice, quantity: qty, removed, extras: selectedExtras, comments });
    renderCart(); modal.remove(); toast(`${product.name} agregado`, 'success');
  });
}
function setupCartUI() {
  const drawer = document.getElementById('cart-drawer'); const backdrop = document.getElementById('drawer-backdrop');
  const open = () => { drawer.classList.add('is-open'); backdrop.classList.add('is-open'); }; const close = () => { drawer.classList.remove('is-open'); backdrop.classList.remove('is-open'); };
  document.getElementById('open-cart').addEventListener('click', open); document.getElementById('close-cart').addEventListener('click', close); backdrop.addEventListener('click', close);
  document.getElementById('checkout-btn').addEventListener('click', async () => {
    try { const data = await API.post('/api/orders', { items: cart, customerName: document.getElementById('customer-name').value.trim() }); cart = []; renderCart(); close(); showTicket(data.ticket); toast('Pedido enviado a cocina', 'success'); await reloadProducts(); } catch (e) { toast(e.message, 'error'); }
  });
}
function renderCart() {
  document.getElementById('cart-count').textContent = cart.reduce((s, i) => s + i.quantity, 0); const itemsEl = document.getElementById('cart-items'); const totalEl = document.getElementById('cart-total'); const checkoutBtn = document.getElementById('checkout-btn');
  if (cart.length === 0) { itemsEl.innerHTML = '<p class="muted center">Tu pedido está vacío.</p>'; totalEl.textContent = '$0.00'; checkoutBtn.disabled = true; return; } checkoutBtn.disabled = false;
  itemsEl.innerHTML = cart.map((it, idx) => `<div class="cart-item"><div class="cart-item__emoji">${it.emoji}</div><div class="cart-item__info"><div class="cart-item__name">${it.quantity}× ${it.name}</div><div class="cart-item__meta">${it.removed.length ? `<span class="tag tag--warn">Sin: ${it.removed.join(', ')}</span>` : ''}${it.extras.length ? `<span class="tag tag--ok">Extra: ${it.extras.join(', ')}</span>` : ''}${it.comments ? `<span class="tag">${escapeHtml(it.comments)}</span>` : ''}</div></div><div class="cart-item__right"><div class="cart-item__price">$${(it.unitPrice * it.quantity).toFixed(2)}</div><button class="link-danger" data-remove-idx="${idx}">Quitar</button></div></div>`).join('');
  totalEl.textContent = `$${cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)}`;
  itemsEl.querySelectorAll('[data-remove-idx]').forEach((btn) => { btn.addEventListener('click', () => { cart.splice(+btn.dataset.removeIdx, 1); renderCart(); }); });
}
function showTicket(text) {
  const modal = document.createElement('div'); modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal modal--ticket"><div class="printer"><div class="printer__slot"></div><pre class="ticket-paper">${escapeHtml(text)}</pre></div><p class="muted center small">🖨️ Enviado a la impresora</p><button class="btn btn-primary btn-block" id="ticket-close">Cerrar</button></div>`;
  document.body.appendChild(modal); modal.querySelector('#ticket-close').addEventListener('click', () => modal.remove()); modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
