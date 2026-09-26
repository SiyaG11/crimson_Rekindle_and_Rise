const test = require('node:test');
const assert = require('node:assert/strict');
const { createPersistenceStore } = require('../persistence/store');
const { createServer } = require('../server');

function createMemoryDatabase() {
  let snapshot = null;

  return {
    async query(statement, parameters = []) {
      if (statement === 'SELECT 1') return { rowCount: 1, rows: [] };
      if (statement.startsWith('SELECT data')) {
        return snapshot ? { rowCount: 1, rows: [{ data: snapshot }] } : { rowCount: 0, rows: [] };
      }
      if (statement.startsWith('INSERT INTO application_state')) {
        snapshot = JSON.parse(parameters[1]);
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected query: ${statement}`);
    }
  };
}

test('persisted users can authenticate after a fresh store hydrates', async () => {
  const database = createMemoryDatabase();
  const options = { databaseUrl: 'postgres://persistence-test', database };
  const firstStore = createPersistenceStore({}, options);

  await firstStore.hydrate();
  const user = firstStore.createUser({
    email: 'persisted@example.com',
    password: 'secret123',
    displayName: 'Persisted User',
    role: 'survivor'
  });
  firstStore.issueSession(user.id);
  await firstStore.flush();

  const secondStore = createPersistenceStore({}, options);
  assert.equal(await secondStore.hydrate(), true);
  assert.equal(secondStore.findUserByCredentials('persisted@example.com', 'secret123')?.id, user.id);
});

test('registration rolls back and returns a service error when PostgreSQL cannot save it', async () => {
  let databaseAvailable = false;
  const database = {
    async query(statement) {
      if (statement === 'SELECT 1') return { rowCount: 1, rows: [] };
      if (statement.startsWith('SELECT data')) return { rowCount: 0, rows: [] };
      if (!databaseAvailable) throw new Error('database unavailable');
      return { rowCount: 1, rows: [] };
    }
  };
  const server = createServer({
    port: 0,
    databaseUrl: 'postgres://persistence-test',
    database,
    requestLoggingEnabled: false,
    metricsEnabled: false
  });
  await server.persistenceReady;
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'unavailable@example.com',
        password: 'secret123',
        displayName: 'Unavailable User',
        role: 'survivor',
        consentAccepted: true
      })
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Unable to save your changes. Please try again.' });
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/health`)).status, 200);

    databaseAvailable = true;
    const retryResponse = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'unavailable@example.com',
        password: 'secret123',
        displayName: 'Unavailable User',
        role: 'survivor',
        consentAccepted: true
      })
    });
    assert.equal(retryResponse.status, 201);
  } finally {
    await new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  }
});
