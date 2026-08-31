const http = require('http');
const fs = require('fs');
const path = require('path');
const { createPersistenceStore } = require('./persistence/store');

const webRoot = path.join(__dirname, '..', 'web');
const defaultSeedFile = path.join(__dirname, 'seed-data.json');

const defaultSeedData = {
  users: [],
  journalEntries: [],
  communities: [
    {
      id: 'c1',
      name: 'Returning to School',
      description: 'Support for transitions and confidence.',
      moderated: true,
      verified: true,
      format: 'hybrid',
      topics: ['education', 'confidence', 'peer-support'],
      location: 'Virtual + Local Chapters',
      members: []
    },
    {
      id: 'c2',
      name: 'Caregiver Support',
      description: 'Resources for family and supporters.',
      moderated: true,
      verified: true,
      format: 'online',
      topics: ['caregiving', 'resources', 'family'],
      location: 'Virtual',
      members: []
    }
  ],
  events: [
    {
      id: 'e1',
      title: 'Community Circle',
      date: '2026-08-08',
      location: 'Virtual',
      format: 'online',
      topic: 'peer-support',
      host: 'Rekindle Peer Team',
      accessibility: 'Live captions enabled',
      safetyNote: 'Moderated conversation with clear participation rules.',
      verified: true,
      rsvps: []
    },
    {
      id: 'e2',
      title: 'Resource Workshop',
      date: '2026-08-12',
      location: 'Austin, TX',
      format: 'in-person',
      topic: 'resources',
      host: 'Care Network Collective',
      accessibility: 'Wheelchair accessible venue',
      safetyNote: 'Facilitator and support volunteers present onsite.',
      verified: true,
      rsvps: []
    },
    {
      id: 'e3',
      title: 'Family Care Q&A',
      date: '2026-08-17',
      location: 'Virtual',
      format: 'online',
      topic: 'caregiving',
      host: 'Family Support Collective',
      accessibility: 'Captioned recording shared after event',
      safetyNote: 'Questions screened for respectful discussion.',
      verified: true,
      rsvps: []
    }
  ]
};

const allowedRoles = new Set(['survivor', 'volunteer', 'caregiver']);
const allowedPrivacyValues = new Set(['private', 'followers', 'everyone']);
const allowedNotificationValues = new Set(['email', 'sms', 'inapp', 'weekly_digest', 'event_updates', 'community_updates']);

function sanitizePrivacyChoice(value, defaultValue = 'private') {
  if (value === 'groups') return 'followers';
  if (value === 'community') return 'everyone';
  return allowedPrivacyValues.has(value) ? value : defaultValue;
}

function sanitizeRoleChoice(value, defaultValue = 'survivor') {
  if (value === 'supporter') return 'caregiver';
  if (value === 'organization') return 'volunteer';
  return allowedRoles.has(value) ? value : defaultValue;
}

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    privacySettings: user.privacySettings,
    profile: user.profile,
    followers: Array.isArray(user.followers) ? user.followers : [],
    following: Array.isArray(user.following) ? user.following : [],
    onboarding: user.onboarding
  };
}

function serializeProfileUser(user) {
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    profile: user.profile
  };
}

function serializeDiscoverUser(user, viewer) {
  const isSelf = viewer && viewer.id === user.id;
  const isFollowing = Boolean(viewer && Array.isArray(viewer.following) && viewer.following.includes(user.id));
  const isFollower = Boolean(viewer && Array.isArray(viewer.followers) && viewer.followers.includes(user.id));
  return {
    ...serializeProfileUser(user),
    email: isSelf ? user.email : undefined,
    followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
    followingCount: Array.isArray(user.following) ? user.following.length : 0,
    relationship: isSelf ? 'self' : isFollowing ? 'following' : isFollower ? 'follower' : 'none'
  };
}

function serializeFollowRequest(request, requester, target) {
  return {
    id: request.id,
    requesterId: request.requesterId,
    targetId: request.targetId,
    message: request.message || '',
    status: request.status,
    createdAt: request.createdAt,
    resolvedAt: request.resolvedAt,
    resolvedBy: request.resolvedBy,
    requester: requester ? serializeProfileUser(requester) : null,
    target: target ? serializeProfileUser(target) : null
  };
}

function serializePost(post, author) {
  return {
    id: post.id,
    body: post.body,
    audience: post.audience,
    image: post.image || null,
    createdAt: post.createdAt,
    author: author ? serializeProfileUser(author) : null
  };
}

