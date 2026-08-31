const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const migrationsDir = path.join(root, 'db', 'migrations');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[db-migrate] DATABASE_URL is required.');
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  console.error('[db-migrate] migrations directory not found.');
  process.exit(1);
}

const files = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('[db-migrate] No migration files found.');
  process.exit(0);
}

for (const file of files) {
  const migrationPath = path.join(migrationsDir, file);
  console.log(`[db-migrate] Applying ${file}`);
  const result = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', migrationPath], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('[db-migrate] Migrations applied successfully.');
