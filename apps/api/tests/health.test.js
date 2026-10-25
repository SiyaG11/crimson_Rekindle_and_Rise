const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createServer, loadConfig, serializeDiscoverUser } = require('../server');

let server;
let baseUrl = '';

test.before(async () => {
  server = createServer({
    port: 0,
    databaseUrl: '',
    seedOnStart: true,
    requestLoggingEnabled: false,
    metricsEnabled: true
  });

  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close(error => {
      if (error) reject(error);
      else resolve();
    });
  });
});

test('health endpoint responds ok', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.service, 'rekindle-rise-api');
});

test('discovery serialization includes a capped mutual follower preview', () => {
  const viewer = { id: 'viewer', followers: ['mutual-a', 'mutual-b', 'mutual-c', 'mutual-d', 'mutual-e'] };
  const candidate = {
    id: 'candidate',
    displayName: 'Candidate',
    role: 'survivor',
    profile: { photoUrl: '' },
    followers: ['mutual-c', 'mutual-a', 'other-user', 'mutual-b', 'mutual-d', 'mutual-e'],
    following: []
  };
  const mutualUsers = new Map([
    ['mutual-a', { id: 'mutual-a', displayName: 'Avery Stone', profile: { photoUrl: '' } }],
    ['mutual-b', { id: 'mutual-b', displayName: 'Blair Chen', profile: { photoUrl: 'https://example.com/blair.jpg' } }],
    ['mutual-c', { id: 'mutual-c', displayName: 'Casey Ray', profile: { photoUrl: 'https://example.com/casey.jpg' } }],
    ['mutual-d', { id: 'mutual-d', displayName: 'Devon Park', profile: { photoUrl: 'https://example.com/devon.jpg' } }],
    ['mutual-e', { id: 'mutual-e', profile: { photoUrl: 'https://example.com/ignored.jpg' } }]
  ]);

  const result = serializeDiscoverUser(candidate, viewer, id => mutualUsers.get(id));

  assert.equal(result.mutualFollowersCount, 5);
  assert.deepEqual(result.mutualFollowers, [
    { id: 'mutual-c', displayName: 'Casey Ray', profile: { photoUrl: 'https://example.com/casey.jpg' } },
    { id: 'mutual-a', displayName: 'Avery Stone', profile: { photoUrl: '' } },
    { id: 'mutual-b', displayName: 'Blair Chen', profile: { photoUrl: 'https://example.com/blair.jpg' } }
  ]);
});

test('host development command loads DATABASE_URL for persistent runtime', () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://rekindle:rekindle@localhost:5432/rekindle';

  try {
    assert.equal(loadConfig().databaseUrl, process.env.DATABASE_URL);
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf8'));
    assert.equal(packageJson.scripts.dev, 'node --env-file=.env apps/api/server.js');
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test('infrastructure health endpoint returns dependency checks', async () => {
  const response = await fetch(`${baseUrl}/health/infrastructure`);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(typeof payload.ok, 'boolean');
  assert.ok(payload.checks);
  assert.equal(typeof payload.checks.database.configured, 'boolean');
  assert.equal(typeof payload.checks.redis.configured, 'boolean');
  assert.equal(typeof payload.checks.objectStorage.configured, 'boolean');
});

test('readiness endpoint reflects infrastructure readiness', async () => {
  const response = await fetch(`${baseUrl}/health/ready`);
  const payload = await response.json();
  assert.ok(response.status === 200 || response.status === 503);
  assert.equal(typeof payload.ok, 'boolean');
  assert.equal(payload.service, 'rekindle-rise-api');
});

test('metrics endpoint exposes request counters and route statistics', async () => {
  await fetch(`${baseUrl}/health`);
  const response = await fetch(`${baseUrl}/health/metrics`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.service, 'rekindle-rise-api');
  assert.equal(typeof payload.uptimeSeconds, 'number');
  assert.equal(typeof payload.totalRequests, 'number');
  assert.equal(typeof payload.totalErrors, 'number');
  assert.ok(payload.totalRequests >= 1);
  assert.ok(payload.byStatus);
  assert.equal(typeof payload.byStatus['2xx'], 'number');
  assert.ok(payload.byRoute['GET /health']);
});

test('register endpoint creates a user', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'maya@example.com',
      password: 'secret',
      displayName: 'Maya',
      role: 'survivor',
      consentAccepted: true,
      profileVisibility: 'followers',
      journalVisibility: 'everyone',
      storySharing: 'followers'
    })
  });
  const payload = await response.json();
  assert.equal(response.status, 201);
  assert.ok(payload.user);
  assert.ok(payload.token);
  assert.equal(payload.verification.status, 'placeholder');
  assert.equal(payload.user.onboarding.completed, true);
  assert.equal(payload.user.onboarding.consentAccepted, true);
  assert.equal(payload.user.privacySettings.profileVisibility, 'followers');
  assert.equal(payload.user.privacySettings.journalVisibility, 'everyone');
  assert.equal(payload.user.privacySettings.storySharing, 'followers');
});

