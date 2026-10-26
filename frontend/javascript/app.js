import * as api from "./api.js";

// StudioOS - Main Application Logic

function getTodayString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getTomorrowString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
}

function getStatusBadgeClass(status) {
  if (status === 'Confirmed') return 'badge-success';
  if (status === 'Cancelled') return 'badge-danger';
  return 'badge-info';
}

let state = {
  clients: [],
  team: [],
  bookings: [],
  settings: { studioName: "StudioOS", email: "" }
};

let isAddingNewClientInline = false;

function saveState() {
  // In-memory state; synchronized with MongoDB backend
}

async function loadDataFromBackend() {
  try {
    const [clients, team, bookings, settings] = await Promise.all([
      api.apiGetClients().catch(() => []),
      api.apiGetTeam().catch(() => []),
      api.apiGetBookings().catch(() => []),
      api.apiGetSettings().catch(() => ({}))
    ]);

    if (Array.isArray(clients)) {
      state.clients = clients.map(c => ({
        id: c._id || c.id,
        name: c.name,
        email: c.email,
        phone: c.phoneNumber || c.phone || "",
        notes: c.notes || ""
      }));
    }

    if (Array.isArray(team)) {
      state.team = team.map(t => ({
        id: t._id || t.id,
        name: t.name,
        role: t.role,
        email: t.email,
        status: t.status || "Active"
      }));
    }

    if (Array.isArray(bookings)) {
      state.bookings = bookings.map(b => ({
        id: b._id || b.id,
        clientId: b.client_id?._id || b.client_id || b.clientId,
        photographerId: b.photographer_id?._id || b.photographer_id || b.photographerId,
        shootType: b.shootType,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        location: b.location,
        totalAmount: Number(b.totalAmount) || 0,
        amountPaid: Number(b.amountPaid) || 0,
        status: b.status || "Confirmed",
        notes: b.notes || ""
      }));
    }

    if (settings && (settings.studioName || settings.email)) {
      state.settings.studioName = settings.studioName || state.settings.studioName;
      state.settings.email = settings.email || state.settings.email;
      const logoEl = document.querySelector('.logo-text');
      const userEl = document.querySelector('.user-profile span');
      if (logoEl) logoEl.textContent = state.settings.studioName;
      if (userEl) userEl.textContent = state.settings.studioName;
    }

    renderView('dashboard');
  } catch (err) {
    console.error("Backend fetch error:", err);
  }
}

/* ── Auth State & Controller (OTP Flow) ── */
let authState = {
  isAuthenticated: false,
  user: null,
  pendingEmail: '',
  generatedOtp: '',
  resendCountdown: 30,
  timerInterval: null
};

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function showAuthScreen(step = 'credentials') {
  const authScreen = document.getElementById('authScreen');
  if (!authScreen) return;
  authScreen.classList.remove('hidden');

  const avatarIcon = document.getElementById('authAvatarIcon');

  if (step === 'credentials') {
    if (avatarIcon) avatarIcon.className = "ri-user-3-line";
    document.getElementById('authTitle').textContent = "Sign In";
    document.getElementById('authSubtitle').textContent = "Enter your credentials to access your studio dashboard";
    document.getElementById('loginCredentialsForm').classList.add('active');
    document.getElementById('loginOtpForm').classList.remove('active');
    document.getElementById('loginCredentialsError').classList.add('hidden');
    const emailInput = document.getElementById('loginEmail');
    const pwdInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = '';
    if (pwdInput) pwdInput.value = '';
    setTimeout(() => {
      if (emailInput) emailInput.focus();
    }, 80);
  } else if (step === 'otp') {
    if (avatarIcon) avatarIcon.className = "ri-shield-keyhole-line";
    document.getElementById('authTitle').textContent = "Two-Step Verification";
    document.getElementById('authSubtitle').textContent = "Enter the 6-digit OTP code sent to your email";
    document.getElementById('loginCredentialsForm').classList.remove('active');
    document.getElementById('loginOtpForm').classList.add('active');
    document.getElementById('loginOtpError').classList.add('hidden');
    document.getElementById('otpTargetEmail').textContent = authState.pendingEmail;

    // [RESEND SETUP] To remove demo OTP display when setting up Resend, remove the 2 lines below:
    const demoDisplay = document.getElementById('demoOtpDisplay');
    if (demoDisplay) demoDisplay.textContent = authState.generatedOtp || "123456";

    const digits = document.querySelectorAll('.otp-digit');
    digits.forEach(d => {
      d.value = '';
      d.classList.remove('has-value', 'error');
    });
    if (digits[0]) setTimeout(() => digits[0].focus(), 80);

    startOtpCountdown();
  }
}

function hideAuthScreen() {
  const authScreen = document.getElementById('authScreen');
  if (authScreen) authScreen.classList.add('hidden');
  if (authState.timerInterval) clearInterval(authState.timerInterval);
}

