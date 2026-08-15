// StudioOS - Main Application Logic

// Get today's date string in YYYY-MM-DD format
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get tomorrow's date string in YYYY-MM-DD format
function getTomorrowString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Maps a booking status to its badge CSS class. Shared by the dashboard,
// bookings table, and payments table so the logic only lives in one place.
function getStatusBadgeClass(status) {
  if (status === 'Confirmed') return 'badge-success';
  if (status === 'Cancelled') return 'badge-danger';
  return 'badge-info';
}

// Initial Mock Data
const defaultClients = [
  { id: "c1", name: "Alice Johnson", email: "alice@example.com", phone: "555-0101", notes: "Prefers outdoor portrait shoots. Needs high contrast editing." },
  { id: "c2", name: "Bob Smith", email: "bob@smithmedia.com", phone: "555-0102", notes: "Corporate client. Standard headshots and corporate branding packages." },
  { id: "c3", name: "Charlie Brown", email: "charlie@brownfamily.org", phone: "555-0103", notes: "Family shoot regular. Kids are active, needs fast shutter photography." }
];

const defaultTeam = [
  { id: "t1", name: "John Doe", role: "Lead Photographer", email: "john@studioos.com", status: "Active" },
  { id: "t2", name: "Jane Smith", role: "Associate Photographer", email: "jane@studioos.com", status: "Active" },
  { id: "t3", name: "Mark Wilson", role: "Assistant", email: "mark@studioos.com", status: "Active" }
];

const defaultBookings = [
  {
    id: "b1",
    clientId: "c1",
    shootType: "Portrait",
    date: getTodayString(),
    startTime: "10:00",
    endTime: "11:30",
    location: "Central Park Studio",
    photographerId: "t1",
    totalAmount: 350.00,
    amountPaid: 150.00,
    status: "Confirmed",
    notes: "Golden hour vibe requested."
  },
  {
    id: "b2",
    clientId: "c2",
    shootType: "Commercial",
    date: getTodayString(),
    startTime: "13:00",
    endTime: "16:00",
    location: "Tech Corp HQ Suite 400",
    photographerId: "t1",
    totalAmount: 1200.00,
    amountPaid: 1200.00,
    status: "Confirmed",
    notes: "Require 15 headshots and office B-roll."
  },
  {
    id: "b3",
    clientId: "c3",
    shootType: "Family",
    date: getTomorrowString(),
    startTime: "16:00",
    endTime: "18:00",
    location: "Sunnyvale Meadows",
    photographerId: "t2",
    totalAmount: 450.00,
    amountPaid: 0.00,
    status: "Pending",
    notes: "Weather backup location is the indoor studio."
  }
];

const defaultSettings = {
  studioName: "Capture Studio",
  currency: "₹",
  email: "hello@capturestudio.com"
};

// App State
let state = {
  clients: JSON.parse(localStorage.getItem('studioos_clients')) || defaultClients,
  team: JSON.parse(localStorage.getItem('studioos_team')) || defaultTeam,
  bookings: JSON.parse(localStorage.getItem('studioos_bookings')) || defaultBookings,
  settings: JSON.parse(localStorage.getItem('studioos_settings')) || defaultSettings
};

// Tracks whether the booking modal is currently showing the inline
// "quick-add client" fields instead of the client dropdown.
let isAddingNewClientInline = false;

// Save state to localStorage
function saveState() {
  localStorage.setItem('studioos_clients', JSON.stringify(state.clients));
  localStorage.setItem('studioos_team', JSON.stringify(state.team));
  localStorage.setItem('studioos_bookings', JSON.stringify(state.bookings));
  localStorage.setItem('studioos_settings', JSON.stringify(state.settings));
}

// Check if overlapping bookings exist for a photographer
function checkConflict(photographerId, date, startTime, endTime, excludeBookingId = null) {
  if (!photographerId || !date || !startTime || !endTime) return false;

  const getMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const newStart = getMinutes(startTime);
  const newEnd = getMinutes(endTime);

  return state.bookings.some(booking => {
    if (booking.id === excludeBookingId) return false;
    if (booking.status === "Cancelled") return false;
    if (booking.photographerId !== photographerId) return false;
    if (booking.date !== date) return false;

    const existStart = getMinutes(booking.startTime);
    const existEnd = getMinutes(booking.endTime);

    // Overlap condition: startA < endB && endA > startB
    return (newStart < existEnd && newEnd > existStart);
  });
}

// Navigation / Router
//
// navigateToView is a top-level function (not scoped inside initNavigation)
// so other code paths — like saveBooking — can jump to a view themselves,
// e.g. only switching to Bookings once a booking has actually been saved,
// rather than navigating up front just to open a modal.
function navigateToView(viewId) {
  const sidebar = document.getElementById('sidebar');
  const navItems = sidebar.querySelectorAll('ul.nav-links li');
  const views = document.querySelectorAll('.view-section');
  const pageTitle = document.getElementById('pageTitle');

  views.forEach(view => {
    view.classList.toggle('active', view.id === viewId);
  });
  navItems.forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewId);
  });
  pageTitle.textContent = viewId.charAt(0).toUpperCase() + viewId.slice(1);

  renderView(viewId);

  // Close sidebar on mobile after navigating
  sidebar.classList.remove('active');
}