test('register endpoint rejects missing consent', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'no-consent@example.com', password: 'secret', displayName: 'No Consent', role: 'survivor' })
  });
  const payload = await response.json();
  assert.equal(response.status, 400);
  assert.equal(payload.error, 'consentAccepted must be true to continue');
});

test('register endpoint rejects missing role', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'role-missing@example.com', password: 'secret', displayName: 'No Role' })
  });
  const payload = await response.json();
  assert.equal(response.status, 400);
  assert.equal(payload.error, 'email, password, displayName, and role are required');
});

test('register endpoint rejects duplicate email', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'maya@example.com',
      password: 'secret',
      displayName: 'Maya Again',
      role: 'survivor',
      consentAccepted: true
    })
  });
  const payload = await response.json();
  assert.equal(response.status, 409);
  assert.equal(payload.error, 'an account with this email already exists');
});

test('login endpoint issues access and refresh tokens', async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.ok(payload.token);
  assert.ok(payload.refreshToken);
});

test('a fresh unauthenticated client can sign in after another client registers', async () => {
  const email = `fresh-client-${Date.now()}@example.com`;
  const registrationResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'secret123',
      displayName: 'Fresh Client',
      role: 'survivor',
      consentAccepted: true
    })
  });
  assert.equal(registrationResponse.status, 201);

  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'secret123' })
  });
  const loginPayload = await loginResponse.json();
  assert.equal(loginResponse.status, 200);
  assert.equal(loginPayload.user.email, email);
  assert.ok(loginPayload.token);
  assert.ok(loginPayload.refreshToken);
});

test('refresh endpoint rotates refresh tokens', async () => {
  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const loginPayload = await loginResponse.json();
  assert.equal(loginResponse.status, 200);

  const refreshResponse = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: loginPayload.refreshToken })
  });
  const refreshPayload = await refreshResponse.json();
  assert.equal(refreshResponse.status, 200);
  assert.ok(refreshPayload.token);
  assert.ok(refreshPayload.refreshToken);
  assert.notEqual(refreshPayload.refreshToken, loginPayload.refreshToken);

  const staleRefreshResponse = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: loginPayload.refreshToken })
  });
  assert.equal(staleRefreshResponse.status, 401);
});

