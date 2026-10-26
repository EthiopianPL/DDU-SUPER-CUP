import { randomUUID } from 'node:crypto';
import { can, hashPassword, ROLES } from './auth.mjs';
import { transaction } from './db.mjs';
import { participation, substitutionCount, yellowCount } from './eligibility.mjs';

export const DEFAULT_RULES = {
  pointsWin: 3,
  pointsDraw: 1,
  halfMinutes: 45,
  extraHalfMinutes: 15,
  maxSubs: 5,
  extraSubs: 1,
  tieBreak: ['points', 'goalDifference', 'goalsFor', 'name'],
  allowExtraTime: false,
};

const GOAL_TYPES = new Set(['open_play', 'penalty', 'free_kick', 'own_goal']);
const OPEN_EVENTS = new Set(['penalty_awarded', 'penalty_missed', 'penalty_saved', 'offside', 'foul', 'free_kick', 'corner', 'save', 'injury', 'var', 'note']);
const LIVE_PERIODS = new Set(['first_half', 'second_half', 'extra_first', 'extra_second', 'penalties']);

export class RuleError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

let revision = 1;
let notify = () => {};

export function setNotifier(fn) {
  notify = fn;
}

export function currentRevision() {
  return revision;
}

function touch() {
  revision += 1;
  notify({ type: 'changed', revision });
}

function deny(actor, permission) {
  if (!can(actor, permission)) throw new RuleError('You do not have permission for that action.', 403);
}

function matchRow(db, id) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
  if (!match) throw new RuleError('Match not found.', 404);
  return match;
}

function playerRow(db, id) {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  if (!player) throw new RuleError('Player not found.', 404);
  return player;
}

