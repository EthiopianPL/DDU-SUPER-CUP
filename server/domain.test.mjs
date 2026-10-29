import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { startServer } from './http.mjs';

process.env.DDU_DB = join(mkdtempSync(join(tmpdir(), 'ddu-')), 'cup.db');
process.env.ADMIN_PASSWORD = 'supercup';
process.env.DDU_DEMO = '1';

test('match events, permissions, clock, and standings stay consistent', async () => {
  const { server } = await startServer(undefined, 0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const call = async (path, { method = 'GET', cookie = '', body } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-DDU-Request': '1',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    return { status: response.status, data };
  };

  const signIn = async (username, password) => {
    const response = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-DDU-Request': '1' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    assert.equal(response.status, 200, data.error);
    return response.headers.get('set-cookie').split(';')[0];
  };

  try {
    const opened = await call('/api/snapshot');
    assert.equal(opened.status, 200);
    const guarded = await fetch(`${base}/api/health`);
    assert.equal(guarded.status, 200);
    assert.equal(guarded.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(guarded.headers.get('x-frame-options'), 'DENY');
    const oversized = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-DDU-Request': '1' },
      body: 'x'.repeat(2_600_000),
    });
    assert.equal(oversized.status, 400);
    const burstStarted = Date.now();
    const burst = await Promise.all(Array.from({ length: 400 }, () => fetch(`${base}/api/health`)));
    assert.ok(burst.every((item) => item.status === 200));
    assert.ok(Date.now() - burstStarted < 15000);
    const live = opened.data.matches.find((match) => match.detail === 'live');
    assert.ok(live);
    assert.equal(live.homeScore, 1);
    assert.equal(live.confirmed, false);
    const finished = opened.data.matches.filter((match) => match.detail === 'finished' && match.confirmed);
    assert.ok(finished.length >= 17);

    const admin = await signIn('admin', 'supercup');
    const createdReader = await call('/api/users', {
      method: 'POST',
      cookie: admin,
      body: { username: 'reader', password: 'readerpass', role: 'reader' },
    });
    assert.equal(createdReader.status, 200, createdReader.data.error);
    const reader = await signIn('reader', 'readerpass');
    const denied = await call(`/api/matches/${live.id}/clock`, {
      method: 'POST',
      cookie: reader,
      body: { action: 'pause', version: live.version },
    });
    assert.equal(denied.status, 403);

    const created = await call('/api/matches', {
      method: 'POST',
      cookie: admin,
      body: {
        homeId: 'software-engineering',
        awayId: 'computer-science',
        date: '2026-12-01',
        time: '15:00',
        venue: 'DDU Main Pitch',
        matchday: 4,
        allowExtra: true,
        halfMinutes: 45,
      },
    });
    assert.equal(created.status, 200, created.data.error);
    const matchId = created.data.id;
    let version = created.data.snapshot.matches.find((match) => match.id === matchId).version;
    const squad = (side) => created.data.snapshot.squads.filter((row) => row.matchId === matchId && row.teamId === (side === 'home' ? 'software-engineering' : 'computer-science'));
    const homeStarter = squad('home').find((row) => row.role === 'starter');
    const homeBench = squad('home').find((row) => row.role === 'bench');
    const awayStarter = squad('away').find((row) => row.role === 'starter');
    const homeAssist = squad('home').find((row) => row.role === 'starter' && row.playerId !== homeStarter.playerId);

    const kick = await call(`/api/matches/${matchId}/clock`, { method: 'POST', cookie: admin, body: { action: 'kickoff', version } });
    assert.equal(kick.status, 200, kick.data.error);
    version = kick.data.snapshot.matches.find((match) => match.id === matchId).version;

    const goal = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'goal', side: 'home', playerId: homeStarter.playerId, assistId: homeAssist.playerId, goalType: 'open_play', clientKey: 'goal-1', version },
    });
    assert.equal(goal.status, 200, goal.data.error);
    version = goal.data.snapshot.matches.find((match) => match.id === matchId).version;
    assert.equal(goal.data.snapshot.matches.find((match) => match.id === matchId).homeScore, 1);
    const scorer = goal.data.snapshot.players.find((player) => player.id === homeStarter.playerId);
    const assister = goal.data.snapshot.players.find((player) => player.id === homeAssist.playerId);
    assert.equal(scorer.goals, (opened.data.players.find((player) => player.id === homeStarter.playerId)?.goals ?? 0) + 1);
    assert.ok(assister.assists >= 1);

    const duplicate = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'goal', side: 'home', playerId: homeStarter.playerId, goalType: 'penalty', clientKey: 'goal-1', version },
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.data.duplicate, true);
    assert.equal(duplicate.data.snapshot.matches.find((match) => match.id === matchId).homeScore, 1);

    const beforeOwn = duplicate.data.snapshot.players.find((player) => player.id === awayStarter.playerId).goals;
    const own = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'goal', side: 'home', playerId: awayStarter.playerId, goalType: 'own_goal', clientKey: 'own-1', version },
    });
    assert.equal(own.status, 200, own.data.error);
    version = own.data.snapshot.matches.find((match) => match.id === matchId).version;
    assert.equal(own.data.snapshot.matches.find((match) => match.id === matchId).homeScore, 2);
    assert.equal(own.data.snapshot.matches.find((match) => match.id === matchId).awayScore, 0);
    const ownEvent = own.data.snapshot.events.find((event) => event.matchId === matchId && event.type === 'goal' && event.goalType === 'own_goal' && !event.voided);
    assert.equal(ownEvent.creditedTeamId, 'software-engineering');
    assert.equal(ownEvent.teamId, 'computer-science');
    assert.equal(ownEvent.assistId, null);
    assert.equal(own.data.snapshot.players.find((player) => player.id === awayStarter.playerId).goals, beforeOwn);
    assert.equal(own.data.snapshot.players.find((player) => player.id === awayStarter.playerId).ownGoals, 1);
    version = own.data.snapshot.matches.find((match) => match.id === matchId).version;
    const penalty = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'goal', side: 'away', playerId: awayStarter.playerId, goalType: 'penalty', clientKey: 'pen-1', version },
    });
    assert.equal(penalty.status, 200, penalty.data.error);
    const penaltyEvent = penalty.data.snapshot.events.find((event) => event.matchId === matchId && event.type === 'goal' && event.goalType === 'penalty' && !event.voided);
    assert.equal(penaltyEvent.goalType, 'penalty');
    assert.equal(penalty.data.snapshot.matches.find((match) => match.id === matchId).awayScore, 1);
    assert.equal(penalty.data.snapshot.players.find((player) => player.id === awayStarter.playerId).goals, beforeOwn + 1);
    version = penalty.data.snapshot.matches.find((match) => match.id === matchId).version;
    const voidPenalty = await call(`/api/matches/${matchId}/events/${penalty.data.id}/void`, {
      method: 'POST',
      cookie: admin,
      body: { reason: 'Penalty check', version },
    });
    assert.equal(voidPenalty.status, 200, voidPenalty.data.error);
    assert.equal(voidPenalty.data.snapshot.matches.find((match) => match.id === matchId).awayScore, 0);
    assert.equal(voidPenalty.data.snapshot.players.find((player) => player.id === awayStarter.playerId).goals, beforeOwn);
    version = voidPenalty.data.snapshot.matches.find((match) => match.id === matchId).version;

    const missed = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'penalty_missed', side: 'away', playerId: awayStarter.playerId, clientKey: 'miss-1', version },
    });
    assert.equal(missed.status, 200, missed.data.error);
    version = missed.data.snapshot.matches.find((match) => match.id === matchId).version;
    assert.equal(missed.data.snapshot.matches.find((match) => match.id === matchId).awayScore, 0);

    const badAssist = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'goal', side: 'away', playerId: awayStarter.playerId, assistId: awayStarter.playerId, goalType: 'free_kick', clientKey: 'bad-assist', version },
    });
    assert.equal(badAssist.status, 400);
    const afterReject = await call('/api/snapshot');
    assert.equal(afterReject.data.matches.find((match) => match.id === matchId).awayScore, 0);
    version = afterReject.data.matches.find((match) => match.id === matchId).version;

    const yellow = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'card', side: 'home', playerId: homeStarter.playerId, cardType: 'yellow', detail: 'foul', clientKey: 'y-1', version },
    });
    assert.equal(yellow.status, 200, yellow.data.error);
    version = yellow.data.snapshot.matches.find((match) => match.id === matchId).version;
    const second = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'card', side: 'home', playerId: homeStarter.playerId, cardType: 'yellow', detail: 'second foul', clientKey: 'y-2', version },
    });
    assert.equal(second.status, 200, second.data.error);
    const bookings = second.data.snapshot.events.filter((event) => event.matchId === matchId && event.playerId === homeStarter.playerId && event.type === 'card' && !event.voided);
    assert.equal(bookings.filter((event) => event.cardType === 'yellow').length, 1);
    assert.equal(bookings.filter((event) => event.cardType === 'second_yellow').length, 1);
    version = second.data.snapshot.matches.find((match) => match.id === matchId).version;
    const sentOff = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'substitution', side: 'home', playerId: homeStarter.playerId, relatedPlayerId: homeBench?.playerId, clientKey: 'sub-off', version },
    });
    assert.equal(sentOff.status, 400);

    const direct = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'card', side: 'away', playerId: awayStarter.playerId, cardType: 'red', detail: 'serious foul', clientKey: 'red-1', version },
    });
    assert.equal(direct.status, 200, direct.data.error);
    version = direct.data.snapshot.matches.find((match) => match.id === matchId).version;
    const again = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'card', side: 'away', playerId: awayStarter.playerId, cardType: 'red', clientKey: 'red-2', version },
    });
    assert.equal(again.status, 400);

    const goalId = goal.data.id;
    const removed = await call(`/api/matches/${matchId}/events/${goalId}/void`, {
      method: 'POST',
      cookie: admin,
      body: { reason: 'Wrong scorer', disallowed: true, version },
    });
    assert.equal(removed.status, 200, removed.data.error);
    version = removed.data.snapshot.matches.find((match) => match.id === matchId).version;
    assert.equal(removed.data.snapshot.matches.find((match) => match.id === matchId).homeScore, 1);

    const intoStoppage = await call(`/api/matches/${matchId}/clock`, {
      method: 'POST',
      cookie: admin,
      body: { action: 'set_clock', seconds: 47 * 60, version },
    });
    assert.equal(intoStoppage.status, 200, intoStoppage.data.error);
    version = intoStoppage.data.snapshot.matches.find((match) => match.id === matchId).version;
    const board = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'added_time', addedMinute: 3, clientKey: 'added-1', version },
    });
    assert.equal(board.status, 200, board.data.error);
    assert.equal(board.data.snapshot.matches.find((match) => match.id === matchId).addedMs, 180000);
    version = board.data.snapshot.matches.find((match) => match.id === matchId).version;
    const late = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'goal', side: 'home', playerId: homeAssist.playerId, goalType: 'open_play', minute: 47, clientKey: 'late-1', version },
    });
    assert.equal(late.status, 200, late.data.error);
    const lateGoal = late.data.snapshot.events.find((event) => event.matchId === matchId && event.type === 'goal' && event.playerId === homeAssist.playerId && !event.voided);
    assert.equal(lateGoal.minute, 45);
    assert.equal(lateGoal.addedMinute, 2);
    version = late.data.snapshot.matches.find((match) => match.id === matchId).version;
    const undoLate = await call(`/api/matches/${matchId}/events/${late.data.id}/void`, {
      method: 'POST',
      cookie: admin,
      body: { reason: 'Stoppage check', version },
    });
    assert.equal(undoLate.status, 200, undoLate.data.error);
    version = undoLate.data.snapshot.matches.find((match) => match.id === matchId).version;

    const paused = await call(`/api/matches/${matchId}/clock`, {
      method: 'POST',
      cookie: admin,
      body: { action: 'set_clock', seconds: 125, version },
    });
    assert.equal(paused.status, 200, paused.data.error);
    const stored = paused.data.snapshot.matches.find((match) => match.id === matchId);
    assert.equal(stored.elapsedMs, 125000);
    assert.ok(stored.runningSince);
    version = stored.version;
    const held = await call(`/api/matches/${matchId}/clock`, { method: 'POST', cookie: admin, body: { action: 'pause', version } });
    assert.equal(held.data.snapshot.matches.find((match) => match.id === matchId).runningSince, null);
    assert.equal(held.data.snapshot.matches.find((match) => match.id === matchId).elapsedMs >= 125000, true);
    version = held.data.snapshot.matches.find((match) => match.id === matchId).version;

    const toHalf = await call(`/api/matches/${matchId}/clock`, { method: 'POST', cookie: admin, body: { action: 'halftime', version } });
    assert.equal(toHalf.status, 200, toHalf.data.error);
    assert.equal(toHalf.data.snapshot.matches.find((match) => match.id === matchId).addedMs, 0);
    version = toHalf.data.snapshot.matches.find((match) => match.id === matchId).version;
    const secondHalf = await call(`/api/matches/${matchId}/clock`, { method: 'POST', cookie: admin, body: { action: 'second_half', version } });
    assert.equal(secondHalf.status, 200, secondHalf.data.error);
    version = secondHalf.data.snapshot.matches.find((match) => match.id === matchId).version;
    const firstHalfGoals = secondHalf.data.snapshot.events.filter((event) => event.matchId === matchId && event.type === 'goal' && !event.voided && event.period === 'first_half');
    assert.equal(firstHalfGoals.length, 1);
    assert.equal(firstHalfGoals.filter((event) => event.creditedTeamId === 'software-engineering').length, 1);
    assert.equal(firstHalfGoals.filter((event) => event.creditedTeamId === 'computer-science').length, 0);
    const deep = await call(`/api/matches/${matchId}/clock`, {
      method: 'POST',
      cookie: admin,
      body: { action: 'set_clock', seconds: 91 * 60, version },
    });
    version = deep.data.snapshot.matches.find((match) => match.id === matchId).version;
    const secondBoard = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'added_time', addedMinute: 4, clientKey: 'added-2', version },
    });
    assert.equal(secondBoard.data.snapshot.matches.find((match) => match.id === matchId).addedMs, 240000);
    version = secondBoard.data.snapshot.matches.find((match) => match.id === matchId).version;
    const lateSecond = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'goal', side: 'home', playerId: homeAssist.playerId, goalType: 'open_play', minute: 93, clientKey: 'late-2', version },
    });
    assert.equal(lateSecond.status, 200, lateSecond.data.error);
    const stillFirstHalf = lateSecond.data.snapshot.events.filter((event) => event.matchId === matchId && event.type === 'goal' && !event.voided && event.period === 'first_half');
    assert.equal(stillFirstHalf.length, 1);
    const secondStoppage = lateSecond.data.snapshot.events.find((event) => event.matchId === matchId && !event.voided && event.type === 'goal' && event.addedMinute === 3);
    assert.equal(secondStoppage.minute, 90);
    version = lateSecond.data.snapshot.matches.find((match) => match.id === matchId).version;
    const undoSecond = await call(`/api/matches/${matchId}/events/${lateSecond.data.id}/void`, {
      method: 'POST',
      cookie: admin,
      body: { reason: 'Second half check', version },
    });
    assert.equal(undoSecond.status, 200, undoSecond.data.error);
    version = undoSecond.data.snapshot.matches.find((match) => match.id === matchId).version;

    const fresh = await call('/api/snapshot');
    const groupPoints = (rows, teamId) => {
      const teamMatches = rows.filter((match) => match.confirmed && match.detail === 'finished' && (match.homeId === teamId || match.awayId === teamId));
      return teamMatches.reduce((total, match) => {
        const goalsFor = match.homeId === teamId ? match.homeScore : match.awayScore;
        const goalsAgainst = match.homeId === teamId ? match.awayScore : match.homeScore;
        if (goalsFor > goalsAgainst) return total + 3;
        if (goalsFor === goalsAgainst) return total + 1;
        return total;
      }, 0);
    };
    const before = groupPoints(fresh.data.matches, 'software-engineering');
    version = fresh.data.matches.find((match) => match.id === matchId).version;
    const ended = await call(`/api/matches/${matchId}/clock`, { method: 'POST', cookie: admin, body: { action: 'full_time', version } });
    assert.equal(ended.data.snapshot.matches.find((match) => match.id === matchId).confirmed, false);
    const finishedAt = ended.data.snapshot.matches.find((match) => match.id === matchId).finishedAt;
    assert.ok(finishedAt);
    assert.equal(groupPoints(ended.data.snapshot.matches, 'software-engineering'), before);
    const lockedEdit = await call(`/api/matches/${matchId}/events`, {
      method: 'POST',
      cookie: admin,
      body: { type: 'goal', side: 'home', playerId: homeAssist.playerId, goalType: 'open_play', clientKey: 'after-ft', version: ended.data.snapshot.matches.find((match) => match.id === matchId).version },
    });
    assert.equal(lockedEdit.status, 400);
    version = ended.data.snapshot.matches.find((match) => match.id === matchId).version;
    const confirmed = await call(`/api/matches/${matchId}/clock`, { method: 'POST', cookie: admin, body: { action: 'confirm', version } });
    assert.equal(confirmed.status, 200, confirmed.data.error);
    assert.equal(confirmed.data.snapshot.matches.find((match) => match.id === matchId).finishedAt, finishedAt);
    assert.equal(groupPoints(confirmed.data.snapshot.matches, 'software-engineering'), before + 3);

    const audit = await call('/api/audit', { cookie: admin });
    assert.equal(audit.status, 200);
    assert.ok(audit.data.audit.some((entry) => entry.action === 'goal.record'));
    const hidden = await call('/api/audit', { cookie: reader });
    assert.equal(hidden.status, 200);
    const outsider = await call('/api/users', { cookie: reader });
    assert.equal(outsider.status, 403);

    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const missingLogo = await call('/api/teams', { method: 'POST', cookie: admin, body: { name: 'No Logo', shortName: 'NL', group: 'A' } });
    assert.equal(missingLogo.status, 400);
    const createdTeam = await call('/api/teams', { method: 'POST', cookie: admin, body: { name: 'Logo FC', shortName: 'LFC', group: 'F', image: { contentType: 'image/png', data: png } } });
    assert.equal(createdTeam.status, 200, createdTeam.data.error);
    const team = createdTeam.data.snapshot.teams.find((item) => item.shortName === 'LFC');
    assert.ok(team.crestUrl.startsWith('/api/media/teams/'));
    const picture = await fetch(`${base}${team.crestUrl}`);
    assert.equal(picture.status, 200);
    assert.equal(picture.headers.get('content-type'), 'image/png');
    const missingPhoto = await call('/api/players', { method: 'POST', cookie: admin, body: { name: 'No Photo', teamId: team.id, position: 'MID', number: 7 } });
    assert.equal(missingPhoto.status, 400);
    const addedPlayer = await call('/api/players', { method: 'POST', cookie: admin, body: { name: 'Photo Kid', teamId: team.id, position: 'MID', number: 8, image: { contentType: 'image/png', data: png } } });
    assert.equal(addedPlayer.status, 200, addedPlayer.data.error);
    const player = addedPlayer.data.snapshot.players.find((item) => item.name === 'Photo Kid');
    const face = await fetch(`${base}${player.photoUrl}`);
    assert.equal(face.status, 200);
    assert.equal(face.headers.get('content-type'), 'image/png');

    const plain = await call('/api/news', { method: 'POST', cookie: admin, body: { title: 'Plain story', summary: 'No picture', body: 'Just words.' } });
    assert.equal(plain.status, 200, plain.data.error);
    assert.equal(plain.data.snapshot.news.find((article) => article.title === 'Plain story').imageUrl, '');
    const pictured = await call('/api/news', { method: 'POST', cookie: admin, body: { title: 'Photo story', summary: 'Has a picture', body: 'Look.', image: { contentType: 'image/png', data: png } } });
    assert.equal(pictured.status, 200, pictured.data.error);
    const story = pictured.data.snapshot.news.find((article) => article.title === 'Photo story');
    assert.ok(story.imageUrl.startsWith('/api/media/news/'));
    const shot = await fetch(`${base}${story.imageUrl}`);
    assert.equal(shot.status, 200);
    assert.equal(shot.headers.get('content-type'), 'image/png');
    const gone = await call(`/api/news/${story.id}`, { method: 'DELETE', cookie: admin, body: {} });
    assert.equal(gone.status, 200, gone.data.error);
    const missing = await fetch(`${base}${story.imageUrl.split('?')[0]}`);
    assert.equal(missing.status, 404);

    const crossGroup = await call('/api/matches', {
      method: 'POST',
      cookie: admin,
      body: { homeId: 'software-engineering', awayId: 'civil-engineering', date: '2026-12-20', time: '15:00' },
    });
    assert.equal(crossGroup.status, 400);

    const knockout = await call('/api/matches', {
      method: 'POST',
      cookie: admin,
      body: { stage: 'r16', slot: 1, homeId: 'software-engineering', awayId: 'civil-engineering', date: '2026-12-20', time: '15:00', venue: 'DDU Main Pitch' },
    });
    assert.equal(knockout.status, 200, knockout.data.error);
    const tie = knockout.data.snapshot.matches.find((match) => match.id === knockout.data.id);
    assert.equal(tie.stage, 'r16');
    assert.equal(tie.slot, 1);
    assert.equal(tie.allowExtra, true);
    const duplicateTie = await call('/api/matches', {
      method: 'POST',
      cookie: admin,
      body: { stage: 'r16', slot: 1, homeId: 'medicine', awayId: 'law', date: '2026-12-20', time: '18:00' },
    });
    assert.equal(duplicateTie.status, 400);

    const round = await call('/api/matches/round', {
      method: 'POST',
      cookie: admin,
      body: { group: 'A', date: '2027-01-02', time: '10:00' },
    });
    assert.equal(round.status, 200, round.data.error);
    assert.equal(round.data.created, 0);
  } finally {
    server.close();
  }
});
