import { openDatabase } from '../server/db.mjs';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

async function updateDb(db, label) {
  console.log(`\n--- Updating ${label} ---`);
  const publicTeamsDir = join(process.cwd(), 'public', 'uploads', 'teams');
  const teams = db.prepare('SELECT id, name, crest_url FROM teams ORDER BY id ASC').all();

  for (const team of teams) {
    const jpgPath = join(publicTeamsDir, `${team.id}.jpg`);
    const finalCrestUrl = existsSync(jpgPath) 
      ? `/uploads/teams/${team.id}.jpg` 
      : `/uploads/teams/${team.id}.svg`;
    
    db.prepare('UPDATE teams SET crest_url = ? WHERE id = ?').run(finalCrestUrl, team.id);
    console.log(`  ${team.id} (${team.name}) -> ${finalCrestUrl}`);
  }

  // Delete all teams from media table
  try {
    db.prepare("DELETE FROM media WHERE id LIKE 'teams/%'").run();
    console.log('  Successfully dropped all teams/% rows from media table.');
  } catch (err) {
    console.warn('  Warning deleting from media:', err.message);
  }

  // Verify media count for teams
  const remaining = db.prepare("SELECT count(*) as count FROM media WHERE id LIKE 'teams/%'").get();
  console.log(`  Remaining team rows in media table: ${remaining.count}`);
}

async function main() {
  // 1. Main DB (Supabase Postgres)
  try {
    const mainDb = await openDatabase();
    await updateDb(mainDb, 'Main DB (Supabase PostgreSQL)');
  } catch (err) {
    console.error('Error on main DB:', err);
  }

  // 2. Local SQLite DB
  const localDbPath = join(process.cwd(), 'data', 'supercup.db');
  if (existsSync(localDbPath)) {
    try {
      const localDb = new DatabaseSync(localDbPath);
      await updateDb(localDb, 'Local SQLite (data/supercup.db)');
      localDb.close();
    } catch (err) {
      console.error('Error on local SQLite:', err);
    }
  }

  console.log('\nAll databases updated!');
}

main().catch(console.error);