function audit(db, actor, action, entity, entityId, before, after) {
  db.prepare(`INSERT INTO audit_log (actor_id, actor_name, action, entity, entity_id, before_json, after_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    actor?.id ?? null,
    actor?.username ?? 'system',
    action,
    entity,
    String(entityId),
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after),
    Date.now(),
  );
}

function rulesOf(db) {
  const row = db.prepare('SELECT rules_json FROM competitions WHERE id = ?').get('super-cup');
  return { ...DEFAULT_RULES, ...(row ? JSON.parse(row.rules_json) : {}) };
}

function assertVersion(match, version) {
  if (version != null && Number(version) !== match.version) {
    throw new RuleError('This match changed on the server. Reload it and try again.', 409);
  }
}

function assertWritable(actor, match) {
  deny(actor, 'match.write');
  if (match.status === 'finished') throw new RuleError('A finished match cannot be edited.');
  if (match.confirmed && !can(actor, 'match.correct')) {
    throw new RuleError('This result is confirmed and locked.');
  }
  if (['cancelled', 'abandoned'].includes(match.status) && !can(actor, 'match.correct')) {
    throw new RuleError('This match is closed.');
  }
}

function assertNotFinished(match) {
  if (match.status === 'finished') throw new RuleError('A finished match cannot be edited.');
}

function squadRows(db, matchId) {
  return db.prepare('SELECT match_id, team_id, player_id, role, sort_index FROM match_squad WHERE match_id = ?').all(matchId);
}

function activeEvents(db, matchId, beforeId = null) {
  const sql = beforeId == null
    ? 'SELECT * FROM match_events WHERE match_id = ? ORDER BY id'
    : 'SELECT * FROM match_events WHERE match_id = ? AND id < ? ORDER BY id';
  return beforeId == null
    ? db.prepare(sql).all(matchId)
    : db.prepare(sql).all(matchId, beforeId);
}

function recomputeScore(db, matchId) {
  const match = matchRow(db, matchId);
  const goals = db.prepare(`SELECT credited_team_id AS team, COUNT(*) AS total
    FROM match_events
    WHERE match_id = ? AND type = 'goal' AND counts_for_score = 1 AND voided = 0 AND shootout = 0
    GROUP BY credited_team_id`).all(matchId);
  let home = 0;
  let away = 0;
  for (const row of goals) {
    if (row.team === match.home_id) home = row.total;
    if (row.team === match.away_id) away = row.total;
  }
  const kicks = db.prepare(`SELECT team_id AS team, SUM(CASE WHEN scored = 1 THEN 1 ELSE 0 END) AS total
    FROM match_events
    WHERE match_id = ? AND type = 'penalty_kick' AND voided = 0
    GROUP BY team_id`).all(matchId);
  let pensHome = null;
  let pensAway = null;
  if (kicks.length) {
    pensHome = 0;
    pensAway = 0;
    for (const row of kicks) {
      if (row.team === match.home_id) pensHome = row.total;
      if (row.team === match.away_id) pensAway = row.total;
    }
  }
  db.prepare(`UPDATE matches
    SET home_score = ?, away_score = ?, pens_home = ?, pens_away = ?, version = version + 1, updated_at = ?
    WHERE id = ?`).run(home, away, pensHome, pensAway, Date.now(), matchId);
}

function clockSnapshot(match, now = Date.now()) {
  const elapsed = match.elapsed_ms + (match.running_since ? Math.max(0, now - match.running_since) : 0);
  return {
    elapsedMs: elapsed,
    minute: Math.floor(elapsed / 60000),
    second: Math.floor(elapsed / 1000) % 60,
    running: Boolean(match.running_since),
    period: match.period,
    addedMinute: Math.floor(match.added_ms / 60000),
  };
}

function freezeElapsed(match, now) {
  return match.elapsed_ms + (match.running_since ? Math.max(0, now - match.running_since) : 0);
}

function sideTeam(match, side) {
  if (side === 'home') return match.home_id;
  if (side === 'away') return match.away_id;
  throw new RuleError('Choose the home or away team.');
}

function ensureSquadPlayer(db, match, playerId, teamId) {
  const squad = db.prepare('SELECT role FROM match_squad WHERE match_id = ? AND player_id = ? AND team_id = ?').get(match.id, playerId, teamId);
  if (!squad) throw new RuleError('That player is not in this team’s squad for the match.');
  return playerRow(db, playerId);
}

function onPitch(db, match, playerId, teamId, beforeId = null) {
  ensureSquadPlayer(db, match, playerId, teamId);
  const state = participation(squadRows(db, match.id).filter((row) => row.team_id === teamId || true), activeEvents(db, match.id, beforeId));
  const player = state.get(playerId);
  if (!player || player.teamId !== teamId) throw new RuleError('That player is not in this team’s squad for the match.');
  if (player.dismissed) throw new RuleError('That player has been sent off.');
  if (!player.on) throw new RuleError('That player is not on the pitch.');
  return player;
}

export function seedDatabase(db, source, password) {
  const existing = db.prepare('SELECT COUNT(*) AS total FROM users').get();
  if (Number(existing.total) > 0) return false;
  if (db.dialect === 'postgres') return seedAccount(db, password);

  transaction(db, () => {
    const now = Date.now();
    db.prepare('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)').run(
      'user-admin',
      'admin',
      hashPassword(password),
      'super_admin',
      now,
    );
    db.prepare('INSERT INTO competitions (id, name, kind, rules_json) VALUES (?, ?, ?, ?)').run(
      'super-cup',
      'Dire Dawa University Super Cup',
      'groups',
      JSON.stringify(DEFAULT_RULES),
    );

    const insertTeam = db.prepare(`INSERT INTO teams (id, name, short_name, college, group_id, color, pitch, coach, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, '', 'active')`);
    for (const team of source.departments) {
      insertTeam.run(team.id, team.name, team.shortName, team.college, team.group, team.color, team.pitch);
    }

    const insertPlayer = db.prepare(`INSERT INTO players (id, team_id, name, position, number, nationality, registered, active)
      VALUES (?, ?, ?, ?, ?, '', ?, 1)`);
    for (const player of source.players) insertPlayer.run(player.id, player.departmentId, player.name, player.position, player.number, 1);

    const knownPlayers = new Set(source.players.map((player) => player.id));
    const remember = (player) => {
      if (knownPlayers.has(player.id)) return;
      knownPlayers.add(player.id);
      insertPlayer.run(player.id, player.departmentId, player.name, player.position, player.number, 0);
    };

    const insertMatch = db.prepare(`INSERT INTO matches (
      id, competition_id, group_id, matchday, home_id, away_id, venue, kickoff_date, kickoff_time,
      status, period, elapsed_ms, running_since, added_ms, half_ms, regulation_ms, et_half_ms, allow_extra,
      home_score, away_score, confirmed, formation_home, formation_away, version, updated_at
    ) VALUES (?, 'super-cup', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, ?, 0, 0, 0, ?, '4-2-3-1', '4-2-3-1', 1, ?)`);
    const insertSquad = db.prepare('INSERT INTO match_squad (match_id, team_id, player_id, role, sort_index) VALUES (?, ?, ?, ?, ?)');
    const insertEvent = db.prepare(`INSERT INTO match_events (
      match_id, client_key, type, team_id, credited_team_id, player_id, assist_id, related_player_id,
      minute, added_minute, period, goal_type, card_type, detail, counts_for_score, shootout, scored, voided, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0, NULL, 0, 'user-admin', ?)`);

    const halfMs = DEFAULT_RULES.halfMinutes * 60 * 1000;
    for (const fixture of source.fixtures) {
      const homeSheet = source.matchSheet(fixture.homeId);
      const awaySheet = source.matchSheet(fixture.awayId);
      for (const player of [...homeSheet.starters, ...homeSheet.bench, ...awaySheet.starters, ...awaySheet.bench]) remember(player);

      const scheduled = fixture.status === 'upcoming';
      const live = fixture.status === 'live';
      const status = scheduled ? 'scheduled' : live ? 'live' : 'finished';
      const period = scheduled ? 'pre' : live ? 'second_half' : 'full_time';
      const elapsed = live ? (fixture.minute ?? 0) * 60 * 1000 : status === 'finished' ? halfMs * 2 : 0;
      insertMatch.run(
        fixture.id,
        fixture.group,
        fixture.matchday,
        fixture.homeId,
        fixture.awayId,
        fixture.stadium,
        fixture.date,
        fixture.time,
        status,
        period,
        elapsed,
        halfMs,
        halfMs * 2,
        DEFAULT_RULES.extraHalfMinutes * 60 * 1000,
        status === 'finished' ? 1 : 0,
        now,
      );

      const writeSquad = (sheet, teamId) => {
        sheet.starters.forEach((player, index) => insertSquad.run(fixture.id, teamId, player.id, 'starter', index));
        sheet.bench.forEach((player, index) => insertSquad.run(fixture.id, teamId, player.id, 'bench', index));
      };
      writeSquad(homeSheet, fixture.homeId);
      writeSquad(awaySheet, fixture.awayId);

      if (!scheduled) {
        for (const event of source.matchTimeline(fixture)) {
          if (event.kind === 'goal') {
            insertEvent.run(fixture.id, `seed-${fixture.id}-g-${event.playerId}-${event.minute}`, 'goal', event.teamId, event.teamId, event.playerId, event.assistId ?? null, null, event.minute, 'second_half', 'open_play', null, '', 1, now);
          } else {
            insertEvent.run(fixture.id, `seed-${fixture.id}-${event.kind}-${event.playerId}-${event.minute}`, 'card', event.teamId, null, event.playerId, null, null, event.minute, 'second_half', null, event.kind === 'red' ? 'red' : 'yellow', '', 0, now);
          }
        }
        for (const change of source.matchSubstitutions(fixture)) {
          insertEvent.run(fixture.id, `seed-${fixture.id}-sub-${change.offId}-${change.minute}`, 'substitution', change.teamId, null, change.offId, null, change.onPlayer.id, change.minute, 'second_half', null, null, 'tactical', 0, now);
        }
        recomputeScore(db, fixture.id);
        const scored = db.prepare('SELECT home_score, away_score FROM matches WHERE id = ?').get(fixture.id);
        const expectedHome = fixture.homeScore ?? 0;
        const expectedAway = fixture.awayScore ?? 0;
        if (scored.home_score !== expectedHome || scored.away_score !== expectedAway) {
          throw new Error(`Seed score mismatch for ${fixture.id}: ${scored.home_score}-${scored.away_score} vs ${expectedHome}-${expectedAway}`);
        }
      }
    }

    const insertNews = db.prepare('INSERT INTO news (id, title, category, time_label, summary, body) VALUES (?, ?, ?, ?, ?, ?)');
    for (const article of source.news) insertNews.run(article.id, article.title, article.category, article.time, article.summary, article.body);
    audit(db, { id: 'user-admin', username: 'system' }, 'seed', 'competition', 'super-cup', null, { matches: source.fixtures.length });
  });
  return true;
}

function seedAccount(db, password) {
  transaction(db, () => {
    const now = Date.now();
    db.prepare('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)').run(
      'user-admin',
      'admin',
      hashPassword(password),
      'super_admin',
      now,
    );
    db.prepare('INSERT INTO competitions (id, name, kind, rules_json) VALUES (?, ?, ?, ?)').run(
      'super-cup',
      'Dire Dawa University Super Cup',
      'groups',
      JSON.stringify(DEFAULT_RULES),
    );
    audit(db, { id: 'user-admin', username: 'system' }, 'seed', 'competition', 'super-cup', null, { teams: 0, matches: 0 });
  });
  return true;
}

function publicPlayer(player, stats) {
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    number: player.number,
    departmentId: player.team_id,
    nationality: player.nationality,
    registered: Boolean(player.registered),
    active: Boolean(player.active),
    photoUrl: player.photo_url,
    goals: stats.goals,
    assists: stats.assists,
    yellowCards: stats.yellowCards,
    redCards: stats.redCards,
    appearances: stats.appearances,
    starts: stats.starts,
  };
}

export function buildSnapshot(db, now = Date.now()) {
  const competition = db.prepare('SELECT * FROM competitions WHERE id = ?').get('super-cup');
  const teams = db.prepare('SELECT * FROM teams ORDER BY name').all();
  const players = db.prepare('SELECT * FROM players').all();
  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff_date, kickoff_time, id').all();
  const events = db.prepare('SELECT * FROM match_events ORDER BY id').all();
  const squads = db.prepare('SELECT * FROM match_squad ORDER BY sort_index').all();
  const stats = db.prepare('SELECT * FROM manual_stats').all();
  const news = db.prepare('SELECT * FROM news').all();
  const names = new Map(players.map((player) => [player.id, player.name]));

  const tally = new Map(players.map((player) => [player.id, { goals: 0, assists: 0, yellowCards: 0, redCards: 0, appearances: 0, starts: 0 }]));
  for (const event of events) {
    if (event.voided) continue;
    if (event.type === 'goal' && event.counts_for_score && event.goal_type !== 'own_goal' && tally.has(event.player_id)) {
      tally.get(event.player_id).goals += 1;
    }
    if (event.type === 'goal' && event.counts_for_score && event.assist_id && tally.has(event.assist_id)) {
      tally.get(event.assist_id).assists += 1;
    }
    if (event.type === 'card' && event.card_type === 'yellow' && tally.has(event.player_id)) tally.get(event.player_id).yellowCards += 1;
    if (event.type === 'card' && (event.card_type === 'red' || event.card_type === 'second_yellow') && tally.has(event.player_id)) {
      tally.get(event.player_id).redCards += 1;
    }
  }
  for (const match of matches) {
    if (match.status === 'scheduled' || match.status === 'postponed' || match.status === 'cancelled') continue;
    const used = new Set();
    for (const row of squads.filter((item) => item.match_id === match.id && item.role === 'starter')) {
      if (!tally.has(row.player_id) || used.has(row.player_id)) continue;
      used.add(row.player_id);
      tally.get(row.player_id).appearances += 1;
      tally.get(row.player_id).starts += 1;
    }
    for (const event of events.filter((item) => item.match_id === match.id && item.type === 'substitution' && !item.voided)) {
      if (!tally.has(event.related_player_id) || used.has(event.related_player_id)) continue;
      used.add(event.related_player_id);
      tally.get(event.related_player_id).appearances += 1;
    }
  }

  return {
    serverNow: now,
    revision,
    competition: competition ? { id: competition.id, name: competition.name, kind: competition.kind, rules: JSON.parse(competition.rules_json) } : null,
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      shortName: team.short_name,
      college: team.college,
      group: team.group_id,
      color: team.color,
      pitch: team.pitch,
      coach: team.coach,
      crestUrl: team.crest_url,
      status: team.status,
    })),
    players: players.map((player) => publicPlayer(player, tally.get(player.id))),
    matches: matches.map((match) => ({
      id: match.id,
      group: match.group_id,
      matchday: match.matchday,
      date: match.kickoff_date,
      time: match.kickoff_time,
      stadium: match.venue,
      homeId: match.home_id,
      awayId: match.away_id,
      detail: match.status,
      period: match.period,
      elapsedMs: match.elapsed_ms,
      runningSince: match.running_since,
      addedMs: match.added_ms,
      halfMs: match.half_ms,
      regulationMs: match.regulation_ms,
      etHalfMs: match.et_half_ms,
      allowExtra: Boolean(match.allow_extra),
      homeScore: match.home_score,
      awayScore: match.away_score,
      pensHome: match.pens_home,
      pensAway: match.pens_away,
      confirmed: Boolean(match.confirmed),
      referee: match.referee,
      assistant1: match.assistant1,
      assistant2: match.assistant2,
      formationHome: match.formation_home,
      formationAway: match.formation_away,
      version: match.version,
      updatedAt: match.updated_at,
    })),
    events: events.map((event) => ({
      id: event.id,
      matchId: event.match_id,
      type: event.type,
      teamId: event.team_id,
      creditedTeamId: event.credited_team_id,
      playerId: event.player_id,
      assistId: event.assist_id,
      relatedPlayerId: event.related_player_id,
      playerName: names.get(event.player_id) ?? '',
      assistName: names.get(event.assist_id) ?? '',
      relatedName: names.get(event.related_player_id) ?? '',
      minute: event.minute,
      addedMinute: event.added_minute,
      period: event.period,
      goalType: event.goal_type,
      cardType: event.card_type,
      detail: event.detail,
      countsForScore: Boolean(event.counts_for_score),
      shootout: Boolean(event.shootout),
      scored: event.scored == null ? null : Boolean(event.scored),
      voided: Boolean(event.voided),
      voidReason: event.void_reason,
    })),
    squads: squads.map((row) => ({
      matchId: row.match_id,
      teamId: row.team_id,
      playerId: row.player_id,
      role: row.role,
      sort: row.sort_index,
    })),
    stats: stats.map((row) => ({ matchId: row.match_id, teamId: row.team_id, metric: row.metric, value: row.value })),
    news: news.map((article) => ({
      id: article.id,
      title: article.title,
      category: article.category,
      time: article.time_label,
      summary: article.summary,
      body: article.body,
    })),
  };
}

export function clockPayload(db, now = Date.now()) {
  const matches = db.prepare('SELECT * FROM matches WHERE running_since IS NOT NULL').all();
  return {
    type: 'clock',
    serverNow: now,
    revision,
    matches: matches.map((match) => ({
      id: match.id,
      elapsedMs: match.elapsed_ms,
      runningSince: match.running_since,
      period: match.period,
      detail: match.status,
      addedMs: match.added_ms,
      homeScore: match.home_score,
      awayScore: match.away_score,
      version: match.version,
    })),
  };
}

function slug(value) {
  const base = String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return base || `item-${Date.now()}`;
}

export function saveTeam(db, actor, input, id) {
  deny(actor, 'team.write');
  const name = String(input.name ?? '').trim();
  const shortName = String(input.shortName ?? '').trim().toUpperCase();
  const group = String(input.group ?? '').trim();
  if (!name || !shortName || !group) throw new RuleError('Name, short name, and group are required.');
  return transaction(db, () => {
    const nowId = id || slug(name);
    const before = id ? db.prepare('SELECT * FROM teams WHERE id = ?').get(id) : null;
    if (id && !before) throw new RuleError('Team not found.', 404);
    if (!id && db.prepare('SELECT id FROM teams WHERE id = ?').get(nowId)) throw new RuleError('A team with that name already exists.');
    const college = String(input.college ?? before?.college ?? '').trim();
    const color = String(input.color ?? before?.color ?? '#2450c8');
    const pitch = String(input.pitch ?? before?.pitch ?? '').trim();
    const coach = String(input.coach ?? before?.coach ?? '').trim();
    const status = String(input.status ?? before?.status ?? 'active');
    if (id) {
      db.prepare(`UPDATE teams SET name=?, short_name=?, college=?, group_id=?, color=?, pitch=?, coach=?, status=? WHERE id=?`).run(
        name, shortName, college, group, color, pitch, coach, status, id,
      );
    } else {
      db.prepare(`INSERT INTO teams (id, name, short_name, college, group_id, color, pitch, coach, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        nowId, name, shortName, college, group, color, pitch, coach, status,
      );
    }
    audit(db, actor, id ? 'team.update' : 'team.create', 'team', id || nowId, before, { name, shortName, group });
    return { id: id || nowId };
  });
}

