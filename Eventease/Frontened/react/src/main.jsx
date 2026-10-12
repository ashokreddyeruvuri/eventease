import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  categories, dateLabel, ensureSeeded, getEvents, getRegistrations, getSession, getUsers,
  priceLabel, readDb, writeDb
} from './data';
import './style.css';

const go = path => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); };
const emailOk = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const today = () => new Date().toLocaleDateString('en-CA');
const eventStatus = event => today() < event.date ? 'Upcoming' : today() <= (event.dates?.at(-1)?.date || event.date) ? 'Ongoing' : 'Completed';

function Layout({ children }) {
  const user = getSession();
  return <><header><nav className="navbar"><div className="nav-inner"><a className="logo" href="/" onClick={e => { e.preventDefault(); go('/'); }}>Event<span>Ease</span></a><ul className="nav-links">
    <li><a href="/" onClick={e => { e.preventDefault(); go('/'); }}>Home</a></li><li><a href="/events" onClick={e => { e.preventDefault(); go('/events'); }}>Events</a></li><li><a href="/#categories">About</a></li><li><a href="mailto:support@eventease.com">Contact</a></li>
    {user ? <><li><a href={`/dashboard/${user.role}`} onClick={e => { e.preventDefault(); go(`/dashboard/${user.role}`); }}>Dashboard</a></li><li><a href="/" onClick={e => { e.preventDefault(); localStorage.removeItem('ee_session'); go('/'); }}>Logout</a></li></> : <><li><a href="/login" onClick={e => { e.preventDefault(); go('/login'); }}>Login</a></li><li><a href="/register" onClick={e => { e.preventDefault(); go('/register'); }}>Register</a></li></>}
  </ul></div></nav></header><main>{children}</main><footer><p>© 2026 EventEase · Discover. Register. Experience.</p><p className="small">Developed by Eruvuri Ashok Reddy</p><p className="small">support@eventease.com</p></footer></>;
}

function EventCard({ event }) {
  return <article className="card"><div className={`card-img cat-${event.category}`}>{categories[event.category]}</div><div className="card-body"><span className="tag">{event.category}</span><h3>{event.name}</h3><p>{event.desc}</p><p className="muted">📅 {dateLabel(event)} · 📍 {event.location}</p><div className="card-foot"><strong>{priceLabel(event.price)}</strong><a className="btn btn-sm" href={`/events/${event.id}`} onClick={e => { e.preventDefault(); go(`/events/${event.id}`); }}>View details</a></div></div></article>;
}

function Home() {
  const events = getEvents();
  return <><section className="hero"><div className="container hero-inner"><div className="hero-copy"><span className="eyebrow">Your events, beautifully organized</span><h1>Discover. Register. Experience.</h1><p>Find inspiring tech meetups, music nights, workshops, and campus experiences in one vibrant platform.</p><div className="hero-actions"><button className="btn" onClick={() => go('/events')}>Explore Events</button><button className="btn btn-light" onClick={() => go('/create-event')}>Create Event</button></div><ul className="hero-points"><li>500+ attendees joined this month</li><li>Live seats and instant ticketing</li><li>Trusted by organizers and communities</li></ul></div><div className="hero-card"><div className="mini-badge">Trending now</div><h3>DevFest 2026</h3><p>AI, web, cloud and startup ideas under one roof.</p><div className="mini-meta"><span>📅 Nov 14</span><span>📍 Hyderabad</span></div><div className="mini-row"><strong>₹499</strong><a className="text-link" href="/events/1" onClick={e => { e.preventDefault(); go('/events/1'); }}>View details</a></div></div></div></section><section className="container"><div className="section-head"><p className="eyebrow small">How it works</p><h2>Plan smarter, faster</h2></div><div className="feature-grid">{[['1','Browse','Explore curated events by category, location, and date.'],['2','Book','Secure your seat instantly with real-time availability.'],['3','Enjoy','Show up, meet people, and create memorable experiences.']].map(item => <article className="feature-card" key={item[0]}><div className="icon">{item[0]}</div><h3>{item[1]}</h3><p>{item[2]}</p></article>)}</div></section><section className="container"><h2>Featured Events</h2><div className="grid">{events.filter(e => e.featured).map(event => <EventCard event={event} key={event.id} />)}</div></section><section className="container" id="categories"><h2>Browse Categories</h2><div className="cats">{Object.entries(categories).map(([name, icon]) => <button className="cat" key={name} onClick={() => go(`/events?category=${name}`)}>{icon} {name}</button>)}</div></section></>;
}

