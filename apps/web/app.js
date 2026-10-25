async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function apiWithAuth(path, options = {}) {
  const accessToken = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  if (!accessToken) {
    return { response: new Response(null, { status: 401 }), payload: { error: 'authentication required' } };
  }

  const firstAttempt = await api(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (firstAttempt.response.status !== 401 || !refreshToken) {
    return firstAttempt;
  }

  const refreshAttempt = await api('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });

  if (!refreshAttempt.response.ok || !refreshAttempt.payload.token || !refreshAttempt.payload.refreshToken) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return firstAttempt;
  }

  localStorage.setItem('token', refreshAttempt.payload.token);
  localStorage.setItem('refreshToken', refreshAttempt.payload.refreshToken);

  return api(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${refreshAttempt.payload.token}`
    }
  });
}

function setState(elementId, variant, message) {
  const target = document.getElementById(elementId);
  if (!target) return;
  target.className = `state-${variant}`;
  target.setAttribute('role', variant === 'error' ? 'alert' : 'status');
  target.setAttribute('aria-live', variant === 'error' ? 'assertive' : 'polite');
  target.setAttribute('aria-atomic', 'true');
  target.textContent = message;
}

const APP_TABS = ['home', 'journal', 'community', 'events', 'profile', 'settings'];
const APP_TAB_STORAGE_KEY = 'rekindle-active-tab';
let activeAppTab = 'home';

function setHomeView(viewName) {
  const onboarding = document.querySelector('.area-onboarding');
  const dashboard = document.querySelector('.area-dashboard');
  const showDashboard = viewName === 'dashboard';

  if (onboarding) onboarding.hidden = showDashboard;
  if (dashboard) dashboard.hidden = !showDashboard;
}

function setAppAccess(isAvailable) {
  const tabs = document.querySelector('.bottom-tabs');
  if (tabs) tabs.hidden = !isAvailable;

  document.querySelectorAll('main > section:not(.area-onboarding)').forEach(panel => {
    panel.hidden = !isAvailable;
  });
}

async function initializeAppNavigation() {
  const accessToken = localStorage.getItem('token');
  const isAuthPage = document.body.dataset.page === 'auth';

  if (accessToken) {
    const result = await apiWithAuth('/api/v1/me');
    if (result.response.ok && result.payload.user) {
      setAppAccess(true);
      if (isAuthPage) {
        window.location.replace('/dashboard.html');
        return;
      }
      updateAuthButtons();
      return;
    }
  }

  if (!isAuthPage) {
    window.location.replace('/auth.html');
    return;
  }

  setAppAccess(false);
  setHomeView('onboarding');
  setAuthMode('login');
}

function setActiveAppTab(tabName, options = {}) {
  const { save = true } = options;
  const normalized = APP_TABS.includes(tabName) ? tabName : 'home';
  activeAppTab = normalized;

  document.querySelectorAll('[data-app-tab-panel]').forEach(panel => {
    const panelTab = panel.getAttribute('data-app-tab-panel');
    const isActive = panelTab === normalized;
    panel.hidden = !isActive;
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  document.querySelectorAll('[data-app-tab]').forEach(tabButton => {
    const isActive = tabButton.getAttribute('data-app-tab') === normalized;
    tabButton.classList.toggle('is-active', isActive);
    tabButton.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  if (save) {
    localStorage.setItem(APP_TAB_STORAGE_KEY, normalized);
  }
}

function showTabForElementId(elementId) {
  const target = document.getElementById(elementId);
  const panel = target?.closest('[data-app-tab-panel]');
  if (!panel) return;
  const tabName = panel.getAttribute('data-app-tab-panel');
  setActiveAppTab(tabName);
}

function bindBottomTabs() {
  const buttons = document.querySelectorAll('[data-app-tab]');
  if (!buttons.length) return;

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      setActiveAppTab(button.getAttribute('data-app-tab') || 'home');
    });
  });

  const savedTab = localStorage.getItem(APP_TAB_STORAGE_KEY);
  setActiveAppTab(savedTab || 'home', { save: false });
}

let authMode = 'login';
let eventCatalog = [];
let eventViewMode = 'list';
let selectedEventId = null;
let eventFilters = {
  q: '',
  topic: '',
  format: '',
  location: '',
  from: '',
  to: ''
};
let socialFeedScope = 'followers';
let socialPostImage = null;
let socialUsers = [];
let socialRequests = [];
let socialCurrentUser = null;
let selectedSocialProfileId = null;
let editingJournalEntryId = null;
let profilePhotoDataUrl = '';
let communityCatalog = [];
let selectedCommunityId = null;
let communityFilters = {
  q: '',
  topic: '',
  format: '',
  location: '',
  moderated: false,
  verified: false
};

const dailyChallenges = [
  'Take three slow breaths and notice one thing that feels safe around you.',
  'Send yourself a kind note in the journal: one sentence is enough.',
  'Drink a glass of water and stretch your shoulders for 30 seconds.',
  'Open a window or step outside for two calm minutes of fresh air.',
  'Name one person or place that helps you feel grounded right now.',
  'Pick one comforting song and listen without multitasking.'
];

const journalPrompts = [
  'What helped you feel steady today?',
  'Where did you notice a small moment of relief?',
  'What is one thing you handled with more care than usual?',
  'Which part of today deserves a gentle thank-you?',
  'What comfort did you give yourself that you want to remember?',
  'What would you like to carry forward into tomorrow?'
];

const journalChallenges = [
  {
    title: 'Two-line time capsule',
    description: 'Write exactly two lines: one about today and one for future-you.',
    hint: 'Keep it tiny. Two short lines is enough.'
  },
  {
    title: 'Emoji mood map',
    description: 'Use 3 emojis to describe your day, then explain why in one sentence.',
    hint: 'Start with weather-style emojis and translate them into words.'
  },
  {
    title: 'Gratitude speed run',
    description: 'List 5 small things you are grateful for in under 60 seconds.',
    hint: 'Small counts: warm tea, sunlight, one kind message.'
  },
  {
    title: 'Mini victory replay',
    description: 'Describe one win from today and what helped make it possible.',
    hint: 'A win can be as simple as getting out of bed on a hard day.'
  },
  {
    title: 'Kind self-talk remix',
    description: 'Rewrite one self-critical thought into a kinder sentence.',
    hint: 'Try adding: "I am learning, not failing."'
  },
  {
    title: 'Future postcard',
    description: 'Write a 1-week-in-the-future postcard to yourself.',
    hint: 'Start with: "Dear me, I noticed you kept going."'
  }
];

function getCurrentDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getJournalChallengeScope() {
  const token = localStorage.getItem('token');
  return token ? token.slice(0, 24) : 'guest';
}

function getJournalChallengeSelectionKey(dateKey) {
  return `journal-challenge-selection:${getJournalChallengeScope()}:${dateKey}`;
}

function getJournalChallengeStatusKey(dateKey) {
  return `journal-challenge-status:${getJournalChallengeScope()}:${dateKey}`;
}

function getJournalChallengeProgressKey() {
  return `journal-challenge-progress:${getJournalChallengeScope()}`;
}

function readJournalChallengeProgress() {
  const raw = localStorage.getItem(getJournalChallengeProgressKey());
  if (!raw) {
    return { completedCount: 0, streak: 0, lastCompletedDate: '' };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { completedCount: 0, streak: 0, lastCompletedDate: '' };
    }
    return {
      completedCount: Number(parsed.completedCount) || 0,
      streak: Number(parsed.streak) || 0,
      lastCompletedDate: typeof parsed.lastCompletedDate === 'string' ? parsed.lastCompletedDate : ''
    };
  } catch (_error) {
    return { completedCount: 0, streak: 0, lastCompletedDate: '' };
  }
}

function writeJournalChallengeProgress(progress) {
  localStorage.setItem(getJournalChallengeProgressKey(), JSON.stringify(progress));
}

function getDateOffsetKey(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

function getJournalChallengeForToday() {
  const dateKey = getCurrentDateKey();
  const selectionKey = getJournalChallengeSelectionKey(dateKey);
  const storedIndex = Number.parseInt(localStorage.getItem(selectionKey) || '', 10);

  const validStored = Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < journalChallenges.length;
  const fallbackIndex = [...dateKey].reduce((total, character) => total + character.charCodeAt(0), 0) % journalChallenges.length;
  const index = validStored ? storedIndex : fallbackIndex;

  if (!validStored) {
    localStorage.setItem(selectionKey, String(index));
  }

  return {
    dateKey,
    index,
    challenge: journalChallenges[index]
  };
}

function updateJournalChallenge() {
  const challengeText = document.getElementById('journalChallengeText');
  const challengeHint = document.getElementById('journalChallengeHint');
  const challengeStatus = document.getElementById('journalChallengeStatus');
  const streakNode = document.getElementById('journalChallengeStreak');
  const completedNode = document.getElementById('journalChallengeCompleted');
  const completeBtn = document.getElementById('journalChallengeCompleteBtn');
  const skipBtn = document.getElementById('journalChallengeSkipBtn');

  if (!challengeText || !challengeHint || !challengeStatus || !streakNode || !completedNode || !completeBtn || !skipBtn) {
    return;
  }

  const current = getJournalChallengeForToday();
  const dayStatus = localStorage.getItem(getJournalChallengeStatusKey(current.dateKey)) || 'pending';
  const progress = readJournalChallengeProgress();

  challengeText.textContent = `${current.challenge.title}: ${current.challenge.description}`;
  challengeHint.textContent = 'Hint: tap Reveal hint for a playful nudge.';
  challengeHint.setAttribute('data-revealed', 'false');

  streakNode.textContent = `Streak: ${progress.streak} day${progress.streak === 1 ? '' : 's'}`;
  completedNode.textContent = `Completed: ${progress.completedCount}`;

  completeBtn.disabled = dayStatus === 'completed';
  skipBtn.disabled = dayStatus === 'completed';

  if (dayStatus === 'completed') {
    challengeStatus.textContent = 'Completed today. Nice momentum.';
  } else if (dayStatus === 'skipped') {
    challengeStatus.textContent = 'Skipped today. You can still try Surprise me.';
  } else {
    challengeStatus.textContent = 'Choose an action to begin.';
  }
}

function revealJournalChallengeHint() {
  const current = getJournalChallengeForToday();
  const hintNode = document.getElementById('journalChallengeHint');
  if (!hintNode) return;
  hintNode.textContent = `Hint: ${current.challenge.hint}`;
  hintNode.setAttribute('data-revealed', 'true');
}

function completeJournalChallenge() {
  const current = getJournalChallengeForToday();
  const statusKey = getJournalChallengeStatusKey(current.dateKey);
  const alreadyCompleted = localStorage.getItem(statusKey) === 'completed';
  if (alreadyCompleted) {
    updateJournalChallenge();
    return;
  }

  const progress = readJournalChallengeProgress();
  const yesterday = getDateOffsetKey(-1);

  if (progress.lastCompletedDate === current.dateKey) {
    updateJournalChallenge();
    return;
  }

  progress.streak = progress.lastCompletedDate === yesterday ? progress.streak + 1 : 1;
  progress.completedCount += 1;
  progress.lastCompletedDate = current.dateKey;

  writeJournalChallengeProgress(progress);
  localStorage.setItem(statusKey, 'completed');
  setState('journalState', 'success', `Challenge complete: ${current.challenge.title}. Great job.`);
  updateJournalChallenge();
}

function skipJournalChallenge() {
  const current = getJournalChallengeForToday();
  localStorage.setItem(getJournalChallengeStatusKey(current.dateKey), 'skipped');

  const progress = readJournalChallengeProgress();
  progress.streak = 0;
  writeJournalChallengeProgress(progress);

  setState('journalState', 'success', 'Challenge skipped for today. You can still journal anytime.');
  updateJournalChallenge();
}

function shuffleJournalChallenge() {
  const current = getJournalChallengeForToday();
  const statusKey = getJournalChallengeStatusKey(current.dateKey);
  if (localStorage.getItem(statusKey) === 'completed') {
    setState('journalState', 'success', 'Today\'s challenge is already completed. Fresh one tomorrow.');
    updateJournalChallenge();
    return;
  }

  let nextIndex = current.index;
  if (journalChallenges.length > 1) {
    while (nextIndex === current.index) {
      nextIndex = Math.floor(Math.random() * journalChallenges.length);
    }
  }

  localStorage.setItem(getJournalChallengeSelectionKey(current.dateKey), String(nextIndex));
  localStorage.removeItem(statusKey);
  setState('journalState', 'success', 'New challenge loaded.');
  updateJournalChallenge();
}

function getJournalDraftKey() {
  const token = localStorage.getItem('token');
  return token ? `journal-draft:${token.slice(0, 24)}` : 'journal-draft:guest';
}

function readJournalDraft() {
  const raw = localStorage.getItem(getJournalDraftKey());
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

function saveJournalDraftToStorage() {
  const title = document.getElementById('journalTitle')?.value || '';
  const body = document.getElementById('journalBody')?.value || '';
  const mood = document.getElementById('journalMood')?.value || 'steady';
  const visibility = document.getElementById('journalEntryVisibility')?.value || 'private';
  const promptReference = document.getElementById('journalPromptText')?.textContent || 'general-reflection';
  if (!title.trim() && !body.trim()) {
    localStorage.removeItem(getJournalDraftKey());
    setState('journalDraftState', 'empty', 'Draft area is clear.');
    return;
  }
  const payload = {
    title,
    body,
    mood,
    visibility,
    promptReference,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem(getJournalDraftKey(), JSON.stringify(payload));
  setState('journalDraftState', 'success', 'Draft saved on this device.');
}

function loadJournalDraftFromStorage() {
  const draft = readJournalDraft();
  if (!draft) {
    setState('journalDraftState', 'empty', 'Drafts save on this device for your current session.');
    return;
  }
  const titleField = document.getElementById('journalTitle');
  const bodyField = document.getElementById('journalBody');
  const moodField = document.getElementById('journalMood');
  const visibilityField = document.getElementById('journalEntryVisibility');
  if (titleField && typeof draft.title === 'string') titleField.value = draft.title;
  if (bodyField && typeof draft.body === 'string') bodyField.value = draft.body;
  if (moodField && typeof draft.mood === 'string') moodField.value = draft.mood;
  if (visibilityField && typeof draft.visibility === 'string') visibilityField.value = draft.visibility;
  setState('journalDraftState', 'success', 'Draft restored.');
}

function clearJournalDraft() {
  localStorage.removeItem(getJournalDraftKey());
  setState('journalDraftState', 'empty', 'Draft removed.');
}

function downloadJsonFile(fileName, content) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || `journal-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function resetJournalComposer() {
  const form = document.getElementById('journalForm');
  const submitButton = document.getElementById('journalSubmitBtn');
  const cancelButton = document.getElementById('journalEditCancelBtn');
  editingJournalEntryId = null;
  form?.reset();
  if (submitButton) submitButton.textContent = 'Save entry';
  cancelButton?.classList.add('is-hidden');
}

function bindJournalDraftActions() {
  document.getElementById('journalExportBtn')?.addEventListener('click', exportAllEntries);
  document.getElementById('journalDraftSaveBtn')?.addEventListener('click', saveJournalDraftToStorage);
  document.getElementById('journalDraftClearBtn')?.addEventListener('click', () => {
    clearJournalDraft();
    resetJournalComposer();
  });
  document.getElementById('journalEditCancelBtn')?.addEventListener('click', () => {
    resetJournalComposer();
    loadJournalDraftFromStorage();
    setState('journalState', 'empty', 'Edit cancelled.');
  });

  const draftFields = ['journalTitle', 'journalBody', 'journalMood', 'journalEntryVisibility'];
  draftFields.forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      saveJournalDraftToStorage();
    });
  });
}

