const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

test('health endpoint responds ok', async () => {
  const response = await fetch('http://127.0.0.1:3000/health');
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
});

test('register endpoint creates a user', async () => {
  const response = await fetch('http://127.0.0.1:3000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret', displayName: 'Maya' })
  });
  const payload = await response.json();
  assert.equal(response.status, 201);
  assert.ok(payload.user);
  assert.ok(payload.token);
});

test('privacy update persists for the authenticated user', async () => {
  const authResponse = await fetch('http://127.0.0.1:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const authPayload = await authResponse.json();
  assert.equal(authResponse.status, 200);

  const privacyResponse = await fetch('http://127.0.0.1:3000/api/v1/me/privacy', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authPayload.token}`
    },
    body: JSON.stringify({ profileVisibility: 'groups', journalVisibility: 'community' })
  });
  const privacyPayload = await privacyResponse.json();
  assert.equal(privacyResponse.status, 200);
  assert.equal(privacyPayload.privacySettings.profileVisibility, 'groups');
  assert.equal(privacyPayload.privacySettings.journalVisibility, 'community');
});

test('joining a community records the membership', async () => {
  const authResponse = await fetch('http://127.0.0.1:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@example.com', password: 'secret' })
  });
  const authPayload = await authResponse.json();
  assert.equal(authResponse.status, 200);

  const joinResponse = await fetch('http://127.0.0.1:3000/api/v1/communities/c1/join', {
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