function Events() {
  const params = new URLSearchParams(window.location.search);
  const [filters, setFilters] = useState({ search: '', category: params.get('category') || '', date: '', sort: 'date' });
  let events = getEvents().filter(e => (!filters.search || e.name.toLowerCase().includes(filters.search.toLowerCase())) && (!filters.category || e.category === filters.category) && (!filters.date || e.date === filters.date));
  events = [...events].sort((a, b) => filters.sort === 'priceLow' ? a.price - b.price : filters.sort === 'priceHigh' ? b.price - a.price : filters.sort === 'seats' ? b.seats - a.seats : a.date.localeCompare(b.date));
  return <section className="container"><h2>All Events</h2><div className="filters"><input placeholder="Search events..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} /><select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}><option value="">All Categories</option>{Object.keys(categories).map(c => <option key={c}>{c}</option>)}</select><input type="date" value={filters.date} onChange={e => setFilters({ ...filters, date: e.target.value })} /><select value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}><option value="date">Sort: Date</option><option value="priceLow">Price: Low to High</option><option value="priceHigh">Price: High to Low</option><option value="seats">Most Seats</option></select></div><div className="grid">{events.map(event => <EventCard event={event} key={event.id} />)}</div>{!events.length && <p className="muted">No events match your filters.</p>}</section>;
}

function Details({ id }) {
  const event = getEvents().find(item => item.id === Number(id));
  const [message, setMessage] = useState('');
  if (!event) return <section className="container"><h2>Event not found</h2></section>;
  const register = () => {
    const user = getSession();
    if (!user) { sessionStorage.setItem('ee_after_login', `/events/${id}`); go('/login'); return; }
    if (event.seats <= 0) return setMessage('This event is sold out.');
    const regs = getRegistrations();
    if (regs.some(reg => reg.userId === user.id && reg.eventId === event.id)) return setMessage('You are already registered.');
    writeDb('registrations', [...regs, { id: Date.now(), userId: user.id, eventId: event.id, ticket: `EE-${Date.now().toString().slice(-6)}` }]);
    writeDb('events', getEvents().map(item => item.id === event.id ? { ...item, seats: item.seats - 1 } : item));
    setMessage('Registration confirmed!');
  };
  return <section className="container details"><p className="eyebrow small">{event.category} · {eventStatus(event)}</p><h1>{event.name}</h1><p>{event.desc}</p><div className="panel"><p>📅 <strong>{dateLabel(event)}</strong></p><p>📍 {event.location}</p><p>🎟️ {event.seats} seats remaining · {priceLabel(event.price)}</p><button className="btn" onClick={register}>Register now</button>{message && <p className="success">{message}</p>}</div></section>;
}

function Auth({ register = false }) {
  const [error, setError] = useState('');
  const submit = e => { e.preventDefault(); const form = new FormData(e.currentTarget); const email = String(form.get('email')).trim().toLowerCase(); if (!emailOk(email)) return setError('Enter a valid email address.'); if (register) { const name = String(form.get('name')).trim(); const password = String(form.get('password')); if (name.length < 3) return setError('Name must be at least 3 characters.'); if (password.length < 6) return setError('Password must be at least 6 characters.'); if (password !== form.get('confirm')) return setError('Passwords do not match.'); const users = getUsers(); if (users.some(user => user.email === email)) return setError('Email is already registered.'); writeDb('users', [...users, { id: Date.now(), name, email, password, role: form.get('role') }]); go('/login'); } else { const user = getUsers().find(item => item.email === email && item.password === form.get('password')); if (!user) return setError('Incorrect email or password.'); writeDb('session', { id: user.id, name: user.name, email: user.email, role: user.role }); const target = sessionStorage.getItem('ee_after_login'); sessionStorage.removeItem('ee_after_login'); go(target || `/dashboard/${user.role}`); } };
  return <section className="container narrow"><form className="form-card" onSubmit={submit}><h2>{register ? 'Create Account' : 'Welcome Back'}</h2>{register && <label>Full Name<input name="name" required /></label>}<label>Email<input name="email" type="email" required /></label><label>Password<input name="password" type="password" required /></label>{register && <><label>Confirm Password<input name="confirm" type="password" required /></label><label>Role<select name="role"><option value="attendee">Attendee</option><option value="organizer">Organizer</option></select></label></>}<p className="error">{error}</p><button className="btn" type="submit">{register ? 'Register' : 'Login'}</button><p>{register ? <>Have an account? <a href="/login" onClick={e => { e.preventDefault(); go('/login'); }}>Login</a></> : <>No account? <a href="/register" onClick={e => { e.preventDefault(); go('/register'); }}>Register here</a></>}</p></form></section>;
}

