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

const stagedDir = path.join(
  'C:', 'Users', 'HP', '.gemini', 'antigravity', 'brain',
  '02b3538e-9707-4de9-9348-57aabb8637d3', 'test_journalism_final'
);
const destDir = path.join(root, 'public', 'uploads', 'players', 'journalism-sosa');
const rawBackup = path.join(destDir, 'raw');
fs.mkdirSync(rawBackup, { recursive: true });

const playerMapping = [
  { id: 'journalism-sosa-nesredin', src: 'nesredin.jpg', target: 'journalism-sosa-nesredin.jpg' },
  { id: 'journalism-sosa-mukerem-a', src: 'mukerem.jpg', target: 'journalism-sosa-mukerem-a.jpg' },
  { id: 'journalism-sosa-lim', src: 'Lim.jpg', target: 'journalism-sosa-lim.jpg' },
  { id: 'journalism-sosa-daniel-a', src: 'daniel.jpg', target: 'journalism-sosa-daniel-a.jpg' },
  { id: 'journalism-sosa-habtemariam-n', src: 'habte.jpg', target: 'journalism-sosa-habtemariam-n.jpg' },
  { id: 'journalism-sosa-lautaro', src: 'lutaro.jpg', target: 'journalism-sosa-lautaro.jpg' },
  { id: 'journalism-sosa-henok-f', src: 'henok.jpg', target: 'journalism-sosa-henok-f.jpg' },
  { id: 'journalism-sosa-yeabkal-e', src: 'yeabkal.jpg', target: 'journalism-sosa-yeabkal-e.jpg' },
  { id: 'journalism-sosa-jaldo', src: 'jaldo.jpg', target: 'journalism-sosa-jaldo.jpg' },
  { id: 'journalism-sosa-moges-y', src: 'moges.jpg', target: 'journalism-sosa-moges-y.jpg' },
  { id: 'journalism-sosa-sadam', src: 'sadam.jpg', target: 'journalism-sosa-sadam.jpg' },
  { id: 'journalism-sosa-tamora', src: 'tamora.jpg', target: 'journalism-sosa-tamora.jpg' },
];

async function run() {
  console.log('--- 1. Backing up raw originals and deploying clean 512x512 portraits ---');

  const rawFiles = fs.readdirSync(destDir).filter((f) => f.toLowerCase().endsWith('.jpg'));
  for (const f of rawFiles) {
    const srcRaw = path.join(destDir, f);
    const destRaw = path.join(rawBackup, f);
    if (!fs.existsSync(destRaw)) {
      fs.copyFileSync(srcRaw, destRaw);
      console.log(`Backed up to raw: ${f}`);
    }
  }

  // Copy clean portraits with original basenames
  const stagedFiles = fs.readdirSync(stagedDir).filter((f) => f.toLowerCase().endsWith('.jpg'));
  for (const f of stagedFiles) {
    const srcPath = path.join(stagedDir, f);
    const destPath = path.join(destDir, f);
    fs.copyFileSync(srcPath, destPath);

    // Also lowercase if different
    const lower = f.toLowerCase();
    if (lower !== f) {
      fs.copyFileSync(srcPath, path.join(destDir, lower));
    }
  }

  // Copy with standard target names
  for (const item of playerMapping) {
    const srcPath = path.join(stagedDir, item.src);
    const destPath = path.join(destDir, item.target);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Deployed: ${item.src} -> ${item.target}`);
  }

  // Coach Abrham
  const coachTarget = 'journalism-sosa-coach-abrham.jpg';
  const coachSrc = path.join(stagedDir, 'abrham.jpg');
  fs.copyFileSync(coachSrc, path.join(destDir, coachTarget));
  fs.copyFileSync(coachSrc, path.join(destDir, 'journalism-sosa-abrham.jpg'));
  console.log(`Deployed coach: abrham.jpg -> ${coachTarget}`);

  console.log('--- 2. Updating Supabase PostgreSQL ---');
  for (const item of playerMapping) {
    const photoUrl = `/uploads/players/journalism-sosa/${item.target}`;
    const mediaId = `players/${item.id}`;
    const buffer = fs.readFileSync(path.join(destDir, item.target));

    await pool.query(
      `INSERT INTO media (id, content_type, bytes)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes`,
      [mediaId, 'image/jpeg', buffer]
    );

    const res = await pool.query(
      `UPDATE players SET photo_url = $1 WHERE id = $2`,
      [photoUrl, item.id]
    );
    console.log(`Postgres: Updated ${item.id} -> ${photoUrl} (rows: ${res.rowCount})`);
  }

  // Coach in Postgres
  const coachPhotoUrl = `/uploads/players/journalism-sosa/${coachTarget}`;
  const coachBuf = fs.readFileSync(path.join(destDir, coachTarget));
  await pool.query(
    `INSERT INTO media (id, content_type, bytes)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes`,
    ['coaches/journalism-sosa', 'image/jpeg', coachBuf]
  );
  await pool.query(
    `INSERT INTO media (id, content_type, bytes)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes`,
    ['teams/journalism-sosa-coach', 'image/jpeg', coachBuf]
  );
  await pool.query(
    `UPDATE teams SET coach = $1, coach_photo_url = $2 WHERE id = $3`,
    ['Abrham', coachPhotoUrl, 'journalism-sosa']
  );
  console.log(`Postgres: Updated coach -> Abrham, ${coachPhotoUrl}`);

  console.log('--- 3. Syncing SQLite local database ---');
  // Copy all 18 players from Postgres to SQLite if not present
  const allPostgresPlayers = await pool.query(
    `SELECT * FROM players WHERE team_id = 'journalism-sosa'`
  );
  const insertSqlitePlayer = sqliteDb.prepare(`
    INSERT INTO players (id, team_id, name, position, number, nationality, registered, active, photo_url, is_captain)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      team_id = excluded.team_id,
      name = excluded.name,
      position = excluded.position,
      number = excluded.number,
      nationality = excluded.nationality,
      registered = excluded.registered,
      active = excluded.active,
      photo_url = excluded.photo_url,
      is_captain = excluded.is_captain
  `);
  const insertSqliteMedia = sqliteDb.prepare(`
    INSERT INTO media (id, content_type, bytes)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes
  `);

  for (const p of allPostgresPlayers.rows) {
    insertSqlitePlayer.run(
      p.id,
      p.team_id,
      p.name,
      p.position,
      p.number,
      p.nationality || 'Ethiopian',
      p.registered ?? 1,
      p.active ?? 1,
      p.photo_url || '',
      p.is_captain ? 1 : 0
    );
  }

  for (const item of playerMapping) {
    const mediaId = `players/${item.id}`;
    const buffer = fs.readFileSync(path.join(destDir, item.target));
    insertSqliteMedia.run(mediaId, 'image/jpeg', buffer);
  }
  insertSqliteMedia.run('coaches/journalism-sosa', 'image/jpeg', coachBuf);
  insertSqliteMedia.run('teams/journalism-sosa-coach', 'image/jpeg', coachBuf);

  sqliteDb.prepare(
    `UPDATE teams SET coach = ?, coach_photo_url = ? WHERE id = ?`
  ).run('Abrham', coachPhotoUrl, 'journalism-sosa');

  console.log('--- All sync steps finished successfully! ---');
}

run().then(async () => {
  await pool.end();
  process.exit(0);
}).catch(async (err) => {
  console.error('Error during sync:', err);
  await pool.end();
  process.exit(1);
});