function initNavigation() {
  const sidebar = document.getElementById('sidebar');
  const navItems = sidebar.querySelectorAll('ul.nav-links li');
  const menuToggleBtn = document.getElementById('menuToggleBtn');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = item.getAttribute('data-view');
      navigateToView(viewId);
    });
  });

  menuToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  // Handle hash navigation on load
  const hash = window.location.hash.replace('#', '');
  if (hash && ['dashboard', 'calendar', 'clients', 'bookings', 'payments', 'team', 'settings'].includes(hash)) {
    navigateToView(hash);
  } else {
    navigateToView('dashboard');
  }
}

// Client UI Controls & Rendering
function renderClients(filterText = '') {
  const tbody = document.getElementById('clientsTableBody');
  tbody.innerHTML = '';

  const query = filterText.toLowerCase().trim();
  const filtered = state.clients.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.email.toLowerCase().includes(query) ||
    c.phone.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No clients found.</td></tr>`;
    return;
  }

  filtered.forEach(client => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(client.name)}</strong></td>
      <td>${escapeHTML(client.email)}</td>
      <td>${escapeHTML(client.phone)}</td>
      <td class="cell-truncate">
        ${escapeHTML(client.notes || '')}
      </td>
      <td>
        <button class="btn btn-sm btn-edit-client" data-id="${client.id}">Edit</button>
        <button class="btn btn-sm btn-danger btn-delete-client" data-id="${client.id}">Delete</button>
      </td>
    `;

    tr.querySelector('.btn-edit-client').addEventListener('click', () => openClientModal(client.id));
    tr.querySelector('.btn-delete-client').addEventListener('click', () => deleteClient(client.id));
    tbody.appendChild(tr);
  });
}

function openClientModal(clientId = null) {
  const modal = document.getElementById('clientModal');
  const form = document.getElementById('clientForm');
  const title = document.getElementById('clientModalTitle');

  form.reset();

  if (clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (client) {
      title.textContent = 'Edit Client';
      document.getElementById('editClientId').value = client.id;
      document.getElementById('clientName').value = client.name;
      document.getElementById('clientEmail').value = client.email;
      document.getElementById('clientPhone').value = client.phone;
      document.getElementById('clientNotes').value = client.notes || '';
    }
  } else {
    title.textContent = 'Add Client';
    document.getElementById('editClientId').value = '';
  }

  modal.classList.add('active');
}

function closeClientModal() {
  document.getElementById('clientModal').classList.remove('active');
}

function saveClient(e) {
  e.preventDefault();
  const id = document.getElementById('editClientId').value;
  const name = document.getElementById('clientName').value;
  const email = document.getElementById('clientEmail').value;
  const phone = document.getElementById('clientPhone').value;
  const notes = document.getElementById('clientNotes').value;

  if (id) {
    // Edit Mode
    const index = state.clients.findIndex(c => c.id === id);
    if (index !== -1) {
      state.clients[index] = { ...state.clients[index], name, email, phone, notes };
    }
  } else {
    // Add Mode
    const newId = 'c_' + Date.now();
    state.clients.push({ id: newId, name, email, phone, notes });
  }

  saveState();
  closeClientModal();
  renderView('clients');
  renderView('dashboard');
}

function deleteClient(id) {
  if (confirm("Are you sure you want to delete this client? All bookings associated with them will remain, but client details won't be linked.")) {
    state.clients = state.clients.filter(c => c.id !== id);
    saveState();
    renderView('clients');
    renderView('dashboard');
  }
}

// Bookings UI Controls & Rendering
function renderBookings(filterText = '') {
  const tbody = document.getElementById('bookingsTableBody');
  tbody.innerHTML = '';

  const query = filterText.toLowerCase().trim();

  const enrichedBookings = state.bookings.map(b => {
    const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown Client' };
    const photographer = state.team.find(t => t.id === b.photographerId) || { name: 'Unassigned' };
    const hasConflict = checkConflict(b.photographerId, b.date, b.startTime, b.endTime, b.id);
    return { ...b, clientName: client.name, photographerName: photographer.name, hasConflict };
  });

  const filtered = enrichedBookings.filter(b =>
    b.clientName.toLowerCase().includes(query) ||
    b.shootType.toLowerCase().includes(query) ||
    b.photographerName.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No bookings found.</td></tr>`;
    return;
  }

  const cur = state.settings.currency || '₹';

  filtered.forEach(booking => {
    const tr = document.createElement('tr');
    const statusClass = getStatusBadgeClass(booking.status);

    tr.innerHTML = `
      <td><strong>${escapeHTML(booking.clientName)}</strong></td>
      <td>${escapeHTML(booking.shootType)}</td>
      <td class="cell-nowrap">
        <div class="cell-primary">${booking.date}</div>
        <div class="cell-secondary">${booking.startTime} - ${booking.endTime}</div>
      </td>
      <td>${escapeHTML(booking.location)}</td>
      <td>${escapeHTML(booking.photographerName)}</td>
      <td>
        <div>${cur}${booking.totalAmount.toFixed(2)}</div>
        <div class="cell-secondary">Paid: ${cur}${booking.amountPaid.toFixed(2)}</div>
      </td>
      <td><span class="badge ${statusClass}">${booking.status}</span></td>
      <td>
        ${booking.hasConflict && booking.status !== 'Cancelled'
          ? `<span class="badge badge-danger">⚠️ Overlap</span>`
          : `<span class="badge badge-success">OK</span>`}
      </td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-edit-booking" data-id="${booking.id}">Edit</button>
          <button class="btn btn-sm btn-danger btn-delete-booking" data-id="${booking.id}">Delete</button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-edit-booking').addEventListener('click', () => openBookingModal(booking.id));
    tr.querySelector('.btn-delete-booking').addEventListener('click', () => deleteBooking(booking.id));
    tbody.appendChild(tr);
  });
}

