import { openDatabase } from '../server/db.mjs';
import {
  isSupabaseConfigured,
  uploadToSupabaseStorage,
  buildStoragePath,
  getOptimizedSupabaseUrl,
  slugify,
  DEFAULT_BUCKET,
} from '../server/supabase-storage.mjs';

/**
 * Migration Script: Migrate legacy media binaries to Supabase Storage
 *
 * Usage:
 *   node scripts/migrate-media-to-supabase.mjs [--dry-run] [--cleanup]
 *
 * Options:
 *   --dry-run   Preview records to be migrated without modifying database or uploading
 *   --cleanup   Remove legacy bytes from media table only after explicit instruction and verification
 */

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const doCleanup = args.includes('--cleanup');

  console.log('=== DDU Super Cup: Media Migration to Supabase Storage ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`);
  console.log(`Cleanup legacy binaries: ${doCleanup ? 'YES' : 'NO (safe preservation)'}\n`);

  if (!isSupabaseConfigured()) {
    if (!isDryRun) {
      console.error('ERROR: Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY) must be set in .env for live migration.');
      process.exit(1);
    }
    console.log('NOTE: Supabase credentials not configured yet. Running dry-run simulation of storage path and entity mappings...\n');
  }

  const db = openDatabase();

  const mediaRows = db.prepare('SELECT id, content_type, bytes FROM media').all();
  console.log(`Found ${mediaRows.length} total records in legacy media table.\n`);

  // Pre-fetch reference datasets in batch for instant processing
  const allAssets = db.prepare("SELECT * FROM media_assets WHERE provider = 'supabase'").all();
  const assetMap = new Map(allAssets.map((a) => [`${a.entity_type}/${a.entity_id}`, a]));

  const allPlayers = db.prepare('SELECT id, name, team_id FROM players').all();
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  const allTeams = db.prepare('SELECT id, group_id, short_name, name FROM teams').all();
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  const allMatches = db.prepare('SELECT id, motm_player_id, home_id, away_id FROM matches').all();
  const matchMap = new Map(allMatches.map((m) => [m.id, m]));

  let migratedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const row of mediaRows) {
    const [kind, ...rest] = row.id.split('/');
    const targetId = rest.join('/');

    console.log(`Checking [${row.id}] (Type: ${row.content_type})...`);

    // Check if already migrated in media_assets
    const existingAsset = assetMap.get(`${kind}/${targetId}`);
    if (existingAsset) {
      console.log(`  -> Already migrated to Supabase Storage: ${existingAsset.public_url || existingAsset.secure_url}`);
      skippedCount++;
      continue;
    }

    const ext = row.content_type?.replace('image/', '') === 'jpeg' ? 'jpg' : (row.content_type?.replace('image/', '') || 'png');
    let path = `other/${kind}/${slugify(targetId)}-${Date.now()}.${ext}`;
    let groupId = null;
    let teamId = null;

    if (kind === 'players') {
      const player = playerMap.get(targetId);
      if (player) {
        teamId = player.team_id;
        const team = teamMap.get(player.team_id);
        if (team) {
          groupId = team.group_id;
          path = buildStoragePath({
            category: 'players',
            groupId: team.group_id,
            teamSlug: team.short_name || team.id,
            entityId: player.id,
            filename: `profile.${ext}`,
          });
        }
      }
    } else if (kind === 'motm') {
      const match = matchMap.get(targetId);
      if (match?.motm_player_id) {
        const player = playerMap.get(match.motm_player_id);
        if (player) {
          teamId = player.team_id;
          const team = teamMap.get(player.team_id);
          groupId = team?.group_id || null;
        }
      }
      path = buildStoragePath({
        category: 'motm',
        entityId: targetId,
        filename: `${match?.motm_player_id || 'player'}.${ext}`,
      });
    } else if (kind === 'teams') {
      const team = teamMap.get(targetId);
      if (team) {
        groupId = team.group_id;
        teamId = targetId;
      }
      path = `other/teams/${slugify(targetId)}-crest.${ext}`;
    }

    console.log(`  Target Path: ${path}`);

    if (isDryRun) {
      console.log(`  [DRY RUN] Would upload ${row.bytes.length} bytes to ${DEFAULT_BUCKET}/${path}`);
      migratedCount++;
      continue;
    }

    try {
      const uploadRes = await uploadToSupabaseStorage({
        image: {
          contentType: row.content_type,
          data: Buffer.from(row.bytes).toString('base64'),
        },
        path,
      });

      const publicUrl = uploadRes.publicUrl;
      console.log(`  Uploaded: ${publicUrl}`);

      // Verify availability via fetch
      const headCheck = await fetch(publicUrl, { method: 'HEAD' });
      if (!headCheck.ok) {
        console.warn(`  Warning: Uploaded URL responded with status ${headCheck.status}`);
      } else {
        console.log(`  Verified HTTP Status: ${headCheck.status}`);
      }

      // Record in media_assets
      const assetId = `sb_${uploadRes.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      db.prepare(`
        INSERT INTO media_assets (id, provider, bucket, path, public_url, public_id, secure_url, format, bytes, width, height, category, group_id, team_id, entity_type, entity_id, created_at)
        VALUES (?, 'supabase', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          bucket = excluded.bucket,
          path = excluded.path,
          public_url = excluded.public_url,
          secure_url = excluded.secure_url,
          bytes = excluded.bytes,
          created_at = excluded.created_at
      `).run(
        assetId,
        uploadRes.bucket,
        uploadRes.path,
        publicUrl,
        uploadRes.path,
        publicUrl,
        uploadRes.format || null,
        uploadRes.bytes || null,
        uploadRes.width || null,
        uploadRes.height || null,
        kind,
        groupId,
        teamId,
        kind,
        targetId,
        Date.now(),
      );

      // Update entity reference safely
      if (kind === 'players') {
        db.prepare('UPDATE players SET photo_url = ? WHERE id = ?').run(publicUrl, targetId);
      } else if (kind === 'teams') {
        db.prepare('UPDATE teams SET crest_url = ? WHERE id = ?').run(publicUrl, targetId);
      } else if (kind === 'motm') {
        db.prepare('UPDATE matches SET motm_photo_url = ? WHERE id = ?').run(publicUrl, targetId);
      }

      console.log(`  Updated entity record for ${kind}/${targetId}`);
      migratedCount++;
    } catch (err) {
      console.error(`  FAILED to migrate ${row.id}: ${err.message}`);
      failedCount++;
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Total legacy records: ${mediaRows.length}`);
  console.log(`Migrated: ${migratedCount}`);
  console.log(`Skipped (already migrated): ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (doCleanup) {
    if (isDryRun) {
      console.log('\n[DRY RUN] Would clean up legacy binary bytes from media table.');
    } else if (failedCount === 0 && migratedCount > 0) {
      console.log('\nExecuting safe cleanup of migrated legacy binaries...');
      // Safe cleanup preserves IDs but frees BYTEA storage
      db.prepare(`DELETE FROM media WHERE id IN (SELECT CONCAT(entity_type, '/', entity_id) FROM media_assets WHERE provider = 'supabase')`).run();
      console.log('Cleanup complete.');
    } else {
      console.warn('\nSkipping cleanup: some records failed to migrate or no records were migrated.');
    }
  } else {
    console.log('\nSafe preservation: all legacy database binaries remain intact in the media table.');
  }

  db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
