import { openDatabase } from '../server/db.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const BIO_STATISTICS_PLAYERS = [
  'bio-statistics-ali-d',
  'bio-statistics-changkouth-y',
  'bio-statistics-dagim-s',
  'bio-statistics-kejela-g',
  'bio-statistics-kedir-y',
  'bio-statistics-naol-e',
  'bio-statistics-ngom-t',
  'bio-statistics-saladin-a',
  'bio-statistics-shumi-t',
  'bio-statistics-tadese-d',
  'bio-statistics-taxin-w',
  'bio-statistics-tomas-a',
];

const IT_PLAYERS = [
  'information-technology-wako-j',
  'information-technology-adem-k',
  'information-technology-atinabon-b',
  'information-technology-nadri-s',
  'information-technology-simion-s',
  'information-technology-firaol-m',
  'information-technology-abokor-o',
  'information-technology-alemayehu-t',
  'information-technology-mihiretu-s',
  'information-technology-kibrom-z',
  'information-technology-lemessa-w',
  'information-technology-hamse-i',
  'information-technology-shafi-m',
  'information-technology-lukman-m',
  'information-technology-muscab-a',
  'information-technology-bereket-s',
];

async function updateDb(db, label) {
  console.log(`\nUpdating ${label}...`);
  
  // 1. Bio-Statistics
  for (const playerId of BIO_STATISTICS_PLAYERS) {
    const filename = `${playerId}.jpg`;
    const photoUrl = `/uploads/players/bio-statistics/${filename}`;
    const filePath = join(process.cwd(), 'public', 'uploads', 'players', 'bio-statistics', filename);
    
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
      console.log(`  [bio-statistics] Updated ${playerId} -> ${photoUrl}`);
    } else {
      console.warn(`  [bio-statistics] Missing processed photo for ${playerId}`);
    }
  }
  
  // 2. Information Technology
  for (const playerId of IT_PLAYERS) {
    const filename = `${playerId}.jpg`;
    const photoUrl = `/uploads/players/information-technology/${filename}`;
    const filePath = join(process.cwd(), 'public', 'uploads', 'players', 'information-technology', filename);
    
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
      console.log(`  [information-technology] Updated ${playerId} -> ${photoUrl}`);
    } else {
      console.warn(`  [information-technology] Missing processed photo for ${playerId}`);
    }
  }

  // Coach photo if present
  const coachPath = join(process.cwd(), 'public', 'uploads', 'players', 'information-technology', 'coach-yabkal.jpg');
  if (existsSync(coachPath)) {
    const coachBytes = readFileSync(coachPath);
    try {
      db.prepare(`
        INSERT INTO media (id, content_type, bytes) VALUES (?, 'image/jpeg', ?)
        ON CONFLICT(id) DO UPDATE SET content_type = 'image/jpeg', bytes = excluded.bytes
      `).run('teams/information-technology-coach', coachBytes);
    } catch {}
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

  console.log('\nAll databases synced for Bio-Statistics and Information Technology!');
  process.exit(0);
}

main().catch(console.error);