function populateClientDropdown(selectedId = '') {
  const dropdown = document.getElementById('bookingClient');
  dropdown.innerHTML = '<option value="">Select a client...</option>';
  state.clients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === selectedId) opt.selected = true;
    dropdown.appendChild(opt);
  });
}

function populatePhotographerDropdown(selectedId = '') {
  const dropdown = document.getElementById('bookingPhotographer');
  dropdown.innerHTML = '<option value="">Select photographer...</option>';
  state.team.filter(t => t.status === 'Active').forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.name} (${t.role})`;
    if (t.id === selectedId) opt.selected = true;
    dropdown.appendChild(opt);
  });
}

// Toggles the booking modal between the client dropdown and the inline
// "quick-add client" fields. Keeps required-attribute state in sync so
// native form validation only enforces whichever mode is visible.
function setInlineNewClientMode(show) {
  isAddingNewClientInline = show;

  const inlineFields = document.getElementById('inlineNewClientFields');
  const toggleBtn = document.getElementById('toggleInlineClientBtn');
  const clientDropdown = document.getElementById('bookingClient');
  const inlineName = document.getElementById('inlineClientName');
  const inlineEmail = document.getElementById('inlineClientEmail');
  const inlinePhone = document.getElementById('inlineClientPhone');

  inlineFields.classList.toggle('hidden', !show);

  // The same button does double duty: "+ New Client" opens the inline
  // fields, and it becomes a "×" close control once they're open — rather
  // than a separate toggle button plus a separate "Cancel" link.
  if (show) {
    toggleBtn.textContent = '×';
    toggleBtn.classList.add('link-btn-close');
    toggleBtn.setAttribute('aria-label', 'Cancel adding a new client');
    toggleBtn.title = 'Cancel — choose existing client';
  } else {
    toggleBtn.textContent = '+ New Client';
    toggleBtn.classList.remove('link-btn-close');
    toggleBtn.setAttribute('aria-label', 'Add a new client');
    toggleBtn.removeAttribute('title');
  }

  if (show) {
    clientDropdown.classList.add('hidden');
    clientDropdown.required = false;
    clientDropdown.value = '';

    inlineName.required = true;
    inlineEmail.required = true;
    inlinePhone.required = true;
  } else {
    clientDropdown.classList.remove('hidden');
    clientDropdown.required = true;

    inlineName.required = false;
    inlineEmail.required = false;
    inlinePhone.required = false;

    inlineName.value = '';
    inlineEmail.value = '';
    inlinePhone.value = '';
  }
}

function openBookingModal(bookingId = null) {
  const modal = document.getElementById('bookingModal');
  const form = document.getElementById('bookingForm');
  const title = document.getElementById('bookingModalTitle');
  const conflictDiv = document.getElementById('bookingConflictWarning');

  form.reset();
  conflictDiv.classList.remove('show');
  // Always start in dropdown mode with no stale inline values, whether this
  // modal was opened from Bookings, Calendar, or the Dashboard quick action.
  setInlineNewClientMode(false);

  populateClientDropdown();
  populatePhotographerDropdown();

  if (bookingId) {
    const booking = state.bookings.find(b => b.id === bookingId);
    if (booking) {
      title.textContent = 'Edit Booking';
      document.getElementById('editBookingId').value = booking.id;
      populateClientDropdown(booking.clientId);
      document.getElementById('bookingShootType').value = booking.shootType;
      document.getElementById('bookingDate').value = booking.date;
      document.getElementById('bookingStartTime').value = booking.startTime;
      document.getElementById('bookingEndTime').value = booking.endTime;
      document.getElementById('bookingLocation').value = booking.location;
      populatePhotographerDropdown(booking.photographerId);
      document.getElementById('bookingTotal').value = booking.totalAmount;
      document.getElementById('bookingPaid').value = booking.amountPaid;
      document.getElementById('bookingStatus').value = booking.status;
      document.getElementById('bookingNotes').value = booking.notes || '';

      triggerConflictCheck();
    }
  } else {
    title.textContent = 'Create New Booking';
    document.getElementById('editBookingId').value = '';
    // Set default date to today
    document.getElementById('bookingDate').value = getTodayString();
  }

  modal.classList.add('active');
}

function closeBookingModal() {
  document.getElementById('bookingModal').classList.remove('active');
}

function triggerConflictCheck() {
  const bookingId = document.getElementById('editBookingId').value || null;
  const photographerId = document.getElementById('bookingPhotographer').value;
  const date = document.getElementById('bookingDate').value;
  const startTime = document.getElementById('bookingStartTime').value;
  const endTime = document.getElementById('bookingEndTime').value;
  const status = document.getElementById('bookingStatus').value;

  const warningDiv = document.getElementById('bookingConflictWarning');

  const hasConflict = status !== 'Cancelled' && checkConflict(photographerId, date, startTime, endTime, bookingId);
  warningDiv.classList.toggle('show', hasConflict);
}

function saveBooking(e) {
  e.preventDefault();

  let clientId = document.getElementById('bookingClient').value;

  // If the user chose "+ New Client", create that client first (same logic
  // as saveClient's add-mode branch), then use its id for the booking below.
  // This keeps the whole thing a single atomic submit.
  if (isAddingNewClientInline) {
    const inlineName = document.getElementById('inlineClientName').value.trim();
    const inlineEmail = document.getElementById('inlineClientEmail').value.trim();
    const inlinePhone = document.getElementById('inlineClientPhone').value.trim();

    if (!inlineName || !inlineEmail || !inlinePhone) {
      // Native required attributes should prevent this, but guard anyway.
      return;
    }

    const newClientId = 'c_' + Date.now();
    state.clients.push({
      id: newClientId,
      name: inlineName,
      email: inlineEmail,
      phone: inlinePhone,
      notes: ''
    });
    saveState();

    clientId = newClientId;
  }

  const id = document.getElementById('editBookingId').value;
  const shootType = document.getElementById('bookingShootType').value;
  const date = document.getElementById('bookingDate').value;
  const startTime = document.getElementById('bookingStartTime').value;
  const endTime = document.getElementById('bookingEndTime').value;
  const location = document.getElementById('bookingLocation').value;
  const photographerId = document.getElementById('bookingPhotographer').value;
  const totalAmount = parseFloat(document.getElementById('bookingTotal').value) || 0;
  const amountPaid = parseFloat(document.getElementById('bookingPaid').value) || 0;
  const status = document.getElementById('bookingStatus').value;
  const notes = document.getElementById('bookingNotes').value;

  const bookingData = {
    clientId,
    shootType,
    date,
    startTime,
    endTime,
    location,
    photographerId,
    totalAmount,
    amountPaid,
    status,
    notes
  };

  if (id) {
    const index = state.bookings.findIndex(b => b.id === id);
    if (index !== -1) {
      state.bookings[index] = { ...state.bookings[index], ...bookingData };
    }
  } else {
    const newId = 'b_' + Date.now();
    state.bookings.push({ id: newId, ...bookingData });
  }

  saveState();
  closeBookingModal();

  // Only navigate now that the booking is actually confirmed/saved — the
  // modal itself can be opened from any view (Dashboard, Calendar, Bookings)
  // without jumping the user away first. Clients/Team/etc. re-render
  // themselves the next time the user visits them, via navigateToView.
  navigateToView('bookings');
  renderView('dashboard'); // keep dashboard stats fresh in the background too
}

function deleteBooking(id) {
  if (confirm("Are you sure you want to delete this booking?")) {
    state.bookings = state.bookings.filter(b => b.id !== id);
    saveState();
    renderView('bookings');
    renderView('dashboard');
  }
}

// Team UI Controls & Rendering
function renderTeam() {
  const tbody = document.getElementById('teamTableBody');
  tbody.innerHTML = '';

  state.team.forEach(member => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(member.name)}</strong></td>
      <td>${escapeHTML(member.role)}</td>
      <td>${escapeHTML(member.email)}</td>
      <td><span class="badge ${member.status === 'Active' ? 'badge-success' : 'badge-warning'}">${member.status}</span></td>
      <td>
        <button class="btn btn-sm btn-edit-team" data-id="${member.id}">Edit</button>
        <button class="btn btn-sm btn-danger btn-delete-team" data-id="${member.id}">Delete</button>
      </td>
    `;

    tr.querySelector('.btn-edit-team').addEventListener('click', () => openTeamModal(member.id));
    tr.querySelector('.btn-delete-team').addEventListener('click', () => deleteTeamMember(member.id));
    tbody.appendChild(tr);
  });
}

