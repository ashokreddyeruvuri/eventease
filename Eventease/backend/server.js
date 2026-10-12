import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'db.json');
const app = express();
const sessions = new Map();
const port = Number(process.env.PORT || 4000);

const seed = {
  users: [
    { id: 1, name: 'Admin User', email: 'admin@eventease.com', passwordHash: hashPassword('admin123'), role: 'admin' },
    { id: 2, name: 'Rahul Verma', email: 'org@eventease.com', passwordHash: hashPassword('org123'), role: 'organizer' },
    { id: 3, name: 'Priya Sharma', email: 'user@eventease.com', passwordHash: hashPassword('user123'), role: 'attendee' },
  ],
  events: [
    { id: 1, organizerId: 2, organizer: 'Rahul Verma', name: 'DevFest 2026', category: 'Technology', date: '2026-11-14', time: '09:00', dates: [{ date: '2026-11-14', time: '09:00' }, { date: '2026-11-15', time: '09:00' }, { date: '2026-11-16', time: '09:00' }], location: 'Hyderabad Tech Park', capacity: 300, seats: 120, price: 499, featured: true, desc: 'A 3-day developer festival with talks on AI, web and cloud.' },
    { id: 2, organizerId: 2, organizer: 'Rahul Verma', name: 'Sunset Music Fest', category: 'Music', date: '2026-10-25', time: '17:00', location: 'Bengaluru Palace Grounds', capacity: 1000, seats: 340, price: 999, featured: true, desc: 'Live bands, DJs and food stalls under the open sky.' },
  ],
  registrations: [],
};

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function publicUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

