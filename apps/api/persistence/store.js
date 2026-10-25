const crypto = require('crypto');

function createPersistenceStore(initialState, options = {}) {
  const allowedVisibility = new Set(['private', 'followers', 'everyone']);
  const state = {
    users: [...(initialState.users || [])],
    journalEntries: [...(initialState.journalEntries || [])],
    posts: [...(initialState.posts || [])],
    followRequests: [...(initialState.followRequests || [])],
    groupMessages: [...(initialState.groupMessages || [])],
    communities: (initialState.communities || []).map(community => ({
      ...community,
      topics: Array.isArray(community.topics) ? [...community.topics] : [],
      location: community.location || 'Virtual',
      format: community.format || 'online',
      members: Array.isArray(community.members) ? [...community.members] : []
    })),
    events: [...(initialState.events || [])],
    moderationActions: [...(initialState.moderationActions || [])],
    blockedResources: [...(initialState.blockedResources || [])],
    sessions: [],
    auditLogs: []
  };
  let persistQueue = Promise.resolve();
  let database = null;

  function snapshot() {
    return {
      users: state.users,
      journalEntries: state.journalEntries,
      posts: state.posts,
      followRequests: state.followRequests,
      groupMessages: state.groupMessages,
      communities: state.communities,
      events: state.events,
      moderationActions: state.moderationActions,
      blockedResources: state.blockedResources,
      sessions: state.sessions,
      auditLogs: state.auditLogs
    };
  }

  function restore(snapshotData) {
    for (const key of Object.keys(state)) {
      state[key] = Array.isArray(snapshotData[key]) ? snapshotData[key] : state[key];
    }
  }

  async function connectDatabase() {
    if (!options.databaseUrl) return null;
    if (options.database) {
      database = options.database;
      await database.query('SELECT 1');
      return database;
    }
    const { Pool } = require('pg');
    database = new Pool({ connectionString: options.databaseUrl });
    await database.query('SELECT 1');
    return database;
  }

  async function hydrate() {
    if (!options.databaseUrl) return false;
    const pool = await connectDatabase();
    const result = await pool.query('SELECT data FROM application_state WHERE id = $1', ['primary']);
    if (result.rowCount === 0) return false;
    restore(result.rows[0].data);
    return true;
  }

  function persist(onFailure) {
    if (!database) return;
    const data = JSON.stringify(snapshot());
    persistQueue = persistQueue.catch(() => {}).then(() => database.query(
      `INSERT INTO application_state (id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      ['primary', data]
    )).catch(error => {
      onFailure?.();
      console.error('[persistence] Unable to save application state:', error.message);
      throw error;
    });
  }

  function createToken(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeVisibility(value, fallback = 'private') {
    if (value === 'groups') return 'followers';
    if (value === 'community') return 'everyone';
    return allowedVisibility.has(value) ? value : fallback;
  }

  function buildPrivacySettings(input = {}) {
    const notificationValues = ['email', 'sms', 'inapp', 'weekly_digest', 'event_updates', 'community_updates'];
    const filteredNotifications = Array.isArray(input.notificationPreferences)
      ? input.notificationPreferences.filter(value => notificationValues.includes(value))
      : [];
    return {
      profileVisibility: normalizeVisibility(input.profileVisibility, 'private'),
      journalVisibility: normalizeVisibility(input.journalVisibility, 'private'),
      storySharing: normalizeVisibility(input.storySharing, 'private'),
      notificationPreferences: filteredNotifications.length > 0 ? [...filteredNotifications] : ['email', 'inapp']
    };
  }

  function addAudit(action, actorId, resourceType, resourceId, shouldPersist = true) {
    state.auditLogs.push({
      id: `audit-${state.auditLogs.length + 1}`,
      action,
      actorId: actorId || null,
      resourceType,
      resourceId: resourceId || null,
      createdAt: new Date().toISOString()
    });
    if (shouldPersist) persist();
  }

  function sanitizeJournalVisibility(value, fallback = 'private') {
    return normalizeVisibility(value, fallback);
  }

  function sanitizeJournalText(value, fallback = '') {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim();
    return normalized || fallback;
  }

  function sanitizeJournalMood(value, fallback = 'steady') {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    const allowedMoods = new Set(['steady', 'hopeful', 'grateful', 'anxious', 'tired', 'overwhelmed']);
    return allowedMoods.has(normalized) ? normalized : fallback;
  }

  function buildResourceKey(resourceType, resourceId) {
    return `${resourceType}:${resourceId}`;
  }

  return {
    listCommunities() {
      return state.communities;
    },

    findCommunityById(id) {
      return state.communities.find(community => community.id === id) || null;
    },

    listCommunityMessages(communityId) {
      return state.groupMessages
        .filter(message => message.communityId === communityId)
        .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
    },

    createCommunityMessage(communityId, userId, body) {
      const community = state.communities.find(candidate => candidate.id === communityId);
      if (!community) return { error: 'group chat not found' };
      if (!community.members.includes(userId)) return { error: 'join this group chat before sending messages' };
      const text = typeof body === 'string' ? body.trim() : '';
      if (!text) return { error: 'message is required' };
      if (text.length > 1000) return { error: 'message must be 1000 characters or fewer' };

      const message = {
        id: `group-message-${state.groupMessages.length + 1}`,
        communityId,
        authorId: userId,
        body: text,
        createdAt: new Date().toISOString()
      };
      state.groupMessages.push(message);
      addAudit('community.message.create', userId, 'community-message', message.id);
      return { message };
    },

    joinCommunity(communityId, userId) {
      const community = state.communities.find(candidate => candidate.id === communityId);
      if (!community) return null;
      if (!community.members.includes(userId)) {
        community.members.push(userId);
        addAudit('community.join', userId, 'community', communityId);
      }
      return community;
    },

    createCommunity(payload) {
      const name = typeof payload.name === 'string' ? payload.name.trim() : '';
      if (!name) {
        return { error: 'community name is required' };
      }

      const nextId = `c${state.communities.length + 1}`;
      const community = {
        id: nextId,
        name,
        description: typeof payload.description === 'string' ? payload.description.trim() : '',
        moderated: true,
        verified: false,
        format: typeof payload.format === 'string' && payload.format.trim() ? payload.format.trim() : 'online',
        topics: Array.isArray(payload.topics)
          ? payload.topics.map(topic => String(topic).trim()).filter(Boolean)
          : [],
        location: typeof payload.location === 'string' && payload.location.trim() ? payload.location.trim() : 'Virtual',
        createdBy: payload.createdBy || null,
        createdAt: new Date().toISOString(),
        members: payload.createdBy ? [payload.createdBy] : []
      };

      state.communities.push(community);
      addAudit('community.create', payload.createdBy || null, 'community', community.id);
      return community;
    },

    listEvents() {
      return state.events;
    },

    findEventById(eventId) {
      return state.events.find(event => event.id === eventId) || null;
    },

    rsvpEvent(eventId, userId) {
      const event = state.events.find(candidate => candidate.id === eventId);
      if (!event) return null;
      if (!Array.isArray(event.rsvps)) event.rsvps = [];
      if (!event.rsvps.includes(userId)) {
        event.rsvps.push(userId);
        addAudit('event.rsvp', userId, 'event', eventId);
      }
      return event;
    },

    createModerationAction(userId, payload) {
      const resourceType = payload.resourceType;
      const resourceId = payload.resourceId;
      const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
      const details = typeof payload.details === 'string' ? payload.details.trim() : '';

      const existing = state.moderationActions.find(action =>
        action.reporterId === userId
        && action.resourceType === resourceType
        && action.resourceId === resourceId
        && action.status === 'pending_review'
      );
      if (existing) return existing;

      const action = {
        id: `report-${state.moderationActions.length + 1}`,
        reporterId: userId,
        resourceType,
        resourceId,
        reason: reason || 'general-safety-concern',
        details,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null
      };
      state.moderationActions.push(action);
      addAudit('moderation.report', userId, resourceType, resourceId);
      return action;
    },

    listModerationActions() {
      return state.moderationActions
        .slice()
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    },

    hasPendingReportByUser(userId, resourceType, resourceId) {
      return state.moderationActions.some(action =>
        action.reporterId === userId
        && action.resourceType === resourceType
        && action.resourceId === resourceId
        && action.status === 'pending_review'
      );
    },

    blockResource(userId, payload) {
      const resourceType = payload.resourceType;
      const resourceId = payload.resourceId;
      const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
      const resourceKey = buildResourceKey(resourceType, resourceId);

      const existing = state.blockedResources.find(entry => entry.userId === userId && entry.resourceKey === resourceKey);
      if (existing) return existing;

      const blocked = {
        id: `block-${state.blockedResources.length + 1}`,
        userId,
        resourceType,
        resourceId,
        resourceKey,
        reason: reason || 'safety-preference',
        createdAt: new Date().toISOString()
      };
      state.blockedResources.push(blocked);
      addAudit('moderation.block', userId, resourceType, resourceId);
      return blocked;
    },

    isResourceBlockedByUser(userId, resourceType, resourceId) {
      const resourceKey = buildResourceKey(resourceType, resourceId);
      return state.blockedResources.some(entry => entry.userId === userId && entry.resourceKey === resourceKey);
    },

    listBlockedResourcesByUser(userId) {
      return state.blockedResources.filter(entry => entry.userId === userId);
    },

    createUser(input, options = {}) {
      const privacySettings = buildPrivacySettings(input.privacySettings);
      const profile = {
        bio: input.profile?.bio || '',
        location: input.profile?.location || '',
        photoUrl: input.profile?.photoUrl || ''
      };
      const onboarding = {
        role: input.role || 'survivor',
        consentAccepted: Boolean(input.onboarding?.consentAccepted),
        privacyPreferences: privacySettings,
        completed: Boolean(input.onboarding?.completed),
        completedAt: input.onboarding?.completedAt || new Date().toISOString()
      };
      const user = {
        id: `user-${state.users.length + 1}`,
        email: input.email,
        password: crypto.scryptSync(input.password, input.email, 64).toString('hex'),
        displayName: input.displayName,
        role: input.role || 'survivor',
        privacySettings,
        profile,
        followers: [],
        following: [],
        onboarding
      };
      state.users.push(user);
      addAudit('user.create', user.id, 'user', user.id, options.persist !== false);
      return user;
    },

    registerUser(input) {
      const previousState = JSON.parse(JSON.stringify(snapshot()));
      const user = this.createUser(input, { persist: false });
      const session = this.issueSession(user.id, { persist: false });
      persist(() => restore(previousState));
      return { user, session };
    },

    findUserByCredentials(email, password) {
      const user = state.users.find(candidate => candidate.email === email);
      if (!user) return null;
      const candidateHash = crypto.scryptSync(password, email, 64).toString('hex');
      const valid = user.password.length === candidateHash.length
        && crypto.timingSafeEqual(Buffer.from(user.password), Buffer.from(candidateHash));
      return valid ? user : null;
    },

    findUserByEmail(email) {
      return state.users.find(candidate => candidate.email === email) || null;
    },

    listUsers() {
      return state.users;
    },

    issueSession(userId, options = {}) {
      const user = state.users.find(candidate => candidate.id === userId);
      if (!user) return null;
      const session = {
        id: `session-${state.sessions.length + 1}`,
        userId,
        accessToken: createToken('access'),
        refreshToken: createToken('refresh'),
        active: true,
        createdAt: new Date().toISOString(),
        rotatedAt: null,
        revokedAt: null
      };
      state.sessions.push(session);
      addAudit('auth.session.issued', userId, 'session', session.id, options.persist !== false);
      return session;
    },

    findUserByAccessToken(token) {
      const session = state.sessions.find(candidate => candidate.active && candidate.accessToken === token);
      if (!session) return null;
      return state.users.find(user => user.id === session.userId) || null;
    },

    rotateSession(refreshToken) {
      const session = state.sessions.find(candidate => candidate.active && candidate.refreshToken === refreshToken);
      if (!session) return null;
      session.accessToken = createToken('access');
      session.refreshToken = createToken('refresh');
      session.rotatedAt = new Date().toISOString();
      addAudit('auth.session.rotated', session.userId, 'session', session.id);
      return session;
    },

    revokeSessionByAccessToken(accessToken) {
      const session = state.sessions.find(candidate => candidate.active && candidate.accessToken === accessToken);
      if (!session) return false;
      session.active = false;
      session.revokedAt = new Date().toISOString();
      addAudit('auth.session.revoked', session.userId, 'session', session.id);
      return true;
    },

    revokeSessionByRefreshToken(refreshToken) {
      const session = state.sessions.find(candidate => candidate.active && candidate.refreshToken === refreshToken);
      if (!session) return false;
      session.active = false;
      session.revokedAt = new Date().toISOString();
      addAudit('auth.session.revoked', session.userId, 'session', session.id);
      return true;
    },

    updatePrivacy(userId, patch) {
      const user = state.users.find(candidate => candidate.id === userId);
      if (!user) return null;
      user.privacySettings = {
        ...user.privacySettings,
        ...patch,
        profileVisibility: normalizeVisibility(patch.profileVisibility, user.privacySettings.profileVisibility || 'private'),
        journalVisibility: normalizeVisibility(patch.journalVisibility, user.privacySettings.journalVisibility || 'private'),
        storySharing: normalizeVisibility(patch.storySharing, user.privacySettings.storySharing || 'private')
      };
      if (user.onboarding) {
        user.onboarding.privacyPreferences = { ...user.privacySettings };
      }
      addAudit('privacy.update', user.id, 'privacy', user.id);
      return user.privacySettings;
    },

    updateProfile(userId, patch) {
      const user = state.users.find(candidate => candidate.id === userId);
      if (!user) return null;
      user.displayName = patch.displayName || user.displayName;
      user.profile = {
        bio: patch.bio ?? user.profile?.bio ?? '',
        location: patch.location ?? user.profile?.location ?? '',
        photoUrl: patch.photoUrl ?? user.profile?.photoUrl ?? ''
      };
      addAudit('profile.update', user.id, 'profile', user.id);
      return user;
    },

    findUserById(userId) {
      return state.users.find(candidate => candidate.id === userId) || null;
    },

    followUser(followerId, followeeId) {
      if (followerId === followeeId) return { error: 'You cannot follow yourself.' };
      const follower = state.users.find(candidate => candidate.id === followerId);
      const followee = state.users.find(candidate => candidate.id === followeeId);
      if (!follower || !followee) return { error: 'user not found' };
      if (!follower.following.includes(followeeId)) follower.following.push(followeeId);
      if (!followee.followers.includes(followerId)) followee.followers.push(followerId);
      addAudit('social.follow', followerId, 'follow', followeeId);
      return { follower, followee };
    },

    unfollowUser(followerId, followeeId) {
      const follower = state.users.find(candidate => candidate.id === followerId);
      const followee = state.users.find(candidate => candidate.id === followeeId);
      if (!follower || !followee) return false;
      follower.following = follower.following.filter(candidate => candidate !== followeeId);
      followee.followers = followee.followers.filter(candidate => candidate !== followerId);
      addAudit('social.unfollow', followerId, 'follow', followeeId);
      return true;
    },

    listFollowRequests(userId, scope = 'incoming') {
      return state.followRequests.filter(request => {
        if (scope === 'outgoing') return request.requesterId === userId;
        if (scope === 'all') return request.requesterId === userId || request.targetId === userId;
        return request.targetId === userId;
      });
    },

    findFollowRequestById(requestId) {
      return state.followRequests.find(request => request.id === requestId) || null;
    },

    requestFollow(requesterId, targetId, message = '') {
      if (requesterId === targetId) return { error: 'You cannot request to follow yourself.' };
      const requester = state.users.find(candidate => candidate.id === requesterId);
      const target = state.users.find(candidate => candidate.id === targetId);
      if (!requester || !target) return { error: 'user not found' };
      if (requester.following.includes(targetId)) return { error: 'You are already following this user.' };
      const existingRequest = state.followRequests.find(request =>
        request.requesterId === requesterId && request.targetId === targetId && request.status === 'pending'
      );
      if (existingRequest) return { error: 'A follow request is already pending.' };
      const request = {
        id: `follow-request-${state.followRequests.length + 1}`,
        requesterId,
        targetId,
        message: message || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null
      };
      state.followRequests.push(request);
      addAudit('social.follow.request', requesterId, 'follow-request', request.id);
      return request;
    },

    acceptFollowRequest(requestId, userId) {
      const request = state.followRequests.find(candidate => candidate.id === requestId);
      if (!request) return { error: 'follow request not found' };
      if (request.targetId !== userId) return { error: 'not authorized' };
      if (request.status !== 'pending') return { error: 'follow request already resolved' };
      const followed = this.followUser(request.requesterId, request.targetId);
      if (followed.error) return { error: followed.error };
      request.status = 'accepted';
      request.resolvedAt = new Date().toISOString();
      request.resolvedBy = userId;
      addAudit('social.follow.request.accept', userId, 'follow-request', request.id);
      return request;
    },

    declineFollowRequest(requestId, userId) {
      const request = state.followRequests.find(candidate => candidate.id === requestId);
      if (!request) return { error: 'follow request not found' };
      if (request.targetId !== userId && request.requesterId !== userId) return { error: 'not authorized' };
      if (request.status !== 'pending') return { error: 'follow request already resolved' };
      request.status = 'declined';
      request.resolvedAt = new Date().toISOString();
      request.resolvedBy = userId;
      addAudit('social.follow.request.decline', userId, 'follow-request', request.id);
      return request;
    },

    listFollowers(userId) {
      const user = state.users.find(candidate => candidate.id === userId);
      if (!user) return [];
      return user.followers.map(followerId => this.findUserById(followerId)).filter(Boolean);
    },

    listFollowing(userId) {
      const user = state.users.find(candidate => candidate.id === userId);
      if (!user) return [];
      return user.following.map(followeeId => this.findUserById(followeeId)).filter(Boolean);
    },

    createPost(userId, payload) {
      const user = state.users.find(candidate => candidate.id === userId);
      if (!user) return null;
      const post = {
        id: `post-${state.posts.length + 1}`,
        authorId: userId,
        body: payload.body || '',
        audience: payload.audience || 'followers',
        image: payload.image ? { ...payload.image } : null,
        createdAt: new Date().toISOString()
      };
      state.posts.push(post);
      addAudit('social.post.create', userId, 'post', post.id);
      return post;
    },

    listPostsByAuthorIds(authorIds) {
      return state.posts
        .filter(post => authorIds.includes(post.authorId))
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .map(post => ({
          ...post,
          author: this.findUserById(post.authorId)
            ? {
                id: this.findUserById(post.authorId).id,
                displayName: this.findUserById(post.authorId).displayName,
                role: this.findUserById(post.authorId).role
              }
            : null
        }));
    },

    getSocialFeed(userId, scope = 'followers') {
      const user = state.users.find(candidate => candidate.id === userId);
      if (!user) return [];
      const authorIds = scope === 'following' ? [...user.following] : [...user.followers];
      if (scope === 'all') {
        authorIds.push(user.id);
        authorIds.push(...user.following, ...user.followers);
      }
      const uniqueAuthorIds = [...new Set(authorIds)];
      return this.listPostsByAuthorIds(uniqueAuthorIds);
    },

    listJournalEntriesByUser(userId) {
      return state.journalEntries
        .filter(entry => entry.userId === userId)
        .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt));
    },

    createJournalEntry(userId, payload) {
      const title = sanitizeJournalText(payload.title, 'Untitled entry');
      const body = sanitizeJournalText(payload.body, '');
      const promptReference = sanitizeJournalText(payload.promptReference || payload.prompt, 'general-reflection');
      const visibility = sanitizeJournalVisibility(payload.visibility, 'private');
      const mood = sanitizeJournalMood(payload.mood, 'steady');
      if (!body && title === 'Untitled entry') {
        throw new Error('title or body is required');
      }
      const createdAt = new Date().toISOString();
      const entry = {
        id: `entry-${state.journalEntries.length + 1}`,
        userId,
        title,
        body,
        promptReference,
        mood,
        visibility,
        createdAt,
        updatedAt: createdAt
      };
      state.journalEntries.push(entry);
      addAudit('journal.create', userId, 'journal-entry', entry.id);
      return entry;
    },

    updateJournalEntry(userId, entryId, payload) {
      const entry = state.journalEntries.find(candidate => candidate.id === entryId && candidate.userId === userId);
      if (!entry) return null;

      if (typeof payload.title === 'string') {
        entry.title = sanitizeJournalText(payload.title, 'Untitled entry');
      }
      if (typeof payload.body === 'string') {
        entry.body = sanitizeJournalText(payload.body, '');
      }
      if (typeof payload.promptReference === 'string' || typeof payload.prompt === 'string') {
        entry.promptReference = sanitizeJournalText(payload.promptReference || payload.prompt, 'general-reflection');
      }
      if (typeof payload.mood === 'string') {
        entry.mood = sanitizeJournalMood(payload.mood, entry.mood || 'steady');
      }
      if (payload.visibility != null) {
        entry.visibility = sanitizeJournalVisibility(payload.visibility, entry.visibility || 'private');
      }

      if (!entry.body && entry.title === 'Untitled entry') {
        throw new Error('title or body is required');
      }

      entry.updatedAt = new Date().toISOString();
      addAudit('journal.update', userId, 'journal-entry', entry.id);
      return entry;
    },

    deleteJournalEntry(userId, entryId) {
      const index = state.journalEntries.findIndex(candidate => candidate.id === entryId && candidate.userId === userId);
      if (index === -1) return false;
      const [deleted] = state.journalEntries.splice(index, 1);
      addAudit('journal.delete', userId, 'journal-entry', deleted.id);
      return true;
    },

    findJournalEntryById(userId, entryId) {
      return state.journalEntries.find(candidate => candidate.id === entryId && candidate.userId === userId) || null;
    },

    exportJournalEntries(userId) {
      const entries = this.listJournalEntriesByUser(userId);
      addAudit('journal.export', userId, 'journal-entry', null);
      return entries;
    },

    listAuditLogs() {
      return state.auditLogs;
    },

    hydrate,

    async flush() {
      try {
        await persistQueue;
      } catch (error) {
        persistQueue = Promise.resolve();
        throw error;
      }
    }
  };
}

module.exports = {
  createPersistenceStore
};