function openTeamModal(memberId = null) {
  const modal = document.getElementById('teamModal');
  const form = document.getElementById('teamForm');
  const title = document.getElementById('teamModalTitle');

  form.reset();
  if (memberId) {
    const member = state.team.find(t => t.id === memberId);
    if (member) {
      title.textContent = 'Edit Team Member';
      document.getElementById('editTeamId').value = member.id;
      document.getElementById('teamName').value = member.name;
      document.getElementById('teamRole').value = member.role;
      document.getElementById('teamEmail').value = member.email;
      document.getElementById('teamStatus').value = member.status;
    }
  } else {
    title.textContent = 'Add Team Member';
    document.getElementById('editTeamId').value = '';
  }
  modal.classList.add('active');
}

function closeTeamModal() {
  document.getElementById('teamModal').classList.remove('active');
}

function saveTeamMember(e) {
  e.preventDefault();
  const id = document.getElementById('editTeamId').value;
  const name = document.getElementById('teamName').value;
  const role = document.getElementById('teamRole').value;
  const email = document.getElementById('teamEmail').value;
  const status = document.getElementById('teamStatus').value;

  if (id) {
    const index = state.team.findIndex(t => t.id === id);
    if (index !== -1) {
      state.team[index] = { id, name, role, email, status };
    }
  } else {
    const newId = 't_' + Date.now();
    state.team.push({ id: newId, name, role, email, status });
  }

  saveState();
  closeTeamModal();
  renderView('team');
  renderView('dashboard');
}

