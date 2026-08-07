async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function bindHeroActions() {
  const signupButton = document.getElementById('signupBtn');
  const loginButton = document.getElementById('loginBtn');

  if (signupButton) {
    signupButton.addEventListener('click', () => {
      const form = document.getElementById('signupForm');
      const firstField = document.getElementById('displayName');
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      firstField?.focus();
    });
  }

  if (loginButton) {
    loginButton.addEventListener('click', () => {
      const form = document.getElementById('signupForm');
      const emailField = document.getElementById('email');
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      emailField?.focus();
    });
  }
}

async function loadEvents() {
  const { payload } = await api('/api/v1/events');
  const container = document.getElementById('eventList');
  if (!container) return;
  container.innerHTML = (payload.events || []).map(event => `
    <div class="event-item">
      <strong>${event.title}</strong>
      <div>${event.date} · ${event.location}</div>
      <div>${event.format}</div>
    </div>
  `).join('');
}

async function loadCommunities() {
  const { payload } = await api('/api/v1/communities');
  const container = document.getElementById('communityList');
  if (!container) return;
  container.innerHTML = (payload.communities || []).map(community => `
    <div class="event-item">
      <strong>${community.name}</strong>
      <div>${community.description}</div>
      <div>${community.members.length} members</div>
      <button data-community-id="${community.id}" class="secondary">Join</button>
    </div>
  `).join('');
  container.querySelectorAll('button').forEach(button => button.addEventListener('click', joinCommunity));
}

async function joinCommunity(event) {
  const button = event.currentTarget;
  const communityId = button.getAttribute('data-community-id');
  const token = localStorage.getItem('token');
  if (!token) return;
  const { payload } = await api(`/api/v1/communities/${communityId}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (payload.community) {
    loadCommunities();
  }
}

async function loadEntries() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const { payload } = await api('/api/v1/journal/entries', { headers: { Authorization: `Bearer ${token}` } });
  const container = document.getElementById('entriesList');
  if (!container) return;
  container.innerHTML = (payload.entries || []).map(entry => `<li><strong>${entry.title}</strong><div>${entry.body}</div><div class="muted">${entry.prompt}</div></li>`).join('');
}

async function loadPrivacySummary() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const { payload } = await api('/api/v1/me', { headers: { Authorization: `Bearer ${token}` } });
  const summary = document.getElementById('privacySummary');
  if (!summary || !payload.user) return;
  const settings = payload.user.privacySettings || {};
  summary.textContent = `Profile: ${settings.profileVisibility || 'private'} · Journal: ${settings.journalVisibility || 'private'}`;
}

async function registerUser(event) {
  event.preventDefault();
  const payload = {
    displayName: document.getElementById('displayName').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    role: document.getElementById('roleSelect').value
  };
  const { payload: result } = await api('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  if (result.token) {
    localStorage.setItem('token', result.token);
    loadEntries();
    loadPrivacySummary();
  }
}

async function savePrivacy(event) {
  event.preventDefault();
  const token = localStorage.getItem('token');
  if (!token) return;
  const payload = {
    profileVisibility: document.getElementById('profileVisibility').value,
    journalVisibility: document.getElementById('journalVisibility').value
  };
  const { payload: result } = await api('/api/v1/me/privacy', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  if (result.privacySettings) {
    loadPrivacySummary();
  }
}

async function saveEntry(event) {
  event.preventDefault();
  const token = localStorage.getItem('token');
  if (!token) return;
  const payload = {
    title: document.getElementById('journalTitle').value,
    body: document.getElementById('journalBody').value,
    prompt: 'What felt grounding today?'
  };
  const { payload: result } = await api('/api/v1/journal/entries', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  if (result.entry) {
    loadEntries();
    document.getElementById('journalForm').reset();
  }
}

const signupForm = document.getElementById('signupForm');
const journalForm = document.getElementById('journalForm');
const privacyForm = document.getElementById('privacyForm');

if (signupForm) signupForm.addEventListener('submit', registerUser);
if (journalForm) journalForm.addEventListener('submit', saveEntry);
if (privacyForm) privacyForm.addEventListener('submit', savePrivacy);

bindHeroActions();
loadEvents();
loadCommunities();
loadEntries();
loadPrivacySummary();
