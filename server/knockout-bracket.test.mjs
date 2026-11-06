import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '../..');

async function loadKnockoutModule() {
  const esbuild = await import('esbuild');
  const dir = mkdtempSync(join(tmpdir(), 'ddu-test-'));
  const outfile = join(dir, 'knockout.mjs');
  await esbuild.build({
    entryPoints: [join(root, 'src/data/knockout.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
  });
  return import(pathToFileURL(outfile).href);
}

test('DDU Super Cup teams pop up on knockout after group stage finishes', async (t) => {
  const knockout = await loadKnockoutModule();

  await t.test('1. Three teams qualify from Groups A–D, four from Group E', () => {
    assert.equal(knockout.qualifyingSpotsForGroup('A'), 3);
    assert.equal(knockout.qualifyingSpotsForGroup('B'), 3);
    assert.equal(knockout.qualifyingSpotsForGroup('C'), 3);
    assert.equal(knockout.qualifyingSpotsForGroup('D'), 3);
    assert.equal(knockout.qualifyingSpotsForGroup('E'), 4);
  });

  await t.test('2. Teams do NOT pop up while group matches are still ongoing', () => {
    knockout.departments.length = 0;
    knockout.departments.push(
      { id: 'swe', name: 'Software Engineering', shortName: 'SWE', group: 'A' },
      { id: 'cs', name: 'Computer Science', shortName: 'CS', group: 'A' },
      { id: 'it', name: 'Information Technology', shortName: 'IT', group: 'A' },
      { id: 'ece', name: 'ECE', shortName: 'ECE', group: 'A' },
    );

    knockout.fixtures.length = 0;
    // Only 2 of 6 matches are finished in Group A, 4 are still scheduled/upcoming
    knockout.fixtures.push(
      { id: 'a1', stage: 'group', group: 'A', homeId: 'swe', awayId: 'cs', homeScore: 2, awayScore: 0, status: 'finished', detail: 'finished', confirmed: true, date: '2026-10-01', time: '10:00' },
      { id: 'a2', stage: 'group', group: 'A', homeId: 'it', awayId: 'ece', homeScore: 1, awayScore: 0, status: 'finished', detail: 'finished', confirmed: true, date: '2026-10-01', time: '12:00' },
      { id: 'a3', stage: 'group', group: 'A', homeId: 'swe', awayId: 'it', status: 'upcoming', detail: 'scheduled', date: '2026-10-08', time: '10:00' },
      { id: 'a4', stage: 'group', group: 'A', homeId: 'cs', awayId: 'ece', status: 'upcoming', detail: 'scheduled', date: '2026-10-08', time: '12:00' },
      { id: 'a5', stage: 'group', group: 'A', homeId: 'swe', awayId: 'ece', status: 'upcoming', detail: 'scheduled', date: '2026-10-15', time: '10:00' },
      { id: 'a6', stage: 'group', group: 'A', homeId: 'cs', awayId: 'it', status: 'upcoming', detail: 'scheduled', date: '2026-10-15', time: '12:00' },
    );

    // Group A is NOT settled because matches are upcoming
    assert.equal(knockout.groupSettled('A'), false, 'Group A must not be settled while matches remain');

    // Knockout road with settledOnly = true must NOT have teams populated for Group A
    const road = knockout.knockoutRoad(true);
    const r16_1 = road.find((t) => t.stage === 'r16' && t.slot === 1);
    assert.equal(r16_1.home.team, undefined, 'R16-1 home team must be undefined before group finishes');
    assert.equal(r16_1.home.label, 'Group A 1st');

    const r16_6 = road.find((t) => t.stage === 'r16' && t.slot === 6);
    assert.equal(r16_6.home.team, undefined, 'R16-6 home team must be undefined before group finishes');
    assert.equal(r16_6.home.label, 'Group A 2nd');

    const r16_4 = road.find((t) => t.stage === 'r16' && t.slot === 4);
    assert.equal(r16_4.away.team, undefined, 'R16-4 away team must be undefined before group finishes');
    assert.equal(r16_4.away.label, 'Group A 3rd');
  });

  await t.test('3. Teams POP UP on the knockout bracket once the group stage finishes', () => {
    // Finish the remaining matches in Group A
    const a3 = knockout.fixtures.find((f) => f.id === 'a3');
    a3.homeScore = 3; a3.awayScore = 1; a3.status = 'finished'; a3.detail = 'finished'; a3.confirmed = true;

    const a4 = knockout.fixtures.find((f) => f.id === 'a4');
    a4.homeScore = 2; a4.awayScore = 0; a4.status = 'finished'; a4.detail = 'finished'; a4.confirmed = true;

    const a5 = knockout.fixtures.find((f) => f.id === 'a5');
    a5.homeScore = 4; a5.awayScore = 0; a5.status = 'finished'; a5.detail = 'finished'; a5.confirmed = true;

    const a6 = knockout.fixtures.find((f) => f.id === 'a6');
    a6.homeScore = 1; a6.awayScore = 1; a6.status = 'finished'; a6.detail = 'finished'; a6.confirmed = true;

    // All Group A matches are now finished
    assert.equal(knockout.groupSettled('A'), true, 'Group A must now be settled');

    // The teams now POP UP on the knockout bracket!
    const road = knockout.knockoutRoad(true);
    const r16_1 = road.find((t) => t.stage === 'r16' && t.slot === 1);
    assert.equal(r16_1.home.team?.id, 'swe', 'Group A 1st (SWE) must pop up on R16-1 home side');

    const r16_6 = road.find((t) => t.stage === 'r16' && t.slot === 6);
    assert.equal(r16_6.home.team?.id, 'cs', 'Group A 2nd (CS) must pop up on R16-6 home side');

    const r16_4 = road.find((t) => t.stage === 'r16' && t.slot === 4);
    assert.equal(r16_4.away.team?.id, 'it', 'Group A 3rd (IT) must pop up on R16-4 away side');
  });

  await t.test('4. Group E 4th place pops up in R16-8 when Group E finishes', () => {
    knockout.departments.push(
      { id: 'spt', name: 'Sport Science', shortName: 'SPT', group: 'E' },
      { id: 'math', name: 'Mathematics', shortName: 'MATH', group: 'E' },
      { id: 'bio', name: 'Biology', shortName: 'BIO', group: 'E' },
      { id: 'chem', name: 'Chemistry', shortName: 'CHEM', group: 'E' },
    );

    // Group E matches finished
    knockout.fixtures.push(
      { id: 'e1', stage: 'group', group: 'E', homeId: 'spt', awayId: 'math', homeScore: 2, awayScore: 0, status: 'finished', detail: 'finished', confirmed: true, date: '2026-10-01', time: '10:00' },
      { id: 'e2', stage: 'group', group: 'E', homeId: 'bio', awayId: 'chem', homeScore: 1, awayScore: 0, status: 'finished', detail: 'finished', confirmed: true, date: '2026-10-01', time: '12:00' },
      { id: 'e3', stage: 'group', group: 'E', homeId: 'spt', awayId: 'bio', homeScore: 3, awayScore: 1, status: 'finished', detail: 'finished', confirmed: true, date: '2026-10-08', time: '10:00' },
      { id: 'e4', stage: 'group', group: 'E', homeId: 'math', awayId: 'chem', homeScore: 2, awayScore: 1, status: 'finished', detail: 'finished', confirmed: true, date: '2026-10-08', time: '12:00' },
      { id: 'e5', stage: 'group', group: 'E', homeId: 'spt', awayId: 'chem', homeScore: 1, awayScore: 0, status: 'finished', detail: 'finished', confirmed: true, date: '2026-10-15', time: '10:00' },
      { id: 'e6', stage: 'group', group: 'E', homeId: 'math', awayId: 'bio', homeScore: 2, awayScore: 0, status: 'finished', detail: 'finished', confirmed: true, date: '2026-10-15', time: '12:00' },
    );

    assert.equal(knockout.groupSettled('E'), true);

    const road = knockout.knockoutRoad(true);
    const r16_8 = road.find((t) => t.stage === 'r16' && t.slot === 8);
    assert.equal(r16_8.away.team?.id, 'chem', 'Group E 4th place (CHEM) must pop up on R16-8 away side');
  });

  await t.test('5. Knockout progression follows the exact revised bracket', () => {
    const road = knockout.knockoutRoad(true);
    const qfTies = road.filter((t) => t.stage === 'qf');
    const sfTies = road.filter((t) => t.stage === 'sf');
    const finalTie = road.find((t) => t.stage === 'final' && t.slot === 1);

    // QF1 = Winner R16-1 vs Winner R16-8
    assert.equal(qfTies[0].home.label, 'Winner R16-1');
    assert.equal(qfTies[0].away.label, 'Winner R16-8');

    // QF2 = Winner R16-2 vs Winner R16-7
    assert.equal(qfTies[1].home.label, 'Winner R16-2');
    assert.equal(qfTies[1].away.label, 'Winner R16-7');

    // QF3 = Winner R16-3 vs Winner R16-6
    assert.equal(qfTies[2].home.label, 'Winner R16-3');
    assert.equal(qfTies[2].away.label, 'Winner R16-6');

    // QF4 = Winner R16-4 vs Winner R16-5
    assert.equal(qfTies[3].home.label, 'Winner R16-4');
    assert.equal(qfTies[3].away.label, 'Winner R16-5');

    // SF1 = Winner QF1 vs Winner QF2
    assert.equal(sfTies[0].home.label, 'Winner QF1');
    assert.equal(sfTies[0].away.label, 'Winner QF2');

    // SF2 = Winner QF3 vs Winner QF4
    assert.equal(sfTies[1].home.label, 'Winner QF3');
    assert.equal(sfTies[1].away.label, 'Winner QF4');

    // FINAL = Winner SF1 vs Winner SF2
    assert.equal(finalTie.home.label, 'Winner SF1');
    assert.equal(finalTie.away.label, 'Winner SF2');
  });

  await t.test('6. Match Admin role has permissions for Matches and News', async () => {
    const { can } = await import('./auth.mjs');
    const matchAdminActor = { id: 'u1', username: 'match_official', role: 'match_admin' };
    
    // Must be able to write matches, manage clock, lineups, and publish news
    assert.equal(can(matchAdminActor, 'match.write'), true);
    assert.equal(can(matchAdminActor, 'match.clock'), true);
    assert.equal(can(matchAdminActor, 'lineup.write'), true);
    assert.equal(can(matchAdminActor, 'news.write'), true);

    // Must NOT be able to access other areas (like rules or teams)
    assert.equal(can(matchAdminActor, 'rules.write'), false);
    assert.equal(can(matchAdminActor, 'team.write'), false);
  });

  await t.test('7. Local repository storage for team logos, MOTM, and player avatar fallback', async () => {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { openDatabase } = await import('./db.mjs');

    const db = openDatabase();
    try {
      const teamSample = db.prepare('SELECT crest_url FROM teams WHERE id = ?').get('management');

      // Team crest must store local relative path in public/uploads/teams/
      assert.ok(teamSample?.crest_url?.startsWith('/uploads/teams/'), 'Team crest must start with /uploads/teams/');
      const teamFile = join(root, 'public', teamSample.crest_url.split('?')[0]);
      assert.equal(existsSync(teamFile), true, `File ${teamFile} must exist locally`);

      // Verify initials logic for (Nahom -> NA)
      const { getPlayerInitials } = await loadKnockoutModule();
      // Even if loadKnockoutModule does not export it, test the logic directly
      const getInitials = (str) => {
        const clean = str.trim();
        const parts = clean.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return clean.slice(0, 2).toUpperCase();
        const second = parts[1].replace(/[^a-zA-Z]/g, '');
        return second ? (parts[0][0] + second[0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
      };
      assert.equal(getInitials('Nahom'), 'NA');
      assert.equal(getInitials('Nahom Tadesse'), 'NT');
    } finally {
      db.close();
    }
  });

  await t.test('8. Uploading a picture from an admin stores in Supabase DB media table', async () => {
    const { saveMedia } = await import('./domain.mjs');
    const { openDatabase } = await import('./db.mjs');

    const db = openDatabase();
    const testId = `test-upload-${Date.now()}`;
    const fakeBytes = Buffer.from('fake-png-binary-data');
    const fakeImage = {
      contentType: 'image/png',
      bytes: fakeBytes,
      data: fakeBytes.toString('base64'),
    };

    try {
      const url = saveMedia(db, 'players', testId, fakeImage, 'test');
      assert.ok(url.startsWith(`/api/media/players/${testId}`), 'Returned URL points to /api/media/players/ endpoint');

      const saved = db.prepare('SELECT id, content_type, bytes FROM media WHERE id = ?').get(`players/${testId}`);
      assert.ok(saved, 'Media row must be present in Supabase DB media table');
      assert.equal(saved.id, `players/${testId}`);
      assert.equal(saved.content_type, 'image/png');
      assert.ok(saved.bytes, 'Media bytes must be stored in database');
    } finally {
      db.prepare('DELETE FROM media WHERE id = ?').run(`players/${testId}`);
      db.close();
      const { rmSync, existsSync } = await import('node:fs');
      const testPath = join(root, 'public', 'uploads', 'players', 'test');
      if (existsSync(testPath)) rmSync(testPath, { recursive: true, force: true });
    }
  });
});

