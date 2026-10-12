// ===== auth.js: login and registration with validation =====
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const errBox = msg => document.getElementById('formError').textContent = msg;

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', ev => {
    ev.preventDefault();
    const email = loginForm.email.value.trim().toLowerCase(), password = loginForm.password.value;
    if (!emailOk(email) || !password) return errBox('Enter a valid email and password.');
    const user = getUsers().find(u => u.email === email && u.password === password);
    if (!user) return errBox('Incorrect email or password.');
    DB.set('session', { id: user.id, name: user.name, email: user.email, role: user.role });
    const returnTo = sessionStorage.getItem('ee_after_login');
    sessionStorage.removeItem('ee_after_login');
    if (returnTo) {
      const target = new URL(returnTo, location.href);
      if (target.origin === location.origin && /\/(?:events|event-details)\.html$/.test(target.pathname)) {
        location.href = target.href;
        return;
      }
    }
    location.href = dashboardLink(user); // role-based redirect
  });
  document.getElementById('forgot').onclick = e => { e.preventDefault(); showToast('Reset link sent (demo)'); };
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', ev => {
    ev.preventDefault();
    const f = registerForm, users = getUsers(), email = f.email.value.trim().toLowerCase();
    if (f.name.value.trim().length < 3) return errBox('Name must be at least 3 characters.');
    if (!emailOk(email)) return errBox('Enter a valid email address.');
    if (f.password.value.length < 6) return errBox('Password must be at least 6 characters.');
    if (f.password.value !== f.confirm.value) return errBox('Passwords do not match.');
    if (users.some(u => u.email === email)) return errBox('Email is already registered.');
    users.push({ id: Date.now(), name: f.name.value.trim(), email, password: f.password.value, role: f.role.value });
    DB.set('users', users); showToast('Account created! Please login.');
    setTimeout(() => location.href = 'login.html', 1200);
  });
}