export function deleteTeam(db, actor, id) {
  deny(actor, 'team.write');
  if (!can(actor, 'match.correct') && actor.role !== 'super_admin') {
    // Team managers may edit a team, not erase it once fixtures exist. Super admin and competition managers can.
  }
  if (actor.role === 'team_manager') throw new RuleError('Only a competition manager can delete a team.', 403);
  return transaction(db, () => {
    const used = db.prepare('SELECT COUNT(*) AS total FROM matches WHERE home_id = ? OR away_id = ?').get(id, id);
    if (used.total > 0) throw new RuleError('Delete or reassign this team’s matches before deleting the team.');
    db.prepare('DELETE FROM players WHERE team_id = ?').run(id);
    const result = db.prepare('DELETE FROM teams WHERE id = ?').run(id);
    if (!result.changes) throw new RuleError('Team not found.', 404);
    audit(db, actor, 'team.delete', 'team', id, null, null);
    return { ok: true };
  });
}

export function savePlayer(db, actor, input, id) {
  deny(actor, 'player.write');
  const name = String(input.name ?? '').trim();
  const teamId = String(input.teamId ?? input.departmentId ?? '').trim();
  const position = String(input.position ?? '').trim();
  const number = Number(input.number);
  if (!name || !teamId || !['GK', 'DEF', 'MID', 'FWD'].includes(position) || !Number.isInteger(number)) {
    throw new RuleError('Name, team, position, and shirt number are required.');
  }
  if (!db.prepare('SELECT id FROM teams WHERE id = ?').get(teamId)) throw new RuleError('Team not found.', 404);
  return transaction(db, () => {
    const before = id ? playerRow(db, id) : null;
    const playerId = id || `${teamId}-${slug(name)}`;
    if (!id && db.prepare('SELECT id FROM players WHERE id = ?').get(playerId)) throw new RuleError('That player already exists.');
    const taken = db.prepare('SELECT id FROM players WHERE team_id = ? AND number = ? AND id <> ? AND active = 1').get(teamId, number, playerId);
    if (taken) throw new RuleError(`Shirt ${number} is already used on this team.`);
    if (id) {
      db.prepare(`UPDATE players SET team_id=?, name=?, position=?, number=?, nationality=?, active=? WHERE id=?`).run(
        teamId, name, position, number, String(input.nationality ?? before.nationality ?? ''), input.active === false ? 0 : 1, id,
      );
    } else {
      db.prepare(`INSERT INTO players (id, team_id, name, position, number, nationality, registered, active) VALUES (?, ?, ?, ?, ?, ?, 1, 1)`).run(
        playerId, teamId, name, position, number, String(input.nationality ?? ''),
      );
    }
    audit(db, actor, id ? 'player.update' : 'player.create', 'player', id || playerId, before, { name, teamId, position, number });
    return { id: id || playerId };
  });
}

