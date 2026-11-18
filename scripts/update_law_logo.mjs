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

const srcLogo = path.join(root, 'public', 'uploads', 'teams', 'law-economics.jpg');
const destLogoLaw = path.join(root, 'public', 'uploads', 'teams', 'law.jpg');

// 1. Copy to law.jpg
fs.copyFileSync(srcLogo, destLogoLaw);
console.log(`Copied law-economics.jpg -> law.jpg`);

const buffer = fs.readFileSync(srcLogo);

async function run() {
  console.log('--- 1. Updating Remote Supabase PostgreSQL ---');
  // Update crest_url
  await pool.query(
    `UPDATE teams SET crest_url = $1 WHERE id = $2`,
    ['/uploads/teams/law-economics.jpg', 'law-economics']
  );
  await pool.query(
    `UPDATE teams SET crest_url = $1 WHERE id = $2`,
    ['/uploads/teams/law.jpg', 'law']
  );

  // Update media table
  for (const mediaId of ['teams/law-economics', 'teams/law']) {
    await pool.query(
      `INSERT INTO media (id, content_type, bytes)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes`,
      [mediaId, 'image/jpeg', buffer]
    );
    console.log(`Supabase media table updated for ${mediaId}`);
  }

  console.log('--- 2. Updating Local SQLite ---');
  sqliteDb.prepare(
    `UPDATE teams SET crest_url = ? WHERE id = ?`
  ).run('/uploads/teams/law-economics.jpg', 'law-economics');

  sqliteDb.prepare(
    `UPDATE teams SET crest_url = ? WHERE id = ?`
  ).run('/uploads/teams/law.jpg', 'law');

  for (const mediaId of ['teams/law-economics', 'teams/law']) {
    sqliteDb.prepare(
      `INSERT OR REPLACE INTO media (id, content_type, bytes) VALUES (?, ?, ?)`
    ).run(mediaId, 'image/jpeg', buffer);
    console.log(`SQLite media table updated for ${mediaId}`);
  }

  console.log('--- 3. Verifying updated records ---');
  // If 'law' does not exist in Postgres, upsert it from SQLite or check
  const lawRow = sqliteDb.prepare(`SELECT * FROM teams WHERE id = 'law'`).get();
  if (lawRow) {
    await pool.query(
      `INSERT INTO teams (id, name, short_name, college, group_id, color, pitch, coach, crest_url, status, coach_photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET crest_url = excluded.crest_url`,
      [
        lawRow.id,
        lawRow.name,
        lawRow.short_name,
        lawRow.college,
        lawRow.group_id,
        lawRow.color,
        lawRow.pitch,
        lawRow.coach,
        lawRow.crest_url,
        lawRow.status,
        lawRow.coach_photo_url,
      ]
    );
    console.log('Upserted law team into Postgres');
  }

  const verifyPg = await pool.query(`SELECT id, name, crest_url FROM teams WHERE id ILIKE '%law%'`);
  console.log('Postgres teams like law:');
  console.table(verifyPg.rows);

  const verifySqlite = sqliteDb.prepare(`SELECT id, name, crest_url FROM teams WHERE id IN ('law', 'law-economics')`).all();
  console.log('SQLite teams:');
  console.table(verifySqlite);

  await pool.end();
}

run().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
