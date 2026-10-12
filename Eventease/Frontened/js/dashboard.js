// ===== dashboard.js: dashboards, admin event details, create/edit event form =====
const stat = (n, label) => `<div class="stat"><b>${n}</b>${label}</div>`;
const table = (heads, rows) => `<div class="table-wrap"><table><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr>${rows.join('') || `<tr><td colspan="${heads.length}" class="muted">Nothing here yet.</td></tr>`}</table></div>`;
const evById = id => getEvents().find(e => e.id === id);
const userById = id => getUsers().find(u => u.id === id);

// ---------- Attendee ----------
function renderAttendee(user) {
  const mine = getRegs().filter(r => r.userId === user.id).map(r => ({ ...r, ev: evById(r.eventId) })).filter(r => r.ev);
  const upcoming = mine.filter(r => lastDate(r.ev) >= todayStr()), past = mine.filter(r => lastDate(r.ev) < todayStr());
  const rows = list => list.map(r => `<tr><td>${esc(r.ev.name)}</td><td>${dateLabel(r.ev)}</td><td>${esc(r.ev.location)}</td></tr>`);
  return `<h2>Welcome, ${esc(user.name)} 👋</h2><div class="stats">${stat(mine.length, 'Registered Events')}${stat(upcoming.length, 'Upcoming')}${stat(past.length, 'Past')}</div>
  <h3>Upcoming Events</h3>${table(['Event', 'Date', 'Location'], rows(upcoming))}
  <h3>Past Events</h3>${table(['Event', 'Date', 'Location'], rows(past))}
  <h3>My Tickets</h3>${mine.map(r => `<div class="ticket" id="ticket-${r.id}"><b>🎟️ ${esc(r.ev.name)}</b><br>Ticket: <b>${esc(r.ticket)}</b> · ${dateLabel(r.ev)} · ${esc(r.ev.location)}<br>${r.ev.url ? `<a href="${esc(r.ev.url)}" target="_blank" rel="noopener noreferrer">Event website</a>` : ''}<div class="ticket-actions"><button class="btn btn-sm btn-light" onclick="printTicket(${r.id})">Print / Download</button><button class="btn btn-sm btn-danger" onclick="cancelRegistration(${r.id})">Cancel registration</button></div></div>`).join('') || '<p class="muted">No tickets yet. <a href="events.html">Browse events</a></p>'}
  <h3 style="margin-top:20px">Profile</h3><div class="panel profile-panel">
    <div class="profile-summary">${user.photo ? `<img class="profile-photo" src="${esc(user.photo)}" alt="${esc(user.name)} profile photo">` : '<div class="profile-photo profile-placeholder" aria-hidden="true">👤</div>'}<div><span class="tag">Attendee account</span><h3>${esc(user.name)}</h3><p class="muted">${esc(user.email)}</p><p class="small muted">${esc(user.college || 'College not added')} · ${esc(user.address || 'Address not added')}</p></div></div>
    <button class="btn btn-sm btn-light" onclick="showProfile(${user.id})">View / edit profile</button>
  </div>`;
}

function profilePanel(user, label) {
  return `<div class="panel profile-panel">
    <div class="profile-summary">${user.photo ? `<img class="profile-photo" src="${esc(user.photo)}" alt="${esc(user.name)} profile photo">` : '<div class="profile-photo profile-placeholder" aria-hidden="true">👤</div>'}<div><span class="tag">${esc(label)}</span><h3>${esc(user.name)}</h3><p class="muted">${esc(user.email)}</p><p class="small muted">${esc(user.college || 'College not added')} · ${esc(user.address || 'Address not added')}</p></div></div>
    <button class="btn btn-sm btn-light" onclick="showProfile(${user.id})">View / edit profile</button>
  </div>`;
}

