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

const cotmPlayers = [
  { id: 'cotm-dawud-s', photoFile: 'Dawa.jpg', targetName: 'cotm-dawud-s.jpg' },
  { id: 'cotm-biniyam-n', photoFile: 'BIniyam.jpg', targetName: 'cotm-biniyam-n.jpg' },
  { id: 'cotm-ermiyas-k', photoFile: 'Ermiyas.jpg', targetName: 'cotm-ermiyas-k.jpg' },
  { id: 'cotm-kidus-z', photoFile: 'Kidus.jpg', targetName: 'cotm-kidus-z.jpg' },
  { id: 'cotm-dawit-a-chelse', photoFile: 'Chelsie.jpg', targetName: 'cotm-dawit-a-chelse.jpg' },
  { id: 'cotm-melkamu-m-buchi', photoFile: 'Buchi.jpg', targetName: 'cotm-melkamu-m-buchi.jpg' },
  { id: 'cotm-besufikad-s', photoFile: 'Besu.jpg', targetName: 'cotm-besufikad-s.jpg' },
  { id: 'cotm-samuel-d', photoFile: 'Sami.jpg', targetName: 'cotm-samuel-d.jpg' },
  { id: 'cotm-kassaye-w', photoFile: 'Kase.jpg', targetName: 'cotm-kassaye-w.jpg' },
  { id: 'cotm-yishak-h', photoFile: 'yuya.jpg', targetName: 'cotm-yishak-h.jpg' },
  { id: 'cotm-firaol', photoFile: 'Pedri.jpg', targetName: 'cotm-firaol.jpg' },
  { id: 'cotm-ephrem-g', photoFile: 'Ephrem.jpg', targetName: 'cotm-ephrem-g.jpg' },
];

const lawecoPlayers = [
  { id: 'law-economics-abeni', photoFile: 'abeni.jpg', targetName: 'law-economics-abeni.jpg' },
  { id: 'law-economics-ashe-t', photoFile: 'ashe.jpg', targetName: 'law-economics-ashe-t.jpg' },
  { id: 'law-economics-bati', photoFile: 'bati.jpg', targetName: 'law-economics-bati.jpg' },
  { id: 'law-economics-ezra', photoFile: 'ezra.jpg', targetName: 'law-economics-ezra.jpg' },
  { id: 'law-economics-haymu-hk', photoFile: 'haymu.jpg', targetName: 'law-economics-haymu-hk.jpg' },
  { id: 'law-economics-kaleb', photoFile: 'kaleb.jpg', targetName: 'law-economics-kaleb.jpg' },
  { id: 'law-economics-kenean', photoFile: 'kenan.jpg', targetName: 'law-economics-kenean.jpg' },
  { id: 'law-economics-mohammed-a', photoFile: 'mohammed.jpg', targetName: 'law-economics-mohammed-a.jpg' },
  { id: 'law-economics-muktar-a', photoFile: 'muktar.jpg', targetName: 'law-economics-muktar-a.jpg' },
  { id: 'law-economics-mulugeta-f', photoFile: 'mulugeta.jpg', targetName: 'law-economics-mulugeta-f.jpg' },
  { id: 'law-economics-musa', photoFile: 'musa.jpg', targetName: 'law-economics-musa.jpg' },
  { id: 'law-economics-nhatty', photoFile: 'nhatty.jpg', targetName: 'law-economics-nhatty.jpg' },
  { id: 'law-economics-tadele', photoFile: 'tadele.jpg', targetName: 'law-economics-tadele.jpg' },
  { id: 'law-economics-teshe-y', photoFile: 'teshe.jpg', targetName: 'law-economics-teshe-y.jpg' },
  { id: 'law-economics-yoal-kim', photoFile: 'yoal kim.jpg', targetName: 'law-economics-yoal-kim.jpg' },
];

