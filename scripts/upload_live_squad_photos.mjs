import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SQUAD_PLAYERS = [
  // Electrical Engineering
  { team: 'electrical-engineering', id: 'electrical-engineering-chala-e', file: 'electrical-engineering-chala-e.jpg' },

  // Marketing
  { team: 'marketing', id: 'marketing-abel-t', file: 'marketing-abel-t.jpg' },
  { team: 'marketing', id: 'marketing-robel-k', file: 'marketing-robel-k.jpg' },
  { team: 'marketing', id: 'marketing-yosef-l', file: 'marketing-yosef-l.jpg' },

  // Industrial & Mechanical
  { team: 'industrial-mechanical', id: 'industrial-mechanical-abdisemed-a', file: 'industrial-mechanical-abdisemed-a.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-bereket-e', file: 'industrial-mechanical-bereket-e.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-biruk-z', file: 'industrial-mechanical-biruk-z.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-demelash-t', file: 'industrial-mechanical-demelash-t.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-eyob-b', file: 'industrial-mechanical-eyob-b.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-eyuel-m', file: 'industrial-mechanical-eyuel-m.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-girmachew-z', file: 'industrial-mechanical-girmachew-z.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-henry-h', file: 'industrial-mechanical-henry-h.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-kidus-e', file: 'industrial-mechanical-kidus-e.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-mikael-t', file: 'industrial-mechanical-mikael-t.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-mikas-t', file: 'industrial-mechanical-mikas-t.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-nahom-g', file: 'industrial-mechanical-nahom-g.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-natnael-a', file: 'industrial-mechanical-natnael-a.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-natnael-h', file: 'industrial-mechanical-natnael-h.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-natnael-t', file: 'industrial-mechanical-natnael-t.jpg' },
  { team: 'industrial-mechanical', id: 'industrial-mechanical-yegile-g', file: 'industrial-mechanical-yegile-g.jpg' },
];

async function main() {
  const base = 'https://ddu-super-cup-2lmf.vercel.app';

  // 1. Log in as super_admin
  console.log('Logging in to live Vercel site...');
  const loginRes = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ddu-request': '1',
    },
    body: JSON.stringify({ username: 'devteam', password: 'supercup' }),
  });
  if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Logged in successfully!');

  // 2. Fetch current snapshot to get full player data
  console.log('Fetching live snapshot...');
  const snap = await fetch(`${base}/api/snapshot`).then(r => r.json());
  const playerMap = new Map(snap.players.map(p => [p.id, p]));

  // 3. Update each player with their image
  let updatedCount = 0;
  for (const { team, id, file } of SQUAD_PLAYERS) {
    const player = playerMap.get(id);
    if (!player) {
      console.warn(`[SKIP] Player ${id} not found in live snapshot`);
      continue;
    }

    const filePath = join(process.cwd(), 'public', 'uploads', 'players', team, file);
    if (!existsSync(filePath)) {
      console.warn(`[SKIP] File not found: ${filePath}`);
      continue;
    }

    const base64 = readFileSync(filePath).toString('base64');
    const patchRes = await fetch(`${base}/api/players/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-ddu-request': '1',
        cookie: cookie || '',
      },
      body: JSON.stringify({
        name: player.name,
        teamId: player.departmentId,
        position: player.position,
        number: player.number,
        nationality: player.nationality || 'Ethiopian',
        isCaptain: player.isCaptain,
        image: {
          contentType: 'image/jpeg',
          data: base64,
        },
      }),
    });

    if (patchRes.ok) {
      const data = await patchRes.json();
      const newUrl = data.snapshot?.players?.find(p => p.id === id)?.photoUrl;
      console.log(`[OK] Updated ${player.name} (${id}) -> ${newUrl}`);
      updatedCount++;
    } else {
      const err = await patchRes.text();
      console.error(`[FAIL] ${player.name} (${id}): ${patchRes.status} -> ${err}`);
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount}/${SQUAD_PLAYERS.length} player portraits on live site!`);
}

main().catch(console.error);
