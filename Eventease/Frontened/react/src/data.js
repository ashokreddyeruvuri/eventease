export const categories = { Technology: '💻', Music: '🎵', Sports: '⚽', Workshops: '🛠️', Conferences: '🎤', Cultural: '🎭' };

export const sampleEvents = [
  { id: 1, name: 'DevFest 2026', category: 'Technology', date: '2026-11-14', time: '09:00', dates: [{ date: '2026-11-14', time: '09:00' }, { date: '2026-11-15', time: '09:00' }, { date: '2026-11-16', time: '09:00' }], location: 'Hyderabad Tech Park', capacity: 300, seats: 120, price: 499, featured: true, desc: 'A 3-day developer festival with talks on AI, web and cloud.' },
  { id: 2, name: 'Sunset Music Fest', category: 'Music', date: '2026-10-25', time: '17:00', location: 'Bengaluru Palace Grounds', capacity: 1000, seats: 340, price: 999, featured: true, desc: 'Live bands, DJs and food stalls under the open sky.' },
  { id: 3, name: 'Inter-College Football Cup', category: 'Sports', date: '2026-12-05', time: '08:00', location: 'City Sports Stadium', capacity: 500, seats: 210, price: 0, featured: true, desc: '16 colleges compete for the championship trophy.' },
  { id: 4, name: 'Web Development Bootcamp', category: 'Workshops', date: '2026-10-18', time: '10:00', dates: [{ date: '2026-10-18', time: '10:00' }, { date: '2026-10-19', time: '10:00' }], location: 'Innovation Lab, Kadapa', capacity: 60, seats: 18, price: 299, desc: 'A 2-day hands-on HTML, CSS and JavaScript workshop for beginners.' },
  { id: 5, name: 'Startup Summit India', category: 'Conferences', date: '2026-11-28', time: '10:00', location: 'Chennai Trade Centre', capacity: 800, seats: 455, price: 1499, featured: true, desc: 'Founders, investors and students meet to share ideas.' },
  { id: 6, name: 'Rangoli & Folk Dance Night', category: 'Cultural', date: '2026-10-20', time: '18:00', location: 'Town Hall, Tirupati', capacity: 400, seats: 150, price: 150, desc: 'Celebrate traditions with folk dances and rangoli contests.' },
  { id: 7, name: 'AI & Machine Learning Meetup', category: 'Technology', date: '2026-12-12', time: '15:00', location: 'Online / Hyderabad', capacity: 150, seats: 90, price: 0, desc: 'Lightning talks and demos from local ML engineers.' },
  { id: 8, name: 'Photography Masterclass', category: 'Workshops', date: '2026-09-10', time: '11:00', location: 'Art Gallery, Vijayawada', capacity: 40, seats: 0, price: 350, desc: 'Learn composition and lighting from a pro photographer.' }
].map(event => ({ ...event, organizerId: 2, organizer: 'Rahul Verma' }));

export const sampleUsers = [
  { id: 1, name: 'Admin User', email: 'admin@eventease.com', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Rahul Verma', email: 'org@eventease.com', password: 'org123', role: 'organizer' },
  { id: 3, name: 'Priya Sharma', email: 'user@eventease.com', password: 'user123', role: 'attendee' }
];

export function readDb(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`ee_${key}`)) ?? fallback; } catch { return fallback; }
}

export function writeDb(key, value) { localStorage.setItem(`ee_${key}`, JSON.stringify(value)); }

export function ensureSeeded() {
  if (!readDb('events', null)) {
    writeDb('events', sampleEvents);
    writeDb('users', sampleUsers);
    writeDb('registrations', []);
  }
}

export const getEvents = () => readDb('events', []);
export const getUsers = () => readDb('users', []);
export const getRegistrations = () => readDb('registrations', []);
export const getSession = () => readDb('session', null);
export const priceLabel = price => price > 0 ? `₹${price}` : 'Free';
export const dateLabel = event => {
  const dates = event.dates?.length ? event.dates : [{ date: event.date }];
  const format = value => new Date(`${value}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return dates.length === 1 ? format(dates[0].date) : `${format(dates[0].date)} – ${format(dates.at(-1).date)} (${dates.length} days)`;
};