function startOtpCountdown() {
  if (authState.timerInterval) clearInterval(authState.timerInterval);
  authState.resendCountdown = 30;
  const timerSpan = document.getElementById('resendTimer');
  const countdownText = document.getElementById('resendCountdownText');
  const resendBtn = document.getElementById('resendOtpBtn');

  countdownText.classList.remove('hidden');
  resendBtn.classList.add('hidden');
  timerSpan.textContent = authState.resendCountdown;

  authState.timerInterval = setInterval(() => {
    authState.resendCountdown--;
    if (authState.resendCountdown <= 0) {
      clearInterval(authState.timerInterval);
      countdownText.classList.add('hidden');
      resendBtn.classList.remove('hidden');
    } else {
      timerSpan.textContent = authState.resendCountdown;
    }
  }, 1000);
}

async function handleCredentialsSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const errorBox = document.getElementById('loginCredentialsError');

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    errorBox.textContent = "Please provide both email address and password.";
    errorBox.classList.remove('hidden');
    return;
  }

  try {
    const res = await api.apiLogin(email, password);
    if (res.token) api.setAuthToken(res.token);

    authState.pendingEmail = email;
    // [RESEND SETUP] Generate temporary code until Resend email service is hooked up
    authState.generatedOtp = generateOtpCode();

    showAuthScreen('otp');
  } catch (err) {
    errorBox.textContent = err.message || "Invalid email or password.";
    errorBox.classList.remove('hidden');
  }
}

function getEnteredOtp() {
  const digits = document.querySelectorAll('.otp-digit');
  let code = '';
  digits.forEach(d => { code += d.value.trim(); });
  return code;
}

async function handleOtpSubmit(e) {
  e.preventDefault();
  const enteredCode = getEnteredOtp();
  const errorBox = document.getElementById('loginOtpError');
  const digits = document.querySelectorAll('.otp-digit');

  if (enteredCode.length < 6) {
    errorBox.textContent = "Please enter all 6 digits of the OTP code.";
    errorBox.classList.remove('hidden');
    digits.forEach(d => { if (!d.value) d.classList.add('error'); });
    return;
  }

  try {
    // Call backend verify-otp API
    const res = await api.apiVerifyOtp(authState.pendingEmail, enteredCode);
    if (res.token) api.setAuthToken(res.token);

    // OTP verified successfully
    authState.isAuthenticated = true;
    authState.user = { email: authState.pendingEmail, name: state.settings.studioName };

    const initials = (authState.pendingEmail.split('@')[0] || 'SO').slice(0, 2).toUpperCase();
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar) headerAvatar.textContent = initials;

    hideAuthScreen();
    await loadDataFromBackend();
  } catch (err) {
    errorBox.textContent = err.message || "Invalid OTP code";
    errorBox.classList.remove('hidden');
    digits.forEach(d => d.classList.add('error'));
    setTimeout(() => {
      digits.forEach(d => d.classList.remove('error'));
    }, 1500);
  }
}

function logout() {
  authState.isAuthenticated = false;
  authState.user = null;
  authState.generatedOtp = '';
  showAuthScreen('credentials');
}

function checkConflict(photographerId, date, startTime, endTime, excludeBookingId = null) {
  if (!photographerId || !date || !startTime || !endTime) return false;
  const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const ns = mins(startTime), ne = mins(endTime);
  return state.bookings.some(b => {
    if (b.id === excludeBookingId || b.status === "Cancelled" || b.photographerId !== photographerId || b.date !== date) return false;
    return ns < mins(b.endTime) && ne > mins(b.startTime);
  });
}

function navigateToView(viewId) {
  const sidebar = document.getElementById('sidebar');
  const navItems = sidebar.querySelectorAll('ul.nav-links li');
  const views = document.querySelectorAll('.view-section');
  const pageTitle = document.getElementById('pageTitle');

  views.forEach(v => v.classList.toggle('active', v.id === viewId));
  navItems.forEach(i => i.classList.toggle('active', i.getAttribute('data-view') === viewId));
  pageTitle.textContent = viewId.charAt(0).toUpperCase() + viewId.slice(1);

  renderView(viewId);
  sidebar.classList.remove('active');
}

function initNavigation() {
  const sidebar = document.getElementById('sidebar');
  const navItems = sidebar.querySelectorAll('ul.nav-links li');
  const menuToggleBtn = document.getElementById('menuToggleBtn');

  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateToView(item.getAttribute('data-view'));
    });
  });

  menuToggleBtn.addEventListener('click', () => sidebar.classList.toggle('active'));

  const hash = window.location.hash.replace('#', '');
  const valid = ['dashboard', 'calendar', 'clients', 'bookings', 'payments', 'team', 'settings'];
  navigateToView(valid.includes(hash) ? hash : 'dashboard');
}

/* ── Clients ── */
function renderClients(filterText = '') {
  const tbody = document.getElementById('clientsTableBody');
  tbody.innerHTML = '';
  const q = filterText.toLowerCase().trim();
  const filtered = state.clients.filter(c =>
    c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
  );
  if (!filtered.length) { tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No clients found.</td></tr>`; return; }
  filtered.forEach(client => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(client.name)}</strong></td>
      <td>${escapeHTML(client.email)}</td>
      <td>${escapeHTML(client.phone)}</td>
      <td class="cell-truncate">${escapeHTML(client.notes || '')}</td>
      <td>
        <button class="btn btn-sm btn-edit-client" data-id="${client.id}">Edit</button>
        <button class="btn btn-sm btn-danger btn-delete-client" data-id="${client.id}">Delete</button>
      </td>`;
    tr.querySelector('.btn-edit-client').addEventListener('click', () => openClientModal(client.id));
    tr.querySelector('.btn-delete-client').addEventListener('click', () => deleteClient(client.id));
    tbody.appendChild(tr);
  });
}

