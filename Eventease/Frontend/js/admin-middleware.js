// Protects the admin dashboard after the server has loaded the current session.
function requireAdminPage() {
  const user = getSession();
  if (!user || user.role !== 'admin') {
    if (!user) localStorage.removeItem('ee_token');
    location.replace('login.html?admin=1');
    return null;
  }
  return user;
}