// ---------- Organizer ----------
function renderOrganizer(user) {
  const events = getEvents().filter(e => e.organizerId === user.id), ids = events.map(e => e.id);
  const regs = getRegs().filter(r => ids.includes(r.eventId));
  const revenue = regs.reduce((s, r) => s + (evById(r.eventId)?.price || 0), 0);
  const rows = events.map(e => `<tr><td>${esc(e.name)}</td><td>${dateLabel(e)}</td><td>${e.capacity - e.seats}/${e.capacity}</td><td>${fmtPrice(e.price)}</td>
    <td><button class="btn btn-sm btn-light" onclick="showEventDetails(${e.id})">Details</button> <a class="btn btn-sm" href="create-event.html?edit=${e.id}">Edit</a> <button class="btn btn-sm btn-danger" onclick="deleteEvent(${e.id})">Delete</button></td></tr>`);
  const regRows = regs.map(r => {
    const attendee = userById(r.userId);
    return `<tr><td>${attendee ? `<button class="table-link" onclick="showUserDetails(${attendee.id})">${esc(attendee.name)}</button>` : 'Removed'}</td><td>${esc(evById(r.eventId)?.name)}</td><td>${r.ticket}</td><td>${r.status}</td></tr>`;
  });
  return `<h2>Organizer Dashboard</h2>${profilePanel(user, 'Organizer account')}<div class="stats">${stat(events.length, 'My Events')}${stat(regs.length, 'Total Attendees')}${stat('₹' + revenue, 'Ticket Revenue')}</div>
  <a class="btn" href="create-event.html">+ Create Event</a><h3 style="margin-top:24px">My Events</h3>${table(['Event', 'Dates', 'Attendees', 'Price', 'Actions'], rows)}
  <h3>Registrations & Tickets</h3>${table(['Attendee', 'Event', 'Ticket', 'Status'], regRows)}`;
}
function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  DB.set('events', getEvents().filter(e => e.id !== id));
  DB.set('registrations', getRegs().filter(r => r.eventId !== id)); initDashboard();
}

function cancelRegistration(id) {
  const user = getSession();
  const registration = getRegs().find(r => r.id === id && r.userId === user?.id);
  if (!registration || !confirm('Cancel this registration? The seat will become available again.')) return;
  const events = getEvents();
  const event = events.find(e => e.id === registration.eventId);
  if (event) event.seats = Math.min(Number(event.seats || 0) + 1, Number(event.capacity || event.seats || 0));
  DB.set('registrations', getRegs().filter(r => r.id !== id));
  DB.set('events', events);
  showToast('Registration cancelled.');
  initDashboard();
}

function printTicket(id) {
  const registration = getRegs().find(item => item.id === id);
  const event = registration && evById(registration.eventId);
  const user = getSession();
  if (!registration || !event) return showToast('Ticket details are unavailable.');
  const printWindow = window.open('', '_blank', 'width=700,height=700');
  if (!printWindow) return showToast('Allow pop-ups to print your ticket.');
  const agenda = eventDates(event).map(day => `${fmtDate(day.date)} at ${day.time}`).join(' • ');
  const website = event.url ? `<p><b>Event website:</b> <a href="${esc(event.url)}" target="_blank" rel="noopener noreferrer">${esc(event.url)}</a></p>` : '';
  printWindow.document.write(`<html><head><title>EventEase Ticket - ${esc(event.name)}</title><link rel="stylesheet" href="css/style.css"></head>
    <body><main class="container print-page"><div class="ticket print-ticket">
      <div class="print-ticket__header"><span class="tag">${esc(event.category)}</span><span class="tag tag-ok">Confirmed</span></div>
      <h1>${esc(event.name)}</h1>
      <p class="muted">EventEase admission ticket</p>
      <div class="print-ticket__details">
        <p><b>Ticket holder:</b> ${esc(user?.name || 'Attendee')}</p>
        <p><b>Ticket number:</b> ${esc(registration.ticket)}</p>
        <p><b>Date and time:</b> ${esc(agenda)}</p>
        <p><b>Location:</b> ${esc(event.location)}</p>
        <p><b>Organizer:</b> ${esc(event.organizer || 'EventEase')}</p>
        <p><b>Ticket price:</b> ${esc(fmtPrice(event.price))}</p>
      </div>
      ${website}
      <p class="muted small">Present this ticket at the event entrance.</p>
    </div><div class="print-actions"><button class="btn" onclick="window.print()">Print ticket</button><button class="btn btn-light" onclick="window.close()">Close</button></div></main></body></html>`);
  printWindow.document.close();
  printWindow.focus();
}

