import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { startServer } from './http.mjs';

process.env.DDU_DB = join(mkdtempSync(join(tmpdir(), 'ddu-')), 'cup.db');
process.env.ADMIN_PASSWORD = 'supercup';

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
    assert.equal(own.data.snapshot.players.find((player) => player.id === awayStarter.playerId).goals, beforeOwn);

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
      body: { type: 'card', side: 'home', playerId: homeStarter.playerId, cardType: 'second_yellow', detail: 'second foul', clientKey: 'y-2', version },
    });
    assert.equal(second.status, 200, second.data.error);
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
    assert.equal(groupPoints(confirmed.data.snapshot.matches, 'software-engineering'), before + 3);

    const audit = await call('/api/audit', { cookie: admin });
    assert.equal(audit.status, 200);
    assert.ok(audit.data.audit.some((entry) => entry.action === 'goal.record'));
    const hidden = await call('/api/audit', { cookie: reader });
    assert.equal(hidden.status, 200);
    const outsider = await call('/api/users', { cookie: reader });
    assert.equal(outsider.status, 403);
  } finally {
    server.close();
  }
});