test('logout endpoint revokes active session', async () => {
  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const loginPayload = await loginResponse.json();
  assert.equal(loginResponse.status, 200);

  const logoutResponse = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginPayload.token}`
    },
    body: JSON.stringify({ refreshToken: loginPayload.refreshToken })
  });
  const logoutPayload = await logoutResponse.json();
  assert.equal(logoutResponse.status, 200);
  assert.equal(logoutPayload.ok, true);

  const meResponse = await fetch(`${baseUrl}/api/v1/me`, {
    headers: {
      Authorization: `Bearer ${loginPayload.token}`
    }
  });
  assert.equal(meResponse.status, 401);
});

test('privacy update persists for the authenticated user', async () => {
  const authResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const authPayload = await authResponse.json();
  assert.equal(authResponse.status, 200);

  const privacyResponse = await fetch(`${baseUrl}/api/v1/me/privacy`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authPayload.token}`
    },
    body: JSON.stringify({
      profileVisibility: 'followers',
      journalVisibility: 'everyone',
      storySharing: 'followers',
      notificationPreferences: ['email', 'inapp', 'event_updates']
    })
  });
  const privacyPayload = await privacyResponse.json();
  assert.equal(privacyResponse.status, 200);
  assert.equal(privacyPayload.privacySettings.profileVisibility, 'followers');
  assert.equal(privacyPayload.privacySettings.journalVisibility, 'everyone');
  assert.equal(privacyPayload.privacySettings.storySharing, 'followers');
  assert.deepEqual(privacyPayload.privacySettings.notificationPreferences, ['email', 'inapp', 'event_updates']);
});

test('profile update persists for the authenticated user', async () => {
  const authResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const authPayload = await authResponse.json();
  assert.equal(authResponse.status, 200);

  const profileResponse = await fetch(`${baseUrl}/api/v1/me/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authPayload.token}`
    },
    body: JSON.stringify({
      displayName: 'Maya Updated',
      bio: 'Gentle progress matters.',
      location: 'Portland, OR',
      photoUrl: 'https://example.com/photo.jpg'
    })
  });
  const profilePayload = await profileResponse.json();
  assert.equal(profileResponse.status, 200);
  assert.equal(profilePayload.user.displayName, 'Maya Updated');
  assert.equal(profilePayload.user.profile.bio, 'Gentle progress matters.');
  assert.equal(profilePayload.user.profile.location, 'Portland, OR');
  assert.equal(profilePayload.user.profile.photoUrl, 'https://example.com/photo.jpg');
});

