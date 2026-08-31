const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server');

let server;
let baseUrl = '';

function uniqueEmail(prefix) {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${seed}@example.com`;
}

test.before(async () => {
  server = createServer({
    port: 0,
    seedOnStart: true
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

test('ui contract serves onboarding and journal surfaces', async () => {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();
  assert.equal(response.status, 200);

  assert.ok(html.includes('id="signupForm"'));
  assert.ok(html.includes('id="journalForm"'));
  assert.ok(html.includes('id="eventSearch"'));
  assert.ok(html.includes('id="communitySearch"'));
  assert.ok(html.includes('id="notificationForm"'));
});

test('end-to-end onboarding flow persists defaults and allows profile retrieval', async () => {
  const email = uniqueEmail('onboarding-flow');
  const registerResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'secret123',
      displayName: 'Onboarding QA',
      role: 'survivor',
      consentAccepted: true,
      profileVisibility: 'followers',
      journalVisibility: 'private',
      storySharing: 'followers',
      notificationPreferences: ['email', 'inapp', 'event_updates']
    })
  });
  const registerPayload = await registerResponse.json();
  assert.equal(registerResponse.status, 201);
  assert.equal(registerPayload.user.onboarding.completed, true);
  assert.equal(registerPayload.user.privacySettings.profileVisibility, 'followers');

  const meResponse = await fetch(`${baseUrl}/api/v1/me`, {
    headers: {
      Authorization: `Bearer ${registerPayload.token}`
    }
  });
  const mePayload = await meResponse.json();
  assert.equal(meResponse.status, 200);
  assert.equal(mePayload.user.email, email);
  assert.deepEqual(mePayload.user.privacySettings.notificationPreferences, ['email', 'inapp', 'event_updates']);
});

test('end-to-end journaling flow supports create edit export and delete lifecycle', async () => {
  const email = uniqueEmail('journal-flow');
  const registerResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'secret123',
      displayName: 'Journal QA',
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
      title: 'Check-in',
      body: 'Breathing exercises helped today.',
      promptReference: 'daily-breathing',
      mood: 'steady'
    })
  });
  const createPayload = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.equal(createPayload.entry.visibility, 'private');

  const updateResponse = await fetch(`${baseUrl}/api/v1/journal/entries/${createPayload.entry.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${registerPayload.token}`
    },
    body: JSON.stringify({
      title: 'Check-in updated',
      body: 'Breathing + journaling helped today.',
      mood: 'hopeful'
    })
  });
  const updatePayload = await updateResponse.json();
  assert.equal(updateResponse.status, 200);
  assert.equal(updatePayload.entry.mood, 'hopeful');

  const exportResponse = await fetch(`${baseUrl}/api/v1/journal/entries/export`, {
    headers: {
      Authorization: `Bearer ${registerPayload.token}`
    }
  });
  const exportPayload = await exportResponse.json();
  assert.equal(exportResponse.status, 200);
  assert.equal(exportPayload.count, 1);
  assert.equal(exportPayload.entries[0].id, createPayload.entry.id);

  const deleteResponse = await fetch(`${baseUrl}/api/v1/journal/entries/${createPayload.entry.id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${registerPayload.token}`
    }
  });
  const deletePayload = await deleteResponse.json();
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletePayload.ok, true);

  const listResponse = await fetch(`${baseUrl}/api/v1/journal/entries`, {
    headers: {
      Authorization: `Bearer ${registerPayload.token}`
    }
  });
  const listPayload = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listPayload.entries.length, 0);
});