function serializeCommunity(community, viewer, moderation = {}) {
  const members = Array.isArray(community.members) ? community.members : [];
  const topics = Array.isArray(community.topics) ? community.topics : [];
  return {
    id: community.id,
    name: community.name,
    description: community.description || '',
    moderated: Boolean(community.moderated),
    verified: Boolean(community.verified),
    format: community.format || 'online',
    topics,
    location: community.location || 'Virtual',
    createdBy: community.createdBy || null,
    createdAt: community.createdAt || null,
    members,
    membersCount: members.length,
    joined: Boolean(viewer && members.includes(viewer.id)),
    reportedByMe: Boolean(moderation.reportedByMe),
    blockedByMe: Boolean(moderation.blockedByMe)
  };
}

function filterCommunities(communities, params) {
  const query = (params.q || '').trim().toLowerCase();
  const topic = (params.topic || '').trim().toLowerCase();
  const format = (params.format || '').trim().toLowerCase();
  const location = (params.location || '').trim().toLowerCase();
  const moderated = (params.moderated || '').trim().toLowerCase();
  const verified = (params.verified || '').trim().toLowerCase();

  return communities.filter(community => {
    const description = String(community.description || '').toLowerCase();
    const name = String(community.name || '').toLowerCase();
    const communityLocation = String(community.location || '').toLowerCase();
    const topics = Array.isArray(community.topics) ? community.topics.map(value => String(value).toLowerCase()) : [];

    if (query && !name.includes(query) && !description.includes(query) && !communityLocation.includes(query) && !topics.some(value => value.includes(query))) {
      return false;
    }
    if (topic && !topics.includes(topic)) {
      return false;
    }
    if (format && String(community.format || '').toLowerCase() !== format) {
      return false;
    }
    if (location && !communityLocation.includes(location)) {
      return false;
    }
    if (moderated === 'true' && !community.moderated) {
      return false;
    }
    if (verified === 'true' && !community.verified) {
      return false;
    }
    return true;
  });
}

function serializeJournalEntry(entry) {
  return {
    id: entry.id,
    userId: entry.userId,
    title: entry.title,
    body: entry.body,
    promptReference: entry.promptReference || 'general-reflection',
    mood: entry.mood || 'steady',
    visibility: sanitizePrivacyChoice(entry.visibility, 'private'),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt || entry.createdAt
  };
}

function serializeEvent(event, viewer, moderation = {}) {
  const rsvps = Array.isArray(event.rsvps) ? event.rsvps : [];
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location || 'Virtual',
    format: event.format || 'online',
    topic: event.topic || 'general-support',
    host: event.host || 'Rekindle & Rise host',
    accessibility: event.accessibility || 'Accessibility details shared in event notes.',
    safetyNote: event.safetyNote || 'Safety expectations reviewed at session start.',
    verified: Boolean(event.verified),
    rsvpCount: rsvps.length,
    rsvped: Boolean(viewer && rsvps.includes(viewer.id)),
    reportedByMe: Boolean(moderation.reportedByMe),
    blockedByMe: Boolean(moderation.blockedByMe)
  };
}

function filterEvents(events, params) {
  const query = (params.q || '').trim().toLowerCase();
  const location = (params.location || '').trim().toLowerCase();
  const format = (params.format || '').trim().toLowerCase();
  const topic = (params.topic || '').trim().toLowerCase();
  const from = (params.from || '').trim();
  const to = (params.to || '').trim();

  return events.filter(event => {
    const title = String(event.title || '').toLowerCase();
    const eventLocation = String(event.location || '').toLowerCase();
    const eventTopic = String(event.topic || '').toLowerCase();
    const eventFormat = String(event.format || '').toLowerCase();

    if (query && !title.includes(query) && !eventLocation.includes(query) && !eventTopic.includes(query)) {
      return false;
    }
    if (location && !eventLocation.includes(location)) {
      return false;
    }
    if (format && eventFormat !== format) {
      return false;
    }
    if (topic && eventTopic !== topic) {
      return false;
    }

    const eventDate = new Date(event.date);
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(eventDate.getTime()) && eventDate < fromDate) {
        return false;
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime()) && !Number.isNaN(eventDate.getTime()) && eventDate > toDate) {
        return false;
      }
    }

    return true;
  });
}

function isSupportedModerationResource(resourceType) {
  return resourceType === 'community' || resourceType === 'event';
}

