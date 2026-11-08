// StudioOS - Frontend API Client
// In production or when served by Express, relative URLs ("") call the same origin.
// In local development with Live Server (port 5500, etc.), fall back to http://localhost:4056
// Can also be explicitly overridden via window.__API_BASE__
const getApiBase = () => {
  if (typeof window === "undefined") return "http://localhost:4056";
  if (window.__API_BASE__) return window.__API_BASE__;

  const isLocalDevServer = window.location.port && window.location.port !== "4056";
  if (isLocalDevServer && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:4056";
  }
  return "";
};

const API_BASE = getApiBase();

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

async function request(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.msg || data.error || "An error occurred";
    throw new Error(errorMsg);
  }

  return data;
}


// ── Auth APIs ──
export const apiLogin = async (email, password) => {
  const res = await request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if (res.token) setAuthToken(res.token);
  return res;
};

export const apiVerifyOtp = async (email, otp) => {
  const res = await request("/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp })
  });
  if (res.token) setAuthToken(res.token);
  return res;
};

// ── Clients APIs ──
export const apiGetClients = async () => {
  const res = await request("/clients/api/get-clients");
  return res.data || [];
};

export const apiCreateClient = async (clientData) => {
  const res = await request("/clients/api/create-client", {
    method: "POST",
    body: JSON.stringify(clientData)
  });
  return res.data || res.creation;
};

export const apiUpdateClient = async (id, updates) => {
  const res = await request(`/clients/api/edit-client-details/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates)
  });
  return res.data || res.operation;
};

export const apiDeleteClient = async (id) => {
  return await request(`/clients/api/delete-client/${id}`, {
    method: "PATCH"
  });
};

// ── Team APIs ──
export const apiGetTeam = async () => {
  const res = await request("/team/api/get-all-members");
  return res.data || [];
};

export const apiCreateTeamMember = async (memberData) => {
  const res = await request("/team/api/add-member", {
    method: "POST",
    body: JSON.stringify(memberData)
  });
  return res.data;
};

export const apiUpdateTeamMember = async (id, updates) => {
  const res = await request(`/team/api/update-details/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates)
  });
  return res.data;
};

export const apiDeleteTeamMember = async (id) => {
  return await request(`/team/api/delete-member/${id}`, {
    method: "PATCH"
  });
};

// ── Bookings APIs ──
export const apiGetBookings = async () => {
  const res = await request("/bookings/api/get-all-bookings");
  return res.data || [];
};

export const apiCreateBooking = async (bookingData) => {
  const res = await request("/bookings/api/create-booking", {
    method: "POST",
    body: JSON.stringify(bookingData)
  });
  return res.data;
};

export const apiUpdateBooking = async (id, updates) => {
  const res = await request(`/bookings/api/update-booking/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates)
  });
  return res.data;
};

export const apiDeleteBooking = async (id) => {
  return await request(`/bookings/api/delete-booking/${id}`, {
    method: "PATCH"
  });
};

// ── Settings APIs ──
export const apiGetSettings = async () => {
  const res = await request("/settings/api/settings");
  return res.data || {};
};

export const apiUpdateSettings = async (updates) => {
  const res = await request("/settings/api/settings", {
    method: "PATCH",
    body: JSON.stringify(updates)
  });
  return res.data;
};