test('journal entry model supports create list edit and delete with timestamps', async () => {
  const registerResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'journaler@example.com',
      password: 'secret',
      displayName: 'Journaler',
      role: 'survivor',
      consentAccepted: true
    })
  });
  const registerPayload = await registerResponse.json();
  assert.equal(registerResponse.status, 201);

  const createResponse = await fetch(`${baseUrl}/api/v1/journal/entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${registerPayload.token}`
    },
    body: JSON.stringify({
      title: 'First reflection',
      body: 'Today I felt grounded after a short walk.',
      promptReference: 'daily-grounding-prompt',
      mood: 'hopeful',
      visibility: 'followers'
    })
  });
  const createPayload = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.equal(createPayload.entry.title, 'First reflection');
  assert.equal(createPayload.entry.promptReference, 'daily-grounding-prompt');
  assert.equal(createPayload.entry.mood, 'hopeful');
  assert.equal(createPayload.entry.visibility, 'followers');
  assert.ok(createPayload.entry.createdAt);
  assert.ok(createPayload.entry.updatedAt);

  const privateDefaultResponse = await fetch(`${baseUrl}/api/v1/journal/entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${registerPayload.token}`
    },
    body: JSON.stringify({
      title: 'Default privacy check',
      body: 'This entry should stay private by default.'
    })
  });
  const privateDefaultPayload = await privateDefaultResponse.json();
  assert.equal(privateDefaultResponse.status, 201);
  assert.equal(privateDefaultPayload.entry.visibility, 'private');

  const exportAllResponse = await fetch(`${baseUrl}/api/v1/journal/entries/export`, {
    headers: {
      Authorization: `Bearer ${registerPayload.token}`
    }
  });
  const exportAllPayload = await exportAllResponse.json();
  assert.equal(exportAllResponse.status, 200);
  assert.equal(exportAllPayload.count, 2);
  assert.equal(exportAllPayload.mimeType, 'application/json');

  const exportEntryResponse = await fetch(`${baseUrl}/api/v1/journal/entries/${createPayload.entry.id}/export`, {
    headers: {
      Authorization: `Bearer ${registerPayload.token}`
    }
  });
  const exportEntryPayload = await exportEntryResponse.json();
  assert.equal(exportEntryResponse.status, 200);
  assert.equal(exportEntryPayload.entry.id, createPayload.entry.id);
  assert.equal(exportEntryPayload.mimeType, 'application/json');

  const listResponse = await fetch(`${baseUrl}/api/v1/journal/entries`, {
    headers: {
      Authorization: `Bearer ${registerPayload.token}`
    }
  });
  const listPayload = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listPayload.entries.length, 2);
  assert.ok(listPayload.entries.some(entry => entry.id === createPayload.entry.id));

  const editResponse = await fetch(`${baseUrl}/api/v1/journal/entries/${createPayload.entry.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${registerPayload.token}`
    },
    body: JSON.stringify({
      title: 'Updated reflection',
      body: 'I slowed down and checked in with myself.',
      promptReference: 'slow-down-check-in',
      mood: 'grateful',
      visibility: 'everyone'
    })
  });
  const editPayload = await editResponse.json();
  assert.equal(editResponse.status, 200);
  assert.equal(editPayload.entry.title, 'Updated reflection');
  assert.equal(editPayload.entry.body, 'I slowed down and checked in with myself.');
  assert.equal(editPayload.entry.promptReference, 'slow-down-check-in');
  assert.equal(editPayload.entry.mood, 'grateful');
  assert.equal(editPayload.entry.visibility, 'everyone');

  const deleteResponse = await fetch(`${baseUrl}/api/v1/journal/entries/${createPayload.entry.id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${registerPayload.token}`
    }
  });
  const deletePayload = await deleteResponse.json();
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletePayload.ok, true);

  const afterDeleteResponse = await fetch(`${baseUrl}/api/v1/journal/entries`, {
    headers: {
      Authorization: `Bearer ${registerPayload.token}`
    }
  });
  const afterDeletePayload = await afterDeleteResponse.json();
  assert.equal(afterDeleteResponse.status, 200);
  assert.equal(afterDeletePayload.entries.length, 1);
});

test('follow requests can be sent from one profile and accepted by another user', async () => {
  const ivyRegister = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ivy@example.com',
      password: 'secret',
      displayName: 'Ivy',
      role: 'survivor',
      consentAccepted: true
    })
  });
  assert.equal(ivyRegister.status, 201);

  const noahRegister = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'noah@example.com',
      password: 'secret',
      displayName: 'Noah',
      role: 'caregiver',
      consentAccepted: true
    })
  });
  assert.equal(noahRegister.status, 201);

  const noahLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'noah@example.com', password: 'secret' })
  });
  const noahLoginPayload = await noahLogin.json();
  assert.equal(noahLogin.status, 200);

  const requestResponse = await fetch(`${baseUrl}/api/v1/me/follow-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${noahLoginPayload.token}`
    },
    body: JSON.stringify({ email: 'ivy@example.com' })
  });
  const requestPayload = await requestResponse.json();
  assert.equal(requestResponse.status, 201);
  assert.equal(requestPayload.request.status, 'pending');

  const noahOutgoing = await fetch(`${baseUrl}/api/v1/me/follow-requests?scope=outgoing`, {
    headers: {
      Authorization: `Bearer ${noahLoginPayload.token}`
    }
  });
  const noahOutgoingPayload = await noahOutgoing.json();
  assert.equal(noahOutgoing.status, 200);
  assert.equal(noahOutgoingPayload.requests.length, 1);

  const ivyLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ivy@example.com', password: 'secret' })
  });
  const ivyLoginPayload = await ivyLogin.json();
  assert.equal(ivyLogin.status, 200);

  const ivyIncoming = await fetch(`${baseUrl}/api/v1/me/follow-requests`, {
    headers: {
      Authorization: `Bearer ${ivyLoginPayload.token}`
    }
  });
  const ivyIncomingPayload = await ivyIncoming.json();
  assert.equal(ivyIncoming.status, 200);
  assert.equal(ivyIncomingPayload.requests.length, 1);

  const acceptResponse = await fetch(`${baseUrl}/api/v1/me/follow-requests/${requestPayload.request.id}/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ivyLoginPayload.token}`
    }
  });
  const acceptPayload = await acceptResponse.json();
  assert.equal(acceptResponse.status, 200);
  assert.equal(acceptPayload.request.status, 'accepted');

  const ivySocial = await fetch(`${baseUrl}/api/v1/me/social?scope=followers`, {
    headers: {
      Authorization: `Bearer ${ivyLoginPayload.token}`
    }
  });
  const ivySocialPayload = await ivySocial.json();
  assert.equal(ivySocial.status, 200);
  assert.equal(ivySocialPayload.followers.length, 1);
  assert.equal(ivySocialPayload.followers[0].displayName, 'Noah');
});

