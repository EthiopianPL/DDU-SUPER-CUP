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
  '02b3538e-9707-4de9-9348-57aabb8637d3', 'test_survey_harmonized'
);
const destDir = path.join(root, 'public', 'uploads', 'players', 'survey');
const rawBackup = path.join(destDir, 'raw');
fs.mkdirSync(rawBackup, { recursive: true });

const playerMapping = [
  { id: 'survey-j', src: 'J@@.jpg', target: 'survey-j.jpg' },
  { id: 'survey-isro', src: 'Isro.jpg', target: 'survey-isro.jpg' },
  { id: 'survey-gamme-m', src: 'Gamme.jpg', target: 'survey-gamme-m.jpg' },
  { id: 'survey-kamil', src: 'Kemil.jpg', target: 'survey-kamil.jpg' },
  { id: 'survey-dagim', src: 'Dagim.jpg', target: 'survey-dagim.jpg' },
  { id: 'survey-g-beki', src: 'G.beki.jpg', target: 'survey-g-beki.jpg' },
  { id: 'survey-samuel', src: 'Samuel.jpg', target: 'survey-samuel.jpg' },
  { id: 'survey-aman', src: 'Aman.jpg', target: 'survey-aman.jpg' },
  { id: 'survey-m-phone', src: 'miphone.jpg', target: 'survey-m-phone.jpg' },
  { id: 'survey-ar-fti-m', src: 'araft.jpg', target: 'survey-ar-fti-m.jpg' },
  { id: 'survey-m-abene-r', src: 'M.abene.jpg', target: 'survey-m-abene-r.jpg' },
  { id: 'survey-bulti', src: 'Bulti.jpg', target: 'survey-bulti.jpg' },
  { id: 'survey-d-pogba', src: 'D.pgba.jpg', target: 'survey-d-pogba.jpg' },
  { id: 'survey-bema-cr', src: 'Bema.jpg', target: 'survey-bema-cr.jpg' },
  { id: 'survey-manu-l', src: 'Emanuel.jpg', target: 'survey-manu-l.jpg' },
];

async function run() {
  console.log('--- 1. Backing up raw originals and deploying clean 512x512 portraits ---');

  // Copy raw originals to raw/ if not already backed up
  const rawFiles = fs.readdirSync(destDir).filter((f) => f.toLowerCase().endsWith('.jpg') && f !== 'raw');
  for (const f of rawFiles) {
    const srcRaw = path.join(destDir, f);
    const destRaw = path.join(rawBackup, f);
    if (!fs.existsSync(destRaw)) {
      fs.copyFileSync(srcRaw, destRaw);
      console.log(`Backed up to raw: ${f}`);
    }
  }

  // Copy clean portraits with original basenames and lowercase
  const stagedFiles = fs.readdirSync(stagedDir).filter((f) => f.toLowerCase().endsWith('.jpg'));
  for (const f of stagedFiles) {
    const srcPath = path.join(stagedDir, f);
    const destPath = path.join(destDir, f);
    fs.copyFileSync(srcPath, destPath);

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

  // Coach Sami
  const coachTarget = 'survey-coach-sami.jpg';
  const coachSrc = path.join(stagedDir, 'Coach sami.jpg');
  fs.copyFileSync(coachSrc, path.join(destDir, coachTarget));
  fs.copyFileSync(coachSrc, path.join(destDir, 'coach-sami.jpg'));
  fs.copyFileSync(coachSrc, path.join(destDir, 'sami.jpg'));
  console.log(`Deployed coach: Coach sami.jpg -> ${coachTarget}`);

  console.log('--- 2. Updating Supabase PostgreSQL ---');
  for (const item of playerMapping) {
    const photoUrl = `/uploads/players/survey/${item.target}`;
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
    console.log(`Postgres: Updated player ${item.id} -> ${photoUrl} (rows: ${res.rowCount})`);
  }

  // Coach in Postgres
  const coachPhotoUrl = `/uploads/players/survey/${coachTarget}`;
  const coachBuf = fs.readFileSync(path.join(destDir, coachTarget));
  await pool.query(
    `INSERT INTO media (id, content_type, bytes)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes`,
    ['coaches/survey', 'image/jpeg', coachBuf]
  );
  await pool.query(
    `INSERT INTO media (id, content_type, bytes)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes`,
    ['teams/survey-coach', 'image/jpeg', coachBuf]
  );
  await pool.query(
    `INSERT INTO media (id, content_type, bytes)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes`,
    ['teams/survey/coach', 'image/jpeg', coachBuf]
  );
  await pool.query(
    `UPDATE teams SET coach = $1, coach_photo_url = $2 WHERE id = $3`,
    ['Sami T.', coachPhotoUrl, 'survey']
  );
  console.log(`Postgres: Updated coach -> Sami T., ${coachPhotoUrl}`);

  console.log('--- 3. Syncing SQLite local database ---');
  // Copy all survey players from Postgres to SQLite if not present
  const allPostgresPlayers = await pool.query(
    `SELECT * FROM players WHERE team_id = 'survey'`
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
  insertSqliteMedia.run('coaches/survey', 'image/jpeg', coachBuf);
  insertSqliteMedia.run('teams/survey-coach', 'image/jpeg', coachBuf);
  insertSqliteMedia.run('teams/survey/coach', 'image/jpeg', coachBuf);

  sqliteDb.prepare(
    `UPDATE teams SET coach = ?, coach_photo_url = ? WHERE id = ?`
  ).run('Sami T.', coachPhotoUrl, 'survey');

  console.log('--- 4. Verification queries ---');
  const verifyPg = await pool.query(
    `SELECT id, name, number, photo_url FROM players WHERE team_id = 'survey' AND photo_url != '' ORDER BY number`
  );
  console.log(`Postgres has ${verifyPg.rows.length} updated survey players with photos:`);
  console.table(verifyPg.rows);

  const verifySqlite = sqliteDb.prepare(
    `SELECT id, name, number, photo_url FROM players WHERE team_id = 'survey' AND photo_url != '' ORDER BY number`
  ).all();
  console.log(`SQLite has ${verifySqlite.length} updated survey players with photos:`);
  console.table(verifySqlite);

  const verifyCoachPg = await pool.query(`SELECT id, name, coach, coach_photo_url FROM teams WHERE id = 'survey'`);
  console.log('Postgres Coach:');
  console.table(verifyCoachPg.rows);

  const verifyCoachSqlite = sqliteDb.prepare(`SELECT id, name, coach, coach_photo_url FROM teams WHERE id = 'survey'`).all();
  console.log('SQLite Coach:');
  console.table(verifyCoachSqlite);

  await pool.end();
}

run().catch((err) => {
  console.error('Survey sync failed:', err);
  process.exit(1);
});
