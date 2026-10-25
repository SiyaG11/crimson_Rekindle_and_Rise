const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createServer } = require('../server');

const seedPath = path.join(__dirname, '..', 'seed-data.json');

test('development seed supplies ten connected users and complete application state', async () => {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  assert.equal(seed.users.length, 10);
  for (const collection of ['journalEntries', 'posts', 'followRequests', 'groupMessages', 'communities', 'events', 'moderationActions', 'blockedResources']) {
    assert.ok(Array.isArray(seed[collection]) && seed[collection].length > 0, `${collection} should be seeded`);
  }

  const server = createServer({
    port: 0,
    databaseUrl: '',
    seedOnStart: true,
    requestLoggingEnabled: false,
    metricsEnabled: false
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    const login = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'maya.chen@example.test', password: 'RiseTogether2026!' })
    });
    const loginPayload = await login.json();
    assert.equal(login.status, 200);
    assert.equal(loginPayload.user.displayName, 'Maya Chen');

    const feed = await fetch(`http://127.0.0.1:${address.port}/api/v1/posts?scope=all`, {
      headers: { Authorization: `Bearer ${loginPayload.token}` }
    });
    const feedPayload = await feed.json();
    assert.equal(feed.status, 200);
    assert.equal(feedPayload.posts.length, 5);
  } finally {
    await new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  }
});
