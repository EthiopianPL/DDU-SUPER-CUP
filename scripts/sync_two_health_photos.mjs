import { openDatabase } from '../server/db.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PLAYERS = [
  'health-eliyas-t',
  'health-tilahun-a',
];

async function updateDb(db, label) {
  console.log(`\nUpdating ${label}...`);
  for (const playerId of PLAYERS) {
    const filename = `${playerId}.jpg`;
    const photoUrl = `/uploads/players/health/${filename}`;
    const filePath = join(process.cwd(), 'public', 'uploads', 'players', 'health', filename);
    
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
      console.log(`  Updated ${playerId} -> ${photoUrl}`);
    } else {
      console.warn(`  Missing processed photo for ${playerId}`);
    }
  }
}

async function main() {
  // 1. Update Main DB
  try {
    const mainDb = await openDatabase();
    await updateDb(mainDb, 'Main DB (DATABASE_URL / configured)');
  } catch (err) {
    console.error('Error updating main DB:', err);
  }

  // 2. Update Local SQLite
  const localDbPath = join(process.cwd(), 'data', 'supercup.db');
  if (existsSync(localDbPath)) {
    try {
      const localDb = new DatabaseSync(localDbPath);
      await updateDb(localDb, 'Local SQLite (data/supercup.db)');
    } catch (err) {
      console.error('Error updating local SQLite:', err);
    }
  }

  console.log('\nBoth players synced to databases!');
  process.exit(0);
}

main().catch(console.error);

