const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const webRoot = path.join(__dirname, '..', 'web');

const state = {
  users: [],
  journalEntries: [],
  communities: [
    { id: 'c1', name: 'Returning to School', description: 'Support for transitions and confidence.', moderated: true, members: [] },
    { id: 'c2', name: 'Caregiver Support', description: 'Resources for family and supporters.', moderated: true, members: [] }
  ],
  events: [
    { id: 'e1', title: 'Community Circle', date: '2026-08-08', location: 'Virtual', format: 'Online', verified: true },
    { id: 'e2', title: 'Resource Workshop', date: '2026-08-12', location: 'Austin, TX', format: 'In Person', verified: true }
  ]
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
  });
}

function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return state.users.find(user => user.token === token) || null;
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(webRoot, safePath);
  if (!filePath.startsWith(webRoot)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  let contentType = 'text/plain; charset=utf-8';
  if (ext === '.html') contentType = 'text/html; charset=utf-8';
  if (ext === '.css') contentType = 'text/css; charset=utf-8';
  if (ext === '.js') contentType = 'application/javascript; charset=utf-8';

  serveFile(res, filePath, contentType);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'rekindle-rise-api' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/communities') {
    sendJson(res, 200, { communities: state.communities });
    return;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/v1/communities/')) {
    const match = url.pathname.match(/^\/api\/v1\/communities\/([^/]+)\/join$/);
    if (!match) {
      sendJson(res, 404, { error: 'route not found' });
      return;
    }
    const user = getAuthenticatedUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'authentication required' });
      return;
    }
    const community = state.communities.find(candidate => candidate.id === match[1]);
    if (!community) {
      sendJson(res, 404, { error: 'community not found' });
      return;
    }
    if (!community.members.includes(user.id)) {
      community.members.push(user.id);
    }
    sendJson(res, 200, { community: { ...community, joined: true } });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/events') {
    sendJson(res, 200, { events: state.events });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/auth/register') {
    try {
      const body = await parseJsonBody(req);
      if (!body.email || !body.password || !body.displayName) {
        sendJson(res, 400, { error: 'email, password, and displayName are required' });
        return;
      }
      const user = {
        id: `user-${state.users.length + 1}`,
        email: body.email,
        password: body.password,
        displayName: body.displayName,
        role: body.role || 'survivor',
        token: `token-${Date.now()}`,
        privacySettings: {
          profileVisibility: 'private',
          journalVisibility: 'private',
          storySharing: 'private',
          notificationPreferences: ['email']
        }
      };
      state.users.push(user);
      sendJson(res, 201, { user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, privacySettings: user.privacySettings }, token: user.token });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
    try {
      const body = await parseJsonBody(req);
      const user = state.users.find(candidate => candidate.email === body.email && candidate.password === body.password);
      if (!user) {
        sendJson(res, 401, { error: 'invalid credentials' });
        return;
      }
      sendJson(res, 200, { user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, privacySettings: user.privacySettings }, token: user.token });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/me') {
    const user = getAuthenticatedUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'authentication required' });
      return;
    }
    sendJson(res, 200, { user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, privacySettings: user.privacySettings } });
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/v1/me/privacy') {
    const user = getAuthenticatedUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'authentication required' });
      return;
    }
    try {
      const body = await parseJsonBody(req);
      user.privacySettings = {
        ...user.privacySettings,
        ...body
      };
      sendJson(res, 200, { privacySettings: user.privacySettings });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/journal/entries') {
    const user = getAuthenticatedUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'authentication required' });
      return;
    }
    const entries = state.journalEntries.filter(entry => entry.userId === user.id);
    sendJson(res, 200, { entries });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/journal/entries') {
    const user = getAuthenticatedUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'authentication required' });
      return;
    }
    try {
      const body = await parseJsonBody(req);
      const entry = {
        id: `entry-${state.journalEntries.length + 1}`,
        userId: user.id,
        title: body.title || 'Untitled entry',
        body: body.body || '',
        prompt: body.prompt || 'What felt grounding today?',
        visibility: 'private',
        createdAt: new Date().toISOString()
      };
      state.journalEntries.push(entry);
      sendJson(res, 201, { entry });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/')) {
    sendJson(res, 404, { error: 'route not found' });
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, url.pathname);
    return;
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`Rekindle & Rise starter API listening on http://localhost:${PORT}`);
});
