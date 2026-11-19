document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form'); const err = document.getElementById('login-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    try { const data = await API.post('/api/auth/login', { username: document.getElementById('username').value.trim(), password: document.getElementById('password').value }); API.setToken(data.token); location.href = '/admin.html'; } catch (e) { err.textContent = e.message; }
  });
});
