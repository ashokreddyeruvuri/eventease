export const categories = { Technology: '💻', Music: '🎵', Sports: '⚽', Workshops: '🛠️', Conferences: '🎤', Cultural: '🎭' };

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const cache = { events: [], registrations: [], users: [], session: null };

function token() {
  return localStorage.getItem('ee_token');
}

async function request(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Cannot connect to EventEase backend at ${API_BASE}. Start the backend on port 4000 and try again.`);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message || body.error || `Request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

function notify() {
  window.dispatchEvent(new Event('ee:data-ready'));
}

export async function ensureSeeded() {
  cache.events = await request('/events');
  if (token()) {
    if (!cache.session) cache.session = await request('/me');
    cache.registrations = await request('/registrations/me');
    if (cache.session?.role === 'admin') cache.users = await request('/admin/users');
  }
  notify();
}

export const getEvents = () => cache.events;
export const getUsers = () => cache.users;
export const getRegistrations = () => cache.registrations;
export const getSession = () => cache.session;

export async function registerUser({ name, email, password, role }) {
  const result = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
  return result.user;
}

export async function login(email, password) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('ee_token', result.token);
  cache.session = result.user;
  await ensureSeeded();
  return result.user;
}

export async function logout() {
  try {
    if (token()) await request('/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('ee_token');
    cache.session = null;
    cache.registrations = [];
    cache.users = [];
    notify();
  }
}

export async function registerForEvent(eventId) {
  const registration = await request(`/events/${eventId}/register`, { method: 'POST' });
  cache.registrations = [...cache.registrations, registration];
  cache.events = await request('/events');
  notify();
  return registration;
}

export async function createEvent(event) {
  const created = await request('/events', { method: 'POST', body: JSON.stringify(event) });
  cache.events = [...cache.events, created];
  notify();
  return created;
}

export const priceLabel = price => price > 0 ? `₹${price}` : 'Free';
export const dateLabel = event => {
  const dates = event.dates?.length ? event.dates : [{ date: event.date }];
  const format = value => new Date(`${value}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return dates.length === 1 ? format(dates[0].date) : `${format(dates[0].date)} – ${format(dates.at(-1).date)} (${dates.length} days)`;
};