async function readDb() {
  try {
    return JSON.parse(await fs.readFile(dbFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dbFile, JSON.stringify(seed, null, 2));
    return structuredClone(seed);
  }
}

async function writeDb(db) {
  await fs.mkdir(dataDir, { recursive: true });
  const temporaryFile = `${dbFile}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(db, null, 2));
  await fs.rename(temporaryFile, dbFile);
}

function auth(required = true) {
  return async (req, res, next) => {
    const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    const userId = token && sessions.get(token);
    if (!userId) {
      if (required) return res.status(401).json({ error: 'Authentication required.' });
      return next();
    }
    const db = await readDb();
    const user = db.users.find(item => item.id === userId);
    if (!user) return res.status(401).json({ error: 'Session is no longer valid.' });
    req.user = user;
    next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: 'You do not have permission for this action.' });
}

function validateEvent(input) {
  const required = ['name', 'category', 'date', 'time', 'location'];
  if (required.some(field => typeof input[field] !== 'string' || !input[field].trim())) return 'Name, category, date, time, and location are required.';
  if (!Number.isInteger(Number(input.capacity)) || Number(input.capacity) < 1) return 'Capacity must be at least 1.';
  if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0) return 'Price cannot be negative.';
  if (input.url) {
    try {
      const url = new URL(input.url);
      if (!['http:', 'https:'].includes(url.protocol)) return 'Event URL must use http:// or https://.';
    } catch {
      return 'Event URL must be valid.';
    }
  }
  return null;
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'eventease-backend' }));

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password, role = 'attendee' } = req.body;
    if (typeof name !== 'string' || name.trim().length < 3) return res.status(400).json({ error: 'Name must be at least 3 characters.' });
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (!['attendee', 'organizer'].includes(role)) return res.status(400).json({ error: 'Invalid account role.' });
    const db = await readDb();
    const normalizedEmail = email.trim().toLowerCase();
    if (db.users.some(user => user.email === normalizedEmail)) return res.status(409).json({ error: 'Email is already registered.' });
    const user = { id: nextId(db.users), name: name.trim(), email: normalizedEmail, passwordHash: hashPassword(password), role };
    db.users.push(user);
    await writeDb(db);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const db = await readDb();
    const user = db.users.find(item => item.email === String(req.body.email || '').trim().toLowerCase());
    if (!user || !verifyPassword(String(req.body.password || ''), user.passwordHash)) return res.status(401).json({ error: 'Incorrect email or password.' });
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, user.id);
    res.json({ token, user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post('/api/auth/logout', auth(), (req, res) => {
  const token = req.get('authorization').replace(/^Bearer\s+/i, '');
  sessions.delete(token);
  res.status(204).end();
});

app.get('/api/events', async (req, res, next) => {
  try { res.json((await readDb()).events); } catch (error) { next(error); }
});

app.post('/api/events', auth(), requireRole('organizer', 'admin'), async (req, res, next) => {
  try {
    const error = validateEvent(req.body);
    if (error) return res.status(400).json({ error });
    const db = await readDb();
    const capacity = Number(req.body.capacity);
    const event = { ...req.body, id: nextId(db.events), organizerId: req.user.id, organizer: req.user.name, capacity, seats: capacity, price: Number(req.body.price || 0) };
    db.events.push(event);
    await writeDb(db);
    res.status(201).json(event);
  } catch (error) { next(error); }
});

app.patch('/api/events/:id', auth(), requireRole('organizer', 'admin'), async (req, res, next) => {
  try {
    const db = await readDb();
    const event = db.events.find(item => item.id === Number(req.params.id));
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (req.user.role !== 'admin' && event.organizerId !== req.user.id) return res.status(403).json({ error: 'You can only edit your own events.' });
    const error = validateEvent({ ...event, ...req.body });
    if (error) return res.status(400).json({ error });
    Object.assign(event, req.body, { capacity: Number(req.body.capacity ?? event.capacity), price: Number(req.body.price ?? event.price) });
    event.seats = Math.max(event.capacity - (Number(event.capacity) - Number(event.seats)), 0);
    await writeDb(db);
    res.json(event);
  } catch (error) { next(error); }
});

app.post('/api/events/:id/register', auth(), requireRole('attendee'), async (req, res, next) => {
  try {
    const db = await readDb();
    const event = db.events.find(item => item.id === Number(req.params.id));
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.seats <= 0) return res.status(409).json({ error: 'This event is sold out.' });
    if (db.registrations.some(item => item.eventId === event.id && item.userId === req.user.id)) return res.status(409).json({ error: 'You are already registered for this event.' });
    const registration = { id: nextId(db.registrations), eventId: event.id, userId: req.user.id, ticket: `EE-${Date.now().toString().slice(-6)}`, date: new Date().toISOString().slice(0, 10), status: 'Confirmed' };
    event.seats -= 1;
    db.registrations.push(registration);
    await writeDb(db);
    res.status(201).json(registration);
  } catch (error) { next(error); }
});

app.delete('/api/events/:id/register', auth(), requireRole('attendee'), async (req, res, next) => {
  try {
    const db = await readDb();
    const index = db.registrations.findIndex(item => item.eventId === Number(req.params.id) && item.userId === req.user.id);
    if (index < 0) return res.status(404).json({ error: 'Registration not found.' });
    const event = db.events.find(item => item.id === Number(req.params.id));
    if (event) event.seats = Math.min(event.seats + 1, event.capacity);
    db.registrations.splice(index, 1);
    await writeDb(db);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get('/api/registrations/me', auth(), async (req, res, next) => {
  try { res.json((await readDb()).registrations.filter(item => item.userId === req.user.id)); } catch (error) { next(error); }
});

app.patch('/api/me', auth(), async (req, res, next) => {
  try {
    const db = await readDb();
    const user = db.users.find(item => item.id === req.user.id);
    const name = String(req.body.name ?? user.name).trim();
    if (name.length < 3) return res.status(400).json({ error: 'Name must be at least 3 characters.' });
    Object.assign(user, { name, college: String(req.body.college ?? user.college ?? '').trim(), address: String(req.body.address ?? user.address ?? '').trim(), photo: String(req.body.photo ?? user.photo ?? '') });
    await writeDb(db);
    res.json(publicUser(user));
  } catch (error) { next(error); }
});

app.get('/api/admin/users', auth(), requireRole('admin'), async (req, res, next) => {
  try { res.json((await readDb()).users.map(publicUser)); } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(port, () => console.log(`EventEase backend listening on http://localhost:${port}`));