function openClientModal(clientId = null) {
  const modal = document.getElementById('clientModal');
  document.getElementById('clientForm').reset();
  if (clientId) {
    const c = state.clients.find(c => c.id === clientId);
    if (c) {
      document.getElementById('clientModalTitle').textContent = 'Edit Client';
      document.getElementById('editClientId').value = c.id;
      document.getElementById('clientName').value = c.name;
      document.getElementById('clientEmail').value = c.email;
      document.getElementById('clientPhone').value = c.phone;
      document.getElementById('clientNotes').value = c.notes || '';
    }
  } else {
    document.getElementById('clientModalTitle').textContent = 'Add Client';
    document.getElementById('editClientId').value = '';
  }
  modal.classList.add('active');
}
function closeClientModal() { document.getElementById('clientModal').classList.remove('active'); }

async function saveClient(e) {
  e.preventDefault();
  const id = document.getElementById('editClientId').value;
  const name = document.getElementById('clientName').value;
  const email = document.getElementById('clientEmail').value;
  const phone = document.getElementById('clientPhone').value;
  const notes = document.getElementById('clientNotes').value;
  try {
    if (id) {
      await api.apiUpdateClient(id, { name, email, phone, notes });
    } else {
      await api.apiCreateClient({ name, email, phone, notes });
    }
    await loadDataFromBackend();
    closeClientModal();
    renderView('clients');
    renderView('dashboard');
  } catch (err) {
    alert("Error saving client: " + err.message);
  }
}

async function deleteClient(id) {
  if (confirm("Delete this client?")) {
    try {
      await api.apiDeleteClient(id);
      await loadDataFromBackend();
      renderView('clients');
      renderView('dashboard');
    } catch (err) {
      alert("Error deleting client: " + err.message);
    }
  }
}

/* ── Bookings ── */
function renderBookings(filterText = '') {
  const tbody = document.getElementById('bookingsTableBody');
  tbody.innerHTML = '';
  const q = filterText.toLowerCase().trim();
  const enriched = state.bookings.map(b => {
    const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown Client' };
    const photographer = state.team.find(t => t.id === b.photographerId) || { name: 'Unassigned' };
    const hasConflict = checkConflict(b.photographerId, b.date, b.startTime, b.endTime, b.id);
    return { ...b, clientName: client.name, photographerName: photographer.name, hasConflict };
  });
  const filtered = enriched.filter(b =>
    b.clientName.toLowerCase().includes(q) ||
    b.shootType.toLowerCase().includes(q) ||
    b.photographerName.toLowerCase().includes(q)
  );
  if (!filtered.length) { tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No bookings found.</td></tr>`; return; }
  filtered.forEach(booking => {
    const tr = document.createElement('tr');
    const sc = getStatusBadgeClass(booking.status);
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
        <div>${booking.totalAmount.toFixed(2)}</div>
        <div class="cell-secondary">Paid: ${booking.amountPaid.toFixed(2)}</div>
      </td>
      <td><span class="badge ${sc}">${booking.status}</span></td>
      <td>${booking.hasConflict && booking.status !== 'Cancelled'
        ? `<span class="badge badge-danger">⚠️ Overlap</span>`
        : `<span class="badge badge-success">OK</span>`}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-edit-booking" data-id="${booking.id}">Edit</button>
          <button class="btn btn-sm btn-danger btn-delete-booking" data-id="${booking.id}">Delete</button>
        </div>
      </td>`;
    tr.querySelector('.btn-edit-booking').addEventListener('click', () => openBookingModal(booking.id));
    tr.querySelector('.btn-delete-booking').addEventListener('click', () => deleteBooking(booking.id));
    tbody.appendChild(tr);
  });
}

function populateClientDropdown(selectedId = '') {
  const dd = document.getElementById('bookingClient');
  dd.innerHTML = '<option value="">Select a client...</option>';
  state.clients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    if (c.id === selectedId) opt.selected = true;
    dd.appendChild(opt);
  });
}

function populatePhotographerDropdown(selectedId = '') {
  const dd = document.getElementById('bookingPhotographer');
  dd.innerHTML = '<option value="">Select photographer...</option>';
  state.team.filter(t => t.status === 'Active').forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = `${t.name} (${t.role})`;
    if (t.id === selectedId) opt.selected = true;
    dd.appendChild(opt);
  });
}

