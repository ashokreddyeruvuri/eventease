// ===== dashboard.js: dashboards, admin event details, create/edit event form =====
const stat = (n, label) => `<div class="stat"><b>${n}</b>${label}</div>`;
const table = (heads, rows) => `<div class="table-wrap"><table><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr>${rows.join('') || `<tr><td colspan="${heads.length}" class="muted">Nothing here yet.</td></tr>`}</table></div>`;
const evById = id => getEvents().find(e => e.id === id);
const userById = id => getUsers().find(u => u.id === id);

function eventCard(e) {
  const image = e.image ? `<div class="card-img" style="background-image:url('${e.image}')"></div>` : `<div class="card-img ${'cat-' + e.category}" aria-label="${esc(e.category)} event"><span>${CATEGORIES[e.category] || '🎉'}</span></div>`;
  return `<article class="card">
    ${image}
    <div class="card-body">
      <div class="card-tags"><span class="tag">${esc(e.category)}</span><span class="tag ${eventStatusLabel(e) === 'Sold out' ? 'tag-sold' : ''}">${eventStatusLabel(e)}</span></div>
      <h3>${esc(e.name)}</h3>
      <p>${esc(e.desc || 'A memorable event for friends, communities and creators.')}</p>
      <div class="mini-meta"><span>📅 ${dateLabel(e)}</span><span>📍 ${esc(e.location)}</span></div>
      <div class="card-foot"><strong>${fmtPrice(e.price)}</strong><a class="text-link" href="event-details.html?id=${e.id}">View details</a></div>
    </div>
  </article>`;
}

function renderHomePage() {
  const featuredBox = document.getElementById('featured');
  const upcomingBox = document.getElementById('upcoming');
  const catsBox = document.getElementById('categories');
  if (!featuredBox && !upcomingBox && !catsBox) return;

  const featured = getEvents().filter(e => e.featured).slice(0, 3);
  const upcoming = getEvents().filter(e => eventStatus(e) === 'Upcoming').slice(0, 4);

  if (featuredBox) featuredBox.innerHTML = featured.map(eventCard).join('') || '<p class="muted">No featured events right now.</p>';
  if (upcomingBox) upcomingBox.innerHTML = upcoming.map(eventCard).join('') || '<p class="muted">No upcoming events available.</p>';
  if (catsBox) catsBox.innerHTML = Object.entries(CATEGORIES).map(([name, emoji]) => `<div class="cat-tile ${'cat-' + name}" title="${esc(name)}"><span>${emoji}</span>${esc(name)}</div>`).join('');
}

function populateEventFilters() {
  const categorySelect = document.getElementById('category');
  if (!categorySelect) return;
  const current = categorySelect.value || '';
  categorySelect.innerHTML = '<option value="">All Categories</option>' + Object.keys(CATEGORIES).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  categorySelect.value = current || '';
}

function renderEventCatalog() {
  const grid = document.getElementById('eventGrid');
  const noResults = document.getElementById('noResults');
  const search = (document.getElementById('search')?.value || '').trim().toLowerCase();
  const selectedCategory = document.getElementById('category')?.value || '';
  const selectedDate = document.getElementById('dateFilter')?.value || '';
  const sortBy = document.getElementById('sort')?.value || 'date';
  if (!grid) return;

  let list = [...getEvents()];
  if (search) list = list.filter(e => [e.name, e.location, e.desc].some(value => String(value || '').toLowerCase().includes(search)));
  if (selectedCategory) list = list.filter(e => e.category === selectedCategory);
  if (selectedDate) list = list.filter(e => eventDates(e).some(d => d.date === selectedDate));

  list.sort((a, b) => {
    if (sortBy === 'priceLow') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'priceHigh') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'seats') return (b.seats || 0) - (a.seats || 0);
    return new Date(a.date || a.dates?.[0]?.date || '2100-01-01') - new Date(b.date || b.dates?.[0]?.date || '2100-01-01');
  });

  grid.innerHTML = list.map(eventCard).join('') || '';
  if (noResults) {
    noResults.hidden = list.length > 0;
  }
}

function initEventCatalog() {
  const grid = document.getElementById('eventGrid');
  if (!grid) return;
  populateEventFilters();
  const searchInput = document.getElementById('search');
  const categorySelect = document.getElementById('category');
  const dateFilter = document.getElementById('dateFilter');
  const sortSelect = document.getElementById('sort');
  [searchInput, categorySelect, dateFilter, sortSelect].forEach(el => {
    if (el) el.addEventListener('input', renderEventCatalog);
    if (el) el.addEventListener('change', renderEventCatalog);
  });
  renderEventCatalog();
}