// ---------- Admin ----------
function renderAdmin() {
  const users = getUsers(), regs = getRegs();
  const userRows = users.map(u => `<tr><td><button class="table-link" onclick="showUserDetails(${u.id})">${esc(u.name)}</button></td><td>${esc(u.email)}</td><td>${u.role}</td><td>${u.role === 'admin' ? '-' : `<button class="btn btn-sm btn-danger" onclick="adminDelete('users',${u.id})">Remove</button>`}</td></tr>`);
  const evRows = getEvents().map(e => `<tr><td>${esc(e.name)}</td><td>${esc(e.organizer)}</td><td>${dateLabel(e)}</td><td>${regs.filter(r => r.eventId === e.id).length}/${e.capacity}</td><td>${eventStatus(e)}</td>
    <td><button class="btn btn-sm btn-light" onclick="showEventDetails(${e.id})">Details</button> <button class="btn btn-sm btn-danger" onclick="adminDelete('events',${e.id})">Delete</button></td></tr>`);
  const regRows = regs.map(r => `<tr><td>${esc(userById(r.userId)?.name || 'Removed')}</td><td>${esc(evById(r.eventId)?.name || 'Removed')}</td><td>${r.ticket}</td><td><button class="btn btn-sm btn-danger" onclick="adminDelete('registrations',${r.id})">Cancel</button></td></tr>`);
  const admin = getSession();
  return `<h2>Admin Dashboard</h2>${profilePanel(admin, 'Administrator account')}<div class="stats">${stat(users.filter(u => u.role === 'attendee').length, 'Total Users')}${stat(users.filter(u => u.role === 'organizer').length, 'Organizers')}${stat(getEvents().length, 'Events')}${stat(regs.length, 'Registrations')}</div>
  <h3>Manage Users & Organizers</h3>${table(['Name', 'Email', 'Role', 'Action'], userRows)}
  <h3>Manage Events</h3>${table(['Event', 'Organizer', 'Dates', 'Registered', 'Status', 'Action'], evRows)}
  <h3>Manage Registrations</h3>${table(['Attendee', 'Event', 'Ticket', 'Action'], regRows)}`;
}