function buildJournalExportFilename(user, suffix = 'journal-export') {
  const nameSeed = (user?.displayName || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'user';
  const dateSeed = new Date().toISOString().slice(0, 10);
  return `${nameSeed}-${suffix}-${dateSeed}.json`;
}

function buildOnboardingPrivacy(body) {
  const profileVisibility = sanitizePrivacyChoice(body.profileVisibility);
  const journalVisibility = sanitizePrivacyChoice(body.journalVisibility);
  const notifications = Array.isArray(body.notificationPreferences)
    ? body.notificationPreferences.filter(value => allowedNotificationValues.has(value))
    : ['email', 'inapp'];
  return {
    profileVisibility,
    journalVisibility,
    storySharing: sanitizePrivacyChoice(body.storySharing),
    notificationPreferences: notifications.length > 0 ? notifications : ['email', 'inapp']
  };
}

function parseBoolean(rawValue, defaultValue = false) {
  if (rawValue == null) return defaultValue;
  const normalized = String(rawValue).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function normalizeMetricsPath(pathname) {
  const segments = String(pathname || '').split('/');
  return segments
    .map((segment, index) => {
      if (index <= 3 || !segment) return segment;
      const looksLikeIdentifier = /^[a-z]\d+$/i.test(segment)
        || /^[0-9a-f]{8,}$/i.test(segment)
        || /^[0-9a-f-]{16,}$/i.test(segment);
      return looksLikeIdentifier ? ':id' : segment;
    })
    .join('/');
}

function shouldLogRequest(configuredLevel, eventLevel) {
  const levelWeight = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40
  };
  const current = levelWeight[configuredLevel] || levelWeight.info;
  const candidate = levelWeight[eventLevel] || levelWeight.info;
  return candidate >= current;
}

function createObservabilityState() {
  return {
    startedAt: Date.now(),
    totalRequests: 0,
    totalErrors: 0,
    byStatus: {},
    byRoute: {}
  };
}

function loadConfig() {
  const parsedPort = Number.parseInt(process.env.PORT || '', 10);
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number.isInteger(parsedPort) ? parsedPort : 3000,
    host: process.env.HOST || '127.0.0.1',
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    objectStorageEndpoint: process.env.OBJECT_STORAGE_ENDPOINT || '',
    logLevel: process.env.LOG_LEVEL || 'info',
    requestLoggingEnabled: parseBoolean(process.env.REQUEST_LOGGING, true),
    metricsEnabled: parseBoolean(process.env.METRICS_ENABLED, true),
    seedOnStart: parseBoolean(process.env.SEED_ON_START, true),
    seedFile: process.env.SEED_FILE || defaultSeedFile
  };
}