function renderEventDetails() {
  const box = document.getElementById('details');
  if (!box) return;
  const id = Number(new URLSearchParams(location.search).get('id'));
  const e = evById(id);
  if (!e) {
    box.innerHTML = '<div class="container narrow"><div class="panel"><h2>Event not found</h2><p class="muted">This event may have been removed or the link is invalid.</p><a class="btn" href="events.html">Browse events</a></div></div>';
    return;
  }

  const user = getSession();
  const regs = getRegs();
  const booked = !!user && regs.some(r => r.userId === user.id && r.eventId === e.id);
  const seatsLeft = Number(e.seats ?? 0);
  const price = fmtPrice(e.price);
  const heroStyle = e.image ? `style="background-image:url('${e.image}')"` : `class="banner cat-${e.category}"`;
  const status = eventStatusLabel(e);
  const bookingButton = booked
    ? '<button class="btn btn-light" disabled>You have registered!</button>'
    : `<button class="btn" onclick="registerForEvent(${e.id})" ${seatsLeft <= 0 || status === 'Completed' ? 'disabled' : ''}>${status === 'Completed' ? 'Event completed' : seatsLeft > 0 ? 'Reserve seat' : 'Sold out'}</button>`;

  box.innerHTML = `
    <div class="banner ${e.image ? '' : 'cat-' + e.category}" ${heroStyle}>
      ${e.image ? '' : (CATEGORIES[e.category] || '🎉')}
    </div>
    <section class="container detail-grid">
      <div class="panel">
        <div class="card-tags"><span class="tag">${esc(e.category)}</span><span class="tag ${status === 'Sold out' ? 'tag-sold' : ''}">${status}</span></div>
        <h2 style="margin-top:12px">${esc(e.name)}</h2>
        <p class="muted">${esc(e.desc || '')}</p>
        <div class="stats">${stat(e.capacity, 'Capacity')}${stat(seatsLeft, 'Seats Left')}${stat(price, 'Ticket Price')}</div>
        <p>📍 ${esc(e.location)}</p>
        <p>👤 Organizer: ${esc(e.organizer)}</p>
        ${e.url ? `<p>🔗 <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">Visit event website</a></p>` : ''}
        <h3>Agenda</h3>
        <ul class="schedule">${eventDates(e).map((d, i) => `<li><b>Day ${i + 1}</b> — ${fmtDate(d.date)} at ${d.time}</li>`).join('')}</ul>
      </div>
      <aside class="panel">
        <h3>Booking</h3>
        <p><strong>${price}</strong></p>
        <p class="muted">${seatsLeft > 0 ? `${seatsLeft} seats left` : 'No seats available'}</p>
        ${bookingButton}
        <div class="payment-box">
          <h3>Ticket Summary</h3>
          <p>${esc(e.name)}</p>
          <p>${dateLabel(e)}</p>
          <p>${esc(e.location)}</p>
          <p>Price: <strong>${price}</strong></p>
        </div>
      </aside>
    </section>`;
}

function registerForEvent(eventId) {
  const user = getSession();
  if (!user) {
    location.href = 'login.html';
    return;
  }

  const e = evById(eventId);
  if (!e) return showToast('Event not found.');
  if (eventStatus(e) === 'Completed') return showToast('Registration is closed for this event.');
  if ((e.seats ?? 0) <= 0) return showToast('This event is sold out.');

  const regs = getRegs();
  if (regs.some(r => r.userId === user.id && r.eventId === eventId)) {
    showToast('You are already registered for this event.');
    return;
  }

  regs.push({ id: Date.now(), userId: user.id, eventId, ticket: `EE-${Date.now().toString().slice(-6)}`, date: todayStr(), status: 'Confirmed' });
  e.seats = Math.max((e.seats ?? 0) - 1, 0);
  DB.set('registrations', regs);
  DB.set('events', getEvents().map(item => item.id === eventId ? e : item));
  showToast('Your seat is confirmed!');
  renderEventDetails();
}

function initEventPage() {
  if (document.getElementById('eventGrid') || document.getElementById('details')) {
    if (!requireRole('attendee', 'organizer', 'admin')) {
      sessionStorage.setItem('ee_after_login', location.pathname + location.search);
      return;
    }
    sessionStorage.removeItem('ee_after_login');
  }

  renderHomePage();
  initEventCatalog();
  renderEventDetails();
}

// ---------- Attendee ----------
function renderAttendee(user) {
  const mine = getRegs().filter(r => r.userId === user.id).map(r => ({ ...r, ev: evById(r.eventId) })).filter(r => r.ev);
  const upcoming = mine.filter(r => lastDate(r.ev) >= todayStr()), past = mine.filter(r => lastDate(r.ev) < todayStr());
  const rows = list => list.map(r => `<tr><td>${esc(r.ev.name)}</td><td>${dateLabel(r.ev)}</td><td>${esc(r.ev.location)}</td></tr>`);
  return `<h2>Welcome, ${esc(user.name)} 👋</h2><div class="stats">${stat(mine.length, 'Registered Events')}${stat(upcoming.length, 'Upcoming')}${stat(past.length, 'Past')}</div>
  <h3>Upcoming Events</h3>${table(['Event', 'Date', 'Location'], rows(upcoming))}
  <h3>Past Events</h3>${table(['Event', 'Date', 'Location'], rows(past))}
  <h3>My Tickets</h3>${mine.map(r => `<div class="ticket"><b>🎟️ ${esc(r.ev.name)}</b><br>Ticket: <b>${r.ticket}</b> · ${dateLabel(r.ev)} · ${esc(r.ev.location)}</div>`).join('') || '<p class="muted">No tickets yet. <a href="events.html">Browse events</a></p>'}
  <h3 style="margin-top:20px">Profile</h3><div class="panel"><p><b>Name:</b> ${esc(user.name)}</p><p><b>Email:</b> ${esc(user.email)}</p><p><b>Role:</b> Attendee</p><br><button class="btn btn-danger" onclick="logout()">Logout</button></div>`;
}

// ---------- Organizer ----------
function renderOrganizer(user) {
  const events = getEvents().filter(e => e.organizerId === user.id), ids = events.map(e => e.id);
  const regs = getRegs().filter(r => ids.includes(r.eventId));
  const revenue = regs.reduce((s, r) => s + (evById(r.eventId)?.price || 0), 0);
  const rows = events.map(e => `<tr><td>${esc(e.name)}</td><td>${dateLabel(e)}</td><td>${e.capacity - e.seats}/${e.capacity}</td><td>${fmtPrice(e.price)}</td>
    <td><button class="btn btn-sm btn-light" onclick="showEventDetails(${e.id})">Details</button> <a class="btn btn-sm" href="create-event.html?edit=${e.id}">Edit</a> <button class="btn btn-sm btn-danger" onclick="deleteEvent(${e.id})">Delete</button></td></tr>`);
  const regRows = regs.map(r => `<tr><td>${esc(userById(r.userId)?.name || 'Removed')}</td><td>${esc(evById(r.eventId)?.name)}</td><td>${r.ticket}</td><td>${r.status}</td></tr>`);
  return `<h2>Organizer Dashboard</h2><div class="stats">${stat(events.length, 'My Events')}${stat(regs.length, 'Total Attendees')}${stat('₹' + revenue, 'Ticket Revenue')}</div>
  <a class="btn" href="create-event.html">+ Create Event</a><h3 style="margin-top:24px">My Events</h3>${table(['Event', 'Dates', 'Attendees', 'Price', 'Actions'], rows)}
  <h3>Registrations & Tickets</h3>${table(['Attendee', 'Event', 'Ticket', 'Status'], regRows)}`;
}
function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  DB.set('events', getEvents().filter(e => e.id !== id));
  DB.set('registrations', getRegs().filter(r => r.eventId !== id)); initDashboard();
}

// ---------- Admin ----------
function renderAdmin() {
  const users = getUsers(), regs = getRegs();
  const userRows = users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role}</td><td>${u.role === 'admin' ? '-' : `<button class="btn btn-sm btn-danger" onclick="adminDelete('users',${u.id})">Remove</button>`}</td></tr>`);
  const evRows = getEvents().map(e => `<tr><td>${esc(e.name)}</td><td>${esc(e.organizer)}</td><td>${dateLabel(e)}</td><td>${regs.filter(r => r.eventId === e.id).length}/${e.capacity}</td><td>${eventStatus(e)}</td>
    <td><button class="btn btn-sm btn-light" onclick="showEventDetails(${e.id})">Details</button> <button class="btn btn-sm btn-danger" onclick="adminDelete('events',${e.id})">Delete</button></td></tr>`);
  const regRows = regs.map(r => `<tr><td>${esc(userById(r.userId)?.name || 'Removed')}</td><td>${esc(evById(r.eventId)?.name || 'Removed')}</td><td>${r.ticket}</td><td><button class="btn btn-sm btn-danger" onclick="adminDelete('registrations',${r.id})">Cancel</button></td></tr>`);
  return `<h2>Admin Dashboard</h2><div class="stats">${stat(users.filter(u => u.role === 'attendee').length, 'Total Users')}${stat(users.filter(u => u.role === 'organizer').length, 'Organizers')}${stat(getEvents().length, 'Events')}${stat(regs.length, 'Registrations')}</div>
  <h3>Manage Users & Organizers</h3>${table(['Name', 'Email', 'Role', 'Action'], userRows)}
  <h3>Manage Events</h3>${table(['Event', 'Organizer', 'Dates', 'Registered', 'Status', 'Action'], evRows)}
  <h3>Manage Registrations</h3>${table(['Attendee', 'Event', 'Ticket', 'Action'], regRows)}`;
}