test('follower posts appear in the followers feed and stay separate from journal entries', async () => {
  const jordanRegister = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'jordan@example.com',
      password: 'secret',
      displayName: 'Jordan',
      role: 'caregiver',
      consentAccepted: true
    })
  });
  const jordanRegisterPayload = await jordanRegister.json();
  assert.equal(jordanRegister.status, 201);

  const jordanLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jordan@example.com', password: 'secret' })
  });
  const jordanLoginPayload = await jordanLogin.json();
  assert.equal(jordanLogin.status, 200);

  const followResponse = await fetch(`${baseUrl}/api/v1/me/follow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jordanLoginPayload.token}`
    },
    body: JSON.stringify({ email: 'maya@example.com' })
  });
  const followPayload = await followResponse.json();
  assert.equal(followResponse.status, 200);
  assert.equal(followPayload.following.length, 1);

  const postResponse = await fetch(`${baseUrl}/api/v1/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jordanLoginPayload.token}`
    },
    body: JSON.stringify({
      body: 'Gentle progress is still progress.',
      audience: 'followers',
      image: {
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3+ZlUAAAAASUVORK5CYII=',
        name: 'calm-note.png',
        type: 'image/png'
      }
    })
  });
  const postPayload = await postResponse.json();
  assert.equal(postResponse.status, 201);
  assert.equal(postPayload.post.body, 'Gentle progress is still progress.');
  assert.equal(postPayload.post.image.name, 'calm-note.png');

  const mayaLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const mayaLoginPayload = await mayaLogin.json();
  assert.equal(mayaLogin.status, 200);

  const socialResponse = await fetch(`${baseUrl}/api/v1/me/social?scope=followers`, {
    headers: {
      Authorization: `Bearer ${mayaLoginPayload.token}`
    }
  });
  const socialPayload = await socialResponse.json();
  assert.equal(socialResponse.status, 200);
  assert.equal(socialPayload.followers.length, 1);
  assert.equal(socialPayload.feed.length, 1);
  assert.equal(socialPayload.feed[0].body, 'Gentle progress is still progress.');
  assert.equal(socialPayload.feed[0].image.name, 'calm-note.png');

  const journalResponse = await fetch(`${baseUrl}/api/v1/journal/entries`, {
    headers: {
      Authorization: `Bearer ${mayaLoginPayload.token}`
    }
  });
  const journalPayload = await journalResponse.json();
  assert.equal(journalResponse.status, 200);
  assert.equal(journalPayload.entries.length, 0);
});

test('joining a community records the membership', async () => {
  const authResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const authPayload = await authResponse.json();
  assert.equal(authResponse.status, 200);

  const joinResponse = await fetch(`${baseUrl}/api/v1/communities/c1/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authPayload.token}`
    }
  });
  const joinPayload = await joinResponse.json();
  assert.equal(joinResponse.status, 200);
  assert.ok(joinPayload.community.members.includes(authPayload.user.id));
});

