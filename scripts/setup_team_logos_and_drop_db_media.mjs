import { openDatabase } from '../server/db.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MAPPINGS = [
  { id: 'accounting', source: 'Accounting.jpg', target: 'accounting.jpg' },
  { id: 'bio-statistics', source: 'Bio stat.jpg', target: 'bio-statistics.jpg' },
  { id: 'chemical-engineering', source: 'Chemical.jpg', target: 'chemical-engineering.jpg' },
  { id: 'civil-engineering', source: 'CIvil.jpg', target: 'civil-engineering.jpg' },
  { id: 'cotm', source: 'Cotm.jpg', target: 'cotm.jpg' },
  { id: 'health', source: 'health.jpg', target: 'health.jpg' },
  { id: 'industrial-mechanical', source: 'Industrial And Mechanical.jpg', target: 'industrial-mechanical.jpg' },
  { id: 'information-technology', source: 'information-technology.jfif', target: 'information-technology.jpg' },
  { id: 'journalism-sosa', source: 'Jornalism and SOSA.jfif', target: 'journalism-sosa.jpg' },
  { id: 'logistics', source: 'Logistic.jpg', target: 'logistics.jpg' },
  { id: 'management', source: 'Management.jpg', target: 'management.jpg' },
  { id: 'padm', source: 'PADM.jpg', target: 'padm.jpg' },
  { id: 'p-p-o', source: 'Psycho Political and Oromia.jpg', target: 'p-p-o.jpg' },
];

async function main() {
  const root = process.cwd();
  const publicTeamsDir = join(root, 'public', 'uploads', 'teams');
  const distTeamsDir = join(root, 'dist', 'uploads', 'teams');
  mkdirSync(publicTeamsDir, { recursive: true });
  mkdirSync(distTeamsDir, { recursive: true });

  const mainDb = await openDatabase();

  // 1. Extract electrical-engineering from DB if it exists in media
  try {
    const eeMedia = mainDb.prepare("SELECT bytes FROM media WHERE id = 'teams/electrical-engineering'").get();
    if (eeMedia?.bytes) {
      const buf = Buffer.isBuffer(eeMedia.bytes) ? eeMedia.bytes : Buffer.from(eeMedia.bytes);
      writeFileSync(join(publicTeamsDir, 'electrical-engineering.jpg'), buf);
      writeFileSync(join(distTeamsDir, 'electrical-engineering.jpg'), buf);
      console.log('Extracted electrical-engineering.jpg from DB media table.');
    }
  } catch (err) {
    console.warn('Could not extract electrical-engineering:', err.message);
  }

  // 2. Standardize all user-provided images in public/uploads/teams
  for (const item of MAPPINGS) {
    const srcPath = join(publicTeamsDir, item.source);
    const targetPath = join(publicTeamsDir, item.target);
    if (existsSync(srcPath)) {
      const bytes = readFileSync(srcPath);
      writeFileSync(targetPath, bytes);
      writeFileSync(join(distTeamsDir, item.target), bytes);
      console.log(`Standardized ${item.source} -> ${item.target}`);
      if (item.source !== item.target) {
        try { unlinkSync(srcPath); } catch {}
      }
    } else if (existsSync(targetPath)) {
      copyFileSync(targetPath, join(distTeamsDir, item.target));
      console.log(`Target already exists: ${item.target}`);
    } else {
      console.warn(`Warning: source file ${item.source} not found.`);
    }
  }

  // Also mirror all SVGs to dist
  const allPublicFiles = readdirSync(publicTeamsDir);
  for (const f of allPublicFiles) {
    const src = join(publicTeamsDir, f);
    const dst = join(distTeamsDir, f);
    if (existsSync(src)) {
      try { copyFileSync(src, dst); } catch {}
    }
  }

  // 3. Update databases: update crest_url and drop all teams/% from media
  const updateDatabase = async (db, label) => {
    console.log(`\nUpdating ${label}...`);
    const teams = db.prepare('SELECT id, crest_url FROM teams').all();
    for (const team of teams) {
      const jpgFile = `${team.id}.jpg`;
      const svgFile = `${team.id}.svg`;
      let finalCrestUrl = `/uploads/teams/${svgFile}`;
      if (existsSync(join(publicTeamsDir, jpgFile))) {
        finalCrestUrl = `/uploads/teams/${jpgFile}`;
      }
      db.prepare('UPDATE teams SET crest_url = ? WHERE id = ?').run(finalCrestUrl, team.id);
      console.log(`  Team ${team.id} crest_url -> ${finalCrestUrl}`);
    }

    // Drop all team logos from media table
    const result = db.prepare("DELETE FROM media WHERE id LIKE 'teams/%'").run();
    console.log(`  Dropped teams/% rows from media table.`);
  };

  // Update Main DB (Supabase Postgres)
  await updateDatabase(mainDb, 'Main DB (Supabase PostgreSQL)');

  // Update Local SQLite DB
  const localDbPath = join(root, 'data', 'supercup.db');
  if (existsSync(localDbPath)) {
    try {
      const localDb = new DatabaseSync(localDbPath);
      await updateDatabase(localDb, 'Local SQLite (data/supercup.db)');
      localDb.close();
    } catch (err) {
      console.error('Error updating local SQLite:', err.message);
    }
  }

  console.log('\nFinished setting up static team logos and dropping all team logos from database media!');
}

main().catch(console.error);

