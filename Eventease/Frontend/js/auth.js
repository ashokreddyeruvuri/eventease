// ===== auth.js: login and registration with validation =====
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const errBox = msg => document.getElementById('formError').textContent = msg;

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async ev => {
    ev.preventDefault();
    const submit = loginForm.querySelector('button[type="submit"]');
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    if (!emailOk(email) || !password) return errBox('Enter a valid email and password.');
    errBox('Signing in...');
    if (submit) submit.disabled = true;
    try {
      const adminLogin = new URLSearchParams(location.search).get('admin') === '1';
      const result = await apiRequest(adminLogin ? '/auth/admin-login' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (!result.token || !result.user?.role) throw new Error('The server returned an incomplete login response.');
      if (adminLogin && result.user.role !== 'admin') throw new Error('Admin access required.');
      localStorage.setItem('ee_token', result.token);
      const user = result.user;
      const returnTo = sessionStorage.getItem('ee_after_login');
      sessionStorage.removeItem('ee_after_login');
      if (returnTo) {
        const target = new URL(returnTo, location.href);
        if (target.origin === location.origin && /\/(?:events|event-details)\.html$/.test(target.pathname)) {
          location.href = target.href;
          return;
        }
      }
      const destination = new URL(dashboardLink(user), location.href);
      destination.searchParams.set('refresh', Date.now().toString());
      window.location.replace(destination.href);
    } catch (error) {
      errBox(error instanceof Error ? error.message : 'Unable to sign in.');
      if (submit) submit.disabled = false;
    }
  });
  document.getElementById('forgot').onclick = e => { e.preventDefault(); showToast('Reset link sent (demo)'); };
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async ev => {
    ev.preventDefault();
    const f = registerForm;
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;
    const role = document.getElementById('role').value;
    if (name.length < 3) return errBox('Name must be at least 3 characters.');
    if (!emailOk(email)) return errBox('Enter a valid email address.');
    if (password.length < 6) return errBox('Password must be at least 6 characters.');
    if (password !== confirm) return errBox('Passwords do not match.');
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
      });
      showToast('Account created! Please login.');
      setTimeout(() => location.href = 'login.html', 1200);
    } catch (error) {
      errBox(error.message);
    }
  });
}