test('joined members can send and read group chat messages', async () => {
  const memberLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const memberPayload = await memberLogin.json();
  assert.equal(memberLogin.status, 200);

  const createMessageResponse = await fetch(`${baseUrl}/api/v1/communities/c1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberPayload.token}`
    },
    body: JSON.stringify({ body: 'Glad to be here today.' })
  });
  const createMessagePayload = await createMessageResponse.json();
  assert.equal(createMessageResponse.status, 201);
  assert.equal(createMessagePayload.message.body, 'Glad to be here today.');
  assert.equal(createMessagePayload.message.author.id, memberPayload.user.id);

  const messagesResponse = await fetch(`${baseUrl}/api/v1/communities/c1/messages`, {
    headers: { Authorization: `Bearer ${memberPayload.token}` }
  });
  const messagesPayload = await messagesResponse.json();
  assert.equal(messagesResponse.status, 200);
  assert.ok(messagesPayload.messages.some(message => message.body === 'Glad to be here today.'));

  const email = `group-chat-guest-${Date.now()}@example.com`;
  const guestRegistration = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'secret123',
      displayName: 'Group Chat Guest',
      role: 'survivor',
      consentAccepted: true
    })
  });
  const guestPayload = await guestRegistration.json();
  assert.equal(guestRegistration.status, 201);

  const guestMessagesResponse = await fetch(`${baseUrl}/api/v1/communities/c1/messages`, {
    headers: { Authorization: `Bearer ${guestPayload.token}` }
  });
  assert.equal(guestMessagesResponse.status, 403);
});

test('communities endpoint supports filtering and detail view with join state', async () => {
  const authResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const authPayload = await authResponse.json();
  assert.equal(authResponse.status, 200);

  const filteredResponse = await fetch(`${baseUrl}/api/v1/communities?topic=education&format=hybrid&location=local%20chapters&moderated=true&verified=true`, {
    headers: {
      Authorization: `Bearer ${authPayload.token}`
    }
  });
  const filteredPayload = await filteredResponse.json();
  assert.equal(filteredResponse.status, 200);
  assert.equal(filteredPayload.communities.length, 1);
  assert.equal(filteredPayload.communities[0].id, 'c1');
  assert.equal(filteredPayload.communities[0].joined, true);

  const detailResponse = await fetch(`${baseUrl}/api/v1/communities/c1`, {
    headers: {
      Authorization: `Bearer ${authPayload.token}`
    }
  });
  const detailPayload = await detailResponse.json();
  assert.equal(detailResponse.status, 200);
  assert.equal(detailPayload.community.id, 'c1');
  assert.equal(detailPayload.community.joined, true);
  assert.ok(detailPayload.community.members.includes(authPayload.user.id));
});

test('authenticated users can create communities and discover them by location', async () => {
  const authResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const authPayload = await authResponse.json();
  assert.equal(authResponse.status, 200);

  const createResponse = await fetch(`${baseUrl}/api/v1/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authPayload.token}`
    },
    body: JSON.stringify({
      name: 'Austin Recovery Walkers',
      description: 'Gentle check-ins and local walk meetups.',
      location: 'Austin, TX',
      format: 'in-person',
      topics: 'walking,peer-support'
    })
  });
  const createPayload = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.equal(createPayload.community.name, 'Austin Recovery Walkers');
  assert.equal(createPayload.community.location, 'Austin, TX');
  assert.equal(createPayload.community.joined, true);
  assert.equal(createPayload.community.verified, false);

  const filteredResponse = await fetch(`${baseUrl}/api/v1/communities?location=austin`, {
    headers: {
      Authorization: `Bearer ${authPayload.token}`
    }
  });
  const filteredPayload = await filteredResponse.json();
  assert.equal(filteredResponse.status, 200);
  assert.ok(filteredPayload.communities.some(community => community.name === 'Austin Recovery Walkers'));
});

