import { openDatabaseAsync } from '../server/db.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

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

async function updateDb(db, label) {
  console.log(`\nUpdating ${label}...`);
  let count = 0;

  for (const { team, id, file } of SQUAD_PLAYERS) {
    const photoUrl = `/uploads/players/${team}/${file}`;
    const filePath = join(process.cwd(), 'public', 'uploads', 'players', team, file);

    if (existsSync(filePath)) {
      const bytes = readFileSync(filePath);
      db.prepare(`UPDATE players SET photo_url = ? WHERE id = ?`).run(photoUrl, id);
      try {
        db.prepare(`
          INSERT INTO media (id, content_type, bytes) VALUES (?, 'image/jpeg', ?)
          ON CONFLICT(id) DO UPDATE SET content_type = 'image/jpeg', bytes = excluded.bytes
        `).run(`players/${id}`, bytes);
      } catch (err) {
        console.warn(`Media table warning for ${id}:`, err.message);
      }
      console.log(`  [${team}] Synced ${id} -> ${photoUrl}`);
      count++;
    } else {
      console.warn(`  [${team}] Missing photo file: ${filePath}`);
    }
  }
  console.log(`Synced ${count}/${SQUAD_PLAYERS.length} players in ${label}`);
}

async function main() {
  // 1. Update configured main database (Supabase PostgreSQL in prod/dev)
  try {
    const mainDb = await openDatabaseAsync();
    await updateDb(mainDb, 'Main DB (DATABASE_URL / Supabase PostgreSQL)');
  } catch (err) {
    console.error('Error updating main DB:', err);
  }

  // 2. Update local SQLite DB if present
  const localDbPath = join(process.cwd(), 'data', 'supercup.db');
  if (existsSync(localDbPath)) {
    try {
      const localDb = new DatabaseSync(localDbPath);
      await updateDb(localDb, 'Local SQLite (data/supercup.db)');
      localDb.close();
    } catch (err) {
      console.error('Error updating local SQLite:', err);
    }
  }

  console.log('\nAll databases synced successfully!');
}

main().catch(console.error);