export function saveNews(db, actor, input, id) {
  deny(actor, 'news.write');
  const title = String(input.title ?? '').trim();
  const summary = String(input.summary ?? '').trim();
  const body = String(input.body ?? '').trim();
  if (!title || !summary || !body) throw new RuleError('Title, summary, and story are required.');
  return transaction(db, () => {
    const articleId = id || slug(title);
    if (id && !db.prepare('SELECT id FROM news WHERE id = ?').get(id)) throw new RuleError('Story not found.', 404);
    if (!id && db.prepare('SELECT id FROM news WHERE id = ?').get(articleId)) throw new RuleError('A story with that title already exists.');
    const fields = [title, String(input.category ?? 'News').trim() || 'News', String(input.time ?? 'Today').trim() || 'Today', summary, body];
    if (id) db.prepare('UPDATE news SET title=?, category=?, time_label=?, summary=?, body=? WHERE id=?').run(...fields, id);
    else db.prepare('INSERT INTO news (title, category, time_label, summary, body, id) VALUES (?, ?, ?, ?, ?, ?)').run(...fields, articleId);
    audit(db, actor, id ? 'news.update' : 'news.create', 'news', id || articleId, null, { title });
    return { id: id || articleId };
  });
}

export function deleteNews(db, actor, id) {
  deny(actor, 'news.write');
  return transaction(db, () => {
    const result = db.prepare('DELETE FROM news WHERE id = ?').run(id);
    if (!result.changes) throw new RuleError('Story not found.', 404);
    audit(db, actor, 'news.delete', 'news', id, null, null);
    return { ok: true };
  });
}

export function createUser(db, actor, input) {
  if (actor.role !== 'super_admin') throw new RuleError('Only a super admin can manage users.', 403);
  const username = String(input.username ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  const role = String(input.role ?? '');
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new RuleError('Username must be 3–32 letters or numbers.');
  if (password.length < 6) throw new RuleError('Password must be at least 6 characters.');
  if (!ROLES.includes(role)) throw new RuleError('Unknown role.');
  return transaction(db, () => {
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) throw new RuleError('That username is taken.');
    const id = `user-${username}`;
    db.prepare('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)').run(id, username, hashPassword(password), role, Date.now());
    audit(db, actor, 'user.create', 'user', id, null, { username, role });
    return { id, username, role };
  });
}

export function updateRules(db, actor, input) {
  deny(actor, 'rules.write');
  const current = rulesOf(db);
  const next = {
    ...current,
    pointsWin: Number(input.pointsWin ?? current.pointsWin),
    pointsDraw: Number(input.pointsDraw ?? current.pointsDraw),
    halfMinutes: Number(input.halfMinutes ?? current.halfMinutes),
    extraHalfMinutes: Number(input.extraHalfMinutes ?? current.extraHalfMinutes),
    maxSubs: Number(input.maxSubs ?? current.maxSubs),
    extraSubs: Number(input.extraSubs ?? current.extraSubs),
    tieBreak: Array.isArray(input.tieBreak) ? input.tieBreak : current.tieBreak,
    allowExtraTime: Boolean(input.allowExtraTime ?? current.allowExtraTime),
  };
  if (![1, 2, 3].includes(next.pointsWin) || next.halfMinutes < 1 || next.halfMinutes > 60 || next.maxSubs < 0 || next.maxSubs > 15) {
    throw new RuleError('Competition rules are outside the allowed range.');
  }
  return transaction(db, () => {
    db.prepare('UPDATE competitions SET rules_json = ? WHERE id = ?').run(JSON.stringify(next), 'super-cup');
    audit(db, actor, 'rules.update', 'competition', 'super-cup', current, next);
    return next;
  });
}