function setInlineNewClientMode(show) {
  isAddingNewClientInline = show;
  const inlineFields = document.getElementById('inlineNewClientFields');
  const toggleBtn = document.getElementById('toggleInlineClientBtn');
  const clientDropdown = document.getElementById('bookingClient');
  const inlineName = document.getElementById('inlineClientName');
  const inlineEmail = document.getElementById('inlineClientEmail');
  const inlinePhone = document.getElementById('inlineClientPhone');

  inlineFields.classList.toggle('hidden', !show);

  if (show) {
    toggleBtn.textContent = '×';
    toggleBtn.classList.add('link-btn-close');
    toggleBtn.setAttribute('aria-label', 'Cancel adding a new client');
    clientDropdown.classList.add('hidden');
    clientDropdown.required = false;
    clientDropdown.value = '';
    inlineName.required = inlineEmail.required = inlinePhone.required = true;
  } else {
    toggleBtn.textContent = '+ New Client';
    toggleBtn.classList.remove('link-btn-close');
    toggleBtn.setAttribute('aria-label', 'Add a new client');
    toggleBtn.removeAttribute('title');
    clientDropdown.classList.remove('hidden');
    clientDropdown.required = true;
    inlineName.required = inlineEmail.required = inlinePhone.required = false;
    inlineName.value = inlineEmail.value = inlinePhone.value = '';
  }
}

function openBookingModal(bookingId = null) {
  const modal = document.getElementById('bookingModal');
  const form = document.getElementById('bookingForm');
  const conflictDiv = document.getElementById('bookingConflictWarning');
  form.reset();
  conflictDiv.classList.remove('show');
  setInlineNewClientMode(false);
  populateClientDropdown();
  populatePhotographerDropdown();
  if (bookingId) {
    const b = state.bookings.find(b => b.id === bookingId);
    if (b) {
      document.getElementById('bookingModalTitle').textContent = 'Edit Booking';
      document.getElementById('editBookingId').value = b.id;
      populateClientDropdown(b.clientId);
      document.getElementById('bookingShootType').value = b.shootType;
      document.getElementById('bookingDate').value = b.date;
      document.getElementById('bookingStartTime').value = b.startTime;
      document.getElementById('bookingEndTime').value = b.endTime;
      document.getElementById('bookingLocation').value = b.location;
      populatePhotographerDropdown(b.photographerId);
      document.getElementById('bookingTotal').value = b.totalAmount;
      document.getElementById('bookingPaid').value = b.amountPaid;
      document.getElementById('bookingStatus').value = b.status;
      document.getElementById('bookingNotes').value = b.notes || '';
      triggerConflictCheck();
    }
  } else {
    document.getElementById('bookingModalTitle').textContent = 'Create New Booking';
    document.getElementById('editBookingId').value = '';
    document.getElementById('bookingDate').value = getTodayString();
  }
  modal.classList.add('active');
}
function closeBookingModal() { document.getElementById('bookingModal').classList.remove('active'); }

function triggerConflictCheck() {
  const bookingId = document.getElementById('editBookingId').value || null;
  const photographerId = document.getElementById('bookingPhotographer').value;
  const date = document.getElementById('bookingDate').value;
  const startTime = document.getElementById('bookingStartTime').value;
  const endTime = document.getElementById('bookingEndTime').value;
  const status = document.getElementById('bookingStatus').value;
  const hasConflict = status !== 'Cancelled' && checkConflict(photographerId, date, startTime, endTime, bookingId);
  document.getElementById('bookingConflictWarning').classList.toggle('show', hasConflict);
}

async function saveBooking(e) {
  e.preventDefault();
  let clientId = document.getElementById('bookingClient').value;
  try {
    if (isAddingNewClientInline) {
      const inlineName = document.getElementById('inlineClientName').value.trim();
      const inlineEmail = document.getElementById('inlineClientEmail').value.trim();
      const inlinePhone = document.getElementById('inlineClientPhone').value.trim();
      if (!inlineName || !inlineEmail || !inlinePhone) return;
      const createdClient = await api.apiCreateClient({ name: inlineName, email: inlineEmail, phone: inlinePhone, notes: '' });
      clientId = createdClient._id || createdClient.id;
    }
    const id = document.getElementById('editBookingId').value;
    const bookingData = {
      clientId,
      shootType: document.getElementById('bookingShootType').value,
      date: document.getElementById('bookingDate').value,
      startTime: document.getElementById('bookingStartTime').value,
      endTime: document.getElementById('bookingEndTime').value,
      location: document.getElementById('bookingLocation').value,
      photographerId: document.getElementById('bookingPhotographer').value,
      totalAmount: parseFloat(document.getElementById('bookingTotal').value) || 0,
      amountPaid: parseFloat(document.getElementById('bookingPaid').value) || 0,
      status: document.getElementById('bookingStatus').value,
      notes: document.getElementById('bookingNotes').value
    };
    if (id) {
      await api.apiUpdateBooking(id, bookingData);
    } else {
      await api.apiCreateBooking(bookingData);
    }
    await loadDataFromBackend();
    closeBookingModal();
    navigateToView('bookings');
    renderView('dashboard');
  } catch (err) {
    alert("Error saving booking: " + err.message);
  }
}