function deleteTeamMember(id) {
  if (confirm("Are you sure you want to delete this team member?")) {
    state.team = state.team.filter(t => t.id !== id);
    saveState();
    renderView('team');
    renderView('dashboard');
  }
}

// Dashboard Page Renderer
function renderDashboard() {
  const cur = state.settings.currency || '₹';
  const todayStr = getTodayString();

  // 1. Calculate Stats
  const todayBookings = state.bookings.filter(b => b.date === todayStr && b.status !== 'Cancelled');
  document.getElementById('statTodayShoots').textContent = todayBookings.length;

  document.getElementById('statActiveClients').textContent = state.clients.length;

  let totalPending = 0;
  let totalRevenueThisMonth = 0;

  const currentMonthStr = todayStr.substring(0, 7); // "YYYY-MM"

  state.bookings.forEach(b => {
    if (b.status !== 'Cancelled') {
      const pending = b.totalAmount - b.amountPaid;
      if (pending > 0) totalPending += pending;

      if (b.date.startsWith(currentMonthStr)) {
        totalRevenueThisMonth += b.totalAmount;
      }
    }
  });

  document.getElementById('statPendingPayments').textContent = `${cur}${totalPending.toFixed(2)}`;
  document.getElementById('statMonthlyRevenue').textContent = `${cur}${totalRevenueThisMonth.toFixed(2)}`;

  // 2. Render Today's Schedule
  const todayContainer = document.getElementById('todayScheduleContainer');
  todayContainer.innerHTML = '';

  if (todayBookings.length === 0) {
    todayContainer.innerHTML = `<p class="empty-state-block">No shoots scheduled for today.</p>`;
  } else {
    const list = document.createElement('div');
    list.className = 'today-schedule-list';

    // Sort today's bookings chronologically
    todayBookings.sort((a, b) => a.startTime.localeCompare(b.startTime));

    todayBookings.forEach(b => {
      const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
      const photographer = state.team.find(t => t.id === b.photographerId) || { name: 'Unassigned' };

      const item = document.createElement('div');
      item.className = 'today-schedule-item';

      item.innerHTML = `
        <div>
          <div class="today-schedule-time">${b.startTime} - ${b.endTime}</div>
          <div class="today-schedule-meta">
            ${escapeHTML(client.name)} • ${escapeHTML(b.shootType)}
          </div>
        </div>
        <div>
          <div class="today-schedule-photographer">${escapeHTML(photographer.name)}</div>
          <div class="today-schedule-location">${escapeHTML(b.location)}</div>
        </div>
      `;
      list.appendChild(item);
    });
    todayContainer.appendChild(list);
  }

  // 3. Render Upcoming Bookings Table (Limit to 5)
  const upcomingBody = document.getElementById('upcomingBookingsTableBody');
  upcomingBody.innerHTML = '';

  const upcomingBookings = state.bookings
    .filter(b => b.date >= todayStr && b.status !== 'Cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  if (upcomingBookings.length === 0) {
    upcomingBody.innerHTML = `<tr><td colspan="5" class="empty-state">No upcoming bookings.</td></tr>`;
  } else {
    upcomingBookings.forEach(b => {
      const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
      const photographer = state.team.find(t => t.id === b.photographerId) || { name: 'Unassigned' };
      const tr = document.createElement('tr');
      const statusClass = getStatusBadgeClass(b.status);

      tr.innerHTML = `
        <td><strong>${escapeHTML(client.name)}</strong></td>
        <td>${escapeHTML(b.shootType)}</td>
        <td>${b.date} at ${b.startTime}</td>
        <td>${escapeHTML(photographer.name)}</td>
        <td><span class="badge ${statusClass}">${b.status}</span></td>
      `;
      upcomingBody.appendChild(tr);
    });
  }

  // 4. Render Active Team List (Right side widget)
  const teamList = document.getElementById('dashboardTeamList');
  teamList.innerHTML = '';
  const activeTeam = state.team.filter(t => t.status === 'Active');
  if (activeTeam.length === 0) {
    teamList.innerHTML = `<li class="empty-state">No active members.</li>`;
  } else {
    activeTeam.forEach(t => {
      const li = document.createElement('li');
      li.className = 'team-list-item';

      li.innerHTML = `
        <div>
          <div class="text-medium">${escapeHTML(t.name)}</div>
          <div class="team-list-role">${escapeHTML(t.role)}</div>
        </div>
        <span class="badge badge-success badge-sm">Active</span>
      `;
      teamList.appendChild(li);
    });
  }
}

