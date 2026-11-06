import { openDatabase } from '../server/db.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MAPPING = {
  'health-abdulhamid-a': 'health-abdulhamid-a.jpg',
  'health-abduselam-k': 'health-abduselam-k.jpg',
  'health-ahmed-a': 'health-ahmed-a.jpg',
  'health-amanuel-a': 'health-amanuel-a.jpg',
  'health-biniyam-w': 'health-biniyam-w.jpg',
  'health-eliyas-t': 'health-eliyas-t.jpg',
  'health-fejru-m': 'health-fejru-m.jpg',
  'health-fitsum-k': 'health-fitsum-k.jpg',
  'health-getayawkal-b': 'health-getayawkal-b.jpg',
  'health-moses-j': 'health-moses-j.jpg',
  'health-muaz-b': 'health-muaz-b.jpg',
  'health-naol-s': 'health-naol-s.jpg',
  'health-nati-s': 'health-nati-s.jpg',
  'health-samuel-t': 'health-samuel-t.jpg',
  'health-wondimagegn-g': 'health-wondimagegn-g.jpg',
  'health-wondimu-w': 'health-wondimu-w.jpg',
};

async function updateDb(db, label) {
  console.log(`\nUpdating ${label}...`);
  
  for (const [playerId, filename] of Object.entries(MAPPING)) {
    const photoUrl = `/uploads/players/health/${filename}`;
    const filePath = join(process.cwd(), 'public', 'uploads', 'players', 'health', filename);
    const bytes = readFileSync(filePath);
    
    // 1. Update players table
    db.prepare(`UPDATE players SET photo_url = ? WHERE id = ?`).run(photoUrl, playerId);
    
    // 2. Insert or replace in media table
    try {
      db.prepare(`
        INSERT INTO media (id, content_type, bytes) VALUES (?, 'image/jpeg', ?)
        ON CONFLICT(id) DO UPDATE SET content_type = 'image/jpeg', bytes = excluded.bytes
      `).run(`players/${playerId}`, bytes);
    } catch (err) {
      console.warn(`Media table update warning for ${playerId}:`, err.message);
    }
    
    console.log(`  Updated ${playerId} -> ${photoUrl}`);
  }
  
  // Players without photos -> clear broken SVG links
  for (const emptyId of ['health-abel-t', 'health-tilahun-a']) {
    db.prepare(`UPDATE players SET photo_url = '' WHERE id = ?`).run(emptyId);
    console.log(`  Cleared broken photo link for ${emptyId}`);
  }
}

async function run() {
  // 1. Main configured DB (Supabase Postgres or SQLite)
  const mainDb = openDatabase();
  await updateDb(mainDb, 'Main DB (DATABASE_URL / configured)');
  mainDb.close();

  // 2. Also update local SQLite database if file exists
  const localSqlitePath = join(process.cwd(), 'data', 'supercup.db');
  if (existsSync(localSqlitePath)) {
    try {
      const sqliteDb = new DatabaseSync(localSqlitePath);
      // Check if players table exists
      const hasTable = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='players'").get();
      if (hasTable) {
        await updateDb(sqliteDb, 'Local SQLite (data/supercup.db)');
      }
      sqliteDb.close();
    } catch (err) {
      console.warn('Could not update local SQLite:', err.message);
    }
  }

  console.log('\nAll databases updated successfully!');
}

run().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
