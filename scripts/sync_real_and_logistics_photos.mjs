import { openDatabase } from '../server/db.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const REAL_PROPERTIES_PLAYERS = [
  'real-properties-biruk-t',
  'real-properties-harun-k',
  'real-properties-samson-a',
  'real-properties-mintesinot-m',
  'real-properties-biniyam-e',
  'real-properties-abraham-e',
  'real-properties-tomas-b',
  'real-properties-abdurahim-h',
  'real-properties-nahom-c',
  'real-properties-firaol-a',
  'real-properties-abubeker-n',
  'real-properties-eskender-f',
  'real-properties-biniyam-m',
  'real-properties-natnael-e',
  'real-properties-yonatan-a',
];

const LOGISTICS_PLAYERS = [
  'logistics-ermias-a',
  'logistics-dikeya-i',
  'logistics-yohannes-a',
  'logistics-adil-j',
  'logistics-mikiyas-d',
  'logistics-yohannes-h',
  'logistics-mekasha-b',
  'logistics-mahir-a',
  'logistics-efrata-d',
  'logistics-kidus-m',
  'logistics-abdurezak',
  'logistics-salim-a',
  'logistics-abdurahman-s',
  'logistics-zelalem-l',
  'logistics-mikiyas-y',
  'logistics-tewodros-m',
  'logistics-biruk-g',
  'logistics-daniel',
  'logistics-abel-m',
  'logistics-yabsira-a',
  'logistics-nuredin-a',
];

async function updateDb(db, label) {
  console.log(`\nUpdating ${label}...`);
  
  // Real Properties
  for (const playerId of REAL_PROPERTIES_PLAYERS) {
    const filename = `${playerId}.jpg`;
    const photoUrl = `/uploads/players/real-properties/${filename}`;
    const filePath = join(process.cwd(), 'public', 'uploads', 'players', 'real-properties', filename);
    
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
      console.log(`  [real-properties] Updated ${playerId} -> ${photoUrl}`);
    } else {
      console.warn(`  [real-properties] Missing processed photo for ${playerId}`);
    }
  }
  
  // Logistics
  for (const playerId of LOGISTICS_PLAYERS) {
    const filename = `${playerId}.jpg`;
    const photoUrl = `/uploads/players/logistics/${filename}`;
    const filePath = join(process.cwd(), 'public', 'uploads', 'players', 'logistics', filename);
    
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
      console.log(`  [logistics] Updated ${playerId} -> ${photoUrl}`);
    } else {
      console.warn(`  [logistics] Missing processed photo for ${playerId}`);
    }
  }
}

async function main() {
  // 1. Update Main DB (Supabase / configured)
  try {
    const mainDb = await openDatabase();
    await updateDb(mainDb, 'Main DB (DATABASE_URL / configured)');
  } catch (err) {
    console.error('Error updating main DB:', err);
  }

  // 2. Update Local SQLite (data/supercup.db)
  const localDbPath = join(process.cwd(), 'data', 'supercup.db');
  if (existsSync(localDbPath)) {
    try {
      const localDb = new DatabaseSync(localDbPath);
      await updateDb(localDb, 'Local SQLite (data/supercup.db)');
    } catch (err) {
      console.error('Error updating local SQLite:', err);
    }
  }

  console.log('\nAll databases synced for Real Property and Logistics!');
  process.exit(0);
}

main().catch(console.error);

