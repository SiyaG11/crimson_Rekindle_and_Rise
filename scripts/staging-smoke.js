const targetBase = (process.env.STAGING_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

async function run() {
  const checks = [
    { path: '/health', expected: [200] },
    { path: '/health/infrastructure', expected: [200] },
    { path: '/health/ready', expected: [200, 503] },
    { path: '/health/metrics', expected: [200, 404] }
  ];

  console.log(`[staging-smoke] target=${targetBase}`);

  let failed = false;

  for (const check of checks) {
    const url = `${targetBase}${check.path}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });
      const ok = check.expected.includes(response.status);
      if (!ok) {
        failed = true;
      }
      console.log(`[staging-smoke] ${check.path} status=${response.status} expected=${check.expected.join('|')}`);
    } catch (error) {
      failed = true;
      console.error(`[staging-smoke] ${check.path} request failed: ${error.message}`);
    }
  }

  if (failed) {
    process.exitCode = 1;
    console.error('[staging-smoke] FAILED');
    return;
  }

  console.log('[staging-smoke] PASSED');
}

run();