async function syncAll() {
  console.log('--- 1. Generating exact target filenames in public/uploads ---');

  const cotmDir = path.join(root, 'public', 'uploads', 'players', 'cotm');
  for (const item of cotmPlayers) {
    const src = path.join(cotmDir, item.photoFile);
    const dest = path.join(cotmDir, item.targetName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`COTM: Copied ${item.photoFile} -> ${item.targetName}`);
    } else {
      console.warn(`Source not found: ${src}`);
    }
  }

  const lawecoDir = path.join(root, 'public', 'uploads', 'players', 'law-economics');
  for (const item of lawecoPlayers) {
    const src = path.join(lawecoDir, item.photoFile);
    const dest = path.join(lawecoDir, item.targetName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Law-Eco: Copied ${item.photoFile} -> ${item.targetName}`);
    } else {
      console.warn(`Source not found: ${src}`);
    }
  }

  console.log('--- 2. Updating Supabase PostgreSQL ---');
  // COTM players
  for (const item of cotmPlayers) {
    const photoUrl = `/uploads/players/cotm/${item.targetName}`;
    const mediaId = `players/${item.id}`;
    const filePath = path.join(cotmDir, item.targetName);
    const buffer = fs.readFileSync(filePath);

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
    console.log(`Postgres COTM: Updated ${item.id} -> ${photoUrl} (rows: ${res.rowCount})`);
  }

  // Law & Economics players
  for (const item of lawecoPlayers) {
    const photoUrl = `/uploads/players/law-economics/${item.targetName}`;
    const mediaId = `players/${item.id}`;
    const filePath = path.join(lawecoDir, item.targetName);
    const buffer = fs.readFileSync(filePath);

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
    console.log(`Postgres Law-Eco: Updated ${item.id} -> ${photoUrl} (rows: ${res.rowCount})`);
  }

  // Coach Nahom for Law-Economics
  const nahomPhoto = '/uploads/players/law-economics/law-economics-nahom.jpg';
  const nahomPath = path.join(lawecoDir, 'nahom.jpg');
  if (fs.existsSync(nahomPath)) {
    const nahomBuf = fs.readFileSync(nahomPath);
    await pool.query(
      `INSERT INTO media (id, content_type, bytes)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes`,
      ['coaches/law-economics', 'image/jpeg', nahomBuf]
    );
    await pool.query(
      `UPDATE teams SET coach_photo_url = $1 WHERE id = $2`,
      [nahomPhoto, 'law-economics']
    );
    console.log(`Postgres Law-Eco: Updated coach_photo_url -> ${nahomPhoto}`);
  }

  console.log('--- 3. Updating SQLite local database ---');
  // Sync to SQLite with matching IDs
  const sqliteInsertMedia = sqliteDb.prepare(`
    INSERT INTO media (id, content_type, bytes)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes
  `);
  const sqliteUpdatePlayer = sqliteDb.prepare(`
    UPDATE players SET photo_url = ? WHERE id = ?
  `);

  for (const item of cotmPlayers) {
    const photoUrl = `/uploads/players/cotm/${item.targetName}`;
    const mediaId = `players/${item.id}`;
    const filePath = path.join(cotmDir, item.targetName);
    const buffer = fs.readFileSync(filePath);
    sqliteInsertMedia.run(mediaId, 'image/jpeg', buffer);
    sqliteUpdatePlayer.run(photoUrl, item.id);
  }

  for (const item of lawecoPlayers) {
    const photoUrl = `/uploads/players/law-economics/${item.targetName}`;
    const mediaId = `players/${item.id}`;
    const filePath = path.join(lawecoDir, item.targetName);
    const buffer = fs.readFileSync(filePath);
    sqliteInsertMedia.run(mediaId, 'image/jpeg', buffer);
    sqliteUpdatePlayer.run(photoUrl, item.id);
  }

  sqliteDb.prepare(`UPDATE teams SET coach_photo_url = ? WHERE id = ?`).run(nahomPhoto, 'law-economics');

  console.log('All sync operations finished successfully!');
}

syncAll().then(async () => {
  await pool.end();
  process.exit(0);
}).catch(async (err) => {
  console.error('Sync failed:', err);
  await pool.end();
  process.exit(1);
});