function Dashboard({ role }) {
  const user = getSession();
  if (!user || user.role !== role) return <section className="container narrow"><div className="panel"><h2>Login required</h2><button className="btn" onClick={() => go('/login')}>Login</button></div></section>;
  const events = getEvents(); const regs = getRegistrations().filter(reg => reg.userId === user.id);
  if (role === 'attendee') return <section className="container"><h2>Welcome, {user.name}</h2><h3>Your registrations</h3><div className="grid">{regs.map(reg => { const event = events.find(item => item.id === reg.eventId); return event ? <EventCard event={event} key={reg.id} /> : null; })}</div><div className="panel"><p><b>Email:</b> {user.email}</p><p><b>Role:</b> Attendee</p></div></section>;
  if (role === 'organizer') return <section className="container"><div className="section-head"><h2>Organizer Dashboard</h2><button className="btn" onClick={() => go('/create-event')}>Create event</button></div><div className="grid">{events.filter(event => event.organizerId === user.id).map(event => <EventCard event={event} key={event.id} />)}</div></section>;
  return <section className="container"><h2>Admin Dashboard</h2><div className="panel"><h3>Users</h3>{getUsers().map(item => <p key={item.id}>{item.name} · {item.email} · {item.role}</p>)}</div><div className="panel"><h3>Events</h3>{events.map(event => <p key={event.id}>{event.name} · {event.seats} seats left</p>)}</div></section>;
}

function CreateEvent() {
  const [error, setError] = useState('');
  const submit = e => { e.preventDefault(); const user = getSession(); if (!user || user.role !== 'organizer') return go('/login'); const form = new FormData(e.currentTarget); const event = { id: Date.now(), organizerId: user.id, organizer: user.name, name: form.get('name'), desc: form.get('desc'), category: form.get('category'), date: form.get('date'), time: form.get('time'), location: form.get('location'), capacity: Number(form.get('capacity')), seats: Number(form.get('capacity')), price: Number(form.get('price')) }; if (!event.name || !event.date || !event.location || event.capacity < 1) return setError('Please complete all required fields.'); writeDb('events', [...getEvents(), event]); go(`/dashboard/${user.role}`); };
  return <section className="container narrow"><form className="form-card" onSubmit={submit}><h2>Create Event</h2><label>Event Name<input name="name" required /></label><label>Description<textarea name="desc" rows="4" required /></label><label>Category<select name="category">{Object.keys(categories).map(c => <option key={c}>{c}</option>)}</select></label><div className="row"><label>Date<input name="date" type="date" required /></label><label>Time<input name="time" type="time" required /></label></div><label>Location<input name="location" required /></label><div className="row"><label>Maximum Capacity<input name="capacity" type="number" min="1" required /></label><label>Ticket Price<input name="price" type="number" min="0" defaultValue="0" required /></label></div><p className="error">{error}</p><button className="btn" type="submit">Submit</button></form></section>;
}

function App() {
  const [, refresh] = useState(0);
  useEffect(() => { ensureSeeded(); const listener = () => refresh(value => value + 1); window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener); }, []);
  const path = window.location.pathname.replace(/\/+$/, '') || '/'; const parts = path.split('/').filter(Boolean);
  let page = path === '/' ? <Home /> : path === '/events' ? <Events /> : path === '/login' ? <Auth /> : path === '/register' ? <Auth register /> : path === '/create-event' ? <CreateEvent /> : parts[0] === 'events' ? <Details id={parts[1]} /> : parts[0] === 'dashboard' ? <Dashboard role={parts[1] || 'attendee'} /> : <Home />;
  return <Layout>{page}</Layout>;
}

createRoot(document.getElementById('root')).render(<App />);