// State for Calendar View
let currentCalendarDate = new Date();
let calendarViewMode = 'month'; // 'month', 'week', 'day'

function formatDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function updateCalendarSidebar() {
  const totalCount = document.getElementById('calTotalBookingsCount');
  const confirmedCount = document.getElementById('calConfirmedBookingsCount');
  const pendingCount = document.getElementById('calPendingBookingsCount');
  const upcomingList = document.getElementById('calendarSidebarUpcomingList');

  if (!upcomingList) return;

  const activeBookings = state.bookings.filter(b => b.status !== 'Cancelled');
  if (totalCount) totalCount.textContent = activeBookings.length;
  if (confirmedCount) confirmedCount.textContent = state.bookings.filter(b => b.status === 'Confirmed').length;
  if (pendingCount) pendingCount.textContent = state.bookings.filter(b => b.status === 'Pending').length;

  upcomingList.innerHTML = '';
  const todayStr = getTodayString();
  const upcoming = state.bookings
    .filter(b => b.date >= todayStr && b.status !== 'Cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  if (upcoming.length === 0) {
    upcomingList.innerHTML = `<p class="empty-state-compact">No upcoming shoots.</p>`;
    return;
  }

  upcoming.forEach(b => {
    const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
    const card = document.createElement('div');
    card.className = 'upcoming-shoot-card';
    card.innerHTML = `
      <div class="upcoming-shoot-time">${b.date} at ${b.startTime}</div>
      <div class="upcoming-shoot-type">${escapeHTML(b.shootType)}</div>
      <div class="upcoming-shoot-client">${escapeHTML(client.name)}</div>
    `;
    card.addEventListener('click', () => {
      // Open the edit modal right here on the Calendar view — no need to
      // jump to Bookings just to look at/edit a shoot. If the booking is
      // actually changed and saved, saveBooking() will navigate then.
      openBookingModal(b.id);
    });
    upcomingList.appendChild(card);
  });
}

// Sets the calendar grid's layout mode by swapping a modifier class,
// instead of writing grid-template-columns/grid-auto-rows inline.
function setCalendarGridMode(mode) {
  const daysGrid = document.getElementById('calendarDaysGrid');
  const gridHeader = document.querySelector('.calendar-grid-header');
  ['mode-month', 'mode-week', 'mode-day'].forEach(cls => {
    daysGrid.classList.remove(cls);
    gridHeader.classList.remove(cls);
  });
  daysGrid.classList.add(`mode-${mode}`);
  gridHeader.classList.add(`mode-${mode}`);
}

// Shared helper: builds a day cell div with bookings inside
function buildDayCell(cellDate, isCurrentMonth, extraClasses) {
  const cellDateStr = formatDateKey(cellDate);
  const today = new Date();
  const isToday = cellDate.getDate() === today.getDate() &&
                  cellDate.getMonth() === today.getMonth() &&
                  cellDate.getFullYear() === today.getFullYear();

  const cellEl = document.createElement('div');
  cellEl.className = 'calendar-day-cell';
  if (!isCurrentMonth) cellEl.classList.add('other-month');
  if (isToday) cellEl.classList.add('today');
  if (extraClasses) cellEl.classList.add(...extraClasses.split(' '));

  cellEl.innerHTML = `
    <div class="calendar-day-number-wrapper">
      <span class="calendar-day-number">${cellDate.getDate()}</span>
    </div>
    <div class="calendar-bookings-container"></div>
  `;

  // Click empty area to create booking with date pre-filled
  cellEl.addEventListener('click', (e) => {
    if (e.target.closest('.calendar-booking-badge')) return;
    openBookingModal();
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) dateInput.value = cellDateStr;
  });

  // Add booking badges
  const dayBookings = state.bookings.filter(b => b.date === cellDateStr && b.status !== 'Cancelled');
  const bookingsContainer = cellEl.querySelector('.calendar-bookings-container');

  dayBookings.forEach(booking => {
    const badge = document.createElement('div');
    badge.className = `calendar-booking-badge ${booking.status.toLowerCase()}`;
    const client = state.clients.find(c => c.id === booking.clientId) || { name: 'Unknown' };
    badge.textContent = `${booking.startTime} ${booking.shootType} - ${client.name}`;
    badge.title = `${booking.startTime} - ${booking.endTime}: ${booking.shootType} (${client.name})`;
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      openBookingModal(booking.id);
    });
    bookingsContainer.appendChild(badge);
  });

  return cellEl;
}

