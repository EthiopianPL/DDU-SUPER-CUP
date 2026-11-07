import { openDatabase } from '../server/db.mjs';

async function main() {
  const db = await openDatabase();
  const teams = db.prepare('SELECT id, name, crest_url FROM teams ORDER BY id ASC').all();
  console.log('--- TEAMS ---');
  for (const t of teams) {
    console.log(`${t.id} | ${t.name} | crest_url: ${t.crest_url}`);
  }

  const mediaTeams = db.prepare("SELECT id, content_type, length(bytes) as size FROM media WHERE id LIKE 'teams/%'").all();
  console.log('\n--- MEDIA TEAMS ---');
  console.log(`Found ${mediaTeams.length} team media rows:`);
  for (const m of mediaTeams) {
    console.log(`  ${m.id} (${m.content_type}, ${m.size} bytes)`);
  }

  try {
    const assets = db.prepare("SELECT id, entity_type, category FROM media_assets WHERE entity_type = 'teams' OR category = 'team' OR category = 'teams'").all();
    console.log(`\n--- MEDIA_ASSETS TEAMS --- (${assets.length} rows)`);
    for (const a of assets) console.log(a);
  } catch (err) {
    console.log('media_assets error:', err.message);
  }
}

main().catch(console.error);