function loadSeedData(seedFilePath) {
  try {
    const raw = fs.readFileSync(seedFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

function createInitialState(config) {
  const seeded = config.seedOnStart ? loadSeedData(config.seedFile) : null;
  const communities = Array.isArray(seeded?.communities) ? seeded.communities : defaultSeedData.communities;
  const events = Array.isArray(seeded?.events) ? seeded.events : defaultSeedData.events;
  const users = Array.isArray(seeded?.users) ? seeded.users : defaultSeedData.users;
  const journalEntries = Array.isArray(seeded?.journalEntries) ? seeded.journalEntries : defaultSeedData.journalEntries;

  return {
    users,
    journalEntries,
    communities: communities.map(community => ({
      ...community,
      members: Array.isArray(community.members) ? community.members : []
    })),
    events
  };
}

function toPublicEndpoint(urlValue) {
  if (!urlValue) return '';
  try {
    const parsed = new URL(urlValue);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (_error) {
    return 'set';
  }
}

function getInfrastructureHealth(config) {
  const checks = {
    database: {
      configured: Boolean(config.databaseUrl),
      endpoint: toPublicEndpoint(config.databaseUrl)
    },
    redis: {
      configured: Boolean(config.redisUrl),
      endpoint: toPublicEndpoint(config.redisUrl)
    },
    objectStorage: {
      configured: Boolean(config.objectStorageEndpoint),
      endpoint: toPublicEndpoint(config.objectStorageEndpoint)
    }
  };

  const ok = Object.values(checks).every(check => check.configured);
  return {
    ok,
    checks,
    mode: config.nodeEnv,
    warnings: ok ? [] : ['One or more infrastructure dependencies are not configured.']
  };
}

function createServer(configOverrides = {}) {
  const config = {
    ...loadConfig(),
    ...configOverrides
  };
  const store = createPersistenceStore(createInitialState(config));
  const observability = createObservabilityState();

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
  return store.findUserByAccessToken(token);
}

function getAccessToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7);
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
  if (ext === '.svg') contentType = 'image/svg+xml; charset=utf-8';
  if (ext === '.png') contentType = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  if (ext === '.webp') contentType = 'image/webp';

  serveFile(res, filePath, contentType);
}

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requestStartedAt = process.hrtime.bigint();

    res.on('finish', () => {
      if (!config.metricsEnabled && !config.requestLoggingEnabled) {
        return;
      }

      const durationMs = Number(process.hrtime.bigint() - requestStartedAt) / 1_000_000;
      const statusCode = res.statusCode || 0;
      const method = req.method || 'GET';
      const normalizedPath = normalizeMetricsPath(url.pathname);

      if (config.metricsEnabled) {
        observability.totalRequests += 1;
        if (statusCode >= 400) {
          observability.totalErrors += 1;
        }

        const statusBucket = `${Math.floor(statusCode / 100)}xx`;
        observability.byStatus[statusBucket] = (observability.byStatus[statusBucket] || 0) + 1;

        const routeKey = `${method} ${normalizedPath}`;
        const current = observability.byRoute[routeKey] || {
          count: 0,
          errors: 0,
          avgDurationMs: 0,
          maxDurationMs: 0
        };
        const nextCount = current.count + 1;
        const nextErrors = current.errors + (statusCode >= 400 ? 1 : 0);
        const nextMax = Math.max(current.maxDurationMs, durationMs);
        const nextAvg = ((current.avgDurationMs * current.count) + durationMs) / nextCount;
        observability.byRoute[routeKey] = {
          count: nextCount,
          errors: nextErrors,
          avgDurationMs: Number(nextAvg.toFixed(2)),
          maxDurationMs: Number(nextMax.toFixed(2))
        };
      }

      if (config.requestLoggingEnabled) {
        const eventLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        if (shouldLogRequest(config.logLevel, eventLevel)) {
          const entry = {
            timestamp: new Date().toISOString(),
            level: eventLevel,
            type: 'http_request',
            method,
            path: normalizedPath,
            statusCode,
            durationMs: Number(durationMs.toFixed(2)),
            requestId: req.headers['x-request-id'] || ''
          };
          console.log(JSON.stringify(entry));
        }
      }
    });

    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'rekindle-rise-api',
        env: config.nodeEnv,
        logLevel: config.logLevel,
        seededFrom: config.seedOnStart ? config.seedFile : 'disabled'
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health/infrastructure') {
      sendJson(res, 200, getInfrastructureHealth(config));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health/ready') {
      const infrastructure = getInfrastructureHealth(config);
      sendJson(res, infrastructure.ok ? 200 : 503, {
        ok: infrastructure.ok,
        service: 'rekindle-rise-api',
        infrastructure
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health/metrics') {
      if (!config.metricsEnabled) {
        sendJson(res, 404, { error: 'metrics disabled' });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        service: 'rekindle-rise-api',
        generatedAt: new Date().toISOString(),
        uptimeSeconds: Number(process.uptime().toFixed(2)),
        totalRequests: observability.totalRequests,
        totalErrors: observability.totalErrors,
        byStatus: observability.byStatus,
        byRoute: observability.byRoute
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/communities') {
      const viewer = getAuthenticatedUser(req);
      const communities = filterCommunities(store.listCommunities(), {
        q: url.searchParams.get('q') || '',
        topic: url.searchParams.get('topic') || '',
        format: url.searchParams.get('format') || '',
        location: url.searchParams.get('location') || '',
        moderated: url.searchParams.get('moderated') || '',
        verified: url.searchParams.get('verified') || ''
      })
        .filter(community => !(viewer && store.isResourceBlockedByUser(viewer.id, 'community', community.id)))
        .map(community => serializeCommunity(community, viewer, {
          reportedByMe: viewer ? store.hasPendingReportByUser(viewer.id, 'community', community.id) : false,
          blockedByMe: viewer ? store.isResourceBlockedByUser(viewer.id, 'community', community.id) : false
        }));

      const allTopics = [...new Set(store.listCommunities().flatMap(community =>
        Array.isArray(community.topics) ? community.topics : []
      ))].sort((left, right) => left.localeCompare(right));

      sendJson(res, 200, {
        communities,
        filters: {
          topics: allTopics,
          locations: [...new Set(store.listCommunities().map(community => community.location).filter(Boolean))],
          formats: ['online', 'in-person', 'hybrid']
        }
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/communities') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      try {
        const body = await parseJsonBody(req);
        if (!body.name || !String(body.name).trim()) {
          sendJson(res, 400, { error: 'community name is required' });
          return;
        }

        const community = store.createCommunity({
          name: String(body.name).trim(),
          description: typeof body.description === 'string' ? body.description.trim() : '',
          format: typeof body.format === 'string' ? body.format.trim().toLowerCase() : 'online',
          location: typeof body.location === 'string' && body.location.trim() ? body.location.trim() : 'Virtual',
          topics: Array.isArray(body.topics)
            ? body.topics.map(topic => String(topic).trim()).filter(Boolean)
            : String(body.topics || '').split(',').map(topic => topic.trim()).filter(Boolean),
          createdBy: user.id
        });

        sendJson(res, 201, {
          community: serializeCommunity(community, user, {
            reportedByMe: false,
            blockedByMe: false
          })
        });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    const communityDetailMatch = req.method === 'GET' && url.pathname.match(/^\/api\/v1\/communities\/([^/]+)$/);
    if (communityDetailMatch) {
      const viewer = getAuthenticatedUser(req);
      const community = store.findCommunityById(communityDetailMatch[1]);
      if (!community) {
        sendJson(res, 404, { error: 'community not found' });
        return;
      }
      if (viewer && store.isResourceBlockedByUser(viewer.id, 'community', community.id)) {
        sendJson(res, 404, { error: 'community not found' });
        return;
      }
      sendJson(res, 200, {
        community: serializeCommunity(community, viewer, {
          reportedByMe: viewer ? store.hasPendingReportByUser(viewer.id, 'community', community.id) : false,
          blockedByMe: viewer ? store.isResourceBlockedByUser(viewer.id, 'community', community.id) : false
        })
      });
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
      const community = store.joinCommunity(match[1], user.id);
      if (!community) {
        sendJson(res, 404, { error: 'community not found' });
        return;
      }
      sendJson(res, 200, {
        community: serializeCommunity(community, user, {
          reportedByMe: store.hasPendingReportByUser(user.id, 'community', community.id),
          blockedByMe: store.isResourceBlockedByUser(user.id, 'community', community.id)
        })
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/events') {
      const viewer = getAuthenticatedUser(req);
      const filteredEvents = filterEvents(store.listEvents(), {
        q: url.searchParams.get('q') || '',
        location: url.searchParams.get('location') || '',
        format: url.searchParams.get('format') || '',
        topic: url.searchParams.get('topic') || '',
        from: url.searchParams.get('from') || '',
        to: url.searchParams.get('to') || ''
      })
        .filter(event => !(viewer && store.isResourceBlockedByUser(viewer.id, 'event', event.id)))
        .sort((left, right) => new Date(left.date) - new Date(right.date));

      const topics = [...new Set(store.listEvents().map(event => event.topic).filter(Boolean))].sort((left, right) => left.localeCompare(right));
      sendJson(res, 200, {
        events: filteredEvents.map(event => serializeEvent(event, viewer, {
          reportedByMe: viewer ? store.hasPendingReportByUser(viewer.id, 'event', event.id) : false,
          blockedByMe: viewer ? store.isResourceBlockedByUser(viewer.id, 'event', event.id) : false
        })),
        filters: {
          topics,
          formats: ['online', 'in-person', 'hybrid']
        }
      });
      return;
    }

    const eventDetailMatch = req.method === 'GET' && url.pathname.match(/^\/api\/v1\/events\/([^/]+)$/);
    if (eventDetailMatch) {
      const viewer = getAuthenticatedUser(req);
      const eventItem = store.findEventById(eventDetailMatch[1]);
      if (!eventItem) {
        sendJson(res, 404, { error: 'event not found' });
        return;
      }
      if (viewer && store.isResourceBlockedByUser(viewer.id, 'event', eventItem.id)) {
        sendJson(res, 404, { error: 'event not found' });
        return;
      }
      sendJson(res, 200, {
        event: serializeEvent(eventItem, viewer, {
          reportedByMe: viewer ? store.hasPendingReportByUser(viewer.id, 'event', eventItem.id) : false,
          blockedByMe: viewer ? store.isResourceBlockedByUser(viewer.id, 'event', eventItem.id) : false
        })
      });
      return;
    }

    const eventRsvpMatch = req.method === 'POST' && url.pathname.match(/^\/api\/v1\/events\/([^/]+)\/rsvp$/);
    if (eventRsvpMatch) {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      const eventItem = store.rsvpEvent(eventRsvpMatch[1], user.id);
      if (!eventItem) {
        sendJson(res, 404, { error: 'event not found' });
        return;
      }
      sendJson(res, 200, {
        event: serializeEvent(eventItem, user, {
          reportedByMe: store.hasPendingReportByUser(user.id, 'event', eventItem.id),
          blockedByMe: store.isResourceBlockedByUser(user.id, 'event', eventItem.id)
        })
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/moderation/report') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      try {
        const body = await parseJsonBody(req);
        if (!isSupportedModerationResource(body.resourceType) || !body.resourceId) {
          sendJson(res, 400, { error: 'resourceType and resourceId are required' });
          return;
        }

        const resourceExists = body.resourceType === 'community'
          ? Boolean(store.findCommunityById(body.resourceId))
          : Boolean(store.findEventById(body.resourceId));
        if (!resourceExists) {
          sendJson(res, 404, { error: `${body.resourceType} not found` });
          return;
        }

        const report = store.createModerationAction(user.id, {
          resourceType: body.resourceType,
          resourceId: body.resourceId,
          reason: body.reason,
          details: body.details
        });
        sendJson(res, 201, { report });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/moderation/block') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      try {
        const body = await parseJsonBody(req);
        if (!isSupportedModerationResource(body.resourceType) || !body.resourceId) {
          sendJson(res, 400, { error: 'resourceType and resourceId are required' });
          return;
        }

        const resourceExists = body.resourceType === 'community'
          ? Boolean(store.findCommunityById(body.resourceId))
          : Boolean(store.findEventById(body.resourceId));
        if (!resourceExists) {
          sendJson(res, 404, { error: `${body.resourceType} not found` });
          return;
        }

        const block = store.blockResource(user.id, {
          resourceType: body.resourceType,
          resourceId: body.resourceId,
          reason: body.reason
        });
        sendJson(res, 201, { block });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/moderation/review-queue') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      if (user.role !== 'volunteer') {
        sendJson(res, 403, { error: 'volunteer role required' });
        return;
      }
      const reports = store.listModerationActions().filter(report => report.status === 'pending_review');
      sendJson(res, 200, {
        queueState: 'pending_review',
        count: reports.length,
        reports
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/register') {
      try {
        const body = await parseJsonBody(req);
        if (!body.email || !body.password || !body.displayName || !body.role) {
          sendJson(res, 400, { error: 'email, password, displayName, and role are required' });
          return;
        }
        const normalizedRole = sanitizeRoleChoice(body.role);
        if (!allowedRoles.has(normalizedRole)) {
          sendJson(res, 400, { error: 'role must be one of: survivor, volunteer, caregiver' });
          return;
        }
        if (body.consentAccepted !== true) {
          sendJson(res, 400, { error: 'consentAccepted must be true to continue' });
          return;
        }
        if (store.findUserByEmail(body.email)) {
          sendJson(res, 409, { error: 'an account with this email already exists' });
          return;
        }
        const user = store.createUser({
          email: body.email,
          password: body.password,
          displayName: body.displayName,
          role: normalizedRole,
          privacySettings: buildOnboardingPrivacy(body),
          onboarding: {
            consentAccepted: true,
            completed: true,
            completedAt: new Date().toISOString()
          }
        });
        const session = store.issueSession(user.id);
        sendJson(res, 201, {
          user: serializeUser(user),
          token: session.accessToken,
          refreshToken: session.refreshToken,
          verification: {
            status: 'placeholder',
            message: 'Verification email flow will be added in a future hardening story.'
          }
        });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
      try {
        const body = await parseJsonBody(req);
        if (!body.email || !body.password) {
          sendJson(res, 400, { error: 'email and password are required' });
          return;
        }
        const user = store.findUserByCredentials(body.email, body.password);
        if (!user) {
          sendJson(res, 401, { error: 'invalid credentials' });
          return;
        }
        const session = store.issueSession(user.id);
        sendJson(res, 200, {
          user: serializeUser(user),
          token: session.accessToken,
          refreshToken: session.refreshToken
        });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/refresh') {
      try {
        const body = await parseJsonBody(req);
        if (!body.refreshToken) {
          sendJson(res, 400, { error: 'refreshToken is required' });
          return;
        }
        const session = store.rotateSession(body.refreshToken);
        if (!session) {
          sendJson(res, 401, { error: 'invalid refresh token' });
          return;
        }
        sendJson(res, 200, {
          token: session.accessToken,
          refreshToken: session.refreshToken
        });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
      const accessToken = getAccessToken(req);
      let revoked = false;
      if (accessToken) {
        revoked = store.revokeSessionByAccessToken(accessToken) || revoked;
      }
      try {
        const body = await parseJsonBody(req);
        if (body.refreshToken) {
          revoked = store.revokeSessionByRefreshToken(body.refreshToken) || revoked;
        }
      } catch (_error) {
        sendJson(res, 400, { error: 'Invalid JSON body' });
        return;
      }
      if (!revoked) {
        sendJson(res, 401, { error: 'no active session found' });
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/me') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      sendJson(res, 200, { user: serializeUser(user) });
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
        const incomingNotifications = Array.isArray(body.notificationPreferences)
          ? body.notificationPreferences.filter(value => allowedNotificationValues.has(value))
          : user.privacySettings.notificationPreferences;
        const privacySettings = store.updatePrivacy(user.id, {
          profileVisibility: sanitizePrivacyChoice(body.profileVisibility, user.privacySettings.profileVisibility),
          journalVisibility: sanitizePrivacyChoice(body.journalVisibility, user.privacySettings.journalVisibility),
          storySharing: sanitizePrivacyChoice(body.storySharing, user.privacySettings.storySharing),
          notificationPreferences: Array.isArray(incomingNotifications) && incomingNotifications.length > 0
            ? incomingNotifications
            : user.privacySettings.notificationPreferences
        });
        sendJson(res, 200, { privacySettings });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'PATCH' && url.pathname === '/api/v1/me/profile') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      try {
        const body = await parseJsonBody(req);
        const updatedUser = store.updateProfile(user.id, {
          displayName: typeof body.displayName === 'string' ? body.displayName.trim() : user.displayName,
          bio: typeof body.bio === 'string' ? body.bio.trim() : user.profile?.bio || '',
          location: typeof body.location === 'string' ? body.location.trim() : user.profile?.location || '',
          photoUrl: typeof body.photoUrl === 'string' ? body.photoUrl.trim() : user.profile?.photoUrl || ''
        });
        sendJson(res, 200, { user: serializeUser(updatedUser) });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/me/social') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      const scope = url.searchParams.get('scope') || 'followers';
      const validScope = scope === 'following' || scope === 'followers' || scope === 'all' ? scope : 'followers';
      const followerUsers = store.listFollowers(user.id).map(serializeProfileUser);
      const followingUsers = store.listFollowing(user.id).map(serializeProfileUser);
      const feed = store.getSocialFeed(user.id, validScope).map(post => serializePost(post, store.findUserById(post.authorId)));
      sendJson(res, 200, {
        user: serializeUser(user),
        followers: followerUsers,
        following: followingUsers,
        feed,
        scope: validScope
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/users') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      sendJson(res, 200, {
        users: store.listUsers().map(candidate => serializeDiscoverUser(candidate, user))
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/me/follow-requests') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      const scope = url.searchParams.get('scope') || 'incoming';
      const validScope = scope === 'outgoing' || scope === 'all' ? scope : 'incoming';
      const requests = store.listFollowRequests(user.id, validScope).map(request =>
        serializeFollowRequest(request, store.findUserById(request.requesterId), store.findUserById(request.targetId))
      );
      sendJson(res, 200, { scope: validScope, requests });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/me/follow-requests') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      try {
        const body = await parseJsonBody(req);
        const targetUser = body.userId ? store.findUserById(body.userId) : store.findUserByEmail(body.email || '');
        if (!targetUser) {
          sendJson(res, 404, { error: 'user not found' });
          return;
        }
        const request = store.requestFollow(user.id, targetUser.id, body.message || '');
        if (request.error) {
          sendJson(res, 400, { error: request.error });
          return;
        }
        sendJson(res, 201, { request: serializeFollowRequest(request, user, targetUser) });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    const acceptRequestMatch = req.method === 'POST' && url.pathname.match(/^\/api\/v1\/me\/follow-requests\/([^/]+)\/accept$/);
    if (acceptRequestMatch) {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      const request = store.acceptFollowRequest(acceptRequestMatch[1], user.id);
      if (request.error) {
        sendJson(res, 400, { error: request.error });
        return;
      }
      sendJson(res, 200, {
        request: serializeFollowRequest(request, store.findUserById(request.requesterId), store.findUserById(request.targetId)),
        followers: store.listFollowers(user.id).map(serializeProfileUser),
        following: store.listFollowing(user.id).map(serializeProfileUser)
      });
      return;
    }

    const declineRequestMatch = req.method === 'DELETE' && url.pathname.match(/^\/api\/v1\/me\/follow-requests\/([^/]+)$/);
    if (declineRequestMatch) {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      const request = store.declineFollowRequest(declineRequestMatch[1], user.id);
      if (request.error) {
        sendJson(res, 400, { error: request.error });
        return;
      }
      sendJson(res, 200, {
        request: serializeFollowRequest(request, store.findUserById(request.requesterId), store.findUserById(request.targetId))
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/me/follow') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      try {
        const body = await parseJsonBody(req);
        const targetUser = body.userId ? store.findUserById(body.userId) : store.findUserByEmail(body.email || '');
        if (!targetUser) {
          sendJson(res, 404, { error: 'user not found' });
          return;
        }
        const result = store.followUser(user.id, targetUser.id);
        if (result.error) {
          sendJson(res, 400, { error: result.error });
          return;
        }
        sendJson(res, 200, {
          followers: store.listFollowers(user.id).map(serializeProfileUser),
          following: store.listFollowing(user.id).map(serializeProfileUser)
        });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'DELETE' && url.pathname === '/api/v1/me/follow') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      try {
        const body = await parseJsonBody(req);
        const targetUser = body.userId ? store.findUserById(body.userId) : store.findUserByEmail(body.email || '');
        if (!targetUser) {
          sendJson(res, 404, { error: 'user not found' });
          return;
        }
        const unfollowed = store.unfollowUser(user.id, targetUser.id);
        if (!unfollowed) {
          sendJson(res, 400, { error: 'unable to unfollow user' });
          return;
        }
        sendJson(res, 200, {
          followers: store.listFollowers(user.id).map(serializeProfileUser),
          following: store.listFollowing(user.id).map(serializeProfileUser)
        });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/posts') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      try {
        const body = await parseJsonBody(req);
        if (!body.body || !body.body.trim()) {
          sendJson(res, 400, { error: 'body is required' });
          return;
        }
        const post = store.createPost(user.id, {
          body: body.body.trim(),
          audience: body.audience || 'followers',
          image: body.image && typeof body.image === 'object' ? {
            dataUrl: typeof body.image.dataUrl === 'string' ? body.image.dataUrl : '',
            name: typeof body.image.name === 'string' ? body.image.name : '',
            type: typeof body.image.type === 'string' ? body.image.type : ''
          } : null
        });
        sendJson(res, 201, { post: serializePost(post, user) });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/posts') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      const scope = url.searchParams.get('scope') || 'followers';
      const validScope = scope === 'following' || scope === 'followers' || scope === 'all' ? scope : 'followers';
      const posts = store.getSocialFeed(user.id, validScope).map(post => serializePost(post, store.findUserById(post.authorId)));
      sendJson(res, 200, { scope: validScope, posts });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/journal/entries') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      const entries = store.listJournalEntriesByUser(user.id).map(serializeJournalEntry);
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
        const entry = store.createJournalEntry(user.id, body);
        sendJson(res, 201, { entry: serializeJournalEntry(entry) });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/journal/entries/export') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      const entries = store.exportJournalEntries(user.id).map(serializeJournalEntry);
      sendJson(res, 200, {
        fileName: buildJournalExportFilename(user),
        mimeType: 'application/json',
        exportedAt: new Date().toISOString(),
        count: entries.length,
        entries
      });
      return;
    }

    const journalEntryExportMatch = url.pathname.match(/^\/api\/v1\/journal\/entries\/([^/]+)\/export$/);
    if (journalEntryExportMatch && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      const entry = store.findJournalEntryById(user.id, journalEntryExportMatch[1]);
      if (!entry) {
        sendJson(res, 404, { error: 'journal entry not found' });
        return;
      }
      sendJson(res, 200, {
        fileName: buildJournalExportFilename(user, `entry-${entry.id}`),
        mimeType: 'application/json',
        exportedAt: new Date().toISOString(),
        entry: serializeJournalEntry(entry)
      });
      return;
    }

    const journalEntryMatch = url.pathname.match(/^\/api\/v1\/journal\/entries\/([^/]+)$/);
    if (journalEntryMatch && req.method === 'PATCH') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      try {
        const body = await parseJsonBody(req);
        const entry = store.updateJournalEntry(user.id, journalEntryMatch[1], body);
        if (!entry) {
          sendJson(res, 404, { error: 'journal entry not found' });
          return;
        }
        sendJson(res, 200, { entry: serializeJournalEntry(entry) });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (journalEntryMatch && req.method === 'DELETE') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { error: 'authentication required' });
        return;
      }
      const deleted = store.deleteJournalEntry(user.id, journalEntryMatch[1]);
      if (!deleted) {
        sendJson(res, 404, { error: 'journal entry not found' });
        return;
      }
      sendJson(res, 200, { ok: true });
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
}

if (require.main === module) {
  const config = loadConfig();
  const server = createServer(config);
  server.listen(config.port, config.host, () => {
    console.log(`Rekindle & Rise starter API listening on http://${config.host}:${config.port}`);
    console.log(`Environment: ${config.nodeEnv} | Log level: ${config.logLevel} | Seed on start: ${config.seedOnStart}`);
  });
}

module.exports = {
  createServer,
  loadConfig,
  getInfrastructureHealth
};
