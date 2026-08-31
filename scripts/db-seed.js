const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const seedsDir = path.join(root, 'db', 'seeds');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[db-seed] DATABASE_URL is required.');
  process.exit(1);
}

if (!fs.existsSync(seedsDir)) {
  console.error('[db-seed] seeds directory not found.');
  process.exit(1);
}

const files = fs.readdirSync(seedsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('[db-seed] No seed files found.');
  process.exit(0);
}

for (const file of files) {
  const seedPath = path.join(seedsDir, file);
  console.log(`[db-seed] Applying ${file}`);
  const result = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', seedPath], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('[db-seed] Seed files applied successfully.');