function defaultSquad(db, teamId) {
  const players = db.prepare('SELECT * FROM players WHERE team_id = ? AND active = 1 AND registered = 1 ORDER BY number').all(teamId);
  const take = (position, count, used) => {
    const found = [];
    for (const player of players) {
      if (found.length >= count || used.has(player.id) || player.position !== position) continue;
      found.push(player);
      used.add(player.id);
    }
    return found;
  };
  const used = new Set();
  const starters = [
    ...take('GK', 1, used),
    ...take('DEF', 4, used),
    ...take('MID', 3, used),
    ...take('FWD', 3, used),
  ];
  for (const player of players) {
    if (starters.length >= 11 || used.has(player.id)) continue;
    starters.push(player);
    used.add(player.id);
  }
  const bench = players.filter((player) => !used.has(player.id)).slice(0, 12);
  return { starters, bench };
}

export function createMatch(db, actor, input) {
  deny(actor, 'match.schedule');
  const homeId = String(input.homeId ?? '');
  const awayId = String(input.awayId ?? '');
  if (!homeId || !awayId || homeId === awayId) throw new RuleError('Choose two different teams.');
  const home = db.prepare('SELECT * FROM teams WHERE id = ?').get(homeId);
  const away = db.prepare('SELECT * FROM teams WHERE id = ?').get(awayId);
  if (!home || !away) throw new RuleError('Team not found.', 404);
  if (home.group_id !== away.group_id) throw new RuleError('Group matches must be between teams in the same group.');
  const date = String(input.date ?? '');
  const time = String(input.time ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new RuleError('A valid date and kickoff time are required.');
  const rules = rulesOf(db);
  const halfMs = (Number(input.halfMinutes) || rules.halfMinutes) * 60 * 1000;
  return transaction(db, () => {
    const id = input.id || `${home.group_id.toLowerCase()}-${slug(home.short_name)}-${slug(away.short_name)}-${date}`;
    if (db.prepare('SELECT id FROM matches WHERE id = ?').get(id)) throw new RuleError('That fixture already exists.');
    const now = Date.now();
    db.prepare(`INSERT INTO matches (
      id, competition_id, group_id, matchday, home_id, away_id, venue, kickoff_date, kickoff_time,
      status, period, elapsed_ms, half_ms, regulation_ms, et_half_ms, allow_extra, referee, assistant1, assistant2, version, updated_at
    ) VALUES (?, 'super-cup', ?, ?, ?, ?, ?, ?, ?, 'scheduled', 'pre', 0, ?, ?, ?, ?, ?, ?, ?, 1, ?)`).run(
      id,
      home.group_id,
      Number(input.matchday) || 1,
      homeId,
      awayId,
      String(input.venue || home.pitch),
      date,
      time,
      halfMs,
      halfMs * 2,
      (rules.extraHalfMinutes || 15) * 60 * 1000,
      input.allowExtra ? 1 : 0,
      String(input.referee ?? ''),
      String(input.assistant1 ?? ''),
      String(input.assistant2 ?? ''),
      now,
    );
    const insertSquad = db.prepare('INSERT INTO match_squad (match_id, team_id, player_id, role, sort_index) VALUES (?, ?, ?, ?, ?)');
    for (const teamId of [homeId, awayId]) {
      const sheet = defaultSquad(db, teamId);
      sheet.starters.forEach((player, index) => insertSquad.run(id, teamId, player.id, 'starter', index));
      sheet.bench.forEach((player, index) => insertSquad.run(id, teamId, player.id, 'bench', index));
    }
    audit(db, actor, 'match.create', 'match', id, null, { homeId, awayId, date, time });
    return { id };
  });
}

export function updateMatch(db, actor, id, input) {
  deny(actor, 'match.schedule');
  return transaction(db, () => {
    const match = matchRow(db, id);
    assertVersion(match, input.version);
    assertNotFinished(match);
    if (match.confirmed && !can(actor, 'match.correct')) throw new RuleError('This result is confirmed and locked.');
    if (match.status !== 'scheduled' && match.status !== 'postponed' && !can(actor, 'match.correct')) {
      throw new RuleError('Reschedule the match before it kicks off, or ask a competition manager.');
    }
    const date = String(input.date ?? match.kickoff_date);
    const time = String(input.time ?? match.kickoff_time);
    const venue = String(input.venue ?? match.venue);
    const referee = String(input.referee ?? match.referee);
    const assistant1 = String(input.assistant1 ?? match.assistant1);
    const assistant2 = String(input.assistant2 ?? match.assistant2);
    const allowExtra = input.allowExtra == null ? match.allow_extra : input.allowExtra ? 1 : 0;
    const halfMinutes = Number(input.halfMinutes);
    const halfMs = Number.isFinite(halfMinutes) && halfMinutes > 0 ? halfMinutes * 60 * 1000 : match.half_ms;
    db.prepare(`UPDATE matches SET kickoff_date=?, kickoff_time=?, venue=?, referee=?, assistant1=?, assistant2=?, allow_extra=?, half_ms=?, regulation_ms=?, version=version+1, updated_at=? WHERE id=?`).run(
      date, time, venue, referee, assistant1, assistant2, allowExtra, halfMs, halfMs * 2, Date.now(), id,
    );
    audit(db, actor, 'match.update', 'match', id, { date: match.kickoff_date, time: match.kickoff_time, venue: match.venue }, { date, time, venue });
    return { id };
  });
}

export function saveLineup(db, actor, matchId, input) {
  deny(actor, 'lineup.write');
  const teamId = String(input.teamId ?? '');
  const starters = [...new Set(input.starters ?? [])];
  const bench = [...new Set(input.bench ?? [])].filter((playerId) => !starters.includes(playerId));
  if (!starters.length) throw new RuleError('Pick at least one starter.');
  if (starters.length > 11) throw new RuleError('A team can start at most 11 players.');
  return transaction(db, () => {
    const match = matchRow(db, matchId);
    assertVersion(match, input.version);
    assertNotFinished(match);
    if (teamId !== match.home_id && teamId !== match.away_id) throw new RuleError('That team is not in this match.');
    const formation = String(input.formation ?? '4-2-3-1');
    for (const playerId of [...starters, ...bench]) ensureSquadPlayerSafe(db, playerId, teamId);
    db.prepare('DELETE FROM match_squad WHERE match_id = ? AND team_id = ?').run(matchId, teamId);
    const insert = db.prepare('INSERT INTO match_squad (match_id, team_id, player_id, role, sort_index) VALUES (?, ?, ?, ?, ?)');
    starters.forEach((playerId, index) => insert.run(matchId, teamId, playerId, 'starter', index));
    bench.forEach((playerId, index) => insert.run(matchId, teamId, playerId, 'bench', index));
    const column = teamId === match.home_id ? 'formation_home' : 'formation_away';
    db.prepare(`UPDATE matches SET ${column} = ?, version = version + 1, updated_at = ? WHERE id = ?`).run(formation, Date.now(), matchId);
    audit(db, actor, 'lineup.update', 'match', matchId, null, { teamId, starters, bench, formation });
    return { id: matchId };
  });
}

function ensureSquadPlayerSafe(db, playerId, teamId) {
  const player = playerRow(db, playerId);
  if (player.team_id !== teamId || !player.active) throw new RuleError(`${player.name} is not an active player for this team.`);
}

function insertEvent(db, match, actor, input, countsForScore) {
  const key = input.clientKey ? String(input.clientKey) : null;
  if (key) {
    const existing = db.prepare('SELECT id FROM match_events WHERE client_key = ?').get(key);
    if (existing) return { id: Number(existing.id), duplicate: true };
  }
  const info = db.prepare(`INSERT INTO match_events (
    match_id, client_key, type, team_id, credited_team_id, player_id, assist_id, related_player_id,
    minute, added_minute, period, goal_type, card_type, detail, counts_for_score, shootout, scored, voided, created_by, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`).run(
    match.id,
    key,
    input.type,
    input.teamId ?? null,
    input.creditedTeamId ?? null,
    input.playerId ?? null,
    input.assistId ?? null,
    input.relatedPlayerId ?? null,
    Number(input.minute) || 0,
    Number(input.addedMinute) || 0,
    input.period || match.period,
    input.goalType ?? null,
    input.cardType ?? null,
    String(input.detail ?? '').slice(0, 500),
    countsForScore ? 1 : 0,
    input.shootout ? 1 : 0,
    input.scored == null ? null : input.scored ? 1 : 0,
    actor.id,
    Date.now(),
  );
  return { id: Number(info.lastInsertRowid), duplicate: false };
}

function requireLivePeriod(match) {
  if (!LIVE_PERIODS.has(match.period) || !['live', 'penalties'].includes(match.status)) {
    throw new RuleError('Kick off, or resume the match, before recording that event.');
  }
}

export function recordEvent(db, actor, matchId, input) {
  assertWritable(actor, matchRow(db, matchId));
  const type = String(input.type ?? '');
  try {
    return transaction(db, () => {
      const match = matchRow(db, matchId);
      assertVersion(match, input.version);
      assertWritable(actor, match);
      const clock = clockSnapshot(match);
      const minute = input.minute == null ? clock.minute : Number(input.minute);
      const addedMinute = input.addedMinute == null ? 0 : Number(input.addedMinute);
      if (!Number.isInteger(minute) || minute < 0 || minute > 150) throw new RuleError('Enter a valid match minute.');
      if (!Number.isInteger(addedMinute) || addedMinute < 0 || addedMinute > 30) throw new RuleError('Enter a valid added-time minute.');
      const base = { ...input, minute, addedMinute, period: input.period || match.period, clientKey: input.clientKey || randomUUID() };

      if (type === 'goal') {
        requireLivePeriod(match);
        if (match.period === 'penalties') throw new RuleError('Shootout kicks are recorded separately from the match score.');
        const goalType = String(input.goalType || 'open_play');
        if (!GOAL_TYPES.has(goalType)) throw new RuleError('Choose a goal type.');
        const creditedTeamId = sideTeam(match, input.side || (input.creditedTeamId === match.away_id ? 'away' : 'home'));
        const scorerTeamId = goalType === 'own_goal' ? (creditedTeamId === match.home_id ? match.away_id : match.home_id) : creditedTeamId;
        if (!input.playerId) throw new RuleError('Choose the scorer.');
        onPitch(db, match, input.playerId, scorerTeamId);
        let assistId = input.assistId || null;
        if (goalType === 'own_goal') assistId = null;
        if (assistId) {
          if (assistId === input.playerId) throw new RuleError('The scorer cannot also be the assister.');
          onPitch(db, match, assistId, creditedTeamId);
        }
        const saved = insertEvent(db, match, actor, {
          ...base,
          type: 'goal',
          teamId: scorerTeamId,
          creditedTeamId,
          playerId: input.playerId,
          assistId,
          goalType,
        }, true);
        if (!saved.duplicate) {
          recomputeScore(db, match.id);
          audit(db, actor, 'goal.record', 'match', match.id, null, { goalType, playerId: input.playerId, assistId, minute });
        }
        return saved;
      }

      if (type === 'card') {
        requireLivePeriod(match);
        const cardType = String(input.cardType || '');
        if (!['yellow', 'second_yellow', 'red'].includes(cardType)) throw new RuleError('Choose a card.');
        const teamId = sideTeam(match, input.side);
        if (!input.playerId) throw new RuleError('Choose the player.');
        onPitch(db, match, input.playerId, teamId);
        const yellows = yellowCount(activeEvents(db, match.id), input.playerId);
        if (cardType === 'yellow' && yellows >= 1) throw new RuleError('This player already has a yellow card. Record a second yellow.');
        if (cardType === 'second_yellow' && yellows !== 1) throw new RuleError('A second yellow needs one active yellow card first.');
        const saved = insertEvent(db, match, actor, { ...base, type: 'card', teamId, playerId: input.playerId, cardType }, false);
        if (!saved.duplicate) audit(db, actor, 'card.record', 'match', match.id, null, { cardType, playerId: input.playerId, minute });
        return saved;
      }

      if (type === 'substitution') {
        requireLivePeriod(match);
        if (match.period === 'penalties') throw new RuleError('Substitutions are closed in the shootout.');
        const teamId = sideTeam(match, input.side);
        if (!input.playerId || !input.relatedPlayerId) throw new RuleError('Choose the player leaving and the player coming on.');
        if (input.playerId === input.relatedPlayerId) throw new RuleError('Choose two different players.');
        onPitch(db, match, input.playerId, teamId);
        const incoming = participation(squadRows(db, match.id), activeEvents(db, match.id)).get(input.relatedPlayerId);
        if (!incoming || incoming.teamId !== teamId) throw new RuleError('The substitute is not in this squad.');
        if (incoming.dismissed) throw new RuleError('A dismissed player cannot return.');
        if (incoming.used) throw new RuleError('That player has already taken part and cannot return.');
        if (!incoming.on && incoming.used) throw new RuleError('That player has already taken part.');
        const rules = rulesOf(db);
        const extra = ['extra_first', 'extra_break', 'extra_second'].includes(match.period) ? rules.extraSubs : 0;
        if (substitutionCount(activeEvents(db, match.id), teamId) >= rules.maxSubs + extra) {
          throw new RuleError('This team has used its substitutions.');
        }
        const saved = insertEvent(db, match, actor, {
          ...base,
          type: 'substitution',
          teamId,
          playerId: input.playerId,
          relatedPlayerId: input.relatedPlayerId,
          detail: input.detail || 'tactical',
        }, false);
        if (!saved.duplicate) audit(db, actor, 'sub.record', 'match', match.id, null, { out: input.playerId, in: input.relatedPlayerId, minute });
        return saved;
      }

      if (type === 'penalty_kick') {
        if (match.period !== 'penalties' && match.status !== 'penalties') throw new RuleError('Start the shootout before recording kicks.');
        const teamId = sideTeam(match, input.side);
        if (!input.playerId) throw new RuleError('Choose the taker.');
        ensureSquadPlayer(db, match, input.playerId, teamId);
        const state = participation(squadRows(db, match.id), activeEvents(db, match.id)).get(input.playerId);
        if (!state || state.dismissed) throw new RuleError('That player cannot take a kick.');
        const saved = insertEvent(db, match, actor, {
          ...base,
          type: 'penalty_kick',
          teamId,
          playerId: input.playerId,
          shootout: true,
          scored: Boolean(input.scored),
          detail: input.scored ? 'scored' : 'missed',
        }, false);
        if (!saved.duplicate) {
          recomputeScore(db, match.id);
          audit(db, actor, 'shootout.kick', 'match', match.id, null, { teamId, playerId: input.playerId, scored: Boolean(input.scored) });
        }
        return saved;
      }

      if (type === 'added_time') {
        requireLivePeriod(match);
        const minutes = Number(input.addedMinute ?? input.minute);
        if (!Number.isInteger(minutes) || minutes < 0 || minutes > 30) throw new RuleError('Enter the added minutes.');
        db.prepare('UPDATE matches SET added_ms = ?, version = version + 1, updated_at = ? WHERE id = ?').run(minutes * 60 * 1000, Date.now(), match.id);
        const saved = insertEvent(db, match, actor, { ...base, type: 'added_time', minute: clock.minute, addedMinute: minutes, detail: `Added time ${minutes}` }, false);
        if (!saved.duplicate) audit(db, actor, 'clock.added', 'match', match.id, { added: match.added_ms }, { added: minutes });
        return saved;
      }

      if (OPEN_EVENTS.has(type)) {
        requireLivePeriod(match);
        const teamId = input.side ? sideTeam(match, input.side) : null;
        if (input.playerId && teamId) onPitch(db, match, input.playerId, teamId);
        const saved = insertEvent(db, match, actor, { ...base, type, teamId, playerId: input.playerId || null }, false);
        if (!saved.duplicate) audit(db, actor, 'event.record', 'match', match.id, null, { type, minute });
        return saved;
      }

      throw new RuleError('Unknown event.');
    });
  } catch (error) {
    if (String(error.message).includes('UNIQUE') && input.clientKey) {
      const existing = db.prepare('SELECT id FROM match_events WHERE client_key = ?').get(String(input.clientKey));
      if (existing) return { id: Number(existing.id), duplicate: true };
    }
    throw error;
  }
}

export function correctEvent(db, actor, matchId, eventId, input) {
  deny(actor, 'match.correct');
  return transaction(db, () => {
    const match = matchRow(db, matchId);
    assertVersion(match, input.version);
    assertNotFinished(match);
    const event = db.prepare('SELECT * FROM match_events WHERE id = ? AND match_id = ?').get(eventId, matchId);
    if (!event || event.voided) throw new RuleError('Event not found.', 404);
    const before = { ...event };
    if (event.type === 'goal') {
      const minute = Number(input.minute ?? event.minute);
      const goalType = String(input.goalType ?? event.goal_type);
      if (!GOAL_TYPES.has(goalType)) throw new RuleError('Choose a goal type.');
      const creditedTeamId = input.side ? sideTeam(match, input.side) : event.credited_team_id;
      const scorerTeamId = goalType === 'own_goal' ? (creditedTeamId === match.home_id ? match.away_id : match.home_id) : creditedTeamId;
      const playerId = input.playerId || event.player_id;
      onPitch(db, match, playerId, scorerTeamId, event.id);
      let assistId = input.assistId === '' ? null : input.assistId ?? event.assist_id;
      if (goalType === 'own_goal') assistId = null;
      if (assistId) {
        if (assistId === playerId) throw new RuleError('The scorer cannot also be the assister.');
        onPitch(db, match, assistId, creditedTeamId, event.id);
      }
      db.prepare(`UPDATE match_events SET team_id=?, credited_team_id=?, player_id=?, assist_id=?, minute=?, added_minute=?, goal_type=?, detail=? WHERE id=?`).run(
        scorerTeamId, creditedTeamId, playerId, assistId, minute, Number(input.addedMinute ?? event.added_minute), goalType, String(input.detail ?? event.detail), event.id,
      );
    } else if (event.type === 'card' || event.type === 'substitution') {
      db.prepare('UPDATE match_events SET minute=?, added_minute=?, detail=? WHERE id=?').run(
        Number(input.minute ?? event.minute), Number(input.addedMinute ?? event.added_minute), String(input.detail ?? event.detail), event.id,
      );
    } else {
      db.prepare('UPDATE match_events SET minute=?, detail=? WHERE id=?').run(Number(input.minute ?? event.minute), String(input.detail ?? event.detail), event.id);
    }
    recomputeScore(db, match.id);
    audit(db, actor, 'event.correct', 'match_event', event.id, before, input);
    return { id: event.id };
  });
}

export function voidEvent(db, actor, matchId, eventId, input) {
  deny(actor, 'match.write');
  if (!can(actor, 'match.correct') && !can(actor, 'match.write')) throw new RuleError('You do not have permission for that action.', 403);
  return transaction(db, () => {
    const match = matchRow(db, matchId);
    assertNotFinished(match);
    if (match.confirmed && !can(actor, 'match.correct')) throw new RuleError('This result is confirmed and locked.');
    assertVersion(match, input.version);
    const event = db.prepare('SELECT * FROM match_events WHERE id = ? AND match_id = ?').get(eventId, matchId);
    if (!event || event.voided) throw new RuleError('Event not found.', 404);
    const reason = String(input.reason ?? '').trim();
    if (reason.length < 3) throw new RuleError('Give a short reason for the correction.');
    db.prepare('UPDATE match_events SET voided = 1, void_reason = ? WHERE id = ?').run(reason, event.id);
    if (input.disallowed && event.type === 'goal') {
      insertEvent(db, match, actor, {
        type: 'note',
        clientKey: `disallow-${event.id}`,
        minute: event.minute,
        addedMinute: event.added_minute,
        period: event.period,
        teamId: event.credited_team_id,
        detail: `Goal disallowed. ${reason}`,
      }, false);
    }
    recomputeScore(db, match.id);
    audit(db, actor, 'event.void', 'match_event', event.id, event, { reason });
    return { id: event.id };
  });
}

export function saveManualStat(db, actor, matchId, input) {
  deny(actor, 'match.write');
  const metric = String(input.metric ?? '');
  const allowed = new Set(['possession', 'shots', 'shots_on_target', 'shots_off_target', 'blocked_shots', 'corners', 'fouls', 'offsides', 'saves', 'passes', 'pass_accuracy']);
  if (!allowed.has(metric)) throw new RuleError('That statistic is not recorded manually.');
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < 0 || value > 1000) throw new RuleError('Enter a valid number.');
  return transaction(db, () => {
    const match = matchRow(db, matchId);
    assertNotFinished(match);
    if (match.confirmed && !can(actor, 'match.correct')) throw new RuleError('This result is confirmed and locked.');
    const teamId = sideTeam(match, input.side);
    db.prepare(`INSERT INTO manual_stats (match_id, team_id, metric, value) VALUES (?, ?, ?, ?)
      ON CONFLICT(match_id, team_id, metric) DO UPDATE SET value = excluded.value`).run(matchId, teamId, metric, value);
    audit(db, actor, 'stat.manual', 'match', matchId, null, { teamId, metric, value });
    return { ok: true };
  });
}

