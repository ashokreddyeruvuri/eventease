// ===== main.js: shared data store, navbar, footer, helpers =====
const CATEGORIES = { Technology:'💻', Music:'🎵', Sports:'⚽', Workshops:'🛠️', Conferences:'🎤', Cultural:'🎭' };

// Tiny localStorage "database" so the site works without a backend
const DB = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem('ee_' + key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { localStorage.setItem('ee_' + key, JSON.stringify(value)); }
};

const sched = [['09:00','Registration & Welcome'],['10:00','Opening Session'],['13:00','Lunch & Networking'],['15:00','Main Activity'],['17:00','Closing']];
const ORG = {organizerId:2, organizer:'Rahul Verma'};

// "dates" holds every day of a multi-day event. date/time always hold the FIRST day.
const SAMPLE_EVENTS = [
  {id:1,name:'DevFest 2026',category:'Technology',date:'2026-11-14',time:'09:00',dates:[{date:'2026-11-14',time:'09:00'},{date:'2026-11-15',time:'09:00'},{date:'2026-11-16',time:'09:00'}],location:'Hyderabad Tech Park',capacity:300,seats:120,price:499,featured:true,desc:'A 3-day developer festival with talks on AI, web and cloud.'},
  {id:2,name:'Sunset Music Fest',category:'Music',date:'2026-10-25',time:'17:00',location:'Bengaluru Palace Grounds',capacity:1000,seats:340,price:999,featured:true,desc:'Live bands, DJs and food stalls under the open sky.'},
  {id:3,name:'Inter-College Football Cup',category:'Sports',date:'2026-12-05',time:'08:00',location:'City Sports Stadium',capacity:500,seats:210,price:0,featured:true,desc:'16 colleges compete for the championship trophy.'},
  {id:4,name:'Web Development Bootcamp',category:'Workshops',date:'2026-10-18',time:'10:00',dates:[{date:'2026-10-18',time:'10:00'},{date:'2026-10-19',time:'10:00'}],location:'Innovation Lab, Kadapa',capacity:60,seats:18,price:299,desc:'A 2-day hands-on HTML, CSS and JavaScript workshop for beginners.'},
  {id:5,name:'Startup Summit India',category:'Conferences',date:'2026-11-28',time:'10:00',location:'Chennai Trade Centre',capacity:800,seats:455,price:1499,featured:true,desc:'Founders, investors and students meet to share ideas.'},
  {id:6,name:'Rangoli & Folk Dance Night',category:'Cultural',date:'2026-10-20',time:'18:00',location:'Town Hall, Tirupati',capacity:400,seats:150,price:150,desc:'Celebrate traditions with folk dances and rangoli contests.'},
  {id:7,name:'AI & Machine Learning Meetup',category:'Technology',date:'2026-12-12',time:'15:00',location:'Online / Hyderabad',capacity:150,seats:90,price:0,desc:'Lightning talks and demos from local ML engineers.'},
  {id:8,name:'Photography Masterclass',category:'Workshops',date:'2026-09-10',time:'11:00',location:'Art Gallery, Vijayawada',capacity:40,seats:0,price:350,desc:'Learn composition and lighting from a pro photographer.'}
].map(e => ({ ...ORG, ...e }));
const SAMPLE_USERS = [
  {id:1,name:'Admin User',email:'admin@eventease.com',password:'admin123',role:'admin'},
  {id:2,name:'Rahul Verma',email:'org@eventease.com',password:'org123',role:'organizer'},
  {id:3,name:'Priya Sharma',email:'user@eventease.com',password:'user123',role:'attendee'}
];

// Seed sample data on first visit
if (!DB.get('events')) { DB.set('events', SAMPLE_EVENTS); DB.set('users', SAMPLE_USERS); DB.set('registrations', []); }

const getEvents = () => DB.get('events', []);
const getUsers = () => DB.get('users', []);
const getRegs = () => DB.get('registrations', []);
const getSession = () => DB.get('session', null);
const fmtPrice = p => (p > 0 ? '₹' + p : 'Free');
const eventStatusLabel = e => Number(e.seats ?? 0) <= 0 ? 'Sold out' : eventStatus(e);
const todayStr = () => new Date().toLocaleDateString('en-CA'); // local date as YYYY-MM-DD
const dashboardLink = u => `${u.role}-dashboard.html`;

// ----- Multi-day event helpers -----
// Older events only have date/time, so fall back to a one-day list
const eventDates = e => (e.dates && e.dates.length ? e.dates : [{ date: e.date, time: e.time }]);
const lastDate = e => eventDates(e).at(-1).date;
const fmtDate = d => new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
// "14 Nov 2026" for one day, "14 Nov 2026 – 16 Nov 2026 (3 days)" for several
function dateLabel(e) {
  const ds = eventDates(e);
  return ds.length === 1 ? fmtDate(ds[0].date) : `${fmtDate(ds[0].date)} – ${fmtDate(ds.at(-1).date)} (${ds.length} days)`;
}
// Upcoming / Ongoing / Completed, based on the first and last date
function eventStatus(e) {
  const t = todayStr();
  return t < eventDates(e)[0].date ? 'Upcoming' : t <= lastDate(e) ? 'Ongoing' : 'Completed';
}

// Escapes user-typed text before it is put into innerHTML (prevents HTML injection)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

// Shows a small message at the bottom-right of the screen
function showToast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
}

// Redirects to login unless the logged-in user still exists and has an allowed role
function requireRole(...roles) {
  const u = getSession();
  const stillExists = u && getUsers().some(x => x.id === u.id);
  if (!u || !stillExists || !roles.includes(u.role)) {
    localStorage.removeItem('ee_session'); location.href = 'login.html'; return null;
  }
  return u;
}

function logout() { localStorage.removeItem('ee_session'); location.href = 'index.html'; }

// Builds the navbar (changes depending on login state) and the footer
function renderLayout() {
  const u = getSession();
  const auth = u
    ? `<li><a href="${dashboardLink(u)}">Dashboard</a></li><li><a href="#" onclick="logout()">Logout</a></li>`
    : `<li><a href="login.html">Login</a></li><li><a href="register.html">Register</a></li>`;
  document.getElementById('navbar').innerHTML = `<nav class="navbar"><div class="nav-inner">
    <a class="logo" href="index.html">Event<span>Ease</span></a><button class="menu-btn" id="menuBtn">☰</button>
    <ul class="nav-links" id="navLinks"><li><a href="index.html">Home</a></li><li><a href="events.html">Events</a></li>
    <li><a href="index.html#categories">About</a></li><li><a href="mailto:support@eventease.com">Contact</a></li>${auth}</ul></div></nav>`;
  document.getElementById('menuBtn').onclick = () => document.getElementById('navLinks').classList.toggle('open');
  document.getElementById('footer').innerHTML = '<p>© 2026 EventEase · Discover. Register. Experience.</p><p class="small">Developed by Eruvuri Ashok Reddy</p><p class="small">support@eventease.com</p>';
}
renderLayout();

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initEventPage === 'function') initEventPage();
  if (typeof initDashboard === 'function') initDashboard();
  if (typeof initEventForm === 'function') initEventForm();
});