test('events endpoint supports filtering, detail view, and RSVP flow', async () => {
  const authResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const authPayload = await authResponse.json();
  assert.equal(authResponse.status, 200);

  const filteredResponse = await fetch(`${baseUrl}/api/v1/events?topic=resources&format=in-person&location=Austin`, {
    headers: {
      Authorization: `Bearer ${authPayload.token}`
    }
  });
  const filteredPayload = await filteredResponse.json();
  assert.equal(filteredResponse.status, 200);
  assert.equal(filteredPayload.events.length, 1);
  assert.equal(filteredPayload.events[0].id, 'e2');

  const detailResponse = await fetch(`${baseUrl}/api/v1/events/e2`, {
    headers: {
      Authorization: `Bearer ${authPayload.token}`
    }
  });
  const detailPayload = await detailResponse.json();
  assert.equal(detailResponse.status, 200);
  assert.equal(detailPayload.event.id, 'e2');
  assert.equal(detailPayload.event.rsvped, false);
  const initialRsvpCount = detailPayload.event.rsvpCount;

  const rsvpResponse = await fetch(`${baseUrl}/api/v1/events/e2/rsvp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authPayload.token}`
    }
  });
  const rsvpPayload = await rsvpResponse.json();
  assert.equal(rsvpResponse.status, 200);
  assert.equal(rsvpPayload.event.id, 'e2');
  assert.equal(rsvpPayload.event.rsvped, true);
  assert.equal(rsvpPayload.event.rsvpCount, initialRsvpCount + 1);
});

test('moderation report and block hooks persist and feed the review queue', async () => {
  const mayaLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const mayaPayload = await mayaLogin.json();
  assert.equal(mayaLogin.status, 200);

  const reportResponse = await fetch(`${baseUrl}/api/v1/moderation/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mayaPayload.token}`
    },
    body: JSON.stringify({
      resourceType: 'community',
      resourceId: 'c2',
      reason: 'Needs closer moderation review.'
    })
  });
  const reportPayload = await reportResponse.json();
  assert.equal(reportResponse.status, 201);
  assert.equal(reportPayload.report.resourceType, 'community');
  assert.equal(reportPayload.report.resourceId, 'c2');
  assert.equal(reportPayload.report.status, 'pending_review');

  const blockResponse = await fetch(`${baseUrl}/api/v1/moderation/block`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mayaPayload.token}`
    },
    body: JSON.stringify({
      resourceType: 'event',
      resourceId: 'e3',
      reason: 'Not a fit right now.'
    })
  });
  const blockPayload = await blockResponse.json();
  assert.equal(blockResponse.status, 201);
  assert.equal(blockPayload.block.resourceType, 'event');
  assert.equal(blockPayload.block.resourceId, 'e3');

  const eventsAfterBlock = await fetch(`${baseUrl}/api/v1/events`, {
    headers: {
      Authorization: `Bearer ${mayaPayload.token}`
    }
  });
  const eventsAfterBlockPayload = await eventsAfterBlock.json();
  assert.equal(eventsAfterBlock.status, 200);
  assert.ok(eventsAfterBlockPayload.events.every(event => event.id !== 'e3'));

  const blockedDetail = await fetch(`${baseUrl}/api/v1/events/e3`, {
    headers: {
      Authorization: `Bearer ${mayaPayload.token}`
    }
  });
  assert.equal(blockedDetail.status, 404);

  const orgRegister = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'moderator@example.com',
      password: 'secret',
      displayName: 'Moderator',
      role: 'volunteer',
      consentAccepted: true
    })
  });
  const orgRegisterPayload = await orgRegister.json();
  assert.equal(orgRegister.status, 201);

  const queueResponse = await fetch(`${baseUrl}/api/v1/moderation/review-queue`, {
    headers: {
      Authorization: `Bearer ${orgRegisterPayload.token}`
    }
  });
  const queuePayload = await queueResponse.json();
  assert.equal(queueResponse.status, 200);
  assert.equal(queuePayload.queueState, 'pending_review');
  assert.ok(queuePayload.reports.some(report => report.resourceType === 'community' && report.resourceId === 'c2'));
});