function showUserDetails(id) {
  const user = userById(id);
  if (!user) return showToast('User not found.');
  closeModal();
  const registrations = getRegs().filter(reg => reg.userId === user.id);
  const organizedEvents = getEvents().filter(event => event.organizerId === user.id);
  const registrationRows = registrations.map(reg => {
    const event = evById(reg.eventId);
    return `<tr><td>${esc(event?.name || 'Removed')}</td><td>${event ? dateLabel(event) : '-'}</td><td>${esc(reg.ticket)}</td><td>${esc(reg.status || 'Confirmed')}</td></tr>`;
  });
  const eventRows = organizedEvents.map(event => `<tr><td>${esc(event.name)}</td><td>${dateLabel(event)}</td><td>${event.seats}/${event.capacity}</td><td>${eventStatus(event)}</td></tr>`);
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg" id="modal" onclick="if(event.target===this)closeModal()"><div class="modal">
    <button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>
    <span class="tag">${esc(user.role)}</span>
    <h2 style="margin-top:8px">${esc(user.name)}</h2>
    <p class="muted">${esc(user.email)}</p>
    <div class="stats">${stat(user.id, 'User ID')}${stat(registrations.length, 'Registrations')}${stat(organizedEvents.length, 'Organized Events')}</div>
    ${registrations.length ? `<h3>Registered Events</h3>${table(['Event', 'Date', 'Ticket', 'Status'], registrationRows)}` : ''}
    ${organizedEvents.length ? `<h3>Organized Events</h3>${table(['Event', 'Dates', 'Seats Left', 'Status'], eventRows)}` : '<p class="muted">No event activity yet.</p>'}
  </div></div>`);
}

function showProfile(id) {
  const user = userById(id);
  if (!user) return showToast('Profile not found.');
  closeModal();
  const roleLabel = user.role === 'organizer' ? 'Organizer profile' : user.role === 'admin' ? 'Administrator profile' : 'Attendee profile';
  const registrations = getRegs().filter(reg => reg.userId === user.id);
  const upcoming = registrations.filter(reg => {
    const event = evById(reg.eventId);
    return event && lastDate(event) >= todayStr();
  }).length;
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg" id="modal" onclick="if(event.target===this)closeModal()"><div class="modal">
    <button class="modal-x" onclick="closeModal()" aria-label="Close profile">✕</button>
    <span class="tag">${roleLabel}</span>
    <h2 style="margin-top:8px">My profile</h2>
    <form id="profileForm" class="form-card profile-form" novalidate>
      ${user.photo ? `<img class="profile-photo profile-photo-large" src="${esc(user.photo)}" alt="Current profile photo">` : ''}
      <label for="profileName">Name<input id="profileName" value="${esc(user.name)}" minlength="3" required></label>
      <label for="profileEmail">Email<input id="profileEmail" value="${esc(user.email)}" readonly></label>
      <label for="profileCollege">College<input id="profileCollege" value="${esc(user.college || '')}" maxlength="120" placeholder="Your college name"></label>
      <label for="profileAddress">Address<textarea id="profileAddress" rows="3" maxlength="240" placeholder="Your address">${esc(user.address || '')}</textarea></label>
      <label for="profilePhoto">Profile photo<input id="profilePhoto" type="file" accept="image/png,image/jpeg,image/webp"></label>
      <div class="stats">${stat(registrations.length, 'Registered Events')}${stat(upcoming, 'Upcoming Events')}</div>
      <p class="error" id="profileError" role="alert"></p>
      <div class="profile-actions"><button type="submit" class="btn">Save changes</button><button type="button" class="btn btn-danger" onclick="logout()">Logout</button></div>
    </form>
  </div></div>`);
  document.getElementById('profileForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = document.getElementById('profileName').value.trim();
    const college = document.getElementById('profileCollege').value.trim();
    const address = document.getElementById('profileAddress').value.trim();
    const photoFile = document.getElementById('profilePhoto').files[0];
    const error = document.getElementById('profileError');
    if (name.length < 3) {
      error.textContent = 'Name must be at least 3 characters.';
      return;
    }
    if (photoFile && !photoFile.type.startsWith('image/')) {
      error.textContent = 'Please choose a valid image file.';
      return;
    }
    readImage(photoFile, photo => {
      try {
        const users = getUsers().map(item => item.id === user.id ? { ...item, name, college, address, photo: photo || item.photo } : item);
        DB.set('users', users);
        DB.set('session', { ...getSession(), name, college, address, photo: photo || user.photo });
      } catch {
        error.textContent = 'Profile photo is too large. Choose a smaller image.';
        return;
      }
      closeModal();
      showToast('Profile updated successfully.');
      initDashboard();
    });
  });
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
    <ul class="schedule">${eventDates(e).map((d, i) => `<li><b>Day ${i + 1}</b> — ${fmtDate(d.date)}<ul>${eventSlots(d).map(slot => `<li>${esc(slot.title || 'Time slot')}: ${esc(slot.start || d.time)}${slot.end ? `–${esc(slot.end)}` : ''}</li>`).join('')}</ul></li>`).join('')}</ul>
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

function initHomePage() {
  renderHomePage();
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
    ['name', 'category', 'location', 'url', 'capacity', 'price'].forEach(k => form[k].value = editing[k] || '');
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
    if (!form.name.value.trim() || !form.desc.value.trim() || !form.location.value.trim() || !form.url.value.trim() || !form.capacity.value || form.price.value === '')
      return err('Please fill in all required fields.');
    try {
      const url = new URL(form.url.value.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported URL scheme');
    } catch {
      return err('Enter a valid event URL beginning with http:// or https://.');
    }
    if (Number(form.capacity.value) < 1 || Number(form.price.value) < 0)
      return err('Capacity must be at least 1 and price cannot be negative.');
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
    location: form.location.value.trim(), url: form.url.value.trim(), capacity: cap, price: Number(form.price.value), image };
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