export function controlMatch(db, actor, matchId, input) {
  const action = String(input.action ?? '');
  if (action === 'confirm') deny(actor, 'match.confirm');
  else if (['postpone', 'cancel', 'reschedule'].includes(action)) deny(actor, 'match.schedule');
  else deny(actor, 'match.clock');

  return transaction(db, () => {
    const match = matchRow(db, matchId);
    assertVersion(match, input.version);
    if (match.status === 'finished' && action !== 'confirm') throw new RuleError('A finished match cannot be edited.');
    const now = Date.now();
    const elapsed = freezeElapsed(match, now);
    const rules = rulesOf(db);
    const patch = { status: match.status, period: match.period, elapsed_ms: elapsed, running_since: null, added_ms: match.added_ms, confirmed: match.confirmed };

    const startRunning = (status, period, at) => {
      patch.status = status;
      patch.period = period;
      patch.elapsed_ms = at;
      patch.running_since = now;
      patch.added_ms = 0;
    };

    if (action === 'kickoff') {
      if (!['scheduled', 'postponed'].includes(match.status)) throw new RuleError('This match has already kicked off.');
      const starters = db.prepare(`SELECT team_id, COUNT(*) AS total FROM match_squad WHERE match_id = ? AND role = 'starter' GROUP BY team_id`).all(matchId);
      if (starters.length < 2 || starters.some((row) => row.total < 1)) throw new RuleError('Both teams need a lineup before kickoff.');
      startRunning('live', 'first_half', 0);
    } else if (action === 'pause') {
      if (!match.running_since) throw new RuleError('The clock is already stopped.');
      patch.running_since = null;
    } else if (action === 'resume') {
      if (!['live', 'halftime', 'suspended'].includes(match.status)) throw new RuleError('Resume is for a match in progress.');
      if (match.period === 'halftime') throw new RuleError('Start the second half instead of resuming.');
      patch.status = match.status === 'suspended' ? 'live' : match.status;
      patch.running_since = now;
    } else if (action === 'halftime') {
      if (match.period !== 'first_half') throw new RuleError('Half time is only at the end of the first half.');
      patch.status = 'halftime';
      patch.period = 'halftime';
      patch.elapsed_ms = match.half_ms;
      patch.running_since = null;
      patch.added_ms = 0;
    } else if (action === 'second_half') {
      if (match.period !== 'halftime') throw new RuleError('The second half starts from half time.');
      startRunning('live', 'second_half', match.half_ms);
    } else if (action === 'extra_first') {
      if (!match.allow_extra && !rules.allowExtraTime && !can(actor, 'match.correct')) throw new RuleError('Extra time is not enabled for this match.');
      if (!['second_half', 'full_time'].includes(match.period) && match.status !== 'live') throw new RuleError('Finish regular time before extra time.');
      db.prepare('UPDATE matches SET allow_extra = 1 WHERE id = ?').run(matchId);
      startRunning('live', 'extra_first', match.regulation_ms);
    } else if (action === 'extra_break') {
      if (match.period !== 'extra_first') throw new RuleError('The extra-time break follows the first extra period.');
      patch.status = 'live';
      patch.period = 'extra_break';
      patch.elapsed_ms = match.regulation_ms + match.et_half_ms;
      patch.running_since = null;
    } else if (action === 'extra_second') {
      if (match.period !== 'extra_break') throw new RuleError('Start the second extra period from the break.');
      startRunning('live', 'extra_second', match.regulation_ms + match.et_half_ms);
    } else if (action === 'penalties') {
      if (!match.allow_extra && !can(actor, 'match.correct')) throw new RuleError('Enable extra time before a shootout.');
      patch.status = 'penalties';
      patch.period = 'penalties';
      patch.running_since = null;
    } else if (action === 'full_time') {
      if (['scheduled', 'postponed', 'cancelled'].includes(match.status)) throw new RuleError('Kick off before ending the match.');
      patch.status = 'finished';
      patch.period = 'full_time';
      patch.running_since = null;
      patch.confirmed = 0;
    } else if (action === 'confirm') {
      if (match.status !== 'finished') throw new RuleError('Finish the match before confirming the result.');
      patch.status = 'finished';
      patch.period = 'full_time';
      patch.running_since = null;
      patch.confirmed = 1;
    } else if (action === 'suspend') {
      if (!['live', 'halftime', 'penalties'].includes(match.status)) throw new RuleError('Only a match in progress can be suspended.');
      patch.status = 'suspended';
      patch.running_since = null;
    } else if (action === 'postpone') {
      if (!['scheduled', 'postponed', 'suspended'].includes(match.status)) throw new RuleError('A match that has a result cannot be postponed this way.');
      patch.status = 'postponed';
      patch.period = 'pre';
      patch.elapsed_ms = 0;
      patch.running_since = null;
      patch.confirmed = 0;
    } else if (action === 'cancel') {
      if (match.confirmed) throw new RuleError('Unconfirm the result before cancelling.');
      patch.status = 'cancelled';
      patch.running_since = null;
      patch.confirmed = 0;
    } else if (action === 'abandon') {
      if (match.confirmed) throw new RuleError('A confirmed result cannot be abandoned.');
      patch.status = 'abandoned';
      patch.running_since = null;
      patch.confirmed = 0;
    } else if (action === 'set_clock') {
      if (!can(actor, 'match.clock')) throw new RuleError('You do not have permission for that action.', 403);
      const seconds = Number(input.seconds);
      if (!Number.isFinite(seconds) || seconds < 0 || seconds > 200 * 60) throw new RuleError('Enter a valid clock time.');
      patch.elapsed_ms = Math.round(seconds * 1000);
      patch.running_since = match.running_since ? now : null;
    } else {
      throw new RuleError('Unknown clock action.');
    }

    db.prepare(`UPDATE matches SET status=?, period=?, elapsed_ms=?, running_since=?, added_ms=?, confirmed=?, version=version+1, updated_at=? WHERE id=?`).run(
      patch.status, patch.period, Math.round(patch.elapsed_ms), patch.running_since, patch.added_ms, patch.confirmed ? 1 : 0, now, matchId,
    );
    audit(db, actor, `clock.${action}`, 'match', matchId, { status: match.status, period: match.period, elapsed: match.elapsed_ms }, patch);
    return { id: matchId, status: patch.status, period: patch.period };
  });
}

export function listAudit(db, actor) {
  if (!actor) throw new RuleError('Sign in required.', 401);
  return db.prepare('SELECT id, actor_name, action, entity, entity_id, before_json, after_json, created_at FROM audit_log ORDER BY id DESC LIMIT 200').all();
}

export function listUsers(db, actor) {
  if (actor.role !== 'super_admin') throw new RuleError('Only a super admin can manage users.', 403);
  return db.prepare('SELECT id, username, role, created_at FROM users ORDER BY username').all();
}

export function withRevision(work) {
  const result = work();
  touch();
  return result;
}