async function exportAllEntries() {
  if (!isAuthenticated()) {
    setState('journalState', 'error', 'Sign in before exporting journal entries.');
    return;
  }
  setState('journalState', 'loading', 'Preparing journal export...');
  const { response, payload } = await apiWithAuth('/api/v1/journal/entries/export');
  if (!response.ok) {
    setState('journalState', 'error', payload.error || 'Unable to export entries right now.');
    return;
  }
  downloadJsonFile(payload.fileName, {
    exportedAt: payload.exportedAt,
    count: payload.count,
    entries: payload.entries || []
  });
  setState('journalState', 'success', `Export downloaded (${payload.count || 0} entries).`);
}

async function exportEntry(entryId) {
  if (!isAuthenticated()) {
    setState('journalState', 'error', 'Sign in before exporting a journal entry.');
    return;
  }
  setState('journalState', 'loading', 'Preparing entry export...');
  const { response, payload } = await apiWithAuth(`/api/v1/journal/entries/${entryId}/export`);
  if (!response.ok) {
    setState('journalState', 'error', payload.error || 'Unable to export this entry.');
    return;
  }
  downloadJsonFile(payload.fileName, {
    exportedAt: payload.exportedAt,
    entry: payload.entry
  });
  setState('journalState', 'success', 'Entry export downloaded.');
}

function isAuthenticated() {
  return Boolean(localStorage.getItem('token'));
}

function updateProfilePhotoPreview() {
  const preview = document.getElementById('profilePhotoPreview');
  if (!preview) return;

  if (!profilePhotoDataUrl) {
    preview.className = 'post-image-preview state-empty';
    preview.textContent = 'No photo selected.';
    return;
  }

  preview.className = 'post-image-preview';
  preview.innerHTML = `<img src="${profilePhotoDataUrl}" alt="Selected profile photo preview" />`;
}

function handleProfilePhotoChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    updateProfilePhotoPreview();
    return;
  }

  if (!file.type.startsWith('image/')) {
    event.target.value = '';
    setState('profileState', 'error', 'Choose an image file for the profile photo.');
    updateProfilePhotoPreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    profilePhotoDataUrl = typeof reader.result === 'string' ? reader.result : '';
    updateProfilePhotoPreview();
    setState('profileState', 'success', 'Profile photo selected. Save profile to apply it.');
  };
  reader.onerror = () => {
    profilePhotoDataUrl = '';
    setState('profileState', 'error', 'Unable to read the selected profile photo.');
    updateProfilePhotoPreview();
  };
  reader.readAsDataURL(file);
}

function removeProfilePhoto() {
  profilePhotoDataUrl = '';
  const photoField = document.getElementById('profilePhotoUpload');
  if (photoField) photoField.value = '';
  updateProfilePhotoPreview();
  setState('profileState', 'success', 'Profile photo removed. Save profile to apply this change.');
}

function setAuthMode(mode) {
  authMode = mode;
  const displayNameRow = document.getElementById('displayNameRow');
  const roleRow = document.getElementById('roleRow');
  const privacyDefaultsRow = document.getElementById('privacyDefaultsRow');
  const consentRow = document.getElementById('consentRow');
  const submitButton = document.getElementById('authSubmitBtn');

  if (mode === 'login') {
    displayNameRow?.classList.add('is-hidden');
    roleRow?.classList.add('is-hidden');
    privacyDefaultsRow?.classList.add('is-hidden');
    consentRow?.classList.add('is-hidden');
    if (submitButton) submitButton.textContent = 'Sign in';
    setState('signupState', 'empty', 'Sign in to continue to your private dashboard and journal.');
  } else {
    displayNameRow?.classList.remove('is-hidden');
    roleRow?.classList.remove('is-hidden');
    privacyDefaultsRow?.classList.remove('is-hidden');
    consentRow?.classList.remove('is-hidden');
    if (submitButton) submitButton.textContent = 'Continue';
    setState('signupState', 'empty', 'Create an account to unlock private journaling and community actions.');
  }

  const displayNameField = document.getElementById('displayName');
  const roleField = document.getElementById('roleSelect');
  const consentField = document.getElementById('consentAccepted');
  if (displayNameField) displayNameField.required = mode === 'register';
  if (roleField) roleField.required = mode === 'register';
  if (consentField) consentField.required = mode === 'register';

  updateAuthButtons();
}

function updateAuthButtons() {
  const loginButton = document.getElementById('loginBtn');
  if (!loginButton) return;
  if (isAuthenticated()) {
    loginButton.textContent = 'Sign out';
    return;
  }
  loginButton.textContent = authMode === 'login' ? 'Use registration' : 'Sign in';
}

function addLandingPageButton() {
  if (document.body.dataset.page === 'auth' || document.getElementById('landingPageBtn')) return;
  const hero = document.querySelector('.hero');
  const loginButton = document.getElementById('loginBtn');
  if (!hero || !loginButton) return;

  const actions = document.createElement('div');
  actions.className = 'hero-actions';
  const landingPageButton = document.createElement('a');
  landingPageButton.id = 'landingPageBtn';
  landingPageButton.className = 'hero-home-link secondary';
  landingPageButton.href = '/landing.html';
  landingPageButton.setAttribute('aria-label', 'Go to landing page');
  landingPageButton.title = 'Go to landing page';
  landingPageButton.innerHTML = '<span class="material-symbol" aria-hidden="true">home</span>Landing Page';

  loginButton.before(actions);
  actions.append(landingPageButton, loginButton);
}