async function deleteBooking(id) {
  if (confirm("Delete this booking?")) {
    try {
      await api.apiDeleteBooking(id);
      await loadDataFromBackend();
      renderView('bookings');
      renderView('dashboard');
    } catch (err) {
      alert("Error deleting booking: " + err.message);
    }
  }
}

/* ── Team ── */
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
      </td>`;
    tr.querySelector('.btn-edit-team').addEventListener('click', () => openTeamModal(member.id));
    tr.querySelector('.btn-delete-team').addEventListener('click', () => deleteTeamMember(member.id));
    tbody.appendChild(tr);
  });
}

function openTeamModal(memberId = null) {
  const modal = document.getElementById('teamModal');
  document.getElementById('teamForm').reset();
  if (memberId) {
    const m = state.team.find(t => t.id === memberId);
    if (m) {
      document.getElementById('teamModalTitle').textContent = 'Edit Team Member';
      document.getElementById('editTeamId').value = m.id;
      document.getElementById('teamName').value = m.name;
      document.getElementById('teamRole').value = m.role;
      document.getElementById('teamEmail').value = m.email;
      document.getElementById('teamStatus').value = m.status;
    }
  } else {
    document.getElementById('teamModalTitle').textContent = 'Add Team Member';
    document.getElementById('editTeamId').value = '';
  }
  modal.classList.add('active');
}
function closeTeamModal() { document.getElementById('teamModal').classList.remove('active'); }

async function saveTeamMember(e) {
  e.preventDefault();
  const id = document.getElementById('editTeamId').value;
  const name = document.getElementById('teamName').value;
  const role = document.getElementById('teamRole').value;
  const email = document.getElementById('teamEmail').value;
  const status = document.getElementById('teamStatus').value;
  try {
    if (id) {
      await api.apiUpdateTeamMember(id, { name, role, email, status });
    } else {
      await api.apiCreateTeamMember({ name, role, email, status });
    }
    await loadDataFromBackend();
    closeTeamModal();
    renderView('team');
    renderView('dashboard');
  } catch (err) {
    alert("Error saving team member: " + err.message);
  }
}

async function deleteTeamMember(id) {
  if (confirm("Delete this team member?")) {
    try {
      await api.apiDeleteTeamMember(id);
      await loadDataFromBackend();
      renderView('team');
      renderView('dashboard');
    } catch (err) {
      alert("Error deleting team member: " + err.message);
    }
  }
}

/* ── Dashboard ── */
function renderDashboard() {
  const todayStr = getTodayString();
  const todayBookings = state.bookings.filter(b => b.date === todayStr && b.status !== 'Cancelled');

  document.getElementById('statTodayShoots').textContent = todayBookings.length;
  document.getElementById('statActiveClients').textContent = state.clients.length;

  let totalPending = 0, totalRevenueThisMonth = 0;
  const monthStr = todayStr.substring(0, 7);
  state.bookings.forEach(b => {
    if (b.status !== 'Cancelled') {
      const p = b.totalAmount - b.amountPaid;
      if (p > 0) totalPending += p;
      if (b.date.startsWith(monthStr)) totalRevenueThisMonth += b.totalAmount;
    }
  });
  document.getElementById('statPendingPayments').textContent = totalPending.toFixed(2);
  document.getElementById('statMonthlyRevenue').textContent = totalRevenueThisMonth.toFixed(2);

  // Today's schedule
  const todayContainer = document.getElementById('todayScheduleContainer');
  todayContainer.innerHTML = '';
  if (!todayBookings.length) {
    todayContainer.innerHTML = `<p class="empty-state-block">No shoots scheduled for today.</p>`;
  } else {
    const list = document.createElement('div');
    list.className = 'today-schedule-list';
    todayBookings.sort((a, b) => a.startTime.localeCompare(b.startTime)).forEach(b => {
      const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
      const photographer = state.team.find(t => t.id === b.photographerId) || { name: 'Unassigned' };
      const item = document.createElement('div');
      item.className = 'today-schedule-item';
      item.innerHTML = `
        <div>
          <div class="today-schedule-time">${b.startTime} - ${b.endTime}</div>
          <div class="today-schedule-meta">${escapeHTML(client.name)} • ${escapeHTML(b.shootType)}</div>
        </div>
        <div>
          <div class="today-schedule-photographer">${escapeHTML(photographer.name)}</div>
          <div class="today-schedule-location">${escapeHTML(b.location)}</div>
        </div>`;
      list.appendChild(item);
    });
    todayContainer.appendChild(list);
  }

  // Upcoming bookings
  const upcomingBody = document.getElementById('upcomingBookingsTableBody');
  upcomingBody.innerHTML = '';
  const upcoming = state.bookings
    .filter(b => b.date >= todayStr && b.status !== 'Cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);
  if (!upcoming.length) {
    upcomingBody.innerHTML = `<tr><td colspan="5" class="empty-state">No upcoming bookings.</td></tr>`;
  } else {
    upcoming.forEach(b => {
      const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
      const photographer = state.team.find(t => t.id === b.photographerId) || { name: 'Unassigned' };
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHTML(client.name)}</strong></td>
        <td>${escapeHTML(b.shootType)}</td>
        <td>${b.date} at ${b.startTime}</td>
        <td>${escapeHTML(photographer.name)}</td>
        <td><span class="badge ${getStatusBadgeClass(b.status)}">${b.status}</span></td>`;
      upcomingBody.appendChild(tr);
    });
  }

  // Active team
  const teamList = document.getElementById('dashboardTeamList');
  teamList.innerHTML = '';
  const activeTeam = state.team.filter(t => t.status === 'Active');
  if (!activeTeam.length) {
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
        <span class="badge badge-success badge-sm">Active</span>`;
      teamList.appendChild(li);
    });
  }
}

/* ── Calendar ── */
let currentCalendarDate = new Date();
let calendarViewMode = 'month';

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function updateCalendarSidebar() {
  const upcomingList = document.getElementById('calendarSidebarUpcomingList');
  if (!upcomingList) return;
  const active = state.bookings.filter(b => b.status !== 'Cancelled');
  document.getElementById('calTotalBookingsCount').textContent = active.length;
  document.getElementById('calConfirmedBookingsCount').textContent = state.bookings.filter(b => b.status === 'Confirmed').length;
  document.getElementById('calPendingBookingsCount').textContent = state.bookings.filter(b => b.status === 'Pending').length;

  upcomingList.innerHTML = '';
  const todayStr = getTodayString();
  const upcoming = state.bookings
    .filter(b => b.date >= todayStr && b.status !== 'Cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);
  if (!upcoming.length) { upcomingList.innerHTML = `<p class="empty-state-compact">No upcoming shoots.</p>`; return; }
  upcoming.forEach(b => {
    const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
    const card = document.createElement('div');
    card.className = 'upcoming-shoot-card';
    card.innerHTML = `
      <div class="upcoming-shoot-time">${b.date} at ${b.startTime}</div>
      <div class="upcoming-shoot-type">${escapeHTML(b.shootType)}</div>
      <div class="upcoming-shoot-client">${escapeHTML(client.name)}</div>`;
    card.addEventListener('click', () => openBookingModal(b.id));
    upcomingList.appendChild(card);
  });
}

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

function buildDayCell(cellDate, isCurrentMonth) {
  const cellDateStr = formatDateKey(cellDate);
  const today = new Date();
  const isToday = cellDate.toDateString() === today.toDateString();

  const cellEl = document.createElement('div');
  cellEl.className = 'calendar-day-cell';
  if (!isCurrentMonth) cellEl.classList.add('other-month');
  if (isToday) cellEl.classList.add('today');

  cellEl.innerHTML = `
    <div class="calendar-day-number-wrapper">
      <span class="calendar-day-number">${cellDate.getDate()}</span>
    </div>
    <div class="calendar-bookings-container"></div>`;

  cellEl.addEventListener('click', e => {
    if (e.target.closest('.calendar-booking-badge')) return;
    openBookingModal();
    const di = document.getElementById('bookingDate');
    if (di) di.value = cellDateStr;
  });

  const dayBookings = state.bookings.filter(b => b.date === cellDateStr && b.status !== 'Cancelled');
  const bookingsContainer = cellEl.querySelector('.calendar-bookings-container');
  dayBookings.forEach(booking => {
    const badge = document.createElement('div');
    badge.className = `calendar-booking-badge ${booking.status.toLowerCase()}`;
    const client = state.clients.find(c => c.id === booking.clientId) || { name: 'Unknown' };
    badge.textContent = `${booking.startTime} ${booking.shootType} - ${client.name}`;
    badge.title = `${booking.startTime}-${booking.endTime}: ${booking.shootType} (${client.name})`;
    badge.addEventListener('click', e => { e.stopPropagation(); openBookingModal(booking.id); });
    bookingsContainer.appendChild(badge);
  });

  return cellEl;
}

function renderCalendarMonth() {
  const daysGrid = document.getElementById('calendarDaysGrid');
  const gridHeader = document.querySelector('.calendar-grid-header');
  daysGrid.innerHTML = '';
  setCalendarGridMode('month');
  gridHeader.innerHTML = DAY_NAMES_SHORT.map(d => `<div>${d}</div>`).join('');

  const year = currentCalendarDate.getFullYear(), month = currentCalendarDate.getMonth();
  const startDOW = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotal = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = startDOW - 1; i >= 0; i--) cells.push({ date: new Date(year, month - 1, prevTotal - i), isCurrent: false });
  for (let i = 1; i <= totalDays; i++)   cells.push({ date: new Date(year, month, i), isCurrent: true });
  for (let i = 1; i <= 42 - cells.length; i++) cells.push({ date: new Date(year, month + 1, i), isCurrent: false });
  cells.forEach(c => daysGrid.appendChild(buildDayCell(c.date, c.isCurrent)));
}

function getWeekStart(d) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function renderCalendarWeek() {
  const daysGrid = document.getElementById('calendarDaysGrid');
  const gridHeader = document.querySelector('.calendar-grid-header');
  daysGrid.innerHTML = '';
  setCalendarGridMode('week');
  const ws = getWeekStart(currentCalendarDate);
  const headerParts = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    headerParts.push(`<div>${DAY_NAMES_SHORT[i]}<br><span class="week-day-number">${d.getDate()}</span></div>`);
  }
  gridHeader.innerHTML = headerParts.join('');
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    daysGrid.appendChild(buildDayCell(d, true));
  }
}

function renderCalendarDay() {
  const daysGrid = document.getElementById('calendarDaysGrid');
  const gridHeader = document.querySelector('.calendar-grid-header');
  daysGrid.innerHTML = '';
  setCalendarGridMode('day');
  const d = currentCalendarDate;
  gridHeader.innerHTML = `<div>${DAY_NAMES_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}</div>`;
  daysGrid.appendChild(buildDayCell(d, true));
}

function renderCalendar() {
  const monthTitle = document.getElementById('calendarMonthTitle');
  const daysGrid = document.getElementById('calendarDaysGrid');
  if (!monthTitle || !daysGrid) return;
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  if (calendarViewMode === 'month') {
    monthTitle.textContent = `${MONTH_NAMES[month]} ${year}`;
    renderCalendarMonth();
  } else if (calendarViewMode === 'week') {
    const ws = getWeekStart(currentCalendarDate), we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    const fmt = d => `${MONTH_NAMES[d.getMonth()].substring(0, 3)} ${d.getDate()}`;
    monthTitle.textContent = `${fmt(ws)} – ${fmt(we)}, ${we.getFullYear()}`;
    renderCalendarWeek();
  } else if (calendarViewMode === 'day') {
    monthTitle.textContent = `${DAY_NAMES_FULL[currentCalendarDate.getDay()]}, ${MONTH_NAMES[month]} ${currentCalendarDate.getDate()}, ${year}`;
    renderCalendarDay();
  }

  document.querySelectorAll('.cal-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.viewMode === calendarViewMode);
  });
  updateCalendarSidebar();
}

/* ── Payments ── */
function renderPayments() {
  let grandTotal = 0, grandPaid = 0, grandPending = 0;
  const tbody = document.getElementById('paymentsTableBody');
  tbody.innerHTML = '';
  const active = state.bookings.filter(b => b.status !== 'Cancelled');
  if (!active.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No payments records.</td></tr>`;
  } else {
    active.forEach(b => {
      const client = state.clients.find(c => c.id === b.clientId) || { name: 'Unknown' };
      const pending = b.totalAmount - b.amountPaid;
      grandTotal += b.totalAmount; grandPaid += b.amountPaid;
      if (pending > 0) grandPending += pending;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>INV-${b.id.toUpperCase().substring(0, 6)}</strong></td>
        <td>${escapeHTML(client.name)}</td>
        <td>${escapeHTML(b.shootType)} (${b.date})</td>
        <td>${b.totalAmount.toFixed(2)}</td>
        <td>${b.amountPaid.toFixed(2)}</td>
        <td>${pending.toFixed(2)}</td>
        <td><span class="badge ${pending <= 0 ? 'badge-success' : 'badge-warning'}">${pending <= 0 ? 'Paid' : 'Pending'}</span></td>`;
      tbody.appendChild(tr);
    });
  }
  document.getElementById('paymentsTotalRev').textContent = grandTotal.toFixed(2);
  document.getElementById('paymentsPaid').textContent = grandPaid.toFixed(2);
  document.getElementById('paymentsPending').textContent = grandPending.toFixed(2);
}

/* ── Settings ── */
function initSettingsForm() {
  document.getElementById('studioName').value = state.settings.studioName || '';
  document.getElementById('studioEmail').value = state.settings.email || '';
  document.getElementById('settingsForm').addEventListener('submit', async e => {
    e.preventDefault();
    const studioName = document.getElementById('studioName').value.trim();
    const email = document.getElementById('studioEmail').value.trim();
    try {
      await api.apiUpdateSettings({ studioName, email });
      state.settings.studioName = studioName;
      state.settings.email = email;
      const logoEl = document.querySelector('.logo-text');
      const userEl = document.querySelector('.user-profile span');
      if (logoEl && state.settings.studioName) logoEl.textContent = state.settings.studioName;
      if (userEl && state.settings.studioName) userEl.textContent = state.settings.studioName;
      alert("Settings saved successfully.");
      renderView('dashboard');
    } catch (err) {
      alert("Error saving settings: " + err.message);
    }
  });
}

/* ── Router ── */
function renderView(viewId) {
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'calendar') renderCalendar();
  if (viewId === 'clients') renderClients(document.getElementById('clientSearchInput').value);
  if (viewId === 'bookings') renderBookings(document.getElementById('bookingSearchInput').value);
  if (viewId === 'payments') renderPayments();
  if (viewId === 'team') renderTeam();
}

/* ── XSS guard ── */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

/* ── Event Listeners ── */
function initEventListeners() {
  // Clients
  document.getElementById('addClientBtn').addEventListener('click', () => openClientModal());
  document.getElementById('closeClientModalBtn').addEventListener('click', closeClientModal);
  document.getElementById('cancelClientModalBtn').addEventListener('click', closeClientModal);
  document.getElementById('clientForm').addEventListener('submit', saveClient);
  document.getElementById('clientSearchInput').addEventListener('input', e => renderClients(e.target.value));

  // Bookings
  document.getElementById('addBookingBtn').addEventListener('click', () => openBookingModal());
  document.getElementById('closeBookingModalBtn').addEventListener('click', closeBookingModal);
  document.getElementById('cancelBookingModalBtn').addEventListener('click', closeBookingModal);
  document.getElementById('bookingForm').addEventListener('submit', saveBooking);
  document.getElementById('bookingSearchInput').addEventListener('input', e => renderBookings(e.target.value));
  ['bookingPhotographer', 'bookingDate', 'bookingStartTime', 'bookingEndTime', 'bookingStatus'].forEach(id => {
    document.getElementById(id).addEventListener('change', triggerConflictCheck);
  });
  document.getElementById('toggleInlineClientBtn').addEventListener('click', () => setInlineNewClientMode(!isAddingNewClientInline));

  // Team
  document.getElementById('addTeamMemberBtn').addEventListener('click', () => openTeamModal());
  document.getElementById('closeTeamModalBtn').addEventListener('click', closeTeamModal);
  document.getElementById('cancelTeamModalBtn').addEventListener('click', closeTeamModal);
  document.getElementById('teamForm').addEventListener('submit', saveTeamMember);

  // Dashboard quick action
  document.getElementById('qaNewBookingBtn').addEventListener('click', () => openBookingModal());

  // Calendar nav
  document.getElementById('calPrevBtn').addEventListener('click', () => {
    if (calendarViewMode === 'month') { currentCalendarDate.setDate(1); currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); }
    else if (calendarViewMode === 'week') currentCalendarDate.setDate(currentCalendarDate.getDate() - 7);
    else currentCalendarDate.setDate(currentCalendarDate.getDate() - 1);
    renderCalendar();
  });
  document.getElementById('calNextBtn').addEventListener('click', () => {
    if (calendarViewMode === 'month') { currentCalendarDate.setDate(1); currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); }
    else if (calendarViewMode === 'week') currentCalendarDate.setDate(currentCalendarDate.getDate() + 7);
    else currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    renderCalendar();
  });
  document.getElementById('calTodayBtn').addEventListener('click', () => { currentCalendarDate = new Date(); renderCalendar(); });
  document.getElementById('calNewBookingBtn').addEventListener('click', () => openBookingModal());

  // View switcher
  document.querySelectorAll('.cal-view-btn').forEach(btn => {
    btn.addEventListener('click', () => { calendarViewMode = btn.dataset.viewMode; renderCalendar(); });
  });

  // Escape closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  });

  // Auth event listeners
  document.getElementById('loginCredentialsForm').addEventListener('submit', handleCredentialsSubmit);
  document.getElementById('loginOtpForm').addEventListener('submit', handleOtpSubmit);

  // Password visibility toggle
  document.getElementById('togglePasswordBtn').addEventListener('click', () => {
    const pwdInput = document.getElementById('loginPassword');
    const pwdIcon = document.getElementById('togglePasswordIcon');
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      pwdIcon.className = 'ri-eye-off-line';
    } else {
      pwdInput.type = 'password';
      pwdIcon.className = 'ri-eye-line';
    }
  });

  // OTP Digits input handling (auto-step, backspace, paste)
  const otpDigits = document.querySelectorAll('.otp-digit');
  otpDigits.forEach((digit, index) => {
    digit.addEventListener('input', e => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val ? val[0] : '';
      if (e.target.value) {
        e.target.classList.add('has-value');
        e.target.classList.remove('error');
        if (index < otpDigits.length - 1) {
          otpDigits[index + 1].focus();
        }
      } else {
        e.target.classList.remove('has-value');
      }
    });

    digit.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !digit.value && index > 0) {
        otpDigits[index - 1].focus();
        otpDigits[index - 1].value = '';
        otpDigits[index - 1].classList.remove('has-value');
      } else if (e.key === 'ArrowLeft' && index > 0) {
        otpDigits[index - 1].focus();
      } else if (e.key === 'ArrowRight' && index < otpDigits.length - 1) {
        otpDigits[index + 1].focus();
      }
    });

    digit.addEventListener('paste', e => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text');
      const cleanDigits = pasteData.replace(/\D/g, '').slice(0, 6);
      if (cleanDigits.length > 0) {
        cleanDigits.split('').forEach((char, i) => {
          if (otpDigits[i]) {
            otpDigits[i].value = char;
            otpDigits[i].classList.add('has-value');
            otpDigits[i].classList.remove('error');
          }
        });
        const nextIdx = Math.min(cleanDigits.length, otpDigits.length - 1);
        otpDigits[nextIdx].focus();
      }
    });
  });

  // Logout buttons
  document.getElementById('sidebarLogoutBtn').addEventListener('click', logout);
  document.getElementById('headerLogoutBtn').addEventListener('click', logout);
}

/* ── Init ── */
window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.logo-text').textContent = state.settings.studioName;
  document.querySelector('.user-profile span').textContent = state.settings.studioName;
  initNavigation();
  initEventListeners();
  initSettingsForm();
  showAuthScreen('credentials');
});