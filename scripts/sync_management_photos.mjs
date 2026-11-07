import { openDatabase } from '../server/db.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MANAGEMENT_PLAYERS = [
  'management-solomon-e',
  'management-tedi-t',
  'management-kirubel-w',
  'management-abdurezak-s',
  'management-tamirat-k',
  'management-abubeker-k',
  'management-ambaye-a',
  'management-asimamaw-a',
  'management-arefat-e',
  'management-bemnet-g',
  'management-abel-w',
  'management-natnael-z',
  'management-ismael-a',
  'management-asnake-a-babi',
  'management-amanuel-d',
  'management-henok-a',
  'management-amar-a',
];

async function updateDb(db, label) {
  console.log(`\nUpdating ${label}...`);
  
  for (const playerId of MANAGEMENT_PLAYERS) {
    const filename = `${playerId}.jpg`;
    const photoUrl = `/uploads/players/management/${filename}`;
    const filePath = join(process.cwd(), 'public', 'uploads', 'players', 'management', filename);
    
    if (existsSync(filePath)) {
      const bytes = readFileSync(filePath);
      db.prepare(`UPDATE players SET photo_url = ? WHERE id = ?`).run(photoUrl, playerId);
      try {
        db.prepare(`
          INSERT INTO media (id, content_type, bytes) VALUES (?, 'image/jpeg', ?)
          ON CONFLICT(id) DO UPDATE SET content_type = 'image/jpeg', bytes = excluded.bytes
        `).run(`players/${playerId}`, bytes);
      } catch (err) {
        console.warn(`Media table warning for ${playerId}:`, err.message);
      }
      console.log(`  [management] Updated ${playerId} -> ${photoUrl}`);
    } else {
      console.warn(`  [management] Missing processed photo for ${playerId}`);
    }
  }
}

async function main() {
  // 1. Update configured main database (Supabase PostgreSQL in prod/dev)
  try {
    const mainDb = await openDatabase();
    await updateDb(mainDb, 'Main DB (DATABASE_URL / configured)');
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

  console.log('\nAll databases synced for Management!');
}

main().catch(console.error);

