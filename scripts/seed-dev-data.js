const fs = require('fs');
const path = require('path');

const outputPath = path.join(process.cwd(), 'apps', 'api', 'seed-data.json');

const seedData = {
  users: [],
  journalEntries: [],
  communities: [
    {
      id: 'c1',
      name: 'Returning to School',
      description: 'Support for transitions and confidence.',
      moderated: true,
      members: []
    },
    {
      id: 'c2',
      name: 'Caregiver Support',
      description: 'Resources for family and supporters.',
      moderated: true,
      members: []
    }
  ],
  events: [
    {
      id: 'e1',
      title: 'Community Circle',
      date: '2026-08-08',
      location: 'Virtual',
      format: 'Online',
      verified: true
    },
    {
      id: 'e2',
      title: 'Resource Workshop',
      date: '2026-08-12',
      location: 'Austin, TX',
      format: 'In Person',
      verified: true
    }
  ]
};

fs.writeFileSync(outputPath, `${JSON.stringify(seedData, null, 2)}\n`, 'utf8');
console.log(`[seed] Wrote ${outputPath}`);
