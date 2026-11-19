let productsCache = []; let ingredientsCache = [];
document.addEventListener('DOMContentLoaded', async () => {
  if (!API.getToken()) { location.href = '/login.html'; return; }
  try { const me = await API.get('/api/auth/me'); document.getElementById('user-badge').textContent = `👤 ${me.user.username}`; } catch { return; }
  document.querySelectorAll('.tab').forEach((tab) => { tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach((t) => t.classList.remove('is-active')); document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('is-active')); tab.classList.add('is-active'); document.getElementById(tab.dataset.target)?.classList.add('is-active'); }); });
  document.getElementById('logout-btn').addEventListener('click', () => { API.clearToken(); location.href = '/login.html'; });
  await Promise.all([reloadIngredients(), reloadProducts(), reloadOrders(), reloadMovements()]);
  document.getElementById('save-settings').addEventListener('click', () => { const alert = +document.getElementById('setting-alert').value; localStorage.setItem('clientAlertUnits', alert); toast('Ajustes guardados', 'success'); });
  document.getElementById('setting-alert').value = localStorage.getItem('clientAlertUnits') || 5;
});
async function reloadIngredients() { const data = await API.get('/api/ingredients'); ingredientsCache = data.ingredients; renderInventory(); renderLowStock(); }
async function reloadProducts() { const data = await API.get('/api/products/admin'); productsCache = data.products; renderProductsAdmin(); }
async function reloadOrders() { const data = await API.get('/api/orders'); renderOrders(data.orders); }
async function reloadMovements() { const data = await API.get('/api/ingredients/movements?limit=200'); renderMovements(data.movements); }
function renderLowStock() {
  const low = ingredientsCache.filter((i) => i.stock <= i.min_stock); const container = document.getElementById('low-stock-banner');
  if (low.length === 0) { container.classList.remove('is-active'); container.innerHTML = ''; return; }
  container.classList.add('is-active');
  container.innerHTML = `<div class="low-stock-banner__title">⚠️ ${low.length} ingrediente(s) por acabarse</div><div class="low-stock-banner__list">${low.map((i) => `<span class="chip chip--warn">${i.emoji} ${i.name}: ${i.stock} ${i.unit}</span>`).join('')}</div>`;
}
function renderInventory() {
  const tbody = document.getElementById('inventory-body');
  tbody.innerHTML = ingredientsCache.map((i) => {
    const level = i.stock <= 0 ? 'out' : i.stock <= i.min_stock ? 'low' : 'ok';
    return `<tr class="${level !== 'ok' ? 'row-low' : ''}"><td>${i.emoji} ${i.name}</td><td><span class="stock-pill stock-pill--${level}">${i.stock} ${i.unit}</span></td><td><div class="stock-controls"><button class="btn btn-ghost btn--sm" data-add="-10" data-id="${i.id}">−10</button><button class="btn btn-ghost btn--sm" data-add="-1" data-id="${i.id}">−1</button><button class="btn btn-ghost btn--sm" data-add="1" data-id="${i.id}">+1</button><button class="btn btn-ghost btn--sm" data-add="10" data-id="${i.id}">+10</button></div></td><td><input type="number" min="0" value="${i.min_stock}" data-threshold="${i.id}" class="input--sm"></td></tr>`;
  }).join('');
  tbody.querySelectorAll('[data-add]').forEach((btn) => { btn.addEventListener('click', async () => { try { await API.patch(`/api/ingredients/${btn.dataset.id}/stock`, { delta: +btn.dataset.add }); await reloadIngredients(); await reloadProducts(); await reloadMovements(); } catch (e) { toast(e.message, 'error'); } }); });
  tbody.querySelectorAll('[data-threshold]').forEach((inp) => { inp.addEventListener('change', async () => { try { await API.patch(`/api/ingredients/${inp.dataset.threshold}/threshold`, { minStock: +inp.value }); await reloadIngredients(); } catch (e) { toast(e.message, 'error'); } }); });
}
function renderProductsAdmin() {
  const container = document.getElementById('products-admin'); const alertUnits = +(localStorage.getItem('clientAlertUnits') || 5);
  container.innerHTML = productsCache.map((p) => {
    const units = p.availableUnits; const level = units <= 0 ? 'out' : units <= alertUnits ? 'low' : 'ok'; const label = units <= 0 ? 'Agotado' : `${units} posibles`;
    const recipe = Object.values(p.recipeDetail).map((r) => `${r.emoji || ''}${r.qty}`).join(' ');
    return `<div class="product-admin-card"><div class="product-admin-card__top"><span class="product-emoji">${p.emoji}</span><div><div class="product-name">${p.name}</div><div class="muted small">$${p.price.toFixed(2)}</div></div></div><p class="muted small">${p.description}</p><div class="product-admin-card__bottom"><span class="stock-pill stock-pill--${level}">${label}</span><span class="muted small">${recipe}</span></div></div>`;
  }).join('');
}
function renderOrders(orders) {
  const container = document.getElementById('orders-list');
  if (!orders.length) { container.innerHTML = '<p class="muted center">Aún no hay pedidos.</p>'; return; }
  container.innerHTML = orders.map((o) => `<div class="order-card"><div class="order-card__header"><div><div class="order-card__id">${o.id} ${o.source === 'voice' ? '📞' : '🌐'}</div><div class="muted small">${new Date(o.createdAt).toLocaleString()} · ${escapeHtml(o.customerName)}</div></div><div class="order-card__total">$${o.total.toFixed(2)}</div></div><div class="order-card__items">${o.items.map((it) => `<div class="order-item"><span>${it.quantity}× ${it.emoji} ${it.name}</span><span>$${it.lineTotal.toFixed(2)}</span></div>${it.removed?.length ? `<div class="muted small">Sin: ${it.removed.join(', ')}</div>` : ''}${it.extras?.length ? `<div class="muted small">Extra: ${it.extras.map((e) => e.name).join(', ')}</div>` : ''}`).join('')}</div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-ghost btn--sm" data-view-ticket="${o.id}">Ver ticket</button><button class="btn btn-primary btn--sm" data-reprint="${o.id}">Reimprimir</button></div></div>`).join('');
  container.querySelectorAll('[data-view-ticket]').forEach((b) => { b.addEventListener('click', async () => { try { const { ticket } = await API.get(`/api/orders/${b.dataset.viewTicket}/ticket`); showTicketModal(ticket); } catch (e) { toast(e.message, 'error'); } }); });
  container.querySelectorAll('[data-reprint]').forEach((b) => { b.addEventListener('click', async () => { try { const data = await API.post(`/api/print/${b.dataset.reprint}`); toast(data.print.ok ? 'Reenviado' : 'Error', data.print.ok ? 'success' : 'error'); } catch (e) { toast(e.message, 'error'); } }); });
}
function renderMovements(movements) {
  const tbody = document.getElementById('movements-body');
  if (!movements.length) { tbody.innerHTML = '<tr><td colspan="5" class="muted center">Sin movimientos.</td></tr>'; return; }
  tbody.innerHTML = movements.map((m) => `<tr><td class="small">${new Date(m.created_at + 'Z').toLocaleString()}</td><td>${m.ingredient_emoji || ''} ${m.ingredient_name || m.ingredient_id}</td><td><b style="color:${m.delta > 0 ? '#065f46' : '#991b1b'}">${m.delta > 0 ? '+' : ''}${m.delta} ${m.unit || ''}</b></td><td class="small">${m.reason}</td><td class="small">${m.order_id || '—'}</td></tr>`).join('');
}
function showTicketModal(text) {
  const modal = document.createElement('div'); modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal modal--ticket"><div class="printer"><div class="printer__slot"></div><pre class="ticket-paper">${escapeHtml(text)}</pre></div><button class="btn btn-primary btn-block" id="ticket-close">Cerrar</button></div>`;
  document.body.appendChild(modal); modal.querySelector('#ticket-close').addEventListener('click', () => modal.remove()); modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
