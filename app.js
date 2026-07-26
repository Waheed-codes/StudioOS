// StudioOS - Main Application Logic

// Helper: Get today's date string in YYYY-MM-DD format
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Get tomorrow's date string in YYYY-MM-DD format
function getTomorrowString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

// App State
let state = {
  clients: JSON.parse(localStorage.getItem('studioos_clients')) || defaultClients,
  team: JSON.parse(localStorage.getItem('studioos_team')) || defaultTeam,
  bookings: JSON.parse(localStorage.getItem('studioos_bookings')) || defaultBookings,
  settings: JSON.parse(localStorage.getItem('studioos_settings')) || {
    studioName: "Capture Studio",
    currency: "$",
    email: "hello@capturestudio.com"
  }
};

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
function initNavigation() {
  const sidebar = document.getElementById('sidebar');
  const navItems = sidebar.querySelectorAll('ul.nav-links li');
  const views = document.querySelectorAll('.view-section');
  const pageTitle = document.getElementById('pageTitle');
  const menuToggleBtn = document.getElementById('menuToggleBtn');

  function navigateTo(viewId) {
    views.forEach(view => {
      view.classList.toggle('active', view.id === viewId);
    });
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewId);
    });
    pageTitle.textContent = viewId.charAt(0).toUpperCase() + viewId.slice(1);
    
    // Custom header labels
    if (viewId === 'dashboard') pageTitle.textContent = 'Dashboard';
    
    renderView(viewId);
    
    // Close sidebar on mobile after navigating
    sidebar.classList.remove('active');
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = item.getAttribute('data-view');
      navigateTo(viewId);
    });
  });

  menuToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  // Handle hash navigation on load
  const hash = window.location.hash.replace('#', '');
  if (hash && ['dashboard', 'calendar', 'clients', 'bookings', 'payments', 'team', 'settings'].includes(hash)) {
    navigateTo(hash);
  } else {
    navigateTo('dashboard');
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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No clients found.</td></tr>`;
    return;
  }

  filtered.forEach(client => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(client.name)}</strong></td>
      <td>${escapeHTML(client.email)}</td>
      <td>${escapeHTML(client.phone)}</td>
      <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHTML(client.notes || '')}
      </td>
      <td>
        <button class="btn btn-sm btn-edit-client" data-id="${client.id}">Edit</button>
        <button class="btn btn-sm btn-danger btn-delete-client" style="color: white; background-color: var(--danger-color); border-color: var(--danger-color);" data-id="${client.id}">Delete</button>
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
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-secondary);">No bookings found.</td></tr>`;
    return;
  }

  filtered.forEach(booking => {
    const tr = document.createElement('tr');
    
    // Status Badge
    let statusClass = 'badge-info';
    if (booking.status === 'Confirmed') statusClass = 'badge-success';
    if (booking.status === 'Cancelled') statusClass = 'badge-danger';
    
    // Currency
    const cur = state.settings.currency || '$';
    
    tr.innerHTML = `
      <td><strong>${escapeHTML(booking.clientName)}</strong></td>
      <td>${escapeHTML(booking.shootType)}</td>
      <td style="white-space: nowrap;">
        <div style="font-weight: 500; color: var(--text-primary);">${booking.date}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">${booking.startTime} - ${booking.endTime}</div>
      </td>
      <td>${escapeHTML(booking.location)}</td>
      <td>${escapeHTML(booking.photographerName)}</td>
      <td>
        <div>${cur}${booking.totalAmount.toFixed(2)}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">Paid: ${cur}${booking.amountPaid.toFixed(2)}</div>
      </td>
      <td><span class="badge ${statusClass}">${booking.status}</span></td>
      <td>
        ${booking.hasConflict && booking.status !== 'Cancelled'
          ? `<span class="badge badge-danger">⚠️ Overlap</span>` 
          : `<span class="badge badge-success">OK</span>`}
      </td>
      <td>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="btn btn-sm btn-edit-booking" data-id="${booking.id}">Edit</button>
          <button class="btn btn-sm btn-danger btn-delete-booking" style="color: white; background-color: var(--danger-color); border-color: var(--danger-color);" data-id="${booking.id}">Delete</button>
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

function openBookingModal(bookingId = null) {
  const modal = document.getElementById('bookingModal');
  const form = document.getElementById('bookingForm');
  const title = document.getElementById('bookingModalTitle');
  const conflictDiv = document.getElementById('bookingConflictWarning');

  form.reset();
  conflictDiv.style.display = 'none';

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
  
  if (status !== 'Cancelled' && checkConflict(photographerId, date, startTime, endTime, bookingId)) {
    warningDiv.style.display = 'flex';
  } else {
    warningDiv.style.display = 'none';
  }
}

function saveBooking(e) {
  e.preventDefault();
  const id = document.getElementById('editBookingId').value;
  const clientId = document.getElementById('bookingClient').value;
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
  renderView('bookings');
  renderView('dashboard');
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
        <button class="btn btn-sm btn-danger btn-delete-team" style="color: white; background-color: var(--danger-color); border-color: var(--danger-color);" data-id="${member.id}">Delete</button>
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
  const cur = state.settings.currency || '$';
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
    todayContainer.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 20px 0;">No shoots scheduled for today.</p>`;
  } else {
    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '12px';

    // Sort today's bookings chronologically
    todayBookings.sort((a, b) => a.startTime.localeCompare(b.startTime));

    todayBookings.forEach(b => {
      const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
      const photographer = state.team.find(t => t.id === b.photographerId) || { name: 'Unassigned' };
      
      const item = document.createElement('div');
      item.style.padding = '12px';
      item.style.border = '1px solid var(--border-color)';
      item.style.borderRadius = 'var(--border-radius)';
      item.style.backgroundColor = 'var(--bg-primary)';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';

      item.innerHTML = `
        <div>
          <div style="font-weight: 600;">${b.startTime} - ${b.endTime}</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
            ${escapeHTML(client.name)} • ${escapeHTML(b.shootType)}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.85rem; font-weight: 500;">${escapeHTML(photographer.name)}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHTML(b.location)}</div>
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
    upcomingBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No upcoming bookings.</td></tr>`;
  } else {
    upcomingBookings.forEach(b => {
      const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
      const photographer = state.team.find(t => t.id === b.photographerId) || { name: 'Unassigned' };
      const tr = document.createElement('tr');
      
      let statusClass = 'badge-info';
      if (b.status === 'Confirmed') statusClass = 'badge-success';
      if (b.status === 'Cancelled') statusClass = 'badge-danger';

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
    teamList.innerHTML = `<li style="color: var(--text-secondary); font-size: 0.875rem;">No active members.</li>`;
  } else {
    activeTeam.forEach(t => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.justifyContent = 'space-between';
      li.style.fontSize = '0.875rem';
      li.style.padding = '8px 0';
      li.style.borderBottom = '1px solid var(--border-color)';
      
      li.innerHTML = `
        <div>
          <div style="font-weight: 500;">${escapeHTML(t.name)}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHTML(t.role)}</div>
        </div>
        <span class="badge badge-success" style="font-size: 0.7rem;">Active</span>
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
    upcomingList.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 12px 0;">No upcoming shoots.</p>`;
    return;
  }
  
  upcoming.forEach(b => {
    const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
    const card = document.createElement('div');
    card.className = 'upcoming-shoot-card';
    card.innerHTML = `
      <div class="upcoming-shoot-time">${b.date} at ${b.startTime}</div>
      <div class="upcoming-shoot-type">${b.shootType}</div>
      <div class="upcoming-shoot-client">${client.name}</div>
    `;
    card.addEventListener('click', () => {
      document.querySelector('[data-view="bookings"]').click();
      openBookingModal(b.id);
    });
    upcomingList.appendChild(card);
  });
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

  // Reset grid to 7 columns
  daysGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  daysGrid.style.gridAutoRows = 'minmax(110px, 1fr)';
  gridHeader.style.gridTemplateColumns = 'repeat(7, 1fr)';
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

  daysGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  daysGrid.style.gridAutoRows = 'minmax(280px, 1fr)';

  const weekStart = getWeekStart(currentCalendarDate);
  const headerParts = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    headerParts.push(`<div>${DAY_NAMES_SHORT[i]}<br><span style="font-weight: 700; font-size: 1rem;">${d.getDate()}</span></div>`);
  }
  gridHeader.style.gridTemplateColumns = 'repeat(7, 1fr)';
  gridHeader.innerHTML = headerParts.join('');

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const cell = buildDayCell(d, true);
    cell.querySelector('.calendar-bookings-container').style.maxHeight = '240px';
    daysGrid.appendChild(cell);
  }
}

// --- DAY VIEW ---
function renderCalendarDay() {
  const daysGrid = document.getElementById('calendarDaysGrid');
  const gridHeader = document.querySelector('.calendar-grid-header');
  daysGrid.innerHTML = '';

  daysGrid.style.gridTemplateColumns = '1fr';
  daysGrid.style.gridAutoRows = 'minmax(360px, 1fr)';

  const d = currentCalendarDate;
  gridHeader.style.gridTemplateColumns = '1fr';
  gridHeader.innerHTML = `<div>${DAY_NAMES_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}</div>`;

  const cell = buildDayCell(d, true);
  cell.querySelector('.calendar-bookings-container').style.maxHeight = 'none';
  daysGrid.appendChild(cell);
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
  const cur = state.settings.currency || '$';
  
  let grandTotal = 0;
  let grandPaid = 0;
  let grandPending = 0;

  const tbody = document.getElementById('paymentsTableBody');
  tbody.innerHTML = '';

  const activeBookings = state.bookings.filter(b => b.status !== 'Cancelled');

  if (activeBookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No payments records.</td></tr>`;
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

  // Team View Actions
  document.getElementById('addTeamMemberBtn').addEventListener('click', () => openTeamModal());
  document.getElementById('closeTeamModalBtn').addEventListener('click', closeTeamModal);
  document.getElementById('cancelTeamModalBtn').addEventListener('click', closeTeamModal);
  document.getElementById('teamForm').addEventListener('submit', saveTeamMember);

  // Quick Actions from Dashboard
  document.getElementById('qaNewBookingBtn').addEventListener('click', () => {
    // Navigate to bookings then open modal
    document.querySelector('[data-view="bookings"]').click();
    openBookingModal();
  });
  document.getElementById('qaNewClientBtn').addEventListener('click', () => {
    document.querySelector('[data-view="clients"]').click();
    openClientModal();
  });

  // Calendar View Actions
  document.getElementById('calPrevBtn').addEventListener('click', () => {
    if (calendarViewMode === 'month') {
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
    document.querySelector('[data-view="bookings"]').click();
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
