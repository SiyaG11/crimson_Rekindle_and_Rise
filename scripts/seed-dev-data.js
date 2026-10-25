const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const seedPath = path.join(process.cwd(), 'apps', 'api', 'seed-data.json');
const databaseUrl = process.env.DATABASE_URL;

function toDatabaseVisibility(value) {
  if (value === 'followers') return 'groups';
  if (value === 'everyone') return 'community';
  return 'private';
}

async function seedDatabase() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to purge and seed development data.');
  }

  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  if (!Array.isArray(seedData.users) || seedData.users.length !== 10) {
    throw new Error('Seed data must contain exactly 10 users.');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  const roleByAppRole = {
    survivor: 'role-survivor',
    caregiver: 'role-supporter',
    volunteer: 'role-organization'
  };

  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO roles (id, code, name) VALUES
        ('role-survivor', 'survivor', 'Survivor'),
        ('role-supporter', 'supporter', 'Supporter/Caregiver'),
        ('role-organization', 'organization', 'Organization Representative'),
        ('role-moderator', 'moderator', 'Moderator'),
        ('role-admin', 'admin', 'Platform Administrator')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    `);
    await client.query('DELETE FROM audit_logs');
    await client.query('DELETE FROM privacy_settings');
    await client.query('DELETE FROM profiles');
    await client.query('DELETE FROM user_roles');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM application_state');

    for (const user of seedData.users) {
      const privacy = user.privacySettings;
      const profile = user.profile;
      await client.query(
        'INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
        [user.id, user.email, user.password, user.displayName]
      );
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [user.id, roleByAppRole[user.role]]
      );
      await client.query(
        'INSERT INTO profiles (id, user_id, bio, photo_url, location) VALUES ($1, $2, $3, $4, $5)',
        [`profile-${user.id}`, user.id, profile.bio, profile.photoUrl, profile.location]
      );
      await client.query(
        'INSERT INTO privacy_settings (id, user_id, profile_visibility, journal_visibility, story_sharing, notification_preferences) VALUES ($1, $2, $3, $4, $5, $6::jsonb)',
        [
          `privacy-${user.id}`,
          user.id,
          toDatabaseVisibility(privacy.profileVisibility),
          toDatabaseVisibility(privacy.journalVisibility),
          toDatabaseVisibility(privacy.storySharing),
          JSON.stringify(privacy.notificationPreferences)
        ]
      );
      await client.query(
        'INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, metadata) VALUES ($1, $2, $3, $4, $5, $6::jsonb)',
        [`audit-seed-${user.id}`, user.id, 'seed.create', 'user', user.id, JSON.stringify({ source: 'development-seed' })]
      );
    }

    await client.query(
      'INSERT INTO application_state (id, data) VALUES ($1, $2::jsonb)',
      ['primary', JSON.stringify(seedData)]
    );
    await client.query('COMMIT');
    console.log(`[seed] Purged mutable data and seeded ${seedData.users.length} users from ${seedPath}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch(error => {
  console.error(`[seed] ${error.message}`);
  process.exitCode = 1;
});