function bindDashboardActions() {
  document.querySelectorAll('[data-scroll-target]').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-scroll-target');
      if (targetId) showTabForElementId(targetId);
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function readCommunityFilters() {
  return {
    q: document.getElementById('communitySearch')?.value?.trim() || '',
    topic: document.getElementById('communityTopicFilter')?.value || '',
    format: document.getElementById('communityFormatFilter')?.value || '',
    location: document.getElementById('communityLocationFilter')?.value?.trim() || '',
    moderated: Boolean(document.getElementById('communityModeratedOnly')?.checked),
    verified: Boolean(document.getElementById('communityVerifiedOnly')?.checked)
  };
}

function updateCommunityFilterOptions(topics = []) {
  const topicSelect = document.getElementById('communityTopicFilter');
  if (!topicSelect) return;
  const currentValue = topicSelect.value;
  const options = ['<option value="">All topics</option>']
    .concat(topics.map(topic => `<option value="${topic}">${topic}</option>`));
  topicSelect.innerHTML = options.join('');
  if (topics.includes(currentValue)) {
    topicSelect.value = currentValue;
  }
}

function bindCommunityActions() {
  const triggerReload = () => {
    communityFilters = readCommunityFilters();
    loadCommunities();
  };
  document.getElementById('communitySearch')?.addEventListener('input', triggerReload);
  document.getElementById('communityTopicFilter')?.addEventListener('change', triggerReload);
  document.getElementById('communityFormatFilter')?.addEventListener('change', triggerReload);
  document.getElementById('communityLocationFilter')?.addEventListener('input', triggerReload);
  document.getElementById('communityModeratedOnly')?.addEventListener('change', triggerReload);
  document.getElementById('communityVerifiedOnly')?.addEventListener('change', triggerReload);
  document.getElementById('communityCreateForm')?.addEventListener('submit', createCommunity);
}

function socialPanelMarkup() {
  return `
    <section class="card area-social">
      <h2>People suggestions</h2>
      <div id="socialState" class="state-empty">Loading people suggestions...</div>
      <div class="directory-search">
        <input id="peopleSearch" type="search" aria-label="Search people suggestions" placeholder="Search people" />
      </div>
      <div id="userDirectory" class="directory-grid"></div>
      <div id="incomingRequests" class="request-list"></div>
    </section>
  `;
}

function initializeCommunitySocial() {
  if (document.body.dataset.page !== 'community') return;
  const main = document.getElementById('mainContent');
  if (!main) return;
  document.title = 'Community | Rekindle & Rise';
  main.classList.add('community-social-page');
  main.innerHTML = socialPanelMarkup();
}

function initializeGroupChatsPage() {
  if (document.body.dataset.page !== 'groups') return;
  const main = document.getElementById('mainContent');
  if (!main) return;
  document.title = 'Group Chats | Rekindle & Rise';
  const headerEyebrow = document.querySelector('.hero .eyebrow');
  const headerTitle = document.querySelector('.hero h1');
  const headerSubtitle = document.querySelector('.hero .subtitle');
  if (headerEyebrow) headerEyebrow.textContent = 'Moderated conversations';
  if (headerTitle) headerTitle.textContent = 'Group Chats';
  if (headerSubtitle) headerSubtitle.textContent = 'Join a group chat to connect at your own pace.';
  main.innerHTML = `
    <section class="card area-communities">
      <p class="eyebrow">Moderated conversations</p>
      <h2>Group Chats</h2>
      <p class="muted">Join a group chat to read and share messages with its members.</p>
      <div id="communityState" class="state-loading">Loading group chats...</div>
      <div class="community-layout">
        <div class="event-list" id="communityList"></div>
        <div class="community-detail" id="communityDetail"><div id="communityDetailState" class="state-empty">Select a group chat to get started.</div><div id="communityDetailBody"></div></div>
      </div>
    </section>
  `;
}

function ensureGroupChatsNavigation() {
  const navigation = document.querySelector('.bottom-tabs');
  const communityLink = navigation?.querySelector('a[href="/community.html"]');
  if (!navigation || !communityLink || navigation.querySelector('a[href="/groups.html"]')) return;
  communityLink.textContent = 'Community';
  const groupChatsLink = document.createElement('a');
  groupChatsLink.className = 'bottom-tab';
  groupChatsLink.href = '/groups.html';
  groupChatsLink.textContent = 'Group Chats';
  if (document.body.dataset.page === 'groups') {
    communityLink.classList.remove('is-active');
    groupChatsLink.classList.add('is-active');
  }
  communityLink.insertAdjacentElement('afterend', groupChatsLink);
}

async function createCommunity(event) {
  event.preventDefault();
  if (!isAuthenticated()) {
    setState('communityState', 'error', 'Sign in before creating a community.');
    return;
  }

  const nameField = document.getElementById('communityCreateName');
  const locationField = document.getElementById('communityCreateLocation');
  const formatField = document.getElementById('communityCreateFormat');
  const topicsField = document.getElementById('communityCreateTopics');
  const descriptionField = document.getElementById('communityCreateDescription');
  const name = nameField?.value?.trim() || '';

  if (!name) {
    setState('communityState', 'error', 'Please add a community name.');
    return;
  }

  setState('communityState', 'loading', 'Creating community...');
  const { response, payload } = await apiWithAuth('/api/v1/communities', {
    method: 'POST',
    body: JSON.stringify({
      name,
      location: locationField?.value?.trim() || 'Virtual',
      format: formatField?.value || 'online',
      topics: topicsField?.value || '',
      description: descriptionField?.value || ''
    })
  });

  if (!response.ok || !payload.community) {
    setState('communityState', 'error', payload.error || 'Unable to create community right now.');
    return;
  }

  if (nameField) nameField.value = '';
  if (locationField) locationField.value = '';
  if (formatField) formatField.value = 'online';
  if (topicsField) topicsField.value = '';
  if (descriptionField) descriptionField.value = '';

  selectedCommunityId = payload.community.id;
  setState('communityState', 'success', `${payload.community.name} created.`);
  loadCommunities();
}

async function reportResource(resourceType, resourceId, stateElementId) {
  if (!isAuthenticated()) {
    setState(stateElementId, 'error', 'Sign in to report content.');
    return;
  }
  const reason = window.prompt('Share a short reason for this report (optional):', 'safety concern');
  if (reason == null) return;

  setState(stateElementId, 'loading', 'Submitting report...');
  const { response, payload } = await apiWithAuth('/api/v1/moderation/report', {
    method: 'POST',
    body: JSON.stringify({ resourceType, resourceId, reason })
  });
  if (!response.ok || !payload.report) {
    setState(stateElementId, 'error', payload.error || 'Unable to submit report right now.');
    return;
  }
  setState(stateElementId, 'success', 'Report submitted for moderator review.');
  if (resourceType === 'community') {
    await loadCommunities();
  } else {
    await loadEvents();
  }
}

async function blockResource(resourceType, resourceId, stateElementId) {
  if (!isAuthenticated()) {
    setState(stateElementId, 'error', 'Sign in to block content.');
    return;
  }
  const confirmed = window.confirm('Block this item from your feed and discovery views?');
  if (!confirmed) return;

  setState(stateElementId, 'loading', 'Blocking item...');
  const { response, payload } = await apiWithAuth('/api/v1/moderation/block', {
    method: 'POST',
    body: JSON.stringify({ resourceType, resourceId, reason: 'safety-preference' })
  });
  if (!response.ok || !payload.block) {
    setState(stateElementId, 'error', payload.error || 'Unable to block item right now.');
    return;
  }
  setState(stateElementId, 'success', 'Item blocked from your discovery view.');
  if (resourceType === 'community') {
    selectedCommunityId = null;
    await loadCommunities();
  } else {
    selectedEventId = null;
    await loadEvents();
  }
}

function renderCommunityDetail(community) {
  const state = document.getElementById('communityDetailState');
  const body = document.getElementById('communityDetailBody');
  if (!state || !body) return;

  if (!community) {
    state.className = 'state-empty';
    state.textContent = 'Select a group chat to get started.';
    body.innerHTML = '';
    return;
  }

  const topicText = (community.topics || []).join(', ') || 'General support';
  state.className = 'state-success';
  state.textContent = community.joined
    ? `You are in ${community.name}.`
    : `Join ${community.name} to enter its group chat.`;

  if (community.joined) {
    body.innerHTML = `
      <div class="group-chat-window">
        <header class="group-chat-header">
          <div>
            <h3>${community.name}</h3>
            <p class="muted">${community.membersCount || 0} members · ${community.format || 'online'} · ${topicText}</p>
          </div>
          <span class="badge badge-private">Joined</span>
        </header>
        <div id="groupChatMessages" class="group-chat-messages" aria-live="polite">Loading messages...</div>
        <form id="groupChatForm" class="group-chat-form"><textarea id="groupChatBody" aria-label="Group chat message" maxlength="1000" placeholder="Write a message to ${community.name}..."></textarea><button type="submit">Send message</button></form>
      </div>
    `;
    body.querySelector('#groupChatForm')?.addEventListener('submit', event => sendGroupChatMessage(event, community.id));
    loadGroupChatMessages(community.id);
    return;
  }

  body.innerHTML = `
    <h3>${community.name}</h3>
    <p>${community.description || ''}</p>
    <p class="muted">${community.membersCount || 0} members · ${community.format || 'online'}</p>
    <p class="muted">Topics: ${topicText}</p>
    <div class="badge-row">
      ${community.moderated ? '<span class="badge badge-moderated">Moderated</span>' : ''}
      <span class="badge badge-private">Join to chat</span>
    </div>
    <div class="action-row action-row-subtle"><button type="button" data-community-detail-join="${community.id}">Join group chat</button></div>
  `;

  body.querySelector('[data-community-detail-join]')?.addEventListener('click', joinCommunity);
}

function selectCommunity(communityId) {
  selectedCommunityId = communityId;
  const selected = communityCatalog.find(community => community.id === communityId) || null;
  renderCommunityDetail(selected);
  document.querySelectorAll('[data-community-card-id]').forEach(node => {
    node.classList.toggle('is-selected', node.getAttribute('data-community-card-id') === communityId);
  });
}

let groupChatCurrentUserId = null;

async function resolveGroupChatCurrentUserId() {
  if (groupChatCurrentUserId) return groupChatCurrentUserId;
  const { response, payload } = await apiWithAuth('/api/v1/me');
  groupChatCurrentUserId = response.ok ? payload.user?.id || null : null;
  return groupChatCurrentUserId;
}

async function loadGroupChatMessages(communityId) {
  const container = document.getElementById('groupChatMessages');
  if (!container) return;
  const [currentUserId, { response, payload }] = await Promise.all([
    resolveGroupChatCurrentUserId(),
    apiWithAuth(`/api/v1/communities/${communityId}/messages`)
  ]);
  if (!response.ok) {
    container.textContent = payload.error || 'Unable to load messages right now.';
    return;
  }
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  container.innerHTML = messages.length === 0
    ? '<p class="muted group-chat-empty">No messages yet. Start the conversation gently.</p>'
    : messages.map(message => {
      const isOwn = Boolean(currentUserId) && message.author?.id === currentUserId;
      return `<article class="group-chat-message ${isOwn ? 'is-own' : ''}"><strong>${isOwn ? 'You' : message.author?.displayName || 'Member'}</strong><span>${message.body}</span><small>${new Date(message.createdAt).toLocaleString()}</small></article>`;
    }).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendGroupChatMessage(event, communityId) {
  event.preventDefault();
  const bodyField = document.getElementById('groupChatBody');
  const body = bodyField?.value?.trim() || '';
  if (!body) return;
  const { response, payload } = await apiWithAuth(`/api/v1/communities/${communityId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body })
  });
  if (!response.ok) {
    setState('communityState', 'error', payload.error || 'Unable to send your message right now.');
    return;
  }
  if (bodyField) bodyField.value = '';
  await loadGroupChatMessages(communityId);
}

function bindSocialActions() {
  document.querySelectorAll('[data-social-scope]').forEach(button => {
    button.addEventListener('click', () => {
      socialFeedScope = button.getAttribute('data-social-scope') || 'followers';
      loadSocialFeed();
    });
  });

  document.getElementById('followForm')?.addEventListener('submit', requestFollowByEmail);
  document.getElementById('socialForm')?.addEventListener('submit', createSocialPost);
  document.getElementById('socialPostImage')?.addEventListener('change', handleSocialImageChange);
  document.getElementById('peopleSearch')?.addEventListener('input', () => {
    renderSocialDirectory(socialUsers, socialCurrentUser);
  });
}

function getSelectedSocialProfile() {
  return socialUsers.find(user => user.id === selectedSocialProfileId) || null;
}

function getSocialRequestStatus(userId) {
  const currentUserId = socialCurrentUser?.id;
  const outgoingRequest = socialRequests.find(request => request.requesterId === currentUserId && request.targetId === userId && request.status === 'pending');
  const incomingRequest = socialRequests.find(request => request.requesterId === userId && request.targetId === currentUserId && request.status === 'pending');
  if (outgoingRequest) return { type: 'pending', request: outgoingRequest };
  if (incomingRequest) return { type: 'incoming', request: incomingRequest };
  return { type: 'none', request: null };
}

function renderSocialDirectory(users, currentUser) {
  const container = document.getElementById('userDirectory');
  if (!container) return;
  const searchTerm = document.getElementById('peopleSearch')?.value.trim().toLowerCase() || '';
  const others = users.filter(user => {
    if (user.id === currentUser?.id) return false;
    if (!searchTerm) return true;
    const searchableProfile = [
      user.displayName,
      user.role,
      user.profile?.bio,
      user.profile?.location
    ].filter(Boolean).join(' ').toLowerCase();
    return searchableProfile.includes(searchTerm);
  });
  if (others.length === 0) {
    container.innerHTML = searchTerm
      ? '<div class="muted">No people match your search.</div>'
      : '<div class="muted">No other profiles are available yet.</div>';
    return;
  }

  container.innerHTML = others.map(user => {
    const initials = user.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(name => name[0])
      .join('')
      .toUpperCase();
    const photoMarkup = user.profile?.photoUrl
      ? `<img src="${user.profile.photoUrl}" alt="" />`
      : `<span aria-hidden="true">${initials}</span>`;
    const mutualFollowersCount = Number(user.mutualFollowersCount) || 0;
    const mutualFollowersLabel = mutualFollowersCount === 1
      ? '1 mutual follower'
      : `${mutualFollowersCount} mutual followers`;
    const requestStatus = getSocialRequestStatus(user.id);
    const followAction = user.relationship === 'following'
      ? '<button type="button" class="user-card-follow" disabled>Following</button>'
      : requestStatus.type === 'pending'
        ? '<button type="button" class="user-card-follow" disabled>Requested</button>'
        : `<button type="button" class="user-card-follow" data-follow-profile="${user.id}"><span class="material-symbol" aria-hidden="true">person_add</span>Follow</button>`;

    return `
      <article class="user-card ${user.id === selectedSocialProfileId ? 'is-selected' : ''}">
        <button type="button" class="user-card-open" data-profile-id="${user.id}" aria-label="View ${user.displayName}'s profile">
          <span class="user-card-cover"><span class="user-card-avatar">${photoMarkup}</span></span>
          <span class="user-card-content">
          <strong>${user.displayName}</strong>
          <span class="user-card-mutual"><span class="material-symbol" aria-hidden="true">group</span>${mutualFollowersLabel}</span>
          <span class="user-card-profile-action">View profile<span class="material-symbol" aria-hidden="true">arrow_forward</span></span>
          </span>
        </button>
        ${followAction}
      </article>
    `;
  }).join('');

  container.querySelectorAll('[data-profile-id]').forEach(button => {
    button.addEventListener('click', () => {
      const profileId = button.getAttribute('data-profile-id');
      if (profileId) window.location.href = `/member-profile.html?user=${encodeURIComponent(profileId)}`;
    });
  });
  container.querySelectorAll('[data-follow-profile]').forEach(button => {
    button.addEventListener('click', () => requestFollow(button.getAttribute('data-follow-profile')));
  });
}

async function loadMemberProfile() {
  if (document.body.dataset.page !== 'member-profile') return;
  const state = document.getElementById('selectedProfileState');
  const detail = document.getElementById('selectedProfileDetail');
  const title = document.getElementById('memberProfileTitle');
  const profileId = new URLSearchParams(window.location.search).get('user');
  if (!state || !detail || !profileId) {
    setState('selectedProfileState', 'error', 'This member profile could not be found.');
    return;
  }

  setState('selectedProfileState', 'loading', 'Loading member profile...');
  const [socialResult, usersResult, requestsResult] = await Promise.all([
    apiWithAuth('/api/v1/me/social?scope=followers'),
    apiWithAuth('/api/v1/users'),
    apiWithAuth('/api/v1/me/follow-requests?scope=all')
  ]);
  const profile = usersResult.payload?.users?.find(user => user.id === profileId);
  if (!socialResult.response.ok || !usersResult.response.ok || !requestsResult.response.ok || !profile) {
    setState('selectedProfileState', 'error', 'This member profile is unavailable right now.');
    detail.innerHTML = '';
    return;
  }

  socialCurrentUser = socialResult.payload?.user || null;
  socialUsers = usersResult.payload.users;
  socialRequests = Array.isArray(requestsResult.payload?.requests) ? requestsResult.payload.requests : [];
  selectedSocialProfileId = profile.id;
  if (title) title.textContent = 'Community';
  renderSelectedSocialProfile(socialCurrentUser);
}

function renderSelectedSocialProfile(currentUser) {
  const state = document.getElementById('selectedProfileState');
  const detail = document.getElementById('selectedProfileDetail');
  if (!state || !detail) return;
  const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const profile = getSelectedSocialProfile() || socialUsers.find(user => user.relationship !== 'self') || null;
  if (!profile) {
    state.className = 'state-empty';
    state.textContent = 'No profile selected yet.';
    detail.innerHTML = '';
    return;
  }

  selectedSocialProfileId = profile.id;
  const requestStatus = profile.id === currentUser?.id ? { type: 'self', request: null } : getSocialRequestStatus(profile.id);
  const actionMarkup = profile.id === currentUser?.id
    ? '<span class="muted">This is your own profile.</span>'
    : requestStatus.type === 'pending'
      ? '<button type="button" class="secondary" data-cancel-request>Cancel request</button>'
      : requestStatus.type === 'incoming'
        ? '<div class="request-actions"><button type="button" data-accept-request>Accept request</button><button type="button" class="secondary" data-decline-request>Decline</button></div>'
        : profile.relationship === 'following'
          ? '<button type="button" class="secondary" data-unfollow-profile>Unfollow</button>'
          : '<button type="button" data-request-follow>Request to follow</button>';
  const mutualFollowersCount = Number(profile.mutualFollowersCount) || 0;
  const mutualFollowers = Array.isArray(profile.mutualFollowers)
    ? profile.mutualFollowers.filter(follower => typeof follower?.displayName === 'string' && follower.displayName.trim())
    : [];
  const mutualFollowersLabel = mutualFollowersCount === 1
    ? '1 total mutual follower'
    : `${mutualFollowersCount} total mutual followers`;
  const mutualAvatarsMarkup = mutualFollowers.length > 0
    ? `<div class="profile-detail-mutuals"><span class="profile-detail-mutual-label">Mutual followers</span><span class="profile-detail-mutual-avatars" role="img" aria-label="Mutual follower avatars: ${escapeHtml(mutualFollowers.map(follower => follower.displayName).join(', '))}; ${mutualFollowersLabel}">${mutualFollowers.map(follower => {
      const initials = follower.displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(name => name[0])
        .join('')
        .toUpperCase();
      const avatar = follower.profile?.photoUrl
        ? `<img src="${escapeHtml(follower.profile.photoUrl)}" alt="" />`
        : `<span aria-hidden="true">${escapeHtml(initials)}</span>`;
      return `<span class="profile-detail-mutual-avatar" aria-hidden="true" title="${escapeHtml(follower.displayName)}">${avatar}</span>`;
    }).join('')}</span></div>`
    : '';

  state.className = 'state-success';
  state.textContent = profile.relationship === 'following'
    ? `You are following ${profile.displayName}.`
    : requestStatus.type === 'pending'
      ? `Follow request pending for ${profile.displayName}.`
      : requestStatus.type === 'incoming'
        ? `${profile.displayName} wants to follow you.`
        : `Viewing ${profile.displayName}'s profile.`;

  detail.innerHTML = `
    <div class="profile-detail-head">
      <div>
        <strong>${profile.displayName}</strong>
        <div class="muted">${profile.role}</div>
      </div>
      ${profile.relationship !== 'none' ? `<span class="badge ${profile.relationship === 'following' ? 'badge-verified' : 'badge-moderated'}">${profile.relationship}</span>` : ''}
    </div>
    <div class="profile-detail-meta">
      <span>${profile.profile?.bio || 'No bio added yet.'}</span>
      <span class="muted">${profile.profile?.location || 'No location listed'}</span>
      <span class="muted">${profile.followersCount} followers · ${profile.followingCount} following</span>
    </div>
    ${mutualAvatarsMarkup}
    <div class="profile-detail-actions">
      ${actionMarkup}
    </div>
  `;

  const requestButton = detail.querySelector('[data-request-follow]');
  if (requestButton) requestButton.addEventListener('click', () => requestFollow(profile.id));
  const unfollowButton = detail.querySelector('[data-unfollow-profile]');
  if (unfollowButton) unfollowButton.addEventListener('click', () => unfollowUser(profile.id));
  const cancelButton = detail.querySelector('[data-cancel-request]');
  if (cancelButton && requestStatus.request) cancelButton.addEventListener('click', () => declineFollowRequest(requestStatus.request.id));
  const acceptButton = detail.querySelector('[data-accept-request]');
  if (acceptButton && requestStatus.request) acceptButton.addEventListener('click', () => acceptFollowRequest(requestStatus.request.id));
  const declineButton = detail.querySelector('[data-decline-request]');
  if (declineButton && requestStatus.request) declineButton.addEventListener('click', () => declineFollowRequest(requestStatus.request.id));
}

function renderFollowRequests(requests) {
  const container = document.getElementById('incomingRequests');
  if (!container) return;
  if (requests.length === 0) {
    container.innerHTML = '<div class="muted">No pending follow requests.</div>';
    return;
  }

  container.innerHTML = requests.map(request => `
    <article class="request-card">
      <strong>${request.requester?.displayName || 'Someone'}</strong>
      <div class="muted">${request.requester?.role || ''} · wants to follow you</div>
      ${request.message ? `<div>${request.message}</div>` : ''}
      <div class="request-actions">
        <button type="button" data-accept-request="${request.id}">Accept</button>
        <button type="button" class="secondary" data-decline-request="${request.id}">Decline</button>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('[data-accept-request]').forEach(button => {
    button.addEventListener('click', () => acceptFollowRequest(button.getAttribute('data-accept-request')));
  });
  container.querySelectorAll('[data-decline-request]').forEach(button => {
    button.addEventListener('click', () => declineFollowRequest(button.getAttribute('data-decline-request')));
  });
}

function selectSocialProfile(userId) {
  selectedSocialProfileId = userId;
  renderSelectedSocialProfile(socialCurrentUser);
  renderSocialDirectory(socialUsers, socialCurrentUser);
}

function updateSocialImagePreview() {
  const preview = document.getElementById('socialImagePreview');
  if (!preview) return;

  if (!socialPostImage) {
    preview.className = 'post-image-preview state-empty';
    preview.textContent = 'No photo selected.';
    preview.innerHTML = 'No photo selected.';
    return;
  }

  preview.className = 'post-image-preview';
  preview.innerHTML = `<img src="${socialPostImage.dataUrl}" alt="Selected post photo preview" />`;
}

function handleSocialImageChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    socialPostImage = null;
    updateSocialImagePreview();
    return;
  }

  if (!file.type.startsWith('image/')) {
    socialPostImage = null;
    event.target.value = '';
    setState('socialState', 'error', 'Choose an image file for the post photo.');
    updateSocialImagePreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    socialPostImage = {
      dataUrl: typeof reader.result === 'string' ? reader.result : '',
      name: file.name,
      type: file.type
    };
    updateSocialImagePreview();
  };
  reader.onerror = () => {
    socialPostImage = null;
    setState('socialState', 'error', 'Unable to read the selected image.');
    updateSocialImagePreview();
  };
  reader.readAsDataURL(file);
}

async function loadDashboardSummary() {
  const greeting = document.getElementById('dashboardGreeting');
  const status = document.getElementById('dashboardStatus');
  const role = document.getElementById('dashboardRole');
  const nextEvent = document.getElementById('dashboardNextEvent');

  if (!greeting || !status || !role || !nextEvent) return;

  if (!isAuthenticated()) {
    greeting.textContent = 'A quiet place to begin.';
    status.textContent = 'Sign in to see personalized support, activity, and next steps.';
    role.textContent = 'Guest view';
    nextEvent.innerHTML = '<span class="dashboard-next-label">Next activity</span><strong>Community Circle</strong><span>Virtual · Verified</span>';
    return;
  }

  const meResult = await apiWithAuth('/api/v1/me');
  const communitiesResult = await api('/api/v1/communities');
  const eventsResult = await api('/api/v1/events');

  const user = meResult.payload.user;
  const communityCount = Array.isArray(communitiesResult.payload.communities) ? communitiesResult.payload.communities.length : 0;
  const nextEventItem = Array.isArray(eventsResult.payload.events) && eventsResult.payload.events.length > 0 ? eventsResult.payload.events[0] : null;

  greeting.textContent = `Welcome back, ${user?.displayName || 'friend'}.`;
  role.textContent = `${user?.role || 'survivor'} view`;
  status.textContent = `Your account is private by default. ${communityCount} group chats and upcoming activities are ready.`;

  if (nextEventItem) {
    nextEvent.innerHTML = `<span class="dashboard-next-label">Next activity</span><strong>${nextEventItem.title}</strong><span>${nextEventItem.location} · ${nextEventItem.format}</span>`;
  }
}

async function loadSocialFeed() {
  const state = document.getElementById('socialState');
  const feed = document.getElementById('socialFeed');
  const userDirectory = document.getElementById('userDirectory');
  const incomingRequests = document.getElementById('incomingRequests');

  if (!state) return;

  if (!isAuthenticated()) {
    state.className = 'state-empty';
    state.textContent = feed ? 'Sign in to see follower posts here.' : 'Sign in to discover people in the community.';
    if (feed) feed.innerHTML = '';
    if (userDirectory) userDirectory.innerHTML = '';
    if (incomingRequests) incomingRequests.innerHTML = '';
    return;
  }

  if (feed) {
    state.className = 'state-loading';
    state.textContent = 'Loading follower posts...';
    const { response, payload } = await apiWithAuth('/api/v1/me/social?scope=followers');
    const posts = Array.isArray(payload?.feed) ? payload.feed : [];
    if (!response.ok) {
      state.className = 'state-error';
      state.textContent = payload?.error || 'Unable to load follower posts.';
      feed.innerHTML = '';
      return;
    }
    feed.innerHTML = posts.length === 0
      ? '<div class="state-empty">No follower posts yet.</div>'
      : posts.map(post => `
      <article class="social-post">
        <div class="social-post-header">
          <strong>${post.author?.displayName || 'Someone in your circle'}</strong>
          <span class="social-post-meta">${new Date(post.createdAt).toLocaleString()}</span>
        </div>
        ${post.image?.dataUrl ? `<div class="social-post-image"><img src="${post.image.dataUrl}" alt="Post image from ${post.author?.displayName || 'a follower'}" /></div>` : ''}
        <div>${post.body}</div>
      </article>
    `).join('');
    state.className = 'state-success';
    state.textContent = 'Follower posts loaded.';
    return;
  }

  if (!userDirectory || !incomingRequests) return;
  state.className = 'state-loading';
  state.textContent = 'Loading people suggestions...';
  const [socialResult, usersResult, requestsResult] = await Promise.all([
    apiWithAuth('/api/v1/me/social?scope=followers'),
    apiWithAuth('/api/v1/users'),
    apiWithAuth('/api/v1/me/follow-requests?scope=all')
  ]);
  if (!socialResult.response.ok || !usersResult.response.ok || !requestsResult.response.ok) {
    state.className = 'state-error';
    state.textContent = 'Unable to load people suggestions.';
    return;
  }
  socialCurrentUser = socialResult.payload?.user || null;
  socialUsers = Array.isArray(usersResult.payload?.users) ? usersResult.payload.users : [];
  socialRequests = Array.isArray(requestsResult.payload?.requests) ? requestsResult.payload.requests : [];
  renderSocialDirectory(socialUsers, socialCurrentUser);
  renderFollowRequests(socialRequests);
  state.className = 'state-success';
  state.textContent = 'People suggestions loaded.';
}

function getDailyChallenge() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const index = [...todayKey].reduce((total, character) => total + character.charCodeAt(0), 0) % dailyChallenges.length;
  return {
    key: todayKey,
    text: dailyChallenges[index]
  };
}

function updateDailyChallenge() {
  const challenge = getDailyChallenge();
  const challengeText = document.getElementById('challengeText');
  const challengeStatus = document.getElementById('challengeStatus');
  const completedKey = `challenge:${challenge.key}`;
  const completed = localStorage.getItem(completedKey) === 'done';

  if (challengeText) challengeText.textContent = challenge.text;
  if (challengeStatus) challengeStatus.textContent = completed ? 'Completed for today.' : 'Not completed yet.';
}

function markDailyChallengeDone() {
  const challenge = getDailyChallenge();
  localStorage.setItem(`challenge:${challenge.key}`, 'done');
  setState('signupState', 'success', 'Nice work. Small daily care counts too.');
  updateDailyChallenge();
}

function refreshDailyChallenge() {
  const index = Math.floor(Math.random() * dailyChallenges.length);
  const challengeText = document.getElementById('challengeText');
  const challengeStatus = document.getElementById('challengeStatus');
  if (challengeText) challengeText.textContent = dailyChallenges[index];
  if (challengeStatus) challengeStatus.textContent = 'A fresh calming option is ready.';
}

function getDailyJournalPrompt() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const index = [...todayKey].reduce((total, character) => total + character.charCodeAt(0), 0) % journalPrompts.length;
  return {
    key: todayKey,
    text: journalPrompts[index]
  };
}

function updateJournalPrompt() {
  const prompt = getDailyJournalPrompt();
  const promptText = document.getElementById('journalPromptText');
  const promptStatus = document.getElementById('journalPromptStatus');
  if (promptText) promptText.textContent = prompt.text;
  if (promptStatus) promptStatus.textContent = 'Ready when you are.';
}

function refreshJournalPrompt() {
  const index = Math.floor(Math.random() * journalPrompts.length);
  const promptText = document.getElementById('journalPromptText');
  const promptStatus = document.getElementById('journalPromptStatus');
  if (promptText) promptText.textContent = journalPrompts[index];
  if (promptStatus) promptStatus.textContent = 'A fresh reflection prompt is ready.';
}

function useJournalPrompt() {
  const promptText = document.getElementById('journalPromptText')?.textContent || '';
  const journalBody = document.getElementById('journalBody');
  if (journalBody && promptText) {
    journalBody.value = `${promptText}\n\n`;
    journalBody.focus();
    const promptStatus = document.getElementById('journalPromptStatus');
    if (promptStatus) promptStatus.textContent = 'Prompt inserted into the journal.';
  }
}

function formatEventDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return { day: 'Date', short: dateValue };
  return {
    day: date.toLocaleDateString(undefined, { weekday: 'short' }),
    short: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  };
}

function setEventView(mode) {
  eventViewMode = mode;
  const list = document.getElementById('eventList');
  const calendar = document.getElementById('eventCalendar');
  const map = document.getElementById('eventMap');
  const meta = document.getElementById('eventMeta');

  document.querySelectorAll('.view-toggle-btn').forEach(button => {
    button.classList.toggle('active', button.getAttribute('data-event-view') === mode);
  });

  if (list) list.hidden = mode !== 'list';
  if (calendar) calendar.hidden = mode !== 'calendar';
  if (map) map.hidden = mode !== 'map';

  if (meta) {
    const labels = {
      list: 'A simple list of verified sessions.',
      calendar: 'A week-at-a-glance view for pacing your schedule.',
      map: 'A calm map-style layout for location and format context.'
    };
    meta.textContent = labels[mode] || labels.list;
  }

  renderEventViews();
}

function readEventFilters() {
  return {
    q: document.getElementById('eventSearch')?.value?.trim() || '',
    topic: document.getElementById('eventTopicFilter')?.value || '',
    format: document.getElementById('eventFormatFilter')?.value || '',
    location: document.getElementById('eventLocationFilter')?.value?.trim() || '',
    from: document.getElementById('eventFromFilter')?.value || '',
    to: document.getElementById('eventToFilter')?.value || ''
  };
}

function updateEventFilterOptions(topics = []) {
  const topicSelect = document.getElementById('eventTopicFilter');
  if (!topicSelect) return;
  const currentValue = topicSelect.value;
  topicSelect.innerHTML = ['<option value="">All topics</option>']
    .concat(topics.map(topic => `<option value="${topic}">${topic}</option>`))
    .join('');
  if (topics.includes(currentValue)) topicSelect.value = currentValue;
}

function bindEventFilterActions() {
  const triggerReload = () => {
    eventFilters = readEventFilters();
    loadEvents();
  };
  document.getElementById('eventSearch')?.addEventListener('input', triggerReload);
  document.getElementById('eventTopicFilter')?.addEventListener('change', triggerReload);
  document.getElementById('eventFormatFilter')?.addEventListener('change', triggerReload);
  document.getElementById('eventLocationFilter')?.addEventListener('input', triggerReload);
  document.getElementById('eventFromFilter')?.addEventListener('change', triggerReload);
  document.getElementById('eventToFilter')?.addEventListener('change', triggerReload);
}

function renderEventDetail(eventItem) {
  const state = document.getElementById('eventDetailState');
  const body = document.getElementById('eventDetailBody');
  if (!state || !body) return;

  if (!eventItem) {
    state.className = 'state-empty';
    state.textContent = 'Select an event to view details and RSVP.';
    body.innerHTML = '';
    return;
  }

  state.className = 'state-success';
  state.textContent = eventItem.rsvped
    ? `You are RSVP'd for ${eventItem.title}.`
    : `${eventItem.title} is open for RSVP.`;
  body.innerHTML = `
    <h3>${eventItem.title}</h3>
    <p class="muted">${eventItem.date} · ${eventItem.location} · ${eventItem.format}</p>
    <p class="muted">Host: ${eventItem.host}</p>
    <p class="muted">Topic: ${eventItem.topic}</p>
    <p class="muted">Accessibility: ${eventItem.accessibility}</p>
    <p class="muted">Safety: ${eventItem.safetyNote}</p>
    <div class="badge-row">
      ${eventItem.verified ? '<span class="badge badge-verified">Verified host</span>' : ''}
      <span class="badge badge-private">${eventItem.rsvpCount || 0} RSVP</span>
      ${eventItem.reportedByMe ? '<span class="badge badge-moderated">Report pending</span>' : ''}
    </div>
    <div class="action-row action-row-subtle">
      <button type="button" data-event-rsvp="${eventItem.id}" ${eventItem.rsvped ? 'disabled' : ''}>${eventItem.rsvped ? 'RSVP confirmed' : 'RSVP'}</button>
      <button type="button" class="secondary subtle-action" data-event-report="${eventItem.id}" ${eventItem.reportedByMe ? 'disabled' : ''}>${eventItem.reportedByMe ? 'Reported' : 'Report'}</button>
      <button type="button" class="secondary subtle-action" data-event-block="${eventItem.id}">Block</button>
    </div>
  `;
  body.querySelector('[data-event-rsvp]')?.addEventListener('click', rsvpEvent);
  body.querySelector('[data-event-report]')?.addEventListener('click', () => reportResource('event', eventItem.id, 'eventState'));
  body.querySelector('[data-event-block]')?.addEventListener('click', () => blockResource('event', eventItem.id, 'eventState'));
}

function selectEvent(eventId) {
  selectedEventId = eventId;
  const selected = eventCatalog.find(eventItem => eventItem.id === eventId) || null;
  renderEventDetail(selected);
  document.querySelectorAll('[data-event-card-id]').forEach(node => {
    node.classList.toggle('is-selected', node.getAttribute('data-event-card-id') === eventId);
  });
}

async function rsvpEvent(event) {
  const eventId = event.currentTarget.getAttribute('data-event-rsvp');
  if (!isAuthenticated()) {
    setState('eventState', 'error', 'Sign in to RSVP for an event.');
    return;
  }
  setState('eventState', 'loading', 'Saving RSVP...');
  const { response, payload } = await apiWithAuth(`/api/v1/events/${eventId}/rsvp`, { method: 'POST' });
  if (!response.ok || !payload.event) {
    setState('eventState', 'error', payload.error || 'Unable to RSVP right now.');
    return;
  }
  setState('eventState', 'success', `RSVP confirmed for ${payload.event.title}.`);
  selectedEventId = payload.event.id;
  loadEvents();
}

function renderEventViews() {
  const calendar = document.getElementById('eventCalendar');
  const map = document.getElementById('eventMap');
  if (!calendar || !map) return;

  if (eventCatalog.length === 0) {
    calendar.innerHTML = '<div class="calendar-day">No events yet.</div>';
    map.innerHTML = '<div class="map-node">No events yet.</div>';
    return;
  }

  const parsedDates = eventCatalog
    .map(eventItem => ({ eventItem, date: new Date(eventItem.date) }))
    .filter(item => !Number.isNaN(item.date.getTime()));
  const anchorDate = parsedDates[0]?.date || new Date();
  const month = anchorDate.getMonth();
  const year = anchorDate.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const eventsByDay = {};
  parsedDates.forEach(item => {
    if (item.date.getMonth() !== month || item.date.getFullYear() !== year) return;
    const day = item.date.getDate();
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(item.eventItem);
  });

  const weekdayHeader = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    .map(day => `<div class="calendar-weekday">${day}</div>`)
    .join('');

  const leadingBlanks = Array.from({ length: firstWeekday }, () => '<div class="calendar-cell calendar-cell-empty" aria-hidden="true"></div>').join('');
  const dayCells = Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1;
    const dayEvents = eventsByDay[day] || [];
    const chips = dayEvents.map(eventItem => `
      <button type="button" class="calendar-event-chip" data-calendar-event-id="${eventItem.id}" title="${eventItem.title}" aria-label="${eventItem.title}">
        ${eventItem.title}
      </button>
    `).join('');
    return `
      <div class="calendar-cell ${dayEvents.length > 0 ? 'calendar-cell-has-events' : ''}">
        <div class="calendar-date">${day}</div>
        <div class="calendar-events">${chips}</div>
      </div>
    `;
  }).join('');

  calendar.innerHTML = `
    <div class="calendar-shell">
      <div class="calendar-month-label">${monthLabel}</div>
      <div class="calendar-grid-structured">
        ${weekdayHeader}
        ${leadingBlanks}
        ${dayCells}
      </div>
    </div>
  `;

  const groupedByLocation = {};
  eventCatalog.forEach((eventItem, index) => {
    const key = String(eventItem.location || 'Virtual');
    if (!groupedByLocation[key]) {
      groupedByLocation[key] = {
        location: key,
        events: [],
        index,
        formatCounts: {}
      };
    }
    groupedByLocation[key].events.push(eventItem);
    const format = String(eventItem.format || 'other').toLowerCase();
    groupedByLocation[key].formatCounts[format] = (groupedByLocation[key].formatCounts[format] || 0) + 1;
  });

  const formatAliases = {
    virtual: 'online',
    online: 'online',
    'in-person': 'in-person',
    hybrid: 'hybrid'
  };

  const formatLabels = {
    online: 'Online',
    'in-person': 'In-person',
    hybrid: 'Hybrid',
    other: 'Other'
  };

  const formatTotals = { online: 0, 'in-person': 0, hybrid: 0, other: 0 };
  eventCatalog.forEach(eventItem => {
    const rawKey = String(eventItem.format || 'other').toLowerCase();
    const key = formatAliases[rawKey] || rawKey;
    if (formatTotals[key] === undefined) {
      formatTotals.other += 1;
      return;
    }
    formatTotals[key] += 1;
  });

  function dominantFormat(group) {
    const entries = Object.entries(group.formatCounts).map(([rawKey, count]) => [formatAliases[rawKey] || rawKey, count]);
    if (entries.length === 0) return 'other';
    const mergedCounts = entries.reduce((acc, [key, count]) => {
      const normalizedKey = formatTotals[key] === undefined ? 'other' : key;
      acc[normalizedKey] = (acc[normalizedKey] || 0) + count;
      return acc;
    }, {});
    const winner = Object.entries(mergedCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';
    return formatTotals[winner] === undefined ? 'other' : winner;
  }

  function locationToPosition(location, fallbackIndex) {
    const value = location.toLowerCase();
    if (value.includes('virtual')) return { x: 50, y: 18 };
    if (value.includes('austin')) return { x: 32, y: 68 };
    if (value.includes('portland')) return { x: 16, y: 36 };
    if (value.includes('new york')) return { x: 78, y: 34 };
    const hash = [...value].reduce((total, char) => total + char.charCodeAt(0), 0) + fallbackIndex * 31;
    return {
      x: 18 + (hash % 64),
      y: 24 + ((hash * 7) % 52)
    };
  }

  const locationGroups = Object.values(groupedByLocation);
  const markerMarkup = locationGroups.map(group => {
    const position = locationToPosition(group.location, group.index);
    const markerFormat = dominantFormat(group);
    const formattedLabel = formatLabels[markerFormat] || formatLabels.other;
    return `
      <button type="button" class="map-pin-button map-pin-${markerFormat}" data-map-location="${group.location}" data-map-format="${markerFormat}" style="left:${position.x}%; top:${position.y}%;" aria-label="${group.location}: ${group.events.length} ${formattedLabel} event${group.events.length === 1 ? '' : 's'}">
        <span class="map-pin" aria-hidden="true"></span>
      </button>
    `;
  }).join('');

  const legendMarkup = Object.entries(formatTotals)
    .filter(([, count]) => count > 0)
    .map(([formatKey, count]) => {
      const label = formatLabels[formatKey] || formatLabels.other;
      return `<li class="map-legend-item"><span class="map-legend-dot map-pin-${formatKey}" aria-hidden="true"></span>${label} (${count})</li>`;
    })
    .join('');

  const firstLocation = locationGroups[0]?.location || '';
  const initialLocation = firstLocation;
  const initialEvents = locationGroups.find(group => group.location === initialLocation)?.events || [];
  const initialEventButtons = initialEvents.map(eventItem => `
    <button type="button" class="map-event-chip" data-map-event-id="${eventItem.id}">${eventItem.title}</button>
  `).join('');

  map.innerHTML = `
    <div class="map-shell">
      <div class="map-shell-label">Map view by location</div>
      <div class="map-canvas">
        <div class="map-grid-overlay" aria-hidden="true"></div>
        ${markerMarkup}
      </div>
      <ul class="map-legend" aria-label="Map legend">${legendMarkup}</ul>
      <div class="map-location-panel">
        <div class="map-location-heading">${initialLocation || 'No location selected'}</div>
        <div class="map-location-subtext">${initialEvents.length} event${initialEvents.length === 1 ? '' : 's'} in this area</div>
        <div class="map-event-list">${initialEventButtons || '<span class="calendar-no-events">No events in this area.</span>'}</div>
      </div>
    </div>
  `;

  calendar.querySelectorAll('[data-calendar-event-id]').forEach(button => {
    button.addEventListener('click', () => {
      const eventId = button.getAttribute('data-calendar-event-id');
      if (eventId) selectEvent(eventId);
    });
  });

  map.querySelectorAll('[data-map-event-id]').forEach(button => {
    button.addEventListener('click', () => {
      const eventId = button.getAttribute('data-map-event-id');
      if (eventId) selectEvent(eventId);
    });
  });

  const locationHeading = map.querySelector('.map-location-heading');
  const locationSubtext = map.querySelector('.map-location-subtext');
  const locationEventList = map.querySelector('.map-location-panel .map-event-list');

  function updateLocationSelection(location) {
    const group = locationGroups.find(item => item.location === location);
    if (!group || !locationHeading || !locationSubtext || !locationEventList) return;

    locationHeading.textContent = group.location;
    locationSubtext.textContent = `${group.events.length} event${group.events.length === 1 ? '' : 's'} in this area`;
    locationEventList.innerHTML = group.events.map(eventItem => `
      <button type="button" class="map-event-chip" data-map-event-id="${eventItem.id}">${eventItem.title}</button>
    `).join('');

    map.querySelectorAll('.map-pin-button').forEach(node => {
      node.classList.toggle('is-active', node.getAttribute('data-map-location') === location);
    });

    locationEventList.querySelectorAll('[data-map-event-id]').forEach(button => {
      button.addEventListener('click', () => {
        const eventId = button.getAttribute('data-map-event-id');
        if (eventId) selectEvent(eventId);
      });
    });
  }

  map.querySelectorAll('.map-pin-button').forEach(pin => {
    pin.addEventListener('click', () => {
      const location = pin.getAttribute('data-map-location');
      if (location) updateLocationSelection(location);
    });
  });

  if (initialLocation) {
    updateLocationSelection(initialLocation);
  }
}

function bindHeroActions() {
  const signupButton = document.getElementById('signupBtn');
  const loginButton = document.getElementById('loginBtn');

  if (signupButton) {
    signupButton.addEventListener('click', () => {
      setAuthMode('register');
      setActiveAppTab('home');
      const form = document.getElementById('signupForm');
      const firstField = document.getElementById('displayName');
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      firstField?.focus();
    });
  }

  if (loginButton) {
    loginButton.addEventListener('click', async () => {
      if (isAuthenticated()) {
        await logoutUser();
        return;
      }
      setAuthMode(authMode === 'login' ? 'register' : 'login');
      setActiveAppTab('home');
      const form = document.getElementById('signupForm');
      const emailField = document.getElementById('email');
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      emailField?.focus();
    });
  }
}

function bindEventActions() {
  document.querySelectorAll('[data-event-view]').forEach(button => {
    button.addEventListener('click', () => setEventView(button.getAttribute('data-event-view') || 'list'));
  });

  bindEventFilterActions();

  document.getElementById('challengeCompleteBtn')?.addEventListener('click', markDailyChallengeDone);
  document.getElementById('challengeRefreshBtn')?.addEventListener('click', refreshDailyChallenge);
  document.getElementById('journalPromptRefreshBtn')?.addEventListener('click', refreshJournalPrompt);
  document.getElementById('journalPromptUseBtn')?.addEventListener('click', useJournalPrompt);
  document.getElementById('journalChallengeCompleteBtn')?.addEventListener('click', completeJournalChallenge);
  document.getElementById('journalChallengeSkipBtn')?.addEventListener('click', skipJournalChallenge);
  document.getElementById('journalChallengeShuffleBtn')?.addEventListener('click', shuffleJournalChallenge);
  document.getElementById('journalChallengeHintBtn')?.addEventListener('click', revealJournalChallengeHint);
}

async function loadEvents() {
  setState('eventState', 'loading', 'Loading upcoming events...');
  const query = new URLSearchParams();
  if (eventFilters.q) query.set('q', eventFilters.q);
  if (eventFilters.topic) query.set('topic', eventFilters.topic);
  if (eventFilters.format) query.set('format', eventFilters.format);
  if (eventFilters.location) query.set('location', eventFilters.location);
  if (eventFilters.from) query.set('from', eventFilters.from);
  if (eventFilters.to) query.set('to', eventFilters.to);
  const resource = query.toString() ? `/api/v1/events?${query.toString()}` : '/api/v1/events';
  const token = localStorage.getItem('token');
  const { response, payload } = await api(resource, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const container = document.getElementById('eventList');
  if (!container) return;
  if (!response.ok) {
    container.innerHTML = '';
    setState('eventState', 'error', 'Unable to load events right now. Please try again shortly.');
    return;
  }
  if (!payload.events || payload.events.length === 0) {
    container.innerHTML = '';
    eventCatalog = [];
    selectedEventId = null;
    renderEventDetail(null);
    renderEventViews();
    setState('eventState', 'empty', 'No events are listed yet. Check back soon for verified sessions.');
    return;
  }
  updateEventFilterOptions(payload.filters?.topics || []);
  eventCatalog = payload.events || [];
  container.innerHTML = eventCatalog.map(event => `
    <div role="button" tabindex="0" class="event-item event-card ${event.id === selectedEventId ? 'is-selected' : ''}" data-event-card-id="${event.id}">
      <strong>${event.title}</strong>
      <div>${event.date} · ${event.location}</div>
      <div>${event.format} · ${event.topic}</div>
      <div class="badge-row">
        ${event.verified ? '<span class="badge badge-verified">Verified host</span>' : ''}
        ${event.rsvped ? '<span class="badge badge-private">RSVP\'d</span>' : ''}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-event-card-id]').forEach(card => {
    card.addEventListener('click', () => selectEvent(card.getAttribute('data-event-card-id')));
    card.addEventListener('keydown', keyboardEvent => {
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        selectEvent(card.getAttribute('data-event-card-id'));
      }
    });
  });

  if (!selectedEventId && eventCatalog[0]) {
    selectedEventId = eventCatalog[0].id;
  }
  renderEventDetail(eventCatalog.find(eventItem => eventItem.id === selectedEventId) || null);
  renderEventViews();
  setState('eventState', 'success', `${payload.events.length} event${payload.events.length === 1 ? '' : 's'} loaded.`);
}

async function loadCommunities() {
  setState('communityState', 'loading', 'Loading group chats...');
  const query = new URLSearchParams();
  if (communityFilters.q) query.set('q', communityFilters.q);
  if (communityFilters.topic) query.set('topic', communityFilters.topic);
  if (communityFilters.format) query.set('format', communityFilters.format);
  if (communityFilters.location) query.set('location', communityFilters.location);
  if (communityFilters.moderated) query.set('moderated', 'true');
  if (communityFilters.verified) query.set('verified', 'true');
  const resource = query.toString() ? `/api/v1/communities?${query.toString()}` : '/api/v1/communities';
  const token = localStorage.getItem('token');
  const { response, payload } = await api(resource, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const container = document.getElementById('communityList');
  if (!container) return;
  if (!response.ok) {
    container.innerHTML = '';
    setState('communityState', 'error', 'Unable to load group chats right now.');
    return;
  }
  if (!payload.communities || payload.communities.length === 0) {
    container.innerHTML = '';
    communityCatalog = [];
    renderCommunityDetail(null);
    setState('communityState', 'empty', 'No group chats found yet.');
    return;
  }
  updateCommunityFilterOptions(payload.filters?.topics || []);
  communityCatalog = payload.communities || [];
  container.innerHTML = communityCatalog.map(community => `
    <div role="button" tabindex="0" class="event-item community-card ${community.id === selectedCommunityId ? 'is-selected' : ''}" data-community-card-id="${community.id}">
      <strong>${community.name}</strong>
      <div>${community.description}</div>
      <div>${community.membersCount} members · ${community.format}</div>
      <div class="badge-row">
        ${community.moderated ? '<span class="badge badge-moderated">Moderated</span>' : ''}
        ${community.verified ? '<span class="badge badge-verified">Verified</span>' : ''}
        ${community.joined ? '<span class="badge badge-private">Joined</span>' : ''}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-community-card-id]').forEach(button => {
    button.addEventListener('click', () => selectCommunity(button.getAttribute('data-community-card-id')));
    button.addEventListener('keydown', keyboardEvent => {
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        selectCommunity(button.getAttribute('data-community-card-id'));
      }
    });
  });

  if (!selectedCommunityId && communityCatalog[0]) {
    selectedCommunityId = communityCatalog[0].id;
  }
  renderCommunityDetail(communityCatalog.find(community => community.id === selectedCommunityId) || null);
  setState('communityState', 'success', `${payload.communities.length} group chats available.`);
}

async function joinCommunity(event) {
  const button = event.currentTarget;
  const communityId = button.getAttribute('data-community-id') || button.getAttribute('data-community-detail-join');
  if (!isAuthenticated()) {
    setState('communityState', 'error', 'Sign in to join a group chat.');
    return;
  }
  setState('communityState', 'loading', 'Joining group chat...');
  const { response, payload } = await apiWithAuth(`/api/v1/communities/${communityId}/join`, { method: 'POST' });
  if (!response.ok) {
    setState('communityState', 'error', payload.error || 'Unable to join this community.');
    return;
  }
  if (payload.community) {
    setState('communityState', 'success', `Joined ${payload.community.name}. You can now send messages.`);
    selectedCommunityId = payload.community.id;
    await loadCommunities();
    document.getElementById('communityDetail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function loadEntries() {
  if (!isAuthenticated()) {
    setState('journalState', 'empty', 'Sign in to view your private journal entries.');
    return;
  }
  setState('journalState', 'loading', 'Loading journal entries...');
  const { response, payload } = await apiWithAuth('/api/v1/journal/entries');
  const container = document.getElementById('entriesList');
  if (!container) return;
  if (!response.ok) {
    container.innerHTML = '';
    setState('journalState', 'error', 'Unable to load journal entries.');
    return;
  }
  if (!payload.entries || payload.entries.length === 0) {
    container.innerHTML = '';
    const recentList = document.getElementById('journalRecentList');
    if (recentList) recentList.textContent = 'Your latest entries will appear here.';
    setState('journalState', 'empty', 'No entries yet. Add your first reflection when you are ready.');
    return;
  }

  const formatEntryTime = timestamp => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return date.toLocaleString();
  };

  const summarizeEntry = text => {
    if (!text) return 'No summary yet.';
    const compact = text.replace(/\s+/g, ' ').trim();
    return compact.length > 90 ? `${compact.slice(0, 90)}...` : compact;
  };

  const recentList = document.getElementById('journalRecentList');
  if (recentList) {
    recentList.innerHTML = payload.entries.slice(0, 3).map(entry => `
      <div class="journal-recent-card">
        <strong>${entry.title}</strong>
        <div class="muted">${formatEntryTime(entry.updatedAt || entry.createdAt)} · ${entry.mood || 'steady'}</div>
      </div>
    `).join('');
  }

  container.innerHTML = (payload.entries || []).map(entry => `
    <li class="journal-history-card">
      <strong>${entry.title}</strong>
      <div>${summarizeEntry(entry.body)}</div>
      <div class="muted">Prompt: ${entry.promptReference || 'general-reflection'}</div>
      <div class="muted">Mood: ${entry.mood || 'steady'} · <span class="badge ${entry.visibility === 'private' ? 'badge-private' : 'badge-moderated'}">${entry.visibility || 'private'}</span></div>
      <div class="muted">Updated: ${formatEntryTime(entry.updatedAt || entry.createdAt)}</div>
      <div class="action-row">
        <button type="button" class="secondary" data-entry-edit="${entry.id}">Edit</button>
        <button type="button" class="secondary" data-entry-export="${entry.id}">Export</button>
        <button type="button" class="secondary" data-entry-delete="${entry.id}">Delete</button>
      </div>
    </li>
  `).join('');

  container.querySelectorAll('[data-entry-edit]').forEach(button => {
    button.addEventListener('click', () => editEntry(button.getAttribute('data-entry-edit')));
  });

  container.querySelectorAll('[data-entry-delete]').forEach(button => {
    button.addEventListener('click', () => deleteEntry(button.getAttribute('data-entry-delete')));
  });

  container.querySelectorAll('[data-entry-export]').forEach(button => {
    button.addEventListener('click', () => exportEntry(button.getAttribute('data-entry-export')));
  });

  setState('journalState', 'success', `${payload.entries.length} private entr${payload.entries.length === 1 ? 'y' : 'ies'} loaded.`);
}

async function editEntry(entryId) {
  if (!isAuthenticated()) {
    setState('journalState', 'error', 'Sign in before editing a journal entry.');
    return;
  }
  const { response, payload } = await apiWithAuth('/api/v1/journal/entries');
  if (!response.ok || !Array.isArray(payload.entries)) {
    setState('journalState', 'error', 'Unable to load entry for editing.');
    return;
  }
  const entry = payload.entries.find(candidate => candidate.id === entryId);
  if (!entry) {
    setState('journalState', 'error', 'Entry not found.');
    return;
  }

  document.getElementById('journalTitle').value = entry.title || '';
  document.getElementById('journalBody').value = entry.body || '';
  document.getElementById('journalMood').value = entry.mood || 'steady';
  const visibilityField = document.getElementById('journalEntryVisibility');
  if (visibilityField) visibilityField.value = entry.visibility || 'private';
  editingJournalEntryId = entry.id;
  const submitButton = document.getElementById('journalSubmitBtn');
  const cancelButton = document.getElementById('journalEditCancelBtn');
  if (submitButton) submitButton.textContent = 'Update entry';
  cancelButton?.classList.remove('is-hidden');
  setState('journalState', 'success', 'Editing mode enabled. Update fields and save.');
  setActiveAppTab('journal');
  document.getElementById('journalForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteEntry(entryId) {
  if (!isAuthenticated()) {
    setState('journalState', 'error', 'Sign in before deleting a journal entry.');
    return;
  }
  const confirmed = window.confirm('Delete this journal entry? This cannot be undone.');
  if (!confirmed) return;

  setState('journalState', 'loading', 'Deleting entry...');
  const { response, payload } = await apiWithAuth(`/api/v1/journal/entries/${entryId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    setState('journalState', 'error', payload.error || 'Unable to delete journal entry.');
    return;
  }
  setState('journalState', 'success', 'Entry deleted.');
  if (editingJournalEntryId === entryId) {
    resetJournalComposer();
  }
  loadEntries();
}

async function loadPrivacySummary() {
  if (!isAuthenticated()) {
    setState('privacyState', 'empty', 'Sign in to view your active privacy defaults.');
    return;
  }
  setState('privacyState', 'loading', 'Loading privacy summary...');
  const { response, payload } = await apiWithAuth('/api/v1/me');
  const summary = document.getElementById('privacySummary');
  if (!summary) return;
  if (!response.ok || !payload.user) {
    setState('privacyState', 'error', 'Unable to load privacy summary.');
    return;
  }
  const settings = payload.user.privacySettings || {};
  summary.textContent = `Profile: ${settings.profileVisibility || 'private'} · Journal: ${settings.journalVisibility || 'private'} · Stories: ${settings.storySharing || 'private'}`;
  setState('privacyState', 'success', 'Privacy settings loaded.');
}

function readNotificationForm() {
  return {
    email: Boolean(document.getElementById('notifyEmail')?.checked),
    inapp: Boolean(document.getElementById('notifyInApp')?.checked),
    sms: Boolean(document.getElementById('notifySms')?.checked),
    weekly_digest: Boolean(document.getElementById('notifyWeeklyDigest')?.checked),
    event_updates: Boolean(document.getElementById('notifyEventUpdates')?.checked),
    community_updates: Boolean(document.getElementById('notifyCommunityUpdates')?.checked)
  };
}

function setNotificationForm(values = []) {
  const selected = new Set(values);
  const binding = {
    notifyEmail: 'email',
    notifyInApp: 'inapp',
    notifySms: 'sms',
    notifyWeeklyDigest: 'weekly_digest',
    notifyEventUpdates: 'event_updates',
    notifyCommunityUpdates: 'community_updates'
  };
  Object.entries(binding).forEach(([id, value]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) checkbox.checked = selected.has(value);
  });
}

async function loadNotificationPreferences() {
  if (!isAuthenticated()) {
    setState('notificationState', 'empty', 'Sign in to manage notification preferences.');
    setNotificationForm(['email', 'inapp']);
    return;
  }
  setState('notificationState', 'loading', 'Loading notification preferences...');
  const { response, payload } = await apiWithAuth('/api/v1/me');
  if (!response.ok || !payload.user) {
    setState('notificationState', 'error', 'Unable to load notification preferences.');
    return;
  }
  const preferences = Array.isArray(payload.user.privacySettings?.notificationPreferences)
    ? payload.user.privacySettings.notificationPreferences
    : ['email', 'inapp'];
  setNotificationForm(preferences);
  setState('notificationState', 'success', `Loaded ${preferences.length} notification preference${preferences.length === 1 ? '' : 's'}.`);
}

async function saveNotificationPreferences(event) {
  event.preventDefault();
  if (!isAuthenticated()) {
    setState('notificationState', 'error', 'Sign in before saving notification preferences.');
    return;
  }

  const selected = Object.entries(readNotificationForm())
    .filter(([, checked]) => checked)
    .map(([value]) => value);
  if (selected.length === 0) {
    setState('notificationState', 'error', 'Select at least one notification preference.');
    return;
  }

  setState('notificationState', 'loading', 'Saving notification preferences...');
  const { response, payload } = await apiWithAuth('/api/v1/me/privacy', {
    method: 'PATCH',
    body: JSON.stringify({ notificationPreferences: selected })
  });
  if (!response.ok || !payload.privacySettings) {
    setState('notificationState', 'error', payload.error || 'Unable to save notification preferences.');
    return;
  }
  setNotificationForm(payload.privacySettings.notificationPreferences || selected);
  setState('notificationState', 'success', 'Notification preferences saved.');
}

async function loadProfileSummary() {
  const state = document.getElementById('profileState');
  const name = document.getElementById('profileSummaryName');
  const role = document.getElementById('profileSummaryRole');
  const meta = document.getElementById('profileSummaryMeta');
  const displayNameField = document.getElementById('profileDisplayName');
  const bioField = document.getElementById('profileBio');
  const locationField = document.getElementById('profileLocation');
  const photoField = document.getElementById('profilePhotoUpload');
  const followersCount = document.getElementById('profileFollowersCount');
  const followingCount = document.getElementById('profileFollowingCount');

  if (!state || !name || !role || !meta || !displayNameField || !bioField || !locationField || !photoField || !followersCount || !followingCount) return;

  if (!isAuthenticated()) {
    state.className = 'state-empty';
    state.textContent = 'Sign in to edit your profile details.';
    name.textContent = 'Display name';
    role.textContent = 'Role';
    meta.textContent = 'Location and photo are optional.';
    followersCount.textContent = '0';
    followingCount.textContent = '0';
    profilePhotoDataUrl = '';
    updateProfilePhotoPreview();
    return;
  }

  const [result, socialResult] = await Promise.all([
    apiWithAuth('/api/v1/me'),
    apiWithAuth('/api/v1/me/social?scope=followers')
  ]);
  const user = result.payload.user;
  if (!result.response.ok || !user) {
    state.className = 'state-error';
    state.textContent = 'Unable to load profile details.';
    return;
  }

  const profile = user.profile || {};
  displayNameField.value = user.displayName || '';
  bioField.value = profile.bio || '';
  locationField.value = profile.location || '';
  profilePhotoDataUrl = profile.photoUrl || '';
  photoField.value = '';
  updateProfilePhotoPreview();
  name.textContent = user.displayName || 'Display name';
  role.textContent = `${user.role || 'survivor'} role`;
  meta.textContent = [profile.location || 'No location yet', profile.photoUrl ? 'Photo uploaded' : 'Photo optional'].join(' · ');
  followersCount.textContent = String(Array.isArray(socialResult.payload?.followers) ? socialResult.payload.followers.length : 0);
  followingCount.textContent = String(Array.isArray(socialResult.payload?.following) ? socialResult.payload.following.length : 0);
  state.className = 'state-success';
  state.textContent = 'Profile loaded.';
}

async function submitAuthForm(event) {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const displayName = document.getElementById('displayName').value.trim();
  const role = document.getElementById('roleSelect').value;
  const consentAccepted = document.getElementById('consentAccepted').checked;
  const profileVisibility = document.getElementById('onboardProfileVisibility').value;
  const journalVisibility = document.getElementById('onboardJournalVisibility').value;
  const storySharing = document.getElementById('onboardStorySharing').value;

  if (!email || !password) {
    setState('signupState', 'error', 'Please complete email and password.');
    return;
  }

  if (authMode === 'register' && (!displayName || !role)) {
    setState('signupState', 'error', 'Please complete display name, email, password, and role.');
    return;
  }

  if (authMode === 'register' && !consentAccepted) {
    setState('signupState', 'error', 'Please agree to the participation and privacy guidance to continue.');
    return;
  }

  const isRegisterMode = authMode === 'register';
  setState('signupState', 'loading', isRegisterMode ? 'Creating your account...' : 'Signing you in...');

  const endpoint = isRegisterMode ? '/api/v1/auth/register' : '/api/v1/auth/login';
  const payload = isRegisterMode
    ? { displayName, email, password, role, consentAccepted, profileVisibility, journalVisibility, storySharing }
    : { email, password };

  const { response, payload: result } = await api(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!response.ok || !result.token) {
    const fallback = isRegisterMode
      ? 'Unable to create your account. Please check your details.'
      : 'Unable to sign in. Please check your email and password.';
    setState('signupState', 'error', result.error || fallback);
    return;
  }

  if (result.token) {
    localStorage.setItem('token', result.token);
    if (result.refreshToken) {
      localStorage.setItem('refreshToken', result.refreshToken);
    }
    const verificationText = isRegisterMode && result.verification?.status === 'placeholder'
      ? ' Verification email is currently a placeholder and will be fully enabled soon.'
      : '';
    const welcomePrefix = isRegisterMode ? 'Welcome' : 'Welcome back';
    setState('signupState', 'success', `${welcomePrefix}, ${result.user?.displayName || 'friend'}! Your account is ready.${verificationText}`);
    updateAuthButtons();
    resetJournalComposer();
    loadJournalDraftFromStorage();
    loadDashboardSummary();
    loadProfileSummary();
    loadEntries();
    loadPrivacySummary();
    loadNotificationPreferences();
    loadCommunities();
    updateJournalChallenge();
    if (document.body.dataset.page === 'auth') {
      window.location.replace('/dashboard.html');
      return;
    }
    setAppAccess(true);
    setHomeView('dashboard');
    setActiveAppTab('home');
    document.querySelector('.area-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function logoutUser() {
  const accessToken = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  if (!accessToken && !refreshToken) {
    setAuthMode('login');
    setAppAccess(false);
    setHomeView('onboarding');
    return;
  }

  await api('/api/v1/auth/logout', {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify({ refreshToken })
  });

  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  if (document.body.dataset.page !== 'auth') {
    window.location.replace('/auth.html');
    return;
  }
  resetJournalComposer();
  loadJournalDraftFromStorage();
  setAuthMode('login');
  setAppAccess(false);
  setHomeView('onboarding');
  setState('signupState', 'success', 'You are signed out. Sign in again to continue.');
  loadDashboardSummary();
  loadProfileSummary();
  loadEntries();
  loadPrivacySummary();
  loadNotificationPreferences();
  updateJournalChallenge();
}

async function saveProfile(event) {
  event.preventDefault();
  if (!isAuthenticated()) {
    setState('profileState', 'error', 'Sign in before updating your profile.');
    return;
  }
  setState('profileState', 'loading', 'Saving profile...');
  const payload = {
    displayName: document.getElementById('profileDisplayName').value,
    bio: document.getElementById('profileBio').value,
    location: document.getElementById('profileLocation').value,
    photoUrl: profilePhotoDataUrl
  };
  const { response, payload: result } = await apiWithAuth('/api/v1/me/profile', { method: 'PATCH', body: JSON.stringify(payload) });
  if (!response.ok || !result.user) {
    setState('profileState', 'error', result.error || 'Unable to save your profile.');
    return;
  }
  setState('profileState', 'success', 'Profile saved.');
  loadDashboardSummary();
  loadProfileSummary();
  loadSocialFeed();
}

async function requestFollowByEmail(event) {
  event.preventDefault();
  const emailField = document.getElementById('followEmail');
  const email = emailField.value.trim();
  if (!email) {
    setState('socialState', 'error', 'Enter an email to request a follow.');
    return;
  }
  setState('socialState', 'loading', 'Sending follow request...');
  const { response, payload } = await apiWithAuth('/api/v1/me/follow-requests', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
  if (!response.ok) {
    setState('socialState', 'error', payload.error || 'Unable to send that follow request.');
    return;
  }
  emailField.value = '';
  setState('socialState', 'success', 'Follow request sent.');
  loadSocialFeed();
  loadMemberProfile();
}

async function requestFollow(userId) {
  setState('socialState', 'loading', 'Sending follow request...');
  const { response, payload } = await apiWithAuth('/api/v1/me/follow-requests', {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
  if (!response.ok) {
    setState('socialState', 'error', payload.error || 'Unable to send that follow request.');
    return;
  }
  setState('socialState', 'success', 'Follow request sent.');
  loadSocialFeed();
  loadMemberProfile();
}

async function acceptFollowRequest(requestId) {
  setState('socialState', 'loading', 'Accepting follow request...');
  const { response, payload } = await apiWithAuth(`/api/v1/me/follow-requests/${requestId}/accept`, { method: 'POST' });
  if (!response.ok) {
    setState('socialState', 'error', payload.error || 'Unable to accept that request.');
    return;
  }
  setState('socialState', 'success', 'Follow request accepted.');
  loadSocialFeed();
  loadMemberProfile();
  loadDashboardSummary();
}

async function declineFollowRequest(requestId) {
  setState('socialState', 'loading', 'Updating follow request...');
  const { response, payload } = await apiWithAuth(`/api/v1/me/follow-requests/${requestId}`, { method: 'DELETE' });
  if (!response.ok) {
    setState('socialState', 'error', payload.error || 'Unable to update that request.');
    return;
  }
  setState('socialState', 'success', 'Follow request updated.');
  loadSocialFeed();
  loadMemberProfile();
}

async function unfollowUser(userId) {
  setState('socialState', 'loading', 'Unfollowing user...');
  const { response, payload } = await apiWithAuth('/api/v1/me/follow', {
    method: 'DELETE',
    body: JSON.stringify({ userId })
  });
  if (!response.ok) {
    setState('socialState', 'error', payload.error || 'Unable to unfollow that user.');
    return;
  }
  setState('socialState', 'success', 'Unfollowed successfully.');
  loadSocialFeed();
  loadMemberProfile();
  loadDashboardSummary();
}

async function createSocialPost(event) {
  event.preventDefault();
  if (!isAuthenticated()) {
    setState('socialState', 'error', 'Sign in before posting.');
    return;
  }
  const bodyField = document.getElementById('socialPostBody');
  const audienceField = document.getElementById('socialAudience');
  const body = bodyField.value.trim();
  if (!body) {
    setState('socialState', 'error', 'Write a short post before sharing.');
    return;
  }
  setState('socialState', 'loading', 'Posting update...');
  const { response, payload } = await apiWithAuth('/api/v1/posts', {
    method: 'POST',
    body: JSON.stringify({
      body,
      audience: audienceField.value,
      image: socialPostImage
    })
  });
  if (!response.ok || !payload.post) {
    setState('socialState', 'error', payload.error || 'Unable to post update.');
    return;
  }
  bodyField.value = '';
  const imageField = document.getElementById('socialPostImage');
  if (imageField) imageField.value = '';
  socialPostImage = null;
  updateSocialImagePreview();
  setState('socialState', 'success', 'Post shared with your circle.');
  loadSocialFeed();
}

async function savePrivacy(event) {
  event.preventDefault();
  if (!isAuthenticated()) {
    setState('privacySaveState', 'error', 'Sign in before updating privacy settings.');
    return;
  }
  setState('privacySaveState', 'loading', 'Saving privacy settings...');
  const payload = {
    profileVisibility: document.getElementById('profileVisibility').value,
    journalVisibility: document.getElementById('journalVisibility').value,
    storySharing: document.getElementById('storySharing').value
  };
  const { response, payload: result } = await apiWithAuth('/api/v1/me/privacy', { method: 'PATCH', body: JSON.stringify(payload) });
  if (!response.ok) {
    setState('privacySaveState', 'error', result.error || 'Unable to save privacy settings.');
    return;
  }
  if (result.privacySettings) {
    setState('privacySaveState', 'success', 'Privacy settings saved.');
    loadPrivacySummary();
  }
}

async function saveEntry(event) {
  event.preventDefault();
  if (!isAuthenticated()) {
    setState('journalState', 'error', 'Sign in before saving a journal entry.');
    return;
  }
  setState('journalState', 'loading', 'Saving entry...');
  const payload = {
    title: document.getElementById('journalTitle').value,
    body: document.getElementById('journalBody').value,
    mood: document.getElementById('journalMood')?.value || 'steady',
    promptReference: document.getElementById('journalPromptText')?.textContent || 'general-reflection',
    visibility: document.getElementById('journalEntryVisibility')?.value || 'private'
  };
  const endpoint = editingJournalEntryId
    ? `/api/v1/journal/entries/${editingJournalEntryId}`
    : '/api/v1/journal/entries';
  const method = editingJournalEntryId ? 'PATCH' : 'POST';
  const { response, payload: result } = await apiWithAuth(endpoint, { method, body: JSON.stringify(payload) });
  if (!response.ok) {
    setState('journalState', 'error', result.error || 'Unable to save your journal entry.');
    return;
  }
  if (result.entry) {
    setState('journalState', 'success', editingJournalEntryId ? 'Entry updated successfully.' : 'Entry saved successfully.');
    clearJournalDraft();
    resetJournalComposer();
    loadEntries();
  }
}

const signupForm = document.getElementById('signupForm');
const journalForm = document.getElementById('journalForm');
const privacyForm = document.getElementById('privacyForm');
const profileForm = document.getElementById('profileForm');
const notificationForm = document.getElementById('notificationForm');

if (signupForm) signupForm.addEventListener('submit', submitAuthForm);
if (journalForm) journalForm.addEventListener('submit', saveEntry);
if (privacyForm) privacyForm.addEventListener('submit', savePrivacy);
if (profileForm) profileForm.addEventListener('submit', saveProfile);
if (notificationForm) notificationForm.addEventListener('submit', saveNotificationPreferences);

initializeCommunitySocial();
initializeGroupChatsPage();
ensureGroupChatsNavigation();
addLandingPageButton();
bindHeroActions();
bindBottomTabs();
bindDashboardActions();
bindEventActions();
bindSocialActions();
bindJournalDraftActions();
bindCommunityActions();
document.getElementById('profilePhotoUpload')?.addEventListener('change', handleProfilePhotoChange);
document.getElementById('profilePhotoRemoveBtn')?.addEventListener('click', removeProfilePhoto);
if (document.body.dataset.page === 'auth') {
  setAuthMode('login');
  setAppAccess(false);
  setHomeView('onboarding');
} else {
  setAppAccess(true);
}
setEventView('list');
updateDailyChallenge();
updateJournalPrompt();
updateJournalChallenge();
loadJournalDraftFromStorage();
loadEvents();
loadCommunities();
loadEntries();
loadPrivacySummary();
loadNotificationPreferences();
loadProfileSummary();
loadSocialFeed();
loadMemberProfile();
loadDashboardSummary();
initializeAppNavigation();