// --- MONTH VIEW ---
function renderCalendarMonth() {
  const daysGrid = document.getElementById('calendarDaysGrid');
  const gridHeader = document.querySelector('.calendar-grid-header');
  daysGrid.innerHTML = '';
  setCalendarGridMode('month');
  gridHeader.innerHTML = DAY_NAMES_SHORT.map(d => `<div>${d}</div>`).join('');

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const startDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const cells = [];

  // Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevMonthTotalDays - i), isCurrent: false });
  }
  // Current month
  for (let i = 1; i <= totalDays; i++) {
    cells.push({ date: new Date(year, month, i), isCurrent: true });
  }
  // Next month padding
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ date: new Date(year, month + 1, i), isCurrent: false });
  }

  cells.forEach(c => daysGrid.appendChild(buildDayCell(c.date, c.isCurrent)));
}

// --- WEEK VIEW ---
function getWeekStart(d) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay()); // Sunday
  return copy;
}

function renderCalendarWeek() {
  const daysGrid = document.getElementById('calendarDaysGrid');
  const gridHeader = document.querySelector('.calendar-grid-header');
  daysGrid.innerHTML = '';
  setCalendarGridMode('week');

  const weekStart = getWeekStart(currentCalendarDate);
  const headerParts = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    headerParts.push(`<div>${DAY_NAMES_SHORT[i]}<br><span class="week-day-number">${d.getDate()}</span></div>`);
  }
  gridHeader.innerHTML = headerParts.join('');

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    daysGrid.appendChild(buildDayCell(d, true));
  }
}

// --- DAY VIEW ---
function renderCalendarDay() {
  const daysGrid = document.getElementById('calendarDaysGrid');
  const gridHeader = document.querySelector('.calendar-grid-header');
  daysGrid.innerHTML = '';
  setCalendarGridMode('day');

  const d = currentCalendarDate;
  gridHeader.innerHTML = `<div>${DAY_NAMES_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}</div>`;

  daysGrid.appendChild(buildDayCell(d, true));
}

// Calendar View Page Renderer (dispatcher)
function renderCalendar() {
  const monthTitle = document.getElementById('calendarMonthTitle');
  const daysGrid = document.getElementById('calendarDaysGrid');
  if (!monthTitle || !daysGrid) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  // Update title based on view mode
  if (calendarViewMode === 'month') {
    monthTitle.textContent = `${MONTH_NAMES[month]} ${year}`;
    renderCalendarMonth();
  } else if (calendarViewMode === 'week') {
    const ws = getWeekStart(currentCalendarDate);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    const fmt = (d) => `${MONTH_NAMES[d.getMonth()].substring(0, 3)} ${d.getDate()}`;
    monthTitle.textContent = `${fmt(ws)} – ${fmt(we)}, ${we.getFullYear()}`;
    renderCalendarWeek();
  } else if (calendarViewMode === 'day') {
    monthTitle.textContent = `${DAY_NAMES_FULL[currentCalendarDate.getDay()]}, ${MONTH_NAMES[month]} ${currentCalendarDate.getDate()}, ${year}`;
    renderCalendarDay();
  }

  // Update view switcher active state
  document.querySelectorAll('.calendar-view-switcher .btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.viewMode === calendarViewMode);
  });

  updateCalendarSidebar();
}

