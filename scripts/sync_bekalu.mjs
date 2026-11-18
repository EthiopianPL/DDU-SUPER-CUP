import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = process.cwd();
const envFile = path.join(root, '.env');
const envText = fs.readFileSync(envFile, 'utf8');
const match = envText.match(/DATABASE_URL=(.+)/);
if (!match) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}
const dbUrl = match[1].trim();

const pool = new pg.Pool({ connectionString: dbUrl });
const sqliteDb = new DatabaseSync(path.join(root, 'data', 'supercup.db'));

const playerId = 'law-economics-bekalu';
const teamId = 'law-economics';
const name = 'Bekalu';
const number = 14;
const position = 'FWD';
const photoUrl = '/uploads/players/law-economics/law-economics-bekalu.jpg';
const mediaId = `players/${playerId}`;

const photoPath = path.join(root, 'public', 'uploads', 'players', 'law-economics', 'law-economics-bekalu.jpg');
const buffer = fs.readFileSync(photoPath);

async function sync() {
  console.log('--- 1. Syncing Supabase PostgreSQL ---');
  await pool.query(
    `INSERT INTO media (id, content_type, bytes)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes`,
    [mediaId, 'image/jpeg', buffer]
  );
  console.log(`Supabase media table updated for ${mediaId}`);

  const updateRes = await pool.query(
    `UPDATE players SET photo_url = $1 WHERE id = $2`,
    [photoUrl, playerId]
  );
  console.log(`Supabase players table updated (rows affected: ${updateRes.rowCount})`);

  console.log('--- 2. Syncing Local SQLite ---');
  sqliteDb.prepare(
    `INSERT OR REPLACE INTO media (id, content_type, bytes)
     VALUES (?, ?, ?)`
  ).run(mediaId, 'image/jpeg', buffer);

  sqliteDb.prepare(
    `INSERT OR REPLACE INTO players (id, team_id, name, number, position, photo_url, is_captain)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(playerId, teamId, name, number, position, photoUrl, 0);
  console.log('Local SQLite players & media updated');

  console.log('--- Verifying Supabase record ---');
  const verify = await pool.query(`SELECT id, name, number, position, photo_url FROM players WHERE id = $1`, [playerId]);
  console.table(verify.rows);

  await pool.end();
}

sync().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
