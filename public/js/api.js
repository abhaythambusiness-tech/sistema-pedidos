const API = {
  base: '', getToken() { return localStorage.getItem('token'); }, setToken(t) { localStorage.setItem('token', t); }, clearToken() { localStorage.removeItem('token'); },
  async request(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }; const token = this.getToken(); if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(this.base + path, { ...opts, headers }); const data = await res.json().catch(() => ({}));
    if (res.status === 401) { this.clearToken(); if (!location.pathname.endsWith('login.html')) location.href = '/login.html'; throw new Error('No autenticado'); }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`); return data;
  },
  get(p) { return this.request(p); }, post(p, b) { return this.request(p, { method: 'POST', body: JSON.stringify(b) }); }, patch(p, b) { return this.request(p, { method: 'PATCH', body: JSON.stringify(b) }); }, del(p) { return this.request(p, { method: 'DELETE' }); }
};
function toast(message, type = 'info') {
  const el = document.createElement('div'); el.className = `toast toast--${type}`; el.textContent = message;
  const container = document.getElementById('toast-container'); if (!container) return;
  container.appendChild(el); setTimeout(() => el.classList.add('is-visible'), 10);
  setTimeout(() => { el.classList.remove('is-visible'); setTimeout(() => el.remove(), 300); }, 3500);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
