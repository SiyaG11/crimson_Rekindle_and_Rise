const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server');

let server;
let baseUrl = '';

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

test('accessibility baseline includes skip link, main landmark, and aria labels on key controls', async () => {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();
  assert.equal(response.status, 200);

  assert.ok(html.includes('class="skip-link"'));
  assert.ok(html.includes('id="mainContent"'));

  assert.ok(html.includes('id="displayName" aria-label="Display name"'));
  assert.ok(html.includes('id="email" type="email" aria-label="Email"'));
  assert.ok(html.includes('id="password" type="password" aria-label="Password"'));
  assert.ok(html.includes('id="journalBody" aria-label="Journal reflection body"'));
  assert.ok(html.includes('id="communitySearch" aria-label="Search communities"'));
  assert.ok(html.includes('id="eventSearch" aria-label="Search events"'));
});

test('frontend state announcements use live region attributes', async () => {
  const response = await fetch(`${baseUrl}/app.js`);
  const source = await response.text();
  assert.equal(response.status, 200);

  assert.ok(source.includes("target.setAttribute('role', variant === 'error' ? 'alert' : 'status');"));
  assert.ok(source.includes("target.setAttribute('aria-live', variant === 'error' ? 'assertive' : 'polite');"));
  assert.ok(source.includes("target.setAttribute('aria-atomic', 'true');"));
});