// ---------- Event details pop-up (admin and organizer) ----------
function showEventDetails(id) {
  const e = evById(id); if (!e) return;
  closeModal();
  const regs = getRegs().filter(r => r.eventId === id);
  const pct = Math.round(regs.length / e.capacity * 100);
  const regRows = regs.map(r => { const u = userById(r.userId); return `<tr><td>${esc(u?.name || 'Removed')}</td><td>${esc(u?.email || '-')}</td><td>${r.ticket}</td><td>${r.date}</td></tr>`; });
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg" id="modal" onclick="if(event.target===this)closeModal()"><div class="modal">
    <button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>
    <span class="tag">${e.category}</span> <span class="tag tag-ok">${eventStatus(e)}</span>
    <h2 style="margin-top:8px">${esc(e.name)}</h2><p class="muted" style="margin-bottom:16px">${esc(e.desc)}</p>
    <div class="stats">${stat(e.capacity, 'Capacity')}${stat(regs.length, 'Registered')}${stat(e.seats, 'Seats Left')}${stat(fmtPrice(e.price), 'Ticket Price')}${stat('₹' + regs.length * e.price, 'Revenue')}</div>
    <p class="small muted">Seats filled: ${pct}%</p><div class="bar"><i style="width:${pct}%"></i></div>
    <p>📍 ${esc(e.location)}</p><p>👤 Organizer: ${esc(e.organizer)}</p>
    <h3 style="margin-top:16px">Event Dates (${eventDates(e).length} ${eventDates(e).length > 1 ? 'days' : 'day'})</h3>
    <ul class="schedule">${eventDates(e).map((d, i) => `<li><b>Day ${i + 1}</b> — ${fmtDate(d.date)} at ${d.time}</li>`).join('')}</ul>
    <h3 style="margin-top:16px">Registered Attendees (${regs.length})</h3>${table(['Name', 'Email', 'Ticket', 'Registered On'], regRows)}
  </div></div>`);
}
const closeModal = () => document.getElementById('modal')?.remove();
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeModal(); });

// Removes registrations that match the test function and gives their seats back
function removeRegs(shouldRemove) {
  const events = getEvents();
  const kept = getRegs().filter(r => {
    if (!shouldRemove(r)) return true;
    const ev = events.find(e => e.id === r.eventId);
    if (ev) ev.seats++;
    return false;
  });
  DB.set('events', events); DB.set('registrations', kept);
}

// Deletes a user, event or registration and cleans up everything linked to it
function adminDelete(key, id) {
  if (!confirm('Are you sure?')) return;
  if (key === 'registrations') removeRegs(r => r.id === id);
  else if (key === 'events') DB.set('registrations', getRegs().filter(r => r.eventId !== id));
  else if (key === 'users') {
    const theirEvents = getEvents().filter(e => e.organizerId === id).map(e => e.id);
    removeRegs(r => r.userId === id || theirEvents.includes(r.eventId));
    DB.set('events', getEvents().filter(e => e.organizerId !== id));
  }
  if (key !== 'registrations') DB.set(key, DB.get(key, []).filter(x => x.id !== id));
  initDashboard();
}

// Picks the right dashboard from the data-role attribute on the page
function initDashboard() {
  const box = document.getElementById('dash'); if (!box) return;
  const role = box.dataset.role, user = requireRole(role); if (!user) return;
  box.innerHTML = { attendee: renderAttendee, organizer: renderOrganizer, admin: renderAdmin }[role](user);
}

// ---------- Create / Edit event form ----------
// Reads the chosen image and shrinks it (max 800px wide) so it fits in browser storage
function readImage(file, done) {
  if (!file) return done(null);
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 800 / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      done(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// Adds one "date + time" row to the Event Dates section
function addDateRow(date = '', time = '') {
  const box = document.getElementById('datesBox');
  const row = document.createElement('div'); row.className = 'date-row';
  row.innerHTML = `<input type="date" class="d-date" value="${date}"><input type="time" class="d-time" value="${time}"><button type="button" class="btn btn-sm btn-danger" title="Remove this date">✕</button>`;
  row.querySelector('button').onclick = () => box.children.length > 1 ? row.remove() : showToast('At least one date is required');
  box.appendChild(row);
}

// Replaces all rows with N consecutive days starting from the first date (for 2 days, 3 days, a week...)
function autoFillDays(n) {
  const box = document.getElementById('datesBox');
  const first = box.querySelector('.d-date').value, time = box.querySelector('.d-time').value || '09:00';
  if (!first) return showToast('Pick the first date before auto-filling');
  box.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = new Date(first + 'T00:00'); d.setDate(d.getDate() + i);
    addDateRow(d.toLocaleDateString('en-CA'), time);
  }
}

// Collects the rows. Returns the sorted list, null if something is empty, or 'dup' if a date repeats
function readDates() {
  const rows = [...document.querySelectorAll('#datesBox .date-row')].map(r => ({ date: r.querySelector('.d-date').value, time: r.querySelector('.d-time').value }));
  if (rows.some(r => !r.date || !r.time)) return null;
  if (new Set(rows.map(r => r.date)).size !== rows.length) return 'dup';
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

function initEventForm() {
  const form = document.getElementById('eventForm'); if (!form) return;
  const user = requireRole('organizer', 'admin'); if (!user) return;
  Object.keys(CATEGORIES).forEach(c => form.category.add(new Option(c, c)));
  const editId = Number(new URLSearchParams(location.search).get('edit')), editing = getEvents().find(e => e.id === editId);
  // An organizer may only edit their own events
  if (editing && user.role === 'organizer' && editing.organizerId !== user.id) { location.href = 'organizer-dashboard.html'; return; }

  if (editing) { // pre-fill the form when editing
    document.getElementById('formTitle').textContent = 'Edit Event';
    ['name', 'category', 'location', 'capacity', 'price'].forEach(k => form[k].value = editing[k]);
    form.desc.value = editing.desc;
    eventDates(editing).forEach(d => addDateRow(d.date, d.time));
  } else addDateRow();

  document.getElementById('addDate').onclick = () => addDateRow();
  document.getElementById('quickDays').addEventListener('change', e => {
    const n = Math.min(30, Math.max(1, Number(e.target.value) || 1));
    autoFillDays(n);
  });

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const err = msg => document.getElementById('formError').textContent = msg;
    if (!form.name.value.trim() || !form.desc.value.trim() || !form.location.value.trim() || !form.capacity.value || form.price.value === '')
      return err('Please fill in all required fields.');
    const dates = readDates();
    if (!dates) return err('Please enter a date and time for every row.');
    if (dates === 'dup') return err('Each date must be different.');
    readImage(form.image.files[0], img => saveEvent(form, user, editing, img || editing?.image, dates));
  });
}

function saveEvent(form, user, editing, image, dates) {
  const events = getEvents(), cap = Number(form.capacity.value);
  // date/time keep the FIRST day so sorting and old code keep working; dates holds every day
  const data = { name: form.name.value.trim(), desc: form.desc.value.trim(), category: form.category.value, dates, date: dates[0].date, time: dates[0].time,
    location: form.location.value.trim(), capacity: cap, price: Number(form.price.value), image };
  if (editing) {
    // Find the event inside THIS fresh array, otherwise the edit is lost
    const target = events.find(e => e.id === editing.id);
    const taken = target.capacity - target.seats;
    Object.assign(target, data, { seats: Math.max(cap - taken, 0) });
  } else {
    events.push({ id: Date.now(), organizerId: user.id, organizer: user.name, seats: cap, ...data });
  }
  try { DB.set('events', events); }
  catch { return document.getElementById('formError').textContent = 'Storage is full. Try a smaller image.'; }
  showToast('Event saved!');
  setTimeout(() => location.href = dashboardLink(user), 1000);
}

initDashboard(); initEventForm();