// Payments Page Renderer
function renderPayments() {
  const cur = state.settings.currency || '₹';

  let grandTotal = 0;
  let grandPaid = 0;
  let grandPending = 0;

  const tbody = document.getElementById('paymentsTableBody');
  tbody.innerHTML = '';

  const activeBookings = state.bookings.filter(b => b.status !== 'Cancelled');

  if (activeBookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No payments records.</td></tr>`;
  } else {
    activeBookings.forEach(b => {
      const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
      const pending = b.totalAmount - b.amountPaid;

      grandTotal += b.totalAmount;
      grandPaid += b.amountPaid;
      if (pending > 0) grandPending += pending;

      const isPaid = pending <= 0;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>INV-${b.id.toUpperCase().substring(0, 6)}</strong></td>
        <td>${escapeHTML(client.name)}</td>
        <td>${escapeHTML(b.shootType)} (${b.date})</td>
        <td>${cur}${b.totalAmount.toFixed(2)}</td>
        <td>${cur}${b.amountPaid.toFixed(2)}</td>
        <td>${cur}${pending.toFixed(2)}</td>
        <td>
          <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">
            ${isPaid ? 'Paid' : 'Pending'}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('paymentsTotalRev').textContent = `${cur}${grandTotal.toFixed(2)}`;
  document.getElementById('paymentsPaid').textContent = `${cur}${grandPaid.toFixed(2)}`;
  document.getElementById('paymentsPending').textContent = `${cur}${grandPending.toFixed(2)}`;
}

// Settings Page Handler
function initSettingsForm() {
  const form = document.getElementById('settingsForm');

  document.getElementById('studioName').value = state.settings.studioName;
  document.getElementById('studioCurrency').value = state.settings.currency;
  document.getElementById('studioEmail').value = state.settings.email;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.settings.studioName = document.getElementById('studioName').value;
    state.settings.currency = document.getElementById('studioCurrency').value;
    state.settings.email = document.getElementById('studioEmail').value;

    // Update logo/name in UI
    document.querySelector('.logo-text').textContent = state.settings.studioName;
    document.querySelector('.user-profile span').textContent = state.settings.studioName;

    saveState();
    alert("Settings saved successfully.");
    renderView('dashboard');
  });
}

// Router dispatcher for active view rendering
function renderView(viewId) {
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'calendar') renderCalendar();
  if (viewId === 'clients') renderClients(document.getElementById('clientSearchInput').value);
  if (viewId === 'bookings') renderBookings(document.getElementById('bookingSearchInput').value);
  if (viewId === 'payments') renderPayments();
  if (viewId === 'team') renderTeam();
}

// Utility: HTML escaping to prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Setup Event Listeners
function initEventListeners() {
  // Clients View Actions
  document.getElementById('addClientBtn').addEventListener('click', () => openClientModal());
  document.getElementById('closeClientModalBtn').addEventListener('click', closeClientModal);
  document.getElementById('cancelClientModalBtn').addEventListener('click', closeClientModal);
  document.getElementById('clientForm').addEventListener('submit', saveClient);
  document.getElementById('clientSearchInput').addEventListener('input', (e) => renderClients(e.target.value));

  // Bookings View Actions
  document.getElementById('addBookingBtn').addEventListener('click', () => openBookingModal());
  document.getElementById('closeBookingModalBtn').addEventListener('click', closeBookingModal);
  document.getElementById('cancelBookingModalBtn').addEventListener('click', closeBookingModal);
  document.getElementById('bookingForm').addEventListener('submit', saveBooking);
  document.getElementById('bookingSearchInput').addEventListener('input', (e) => renderBookings(e.target.value));

  // Conflict checkers during input
  ['bookingPhotographer', 'bookingDate', 'bookingStartTime', 'bookingEndTime', 'bookingStatus'].forEach(id => {
    document.getElementById(id).addEventListener('change', triggerConflictCheck);
  });

  // Inline quick-add client toggle (inside booking modal). One button
  // does both jobs: "+ New Client" opens the inline fields, "×" closes them.
  document.getElementById('toggleInlineClientBtn').addEventListener('click', () => {
    setInlineNewClientMode(!isAddingNewClientInline);
  });

  // Team View Actions
  document.getElementById('addTeamMemberBtn').addEventListener('click', () => openTeamModal());
  document.getElementById('closeTeamModalBtn').addEventListener('click', closeTeamModal);
  document.getElementById('cancelTeamModalBtn').addEventListener('click', closeTeamModal);
  document.getElementById('teamForm').addEventListener('submit', saveTeamMember);

  // Quick Actions from Dashboard
  // Open the modal right where the user is — no view switch until the
  // booking is actually saved (see navigateToView('bookings') in saveBooking).
  document.getElementById('qaNewBookingBtn').addEventListener('click', () => {
    openBookingModal();
  });

  // Calendar View Actions
  document.getElementById('calPrevBtn').addEventListener('click', () => {
    if (calendarViewMode === 'month') {
      currentCalendarDate.setDate(1)
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    } else if (calendarViewMode === 'week') {
      currentCalendarDate.setDate(currentCalendarDate.getDate() - 7);
    } else if (calendarViewMode === 'day') {
      currentCalendarDate.setDate(currentCalendarDate.getDate() - 1);
    }
    renderCalendar();
  });
  document.getElementById('calNextBtn').addEventListener('click', () => {
    if (calendarViewMode === 'month') {
      currentCalendarDate.setDate(1)
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    } else if (calendarViewMode === 'week') {
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 7);
    } else if (calendarViewMode === 'day') {
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }
    renderCalendar();
  });
  document.getElementById('calTodayBtn').addEventListener('click', () => {
    currentCalendarDate = new Date();
    renderCalendar();
  });
  document.getElementById('calNewBookingBtn').addEventListener('click', () => {
    openBookingModal();
  });

  // Calendar View Switcher (Month / Week / Day)
  document.querySelectorAll('.calendar-view-switcher .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      calendarViewMode = btn.dataset.viewMode;
      renderCalendar();
    });
  });

  // Global Escape key handler — closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modals = document.querySelectorAll('.modal-overlay.active');
      modals.forEach(m => m.classList.remove('active'));
    }
  });
}

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  // Apply initial settings in header/sidebar
  document.querySelector('.logo-text').textContent = state.settings.studioName;
  document.querySelector('.user-profile span').textContent = state.settings.studioName;

  initNavigation();
  initEventListeners();
  initSettingsForm();
});