import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { can, hashPassword, ROLES } from './auth.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
import { transaction } from './db.mjs';
import { participation, substitutionCount, yellowCount, checkPlayerSuspension } from './eligibility.mjs';
import {
  getStorageProvider,
  isSupabaseConfigured,
  buildStoragePath,
  validateImageUpload,
  uploadToSupabaseStorage,
  deleteFromSupabaseStorage,
  getOptimizedSupabaseUrl,
  slugify,
  DEFAULT_BUCKET,
} from './supabase-storage.mjs';

export const DEFAULT_RULES = {
  pointsWin: 3,
  pointsDraw: 1,
  halfMinutes: 40,
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
  throw new RuleError('Choose a team.');
}

function periodEndMinute(match) {
  const half = Math.round(Number(match.half_ms) / 60000);
  const regulation = Math.round(Number(match.regulation_ms) / 60000) || half * 2;
  const extra = Math.round(Number(match.et_half_ms) / 60000);
  if (match.period === 'first_half') return half;
  if (match.period === 'second_half') return regulation;
  if (match.period === 'extra_first') return regulation + extra;
  if (match.period === 'extra_second') return regulation + extra * 2;
  return null;
}

function inferPeriod(match, minute) {
  const half = Math.round(Number(match.half_ms) / 60000) || 45;
  const regulation = Math.round(Number(match.regulation_ms) / 60000) || half * 2;
  const extra = Math.round(Number(match.et_half_ms) / 60000) || 15;
  if (minute <= half) return 'first_half';
  if (minute <= regulation) return 'second_half';
  if (minute <= regulation + extra) return 'extra_first';
  return 'extra_second';
}

function splitPlayedMinute(match, minute, addedMinute, period = match.period) {
  const end = periodEndMinute({ ...match, period });
  const at = Number(minute) || 0;
  const added = Number(addedMinute) || 0;
  if (end == null) return { minute: at, addedMinute: added };
  if (added > 0) return { minute: Math.min(at, end), addedMinute: added };
  if (at > end) return { minute: end, addedMinute: at - end };
  return { minute: at, addedMinute: 0 };
}

function ensureSquadPlayer(db, match, playerId, teamId) {
  const squad = db.prepare('SELECT role FROM match_squad WHERE match_id = ? AND player_id = ? AND team_id = ?').get(match.id, playerId, teamId);
  if (!squad) {
    const totalSquad = db.prepare('SELECT COUNT(*) AS total FROM match_squad WHERE match_id = ?').get(match.id);
    if (Number(totalSquad.total) === 0) {
      const player = playerRow(db, playerId);
      if (player && player.team_id === teamId) return player;
    }
    throw new RuleError('That player is not in this team’s squad for the match.');
  }
  return playerRow(db, playerId);
}

function onPitch(db, match, playerId, teamId, beforeId = null) {
  ensureSquadPlayer(db, match, playerId, teamId);
  const state = participation(squadRows(db, match.id).filter((row) => row.team_id === teamId || true), activeEvents(db, match.id, beforeId));
  const player = state.get(playerId);
  if (!player || player.teamId !== teamId) throw new RuleError('That player is not in this team’s squad for the match.');
  if (player.dismissed) throw new RuleError('That player has been sent off.');
  if (match.status !== 'finished' && !player.on) throw new RuleError('That player is not on the pitch.');
  return player;
}

export function seedDatabase(db, source, password) {
  const existing = db.prepare('SELECT COUNT(*) AS total FROM users').get();
  if (Number(existing.total) > 0) return false;
  if (!source) return seedAccount(db, password);

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

    const insertTeam = db.prepare(`INSERT INTO teams (id, name, short_name, college, group_id, color, pitch, coach, crest_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, 'active')`);
    for (const team of source.departments) {
      const localCrest = `/uploads/teams/${team.id}.svg`;
      insertTeam.run(team.id, team.name, team.shortName, team.college, team.group, team.color, team.pitch, localCrest);
    }

    const insertPlayer = db.prepare(`INSERT INTO players (id, team_id, name, position, number, nationality, photo_url, registered, active)
      VALUES (?, ?, ?, ?, ?, '', ?, ?, 1)`);
    for (const player of source.players) {
      const localPhoto = `/uploads/players/${player.id}.svg`;
      insertPlayer.run(player.id, player.departmentId, player.name, player.position, player.number, localPhoto, 1);
    }

    const knownPlayers = new Set(source.players.map((player) => player.id));
    const remember = (player) => {
      if (knownPlayers.has(player.id)) return;
      knownPlayers.add(player.id);
      const localPhoto = `/uploads/players/${player.id}.svg`;
      insertPlayer.run(player.id, player.departmentId, player.name, player.position, player.number, localPhoto, 0);
    };

    const insertMatch = db.prepare(`INSERT INTO matches (
      id, competition_id, group_id, matchday, home_id, away_id, venue, kickoff_date, kickoff_time,
      status, period, elapsed_ms, running_since, added_ms, half_ms, regulation_ms, et_half_ms, allow_extra,
      home_score, away_score, confirmed, formation_home, formation_away, version, updated_at,
      lineup_home_approved, lineup_away_approved
    ) VALUES (?, 'super-cup', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, ?, 0, 0, 0, ?, '4-2-3-1', '4-2-3-1', 1, ?, ?, ?)`);
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
        status !== 'scheduled' ? 1 : 0,
        status !== 'scheduled' ? 1 : 0,
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
    isCaptain: Boolean(player.is_captain),
    photoUrl: player.photo_url,
    goals: stats.goals,
    assists: stats.assists,
    ownGoals: stats.ownGoals,
    yellowCards: stats.yellowCards,
    redCards: stats.redCards,
    appearances: stats.appearances,
    starts: stats.starts,
  };
}

export function ensureFinishedStamps(db) {
  db.prepare(`UPDATE matches SET finished_at = updated_at WHERE status = 'finished' AND finished_at IS NULL`).run();
}

export function ensureNewsStamps(db) {
  const rows = db.prepare('SELECT id FROM news WHERE created_at = 0').all();
  for (const row of rows) {
    const audit = db.prepare(`SELECT created_at FROM audit_log WHERE entity = 'news' AND entity_id = ? ORDER BY created_at DESC LIMIT 1`).get(row.id);
    if (!audit?.created_at) continue;
    db.prepare('UPDATE news SET created_at = ? WHERE id = ? AND created_at = 0').run(Number(audit.created_at), row.id);
  }
}

export function cleanupExpiredMotm(db, now = Date.now(), shouldTouch = true) {
  const matchesWithMotm = db.prepare(`
    SELECT id, matchday, kickoff_date, kickoff_time, status, running_since, finished_at, updated_at, motm_player_id, motm_photo_url
    FROM matches
    WHERE motm_player_id IS NOT NULL AND motm_photo_url IS NOT NULL
  `).all();

  if (!matchesWithMotm.length) return 0;

  const allMatches = db.prepare(`
    SELECT id, matchday, kickoff_date, kickoff_time, status, running_since, finished_at, updated_at
    FROM matches
    ORDER BY kickoff_date ASC, kickoff_time ASC, id ASC
  `).all();

  const expiredMatches = [];

  for (const m of matchesWithMotm) {
    let finishedAt = Number(m.finished_at || 0);
    if (!finishedAt) {
      finishedAt = Number(m.updated_at || 0);
    }

    // 1. 24-hour expiration rule: if 24 hours have elapsed since the match finished
    const isOver24Hours = finishedAt > 0 && (now - finishedAt >= 24 * 60 * 60 * 1000);

    // 2. Next game start rule:
    // If any subsequent session/matchday match has started
    const currentIndex = allMatches.findIndex((item) => item.id === m.id);
    let nextGameStarted = false;

    if (currentIndex !== -1) {
      for (let j = currentIndex + 1; j < allMatches.length; j++) {
        const nextMatch = allMatches[j];
        const isNextSession =
          (nextMatch.matchday != null && m.matchday != null && nextMatch.matchday > m.matchday) ||
          (nextMatch.kickoff_date && m.kickoff_date && nextMatch.kickoff_date > m.kickoff_date) ||
          (j - currentIndex >= 2);

        if (isNextSession) {
          const hasStarted =
            ['live', 'halftime', 'extra_first', 'extra_second', 'penalties', 'finished'].includes(nextMatch.status) ||
            nextMatch.running_since != null;

          if (hasStarted) {
            nextGameStarted = true;
            break;
          }
        }
      }
    }

    if (isOver24Hours || nextGameStarted) {
      expiredMatches.push({
        id: m.id,
        before: { motmPlayerId: m.motm_player_id, motmPhotoUrl: m.motm_photo_url },
        reason: isOver24Hours ? 'expired_24hr' : 'next_game_started',
      });
    }
  }

  if (!expiredMatches.length) return 0;

  const assetsToDelete = [];
  transaction(db, () => {
    for (const item of expiredMatches) {
      const matchId = item.id;
      const prevAsset = db.prepare('SELECT path, bucket, public_id FROM media_assets WHERE entity_type = ? AND entity_id = ? AND category = ?').get('matches', matchId, 'motm');
      if (prevAsset) {
        assetsToDelete.push({ path: prevAsset.path || prevAsset.public_id, bucket: prevAsset.bucket || DEFAULT_BUCKET });
        db.prepare('DELETE FROM media_assets WHERE entity_type = ? AND entity_id = ? AND category = ?').run('matches', matchId, 'motm');
      }
      db.prepare('DELETE FROM media WHERE id = ? OR id LIKE ?').run(`motm/${matchId}`, `motm/${matchId}%`);
      db.prepare('UPDATE matches SET motm_player_id = NULL, motm_photo_url = NULL, version = version + 1, updated_at = ? WHERE id = ?').run(
        Date.now(),
        matchId,
      );
      audit(db, { id: 'system', username: 'system', role: 'system' }, 'match.motm.expire', 'match', matchId, item.before, { reason: item.reason });
    }
  });

  for (const asset of assetsToDelete) {
    if (asset.path) {
      const playerReuse = db.prepare('SELECT COUNT(*) AS total FROM players WHERE photo_url LIKE ?').get(`%${asset.path}%`);
      if (!Number(playerReuse?.total)) {
        deleteFromSupabaseStorage(asset.bucket || DEFAULT_BUCKET, asset.path).catch(() => {});
      }
    }
  }

  if (shouldTouch) {
    touch();
  }
  return expiredMatches.length;
}

export function buildSnapshot(db, now = Date.now()) {
  cleanupExpiredMotm(db, now, false);
  const competition = db.prepare('SELECT * FROM competitions WHERE id = ?').get('super-cup');
  const teams = db.prepare('SELECT * FROM teams ORDER BY name').all();
  const players = db.prepare('SELECT * FROM players').all();
  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff_date, kickoff_time, id').all();
  const events = db.prepare('SELECT * FROM match_events ORDER BY id').all();
  const squads = db.prepare('SELECT * FROM match_squad ORDER BY sort_index').all();
  const stats = db.prepare('SELECT * FROM manual_stats').all();
  const news = db.prepare('SELECT * FROM news ORDER BY created_at DESC, id DESC').all();
  const names = new Map(players.map((player) => [player.id, player.name]));

  const tally = new Map(players.map((player) => [player.id, { goals: 0, assists: 0, ownGoals: 0, yellowCards: 0, redCards: 0, appearances: 0, starts: 0 }]));
  for (const event of events) {
    if (event.voided) continue;
    if (event.type === 'goal' && event.counts_for_score && event.goal_type !== 'own_goal' && tally.has(event.player_id)) {
      tally.get(event.player_id).goals += 1;
    }
    if (event.type === 'goal' && event.counts_for_score && event.goal_type === 'own_goal' && tally.has(event.player_id)) {
      tally.get(event.player_id).ownGoals += 1;
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
      coachPhotoUrl: team.coach_photo_url || '',
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
      fourthReferee: match.fourth_referee,
      streamer: match.streamer || '',
      formationHome: match.formation_home,
      formationAway: match.formation_away,
      lineupHomeApproved: Boolean(match.lineup_home_approved),
      lineupAwayApproved: Boolean(match.lineup_away_approved),
      lineupApproved: Boolean(match.lineup_home_approved && match.lineup_away_approved),
      stage: match.stage || 'group',
      slot: Number(match.slot) || 0,
      version: match.version,
      finishedAt: match.finished_at == null ? null : Number(match.finished_at),
      motmPlayerId: match.motm_player_id || null,
      motmPhotoUrl: match.motm_photo_url || null,
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
    news: news.map((article) => {
      let imageUrls = [];
      try {
        if (article.image_urls) imageUrls = JSON.parse(article.image_urls);
      } catch {}
      if (!Array.isArray(imageUrls) || !imageUrls.length) {
        if (article.image_url) imageUrls = [article.image_url];
        else imageUrls = [];
      }
      return {
        id: article.id,
        title: article.title,
        category: article.category,
        time: article.time_label,
        summary: article.summary,
        body: article.body,
        imageUrl: article.image_url || imageUrls[0] || '',
        imageUrls,
        createdAt: Number(article.created_at) || 0,
      };
    }),
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

function storedImage(input) {
  const image = input?.image;
  if (!image) return null;
  const contentType = String(image.contentType ?? '').toLowerCase().trim();
  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(contentType)) {
    throw new RuleError('Upload a PNG, JPEG, or WebP image.');
  }
  let raw = String(image.data ?? '');
  const comma = raw.indexOf(',');
  if (raw.startsWith('data:') && comma >= 0) raw = raw.slice(comma + 1);
  const bytes = Buffer.from(raw, 'base64');
  if (!bytes.length) throw new RuleError('The image was empty.');
  if (bytes.length > 5_000_000) throw new RuleError('That image is larger than 5 MB.');
  return { contentType, bytes, data: raw };
}

export function saveLocalFile(kind, id, image, subfolder = '') {
  const ext = image.contentType?.includes('svg')
    ? 'svg'
    : image.contentType?.includes('png')
    ? 'png'
    : image.contentType?.includes('webp')
    ? 'webp'
    : 'jpg';
  const cleanId = String(id).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const filename = `${cleanId}.${ext}`;
  const relativeDir = subfolder ? join(kind, subfolder) : kind;

  const publicDir = join(root, 'public', 'uploads', relativeDir);
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(join(publicDir, filename), image.bytes);

  const distDir = join(root, 'dist', 'uploads', relativeDir);
  if (existsSync(join(root, 'dist'))) {
    mkdirSync(distDir, { recursive: true });
    writeFileSync(join(distDir, filename), image.bytes);
  }

  const urlPrefix = subfolder ? `/uploads/${kind}/${subfolder}` : `/uploads/${kind}`;
  return `${urlPrefix}/${filename}?v=${Date.now()}`;
}

export function saveMedia(db, kind, id, image, subfolder = '') {
  db.prepare(`INSERT INTO media (id, content_type, bytes) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes`).run(`${kind}/${id}`, image.contentType, image.bytes);
  try {
    saveLocalFile(kind, id, image, subfolder);
  } catch (err) {
    console.warn('Could not mirror media to local disk:', err?.message);
  }
  return `/api/media/${kind}/${encodeURIComponent(id)}?v=${Date.now()}`;
}

export async function setImage(db, kind, id, image) {
  if (kind === 'players') {
    const player = playerRow(db, id);
    return savePlayer(db, { role: 'competition_manager', id: 'system', username: 'system' }, {
      name: player.name,
      teamId: player.teamId,
      position: player.position,
      number: player.number,
      nationality: player.nationality,
      active: player.active !== false,
      image,
    }, id);
  }
  if (kind === 'coaches') {
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(id);
    if (!team) throw new RuleError('Team not found.', 404);
    const url = saveMedia(db, 'coaches', id, image, 'coaches');
    db.prepare('UPDATE teams SET coach_photo_url = ? WHERE id = ?').run(url, id);
    return { id, url };
  }
  const table = 'teams';
  const column = 'crest_url';
  return transaction(db, () => {
    if (!db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)) throw new RuleError('Not found.', 404);
    const url = saveLocalFile(kind, id, image);
    try {
      db.prepare('DELETE FROM media WHERE id = ?').run(`teams/${id}`);
    } catch {}
    db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`).run(url, id);
    return { id, url };
  });
}

export function saveTeam(db, actor, input, id) {
  deny(actor, 'team.write');
  const name = String(input.name ?? '').trim();
  const shortName = String(input.shortName ?? '').trim().toUpperCase();
  const group = String(input.group ?? '').trim();
  if (!name || !shortName || !group) throw new RuleError('Name, short name, and group are required.');
  const image = storedImage(input);
  if (!id && !image) throw new RuleError('A team logo is required.');
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
    let crest = before?.crest_url ?? '';
    if (image) {
      crest = saveLocalFile('teams', nowId, image);
      try {
        db.prepare('DELETE FROM media WHERE id = ?').run(`teams/${nowId}`);
      } catch {}
    }
    let coachPhoto = input.coachPhotoUrl !== undefined ? String(input.coachPhotoUrl ?? '') : (before?.coach_photo_url ?? '');
    const coachImage = input.coachImage ? storedImage({ image: input.coachImage }) : (input.coachPhoto ? storedImage({ image: input.coachPhoto }) : null);
    if (coachImage) {
      coachPhoto = saveMedia(db, 'coaches', nowId, coachImage, 'coaches');
    }
    if (id) {
      db.prepare(`UPDATE teams SET name=?, short_name=?, college=?, group_id=?, color=?, pitch=?, coach=?, coach_photo_url=?, crest_url=?, status=? WHERE id=?`).run(
        name, shortName, college, group, color, pitch, coach, coachPhoto, crest, status, id,
      );
    } else {
      db.prepare(`INSERT INTO teams (id, name, short_name, college, group_id, color, pitch, coach, coach_photo_url, crest_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        nowId, name, shortName, college, group, color, pitch, coach, coachPhoto, crest, status,
      );
    }
    audit(db, actor, id ? 'team.update' : 'team.create', 'team', nowId, before, { name, shortName, group });
    return { id: nowId };
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
    if (Number(used.total) > 0) throw new RuleError('Delete or reassign this team’s matches before deleting the team.');
    const roster = db.prepare('SELECT id FROM players WHERE team_id = ?').all(id);
    db.prepare('DELETE FROM media WHERE id = ?').run(`teams/${id}`);
    db.prepare('DELETE FROM media WHERE id = ?').run(`coaches/${id}`);
    for (const player of roster) {
      db.prepare('DELETE FROM media WHERE id = ?').run(`players/${player.id}`);
      const assets = db.prepare('SELECT public_id, path, bucket, provider FROM media_assets WHERE entity_type = ? AND entity_id = ?').all('players', player.id);
      for (const asset of assets) {
        if (asset.provider === 'supabase') deleteFromSupabaseStorage(asset.bucket || DEFAULT_BUCKET, asset.path || asset.public_id).catch(() => {});
      }
      db.prepare('DELETE FROM media_assets WHERE entity_type = ? AND entity_id = ?').run('players', player.id);
    }
    db.prepare('DELETE FROM media_assets WHERE team_id = ?').run(id);
    db.prepare('DELETE FROM players WHERE team_id = ?').run(id);
    const result = db.prepare('DELETE FROM teams WHERE id = ?').run(id);
    if (!result.changes) throw new RuleError('Team not found.', 404);
    audit(db, actor, 'team.delete', 'team', id, null, null);
    return { ok: true };
  });
}

export async function deletePlayer(db, actor, id) {
  deny(actor, 'player.write');
  return transaction(db, () => {
    const before = playerRow(db, id);
    const used = db.prepare('SELECT COUNT(*) AS total FROM match_squad WHERE player_id = ?').get(id);
    if (Number(used.total) > 0) {
      db.prepare('UPDATE players SET active = 0 WHERE id = ?').run(id);
      audit(db, actor, 'player.deactivate', 'player', id, before, { active: 0 });
      return { ok: true, deactivated: true };
    }
    const assets = db.prepare('SELECT public_id, path, bucket, provider FROM media_assets WHERE entity_type = ? AND entity_id = ?').all('players', id);
    for (const asset of assets) {
      if (asset.provider === 'supabase') deleteFromSupabaseStorage(asset.bucket || DEFAULT_BUCKET, asset.path || asset.public_id).catch(() => {});
    }
    db.prepare('DELETE FROM media_assets WHERE entity_type = ? AND entity_id = ?').run('players', id);
    db.prepare('DELETE FROM media WHERE id = ?').run(`players/${id}`);
    const result = db.prepare('DELETE FROM players WHERE id = ?').run(id);
    if (!result.changes) throw new RuleError('Player not found.', 404);
    audit(db, actor, 'player.delete', 'player', id, before, null);
    return { ok: true, deleted: true };
  });
}

export async function savePlayer(db, actor, input, id) {
  deny(actor, 'player.write');
  const name = String(input.name ?? '').trim();
  const teamId = String(input.teamId ?? input.departmentId ?? '').trim();
  const position = String(input.position ?? '').trim();
  const number = Number(input.number);
  if (!name || !teamId || !['GK', 'DEF', 'MID', 'FWD'].includes(position) || !Number.isInteger(number)) {
    throw new RuleError('Name, team, position, and shirt number are required.');
  }
  const image = storedImage(input);
  const team = db.prepare('SELECT id, name, short_name, group_id FROM teams WHERE id = ?').get(teamId);
  if (!team) throw new RuleError('Team not found.', 404);

  const before = id ? playerRow(db, id) : null;
  const playerId = id || `${teamId}-${slug(name)}`;
  if (!id && db.prepare('SELECT id FROM players WHERE id = ?').get(playerId)) throw new RuleError('That player already exists.');
  const taken = db.prepare('SELECT id FROM players WHERE team_id = ? AND number = ? AND id <> ? AND active = 1').get(teamId, number, playerId);
  if (taken) throw new RuleError(`Shirt ${number} is already used on this team.`);

  let photo = before?.photo_url ?? '';
  let uploadedSupabase = null;
  let oldStoragePath = null;
  let oldStorageBucket = null;

  const isCaptain = input.isCaptain !== undefined
    ? (input.isCaptain === true || input.isCaptain === 1 || input.isCaptain === 'true' ? 1 : 0)
    : (before?.is_captain ? 1 : 0);

  if (image) {
    photo = saveMedia(db, 'players', playerId, image, teamId);
  }

  try {
    transaction(db, () => {
      if (isCaptain === 1) {
        db.prepare('UPDATE players SET is_captain = 0 WHERE team_id = ?').run(teamId);
      }
      if (id) {
        db.prepare(`UPDATE players SET team_id=?, name=?, position=?, number=?, nationality=?, photo_url=?, active=?, is_captain=? WHERE id=?`).run(
          teamId, name, position, number, String(input.nationality ?? before.nationality ?? ''), photo, input.active === false ? 0 : 1, isCaptain, id,
        );
      } else {
        db.prepare(`INSERT INTO players (id, team_id, name, position, number, nationality, photo_url, registered, active, is_captain) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`).run(
          playerId, teamId, name, position, number, String(input.nationality ?? ''), photo, isCaptain,
        );
      }

      if (uploadedSupabase) {
        const assetId = `sb_${uploadedSupabase.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        db.prepare(`
          INSERT INTO media_assets (id, provider, bucket, path, public_url, public_id, secure_url, format, bytes, width, height, category, group_id, team_id, entity_type, entity_id, created_at)
          VALUES (?, 'supabase', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'players', ?, ?, 'players', ?, ?)
        `).run(
          assetId,
          uploadedSupabase.bucket,
          uploadedSupabase.path,
          uploadedSupabase.publicUrl,
          uploadedSupabase.path,
          uploadedSupabase.publicUrl,
          uploadedSupabase.format || null,
          uploadedSupabase.bytes || null,
          uploadedSupabase.width || null,
          uploadedSupabase.height || null,
          team.group_id,
          teamId,
          playerId,
          Date.now(),
        );

        if (id) {
          const prev = db.prepare('SELECT path, bucket, public_id FROM media_assets WHERE entity_type = ? AND entity_id = ? AND (path <> ? OR public_id <> ?)').get('players', playerId, uploadedSupabase.path, uploadedSupabase.path);
          if (prev) {
            oldStoragePath = prev.path || prev.public_id;
            oldStorageBucket = prev.bucket || DEFAULT_BUCKET;
            db.prepare('DELETE FROM media_assets WHERE (path = ? OR public_id = ?)').run(oldStoragePath, oldStoragePath);
          }
        }
      } else if (image) {
        const assetId = `local_players_${playerId}_${Date.now()}`;
        db.prepare(`
          INSERT INTO media_assets (id, provider, bucket, path, public_url, public_id, secure_url, format, bytes, width, height, category, group_id, team_id, entity_type, entity_id, created_at)
          VALUES (?, 'local', 'local', ?, ?, ?, ?, ?, ?, ?, ?, 'players', ?, ?, 'players', ?, ?)
        `).run(
          assetId,
          `players/${playerId}`,
          photo,
          `players/${playerId}`,
          photo,
          image.contentType.replace('image/', ''),
          image.bytes.length,
          null,
          null,
          team.group_id,
          teamId,
          playerId,
          Date.now(),
        );
      }

      audit(db, actor, id ? 'player.update' : 'player.create', 'player', id || playerId, before, { name, teamId, position, number, isCaptain: Boolean(isCaptain) });
    });
  } catch (dbError) {
    if (uploadedSupabase) {
      await deleteFromSupabaseStorage(uploadedSupabase.bucket, uploadedSupabase.path).catch(() => {});
    }
    throw dbError;
  }

  if (oldStoragePath) {
    const motmReuse = db.prepare('SELECT COUNT(*) AS total FROM matches WHERE motm_photo_url LIKE ?').get(`%${oldStoragePath}%`);
    if (!Number(motmReuse?.total)) {
      deleteFromSupabaseStorage(oldStorageBucket || DEFAULT_BUCKET, oldStoragePath).catch(() => {});
    }
  }

  return { id: id || playerId };
}

export async function saveNews(db, actor, input, id) {
  deny(actor, 'news.write');
  const title = String(input.title ?? '').trim();
  const summary = String(input.summary ?? '').trim();
  const body = String(input.body ?? '').trim();
  if (!title || !summary || !body) throw new RuleError('Title, summary, and story are required.');
  const articleId = id || slug(title);
  const before = id ? db.prepare('SELECT id, image_url, image_urls FROM news WHERE id = ?').get(id) : null;
  if (id && !before) throw new RuleError('Story not found.', 404);
  if (!id && db.prepare('SELECT id FROM news WHERE id = ?').get(articleId)) throw new RuleError('A story with that title already exists.');

  let finalImageUrls = [];
  if (Array.isArray(input.images)) {
    for (let i = 0; i < input.images.length; i++) {
      const item = input.images[i];
      if (!item) continue;
      if (typeof item === 'string' && !item.startsWith('data:')) {
        finalImageUrls.push(item);
      } else if (item.url && typeof item.url === 'string' && !item.url.startsWith('data:')) {
        finalImageUrls.push(item.url);
      } else {
        const img = storedImage(item.image ? item : { image: item });
        if (img) {
          const mediaId = `${articleId}-${i}-${Date.now().toString(36)}`;
          const url = saveMedia(db, 'news', mediaId, img);
          finalImageUrls.push(url);
        }
      }
    }
  } else if (input.image) {
    const img = storedImage(input);
    if (img) {
      const url = saveMedia(db, 'news', articleId, img);
      finalImageUrls.push(url);
    }
  } else if (before) {
    try {
      if (before.image_urls) finalImageUrls = JSON.parse(before.image_urls);
    } catch {}
    if (!finalImageUrls.length && before.image_url) {
      finalImageUrls = [before.image_url];
    }
  }

  const primaryImageUrl = finalImageUrls[0] || '';

  return transaction(db, () => {
    const fields = [
      title,
      String(input.category ?? 'News').trim() || 'News',
      String(input.time ?? 'Today').trim() || 'Today',
      summary,
      body,
      primaryImageUrl,
      JSON.stringify(finalImageUrls),
    ];
    if (id) db.prepare('UPDATE news SET title=?, category=?, time_label=?, summary=?, body=?, image_url=?, image_urls=? WHERE id=?').run(...fields, id);
    else db.prepare('INSERT INTO news (title, category, time_label, summary, body, image_url, image_urls, id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...fields, articleId, Date.now());
    audit(db, actor, id ? 'news.update' : 'news.create', 'news', id || articleId, null, { title });
    return { id: id || articleId };
  });
}

export function deleteNews(db, actor, id) {
  deny(actor, 'news.write');
  const before = db.prepare('SELECT image_url FROM news WHERE id = ?').get(id);
  if (before?.image_url && before.image_url.includes('/storage/v1/object/public/')) {
    const match = before.image_url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    if (match) {
      deleteFromSupabaseStorage(DEFAULT_BUCKET, match[1]).catch(() => {});
    }
  }
  return transaction(db, () => {
    const result = db.prepare('DELETE FROM news WHERE id = ?').run(id);
    if (!result.changes) throw new RuleError('Story not found.', 404);
    db.prepare('DELETE FROM media WHERE id = ? OR id LIKE ?').run(`news/${id}`, `news/${id}-%`);
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

const MATCH_STAGES = new Set(['group', 'r16', 'qf', 'sf', 'final']);
const KNOCKOUT_TIES = { r16: 8, qf: 4, sf: 2, final: 1 };

function plannedMatch(db, input) {
  const stage = MATCH_STAGES.has(input.stage) ? input.stage : 'group';
  const knockout = stage !== 'group';
  const homeId = String(input.homeId ?? '');
  const awayId = String(input.awayId ?? '');
  if (!homeId || !awayId || homeId === awayId) throw new RuleError('Choose two different teams.');
  const home = db.prepare('SELECT * FROM teams WHERE id = ?').get(homeId);
  const away = db.prepare('SELECT * FROM teams WHERE id = ?').get(awayId);
  if (!home || !away) throw new RuleError('Team not found.', 404);
  if (!knockout && home.group_id !== away.group_id) throw new RuleError('Group matches must be between teams in the same group.');
  const date = String(input.date ?? '');
  const time = String(input.time ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new RuleError('A valid date and kickoff time are required.');
  const slot = Number(input.slot) || 0;
  if (knockout && (!Number.isInteger(slot) || slot < 1 || slot > KNOCKOUT_TIES[stage])) {
    throw new RuleError('Choose a tie in that round.');
  }
  if (knockout) {
    const taken = db.prepare(`SELECT id FROM matches WHERE stage = ? AND slot = ? AND status != 'cancelled'`).get(stage, slot);
    if (taken) throw new RuleError('That tie is already on the calendar.');
  }
  const id = input.id || (knockout
    ? `${stage}-${slot}-${slug(home.short_name)}-${slug(away.short_name)}`
    : `${home.group_id.toLowerCase()}-${slug(home.short_name)}-${slug(away.short_name)}-${date}`);
  if (db.prepare('SELECT id FROM matches WHERE id = ?').get(id)) throw new RuleError('That fixture already exists.');
  return {
    id,
    stage,
    slot: knockout ? slot : 0,
    groupId: knockout ? 'KO' : home.group_id,
    matchday: knockout ? slot : (Number(input.matchday) || 1),
    homeId,
    awayId,
    venue: String(input.venue || home.pitch || 'DDU Main Pitch'),
    date,
    time,
    allowExtra: knockout ? input.allowExtra !== false : Boolean(input.allowExtra),
    halfMinutes: Number(input.halfMinutes) || 0,
    referee: String(input.referee ?? ''),
    assistant1: String(input.assistant1 ?? ''),
    assistant2: String(input.assistant2 ?? ''),
    fourthReferee: String(input.fourthReferee ?? input.fourth_referee ?? ''),
    streamer: String(input.streamer ?? '').trim(),
  };
}

function insertScheduledMatch(db, plan) {
  const rules = rulesOf(db);
  const halfMs = (plan.halfMinutes || rules.halfMinutes) * 60 * 1000;
  const now = Date.now();
  db.prepare(`INSERT INTO matches (
    id, competition_id, group_id, matchday, home_id, away_id, venue, kickoff_date, kickoff_time,
    status, period, elapsed_ms, half_ms, regulation_ms, et_half_ms, allow_extra, referee, assistant1, assistant2, fourth_referee, streamer,
    stage, slot, version, updated_at, lineup_home_approved, lineup_away_approved
  ) VALUES (?, 'super-cup', ?, ?, ?, ?, ?, ?, ?, 'scheduled', 'pre', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, 0)`).run(
    plan.id,
    plan.groupId,
    plan.matchday,
    plan.homeId,
    plan.awayId,
    plan.venue,
    plan.date,
    plan.time,
    halfMs,
    halfMs * 2,
    (rules.extraHalfMinutes || 15) * 60 * 1000,
    plan.allowExtra ? 1 : 0,
    plan.referee,
    plan.assistant1,
    plan.assistant2,
    plan.fourthReferee,
    plan.streamer,
    plan.stage,
    plan.slot,
    now,
  );
  return plan.id;
}

export function createMatch(db, actor, input) {
  deny(actor, 'match.schedule');
  return transaction(db, () => {
    const plan = plannedMatch(db, input);
    insertScheduledMatch(db, plan);
    audit(db, actor, 'match.create', 'match', plan.id, null, { homeId: plan.homeId, awayId: plan.awayId, date: plan.date, time: plan.time, stage: plan.stage, slot: plan.slot });
    return { id: plan.id };
  });
}

function roundRobin(teams) {
  const rotation = [...teams];
  if (rotation.length % 2 === 1) rotation.push(null);
  const rounds = [];
  const count = rotation.length;
  for (let round = 0; round < count - 1; round += 1) {
    const pairs = [];
    for (let index = 0; index < count / 2; index += 1) {
      const home = rotation[index];
      const away = rotation[count - 1 - index];
      if (home && away) pairs.push([home, away]);
    }
    rounds.push(pairs);
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop());
    rotation.splice(0, rotation.length, fixed, ...rest);
  }
  return rounds;
}

function shiftIsoDate(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function scheduleGroupFixtures(db, actor, input) {
  deny(actor, 'match.schedule');
  const date = String(input.date ?? '');
  const time = String(input.time ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new RuleError('A valid date and kickoff time are required.');
  const requested = input.group ? [String(input.group).toUpperCase()] : ['A', 'B', 'C', 'D', 'E', 'F'];
  return transaction(db, () => {
    let created = 0;
    for (const group of requested) {
      const teams = db.prepare(`SELECT * FROM teams WHERE group_id = ? AND status != 'withdrawn' ORDER BY name`).all(group);
      if (teams.length < 2) continue;
      roundRobin(teams).forEach((pairs, index) => {
        const kickoff = shiftIsoDate(date, index * 7);
        for (const [home, away] of pairs) {
          const exists = db.prepare(`SELECT id FROM matches WHERE COALESCE(stage, 'group') = 'group' AND status != 'cancelled' AND ((home_id = ? AND away_id = ?) OR (home_id = ? AND away_id = ?))`).get(home.id, away.id, away.id, home.id);
          if (exists) continue;
          insertScheduledMatch(db, plannedMatch(db, {
            stage: 'group',
            homeId: home.id,
            awayId: away.id,
            date: kickoff,
            time,
            venue: home.pitch,
            matchday: index + 1,
          }));
          created += 1;
        }
      });
    }
    audit(db, actor, 'match.round', 'competition', 'super-cup', null, { created, groups: requested });
    return { created };
  });
}

export function updateMatch(db, actor, id, input) {
  if (!can(actor, 'match.schedule') && !can(actor, 'match.write')) {
    throw new RuleError('You do not have permission to update matches.', 403);
  }
  return transaction(db, () => {
    const match = matchRow(db, id);
    assertVersion(match, input.version);
    if (match.confirmed && actor.role === 'match_admin') {
      throw new RuleError('This match is confirmed and cannot be edited by a match admin.', 403);
    }
    if (match.status === 'finished' && !can(actor, 'match.correct') && !can(actor, 'match.schedule')) {
      throw new RuleError('A finished match cannot be edited, or ask a competition manager.');
    }
    if (match.confirmed && !can(actor, 'match.correct') && !can(actor, 'match.schedule')) {
      throw new RuleError('This result is confirmed and locked.');
    }
    if (match.status !== 'scheduled' && match.status !== 'postponed' && !can(actor, 'match.correct') && !can(actor, 'match.schedule')) {
      throw new RuleError('Reschedule the match before it kicks off, or ask a competition manager.');
    }
    const rawMatchday = input.matchday != null ? Number(input.matchday) : match.matchday;
    const matchday = Number.isInteger(rawMatchday) && rawMatchday > 0 ? rawMatchday : match.matchday;
    const date = String(input.date ?? match.kickoff_date);
    const time = String(input.time ?? match.kickoff_time);
    const venue = String(input.venue ?? match.venue);
    const referee = String(input.referee ?? match.referee);
    const assistant1 = String(input.assistant1 ?? match.assistant1);
    const assistant2 = String(input.assistant2 ?? match.assistant2);
    const fourthReferee = String(input.fourthReferee ?? input.fourth_referee ?? match.fourth_referee ?? '');
    const streamer = String(input.streamer ?? match.streamer ?? '').trim();
    const allowExtra = input.allowExtra == null ? match.allow_extra : input.allowExtra ? 1 : 0;
    const halfMinutes = Number(input.halfMinutes);
    const halfMs = Number.isFinite(halfMinutes) && halfMinutes > 0 ? halfMinutes * 60 * 1000 : match.half_ms;
    db.prepare(`UPDATE matches SET matchday=?, kickoff_date=?, kickoff_time=?, venue=?, referee=?, assistant1=?, assistant2=?, fourth_referee=?, streamer=?, allow_extra=?, half_ms=?, regulation_ms=?, version=version+1, updated_at=? WHERE id=?`).run(
      matchday, date, time, venue, referee, assistant1, assistant2, fourthReferee, streamer, allowExtra, halfMs, halfMs * 2, Date.now(), id,
    );
    audit(db, actor, 'match.update', 'match', id,
      { matchday: match.matchday, date: match.kickoff_date, time: match.kickoff_time, venue: match.venue, streamer: match.streamer },
      { matchday, date, time, venue, streamer }
    );
    return { id };
  });
}

export function deleteMatch(db, actor, id) {
  if (actor.role !== 'super_admin') {
    throw new RuleError('Only a Super Admin can delete matches.', 403);
  }
  return transaction(db, () => {
    const match = matchRow(db, id);
    db.prepare('DELETE FROM match_events WHERE match_id = ?').run(id);
    db.prepare('DELETE FROM match_squad WHERE match_id = ?').run(id);
    db.prepare('DELETE FROM manual_stats WHERE match_id = ?').run(id);
    const result = db.prepare('DELETE FROM matches WHERE id = ?').run(id);
    if (!result.changes) throw new RuleError('Match not found.', 404);
    audit(db, actor, 'match.delete', 'match', id, { homeId: match.home_id, awayId: match.away_id, date: match.kickoff_date }, null);
    return { id, deleted: true };
  });
}

export function saveLineup(db, actor, matchId, input) {
  deny(actor, 'lineup.write');
  const teamId = String(input.teamId ?? '');
  return transaction(db, () => {
    const match = matchRow(db, matchId);
    assertVersion(match, input.version);
    assertNotFinished(match);
    if (teamId !== match.home_id && teamId !== match.away_id) throw new RuleError('That team is not in this match.');
    const formationCol = teamId === match.home_id ? 'formation_home' : 'formation_away';
    const approvedCol = teamId === match.home_id ? 'lineup_home_approved' : 'lineup_away_approved';

    if (input.action === 'approve') {
      if (actor.role !== 'super_admin' && actor.role !== 'competition_manager' && actor.role !== 'match_admin') {
        throw new RuleError('Lineup approval requires Super Admin or Match Admin privileges.', 403);
      }
      const starters = db.prepare(`SELECT COUNT(*) AS total FROM match_squad WHERE match_id = ? AND team_id = ? AND role = 'starter'`).get(matchId, teamId);
      if (!starters || starters.total < 11) throw new RuleError('Fill all 11 starter positions before approving the lineup.');
      db.prepare(`UPDATE matches SET ${approvedCol} = 1, version = version + 1, updated_at = ? WHERE id = ?`).run(Date.now(), matchId);
      audit(db, actor, 'lineup.approve', 'match', matchId, null, { teamId, approved: true });
      return { id: matchId };
    }

    if (input.action === 'unapprove' || input.action === 'revoke') {
      if (actor.role !== 'super_admin' && actor.role !== 'competition_manager' && actor.role !== 'match_admin') {
        throw new RuleError('Revoking lineup approval requires Super Admin or Match Admin privileges.', 403);
      }
      db.prepare(`UPDATE matches SET ${approvedCol} = 0, version = version + 1, updated_at = ? WHERE id = ?`).run(Date.now(), matchId);
      audit(db, actor, 'lineup.unapprove', 'match', matchId, null, { teamId, approved: false });
      return { id: matchId };
    }

    const formation = String(input.formation ?? match[formationCol] ?? '4-2-3-1').trim();
    if (input.action === 'set_formation') {
      db.prepare(`UPDATE matches SET ${formationCol} = ?, version = version + 1, updated_at = ? WHERE id = ?`).run(formation, Date.now(), matchId);
      audit(db, actor, 'lineup.formation', 'match', matchId, null, { teamId, formation });
      return { id: matchId, formation };
    }

    if (input.action === 'update_bench') {
      const rawBench = Array.isArray(input.bench) ? input.bench : [];
      const currentStarters = db.prepare(`SELECT player_id FROM match_squad WHERE match_id = ? AND team_id = ? AND role = 'starter' ORDER BY sort_index`).all(matchId, teamId).map((r) => r.player_id);
      const bench = [...new Set(rawBench.filter((id) => id != null && String(id).trim() !== '' && !currentStarters.includes(id)).map(String))];

      for (const playerId of bench) ensureSquadPlayerSafe(db, playerId, teamId, matchId);

      if (match.status !== 'scheduled') {
        const existingEvents = activeEvents(db, matchId).filter((e) => e.team_id === teamId);
        const requiredPlayerIds = new Set();
        for (const ev of existingEvents) {
          if (ev.player_id) requiredPlayerIds.add(ev.player_id);
          if (ev.related_player_id) requiredPlayerIds.add(ev.related_player_id);
        }
        const allSquadIds = new Set([...currentStarters, ...bench]);
        for (const pid of requiredPlayerIds) {
          if (!allSquadIds.has(pid)) {
            const p = db.prepare('SELECT name FROM players WHERE id = ?').get(pid);
            throw new RuleError(`Cannot remove ${p?.name || 'player'} because they have already participated in this match.`);
          }
        }
      }

      db.prepare(`DELETE FROM match_squad WHERE match_id = ? AND team_id = ? AND role = 'bench'`).run(matchId, teamId);
      const insert = db.prepare('INSERT INTO match_squad (match_id, team_id, player_id, role, sort_index) VALUES (?, ?, ?, ?, ?)');
      bench.forEach((playerId, index) => insert.run(matchId, teamId, playerId, 'bench', index));

      db.prepare(`UPDATE matches SET version = version + 1, updated_at = ? WHERE id = ?`).run(Date.now(), matchId);
      audit(db, actor, 'lineup.bench', 'match', matchId, null, { teamId, bench });
      return { id: matchId, bench };
    }

    const rawStarters = Array.isArray(input.starters) ? input.starters : [];
    const starters = [...new Set(rawStarters.filter((id) => id != null && String(id).trim() !== '').map(String))];
    const rawBench = Array.isArray(input.bench) ? input.bench : [];
    const bench = [...new Set(rawBench.filter((id) => id != null && String(id).trim() !== '' && !starters.includes(id)).map(String))];

    const isApproving = input.approved === true;
    if (isApproving) {
      if (actor.role !== 'super_admin' && actor.role !== 'competition_manager' && actor.role !== 'match_admin') {
        throw new RuleError('Lineup approval requires Super Admin or Match Admin privileges.', 403);
      }
      if (starters.length < 11) throw new RuleError('Fill all 11 starter positions before approving the lineup.');
      if (starters.length > 11) throw new RuleError('A team can start at most 11 players.');
      starters.forEach((playerId) => ensureSquadPlayerSafe(db, playerId, teamId, matchId));
    } else {
      if (starters.length > 11) throw new RuleError('A team can start at most 11 players.');
      starters.forEach((playerId) => ensureSquadPlayerSafe(db, playerId, teamId, matchId));
    }
    for (const playerId of bench) ensureSquadPlayerSafe(db, playerId, teamId, matchId);

    if (match.status !== 'scheduled') {
      const existingEvents = activeEvents(db, matchId).filter((e) => e.team_id === teamId);
      const requiredPlayerIds = new Set();
      for (const ev of existingEvents) {
        if (ev.player_id) requiredPlayerIds.add(ev.player_id);
        if (ev.related_player_id) requiredPlayerIds.add(ev.related_player_id);
      }
      const allSquadIds = new Set([...starters, ...bench]);
      for (const pid of requiredPlayerIds) {
        if (!allSquadIds.has(pid)) {
          const p = db.prepare('SELECT name FROM players WHERE id = ?').get(pid);
          throw new RuleError(`Cannot remove ${p?.name || 'player'} because they have already participated in this match.`);
        }
      }
    }

    db.prepare('DELETE FROM match_squad WHERE match_id = ? AND team_id = ?').run(matchId, teamId);
    const insert = db.prepare('INSERT INTO match_squad (match_id, team_id, player_id, role, sort_index) VALUES (?, ?, ?, ?, ?)');
    starters.forEach((playerId, index) => insert.run(matchId, teamId, playerId, 'starter', index));
    bench.forEach((playerId, index) => insert.run(matchId, teamId, playerId, 'bench', index));

    const approvedVal = isApproving ? 1 : (input.approved === false ? (match.status !== 'scheduled' ? 1 : 0) : (match[approvedCol] || 0));
    db.prepare(`UPDATE matches SET ${formationCol} = ?, ${approvedCol} = ?, version = version + 1, updated_at = ? WHERE id = ?`).run(formation, approvedVal, Date.now(), matchId);
    audit(db, actor, 'lineup.update', 'match', matchId, null, { teamId, starters, bench, formation, approved: Boolean(approvedVal) });
    return { id: matchId, formation, approved: Boolean(approvedVal) };
  });
}

function formationRoles(formation) {
  const clean = String(formation ?? '').split(' ')[0].trim();
  const counts = clean.split('-').map((part) => Number(part)).filter((count) => Number.isInteger(count) && count > 0);
  const shape = counts.length >= 2 ? counts : [4, 3, 3];
  const roles = ['GK', ...Array.from({ length: shape[0] }, () => 'DEF')];
  shape.slice(1, -1).forEach((count) => roles.push(...Array.from({ length: count }, () => 'MID')));
  roles.push(...Array.from({ length: shape[shape.length - 1] }, () => 'FWD'));
  return roles;
}

function ensureSquadPlayerSafe(db, playerId, teamId, matchId) {
  const player = playerRow(db, playerId);
  if (player.team_id !== teamId || !player.active) throw new RuleError(`${player.name} is not an active player for this team.`);
  if (matchId) {
    const teamMatches = db.prepare('SELECT * FROM matches WHERE home_id = ? OR away_id = ?').all(teamId, teamId);
    const events = db.prepare('SELECT * FROM match_events WHERE voided = 0').all();
    const check = checkPlayerSuspension(teamMatches, events, playerId, matchId);
    if (check.suspended) {
      throw new RuleError(`Cannot add ${player.name} to lineup: ${check.detail}`);
    }
  }
  return player;
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
      const rawMinute = input.minute == null ? clock.minute : Number(input.minute);
      const rawAdded = input.addedMinute == null ? 0 : Number(input.addedMinute);
      const targetPeriod = input.period || (match.status === 'finished' ? inferPeriod(match, rawMinute) : match.period);
      const stamped = splitPlayedMinute(match, rawMinute, rawAdded, targetPeriod);
      const minute = stamped.minute;
      const addedMinute = stamped.addedMinute;
      if (!Number.isInteger(minute) || minute < 0 || minute > 150) throw new RuleError('Enter a valid match minute.');
      if (!Number.isInteger(addedMinute) || addedMinute < 0 || addedMinute > 30) throw new RuleError('Enter a valid added-time minute.');
      const base = { ...input, minute, addedMinute, period: targetPeriod, clientKey: input.clientKey || randomUUID() };

      if (type === 'goal') {
        if (match.status !== 'finished') {
          requireLivePeriod(match);
          if (match.period === 'penalties') throw new RuleError('Shootout kicks are recorded separately from the match score.');
        }
        const goalType = String(input.goalType || 'open_play');
        if (!GOAL_TYPES.has(goalType)) throw new RuleError('Choose a goal type.');
        const creditedTeamId = sideTeam(match, input.side || (input.creditedTeamId === match.away_id ? 'away' : 'home'));
        const scorerTeamId = goalType === 'own_goal' ? (creditedTeamId === match.home_id ? match.away_id : match.home_id) : creditedTeamId;
        if (!input.playerId) throw new RuleError('Choose the scorer.');
        if (match.status !== 'finished') {
          onPitch(db, match, input.playerId, scorerTeamId);
        } else {
          ensureSquadPlayer(db, match, input.playerId, scorerTeamId);
        }
        let assistId = input.assistId || null;
        if (goalType === 'own_goal') assistId = null;
        if (assistId) {
          if (assistId === input.playerId) throw new RuleError('The scorer cannot also be the assister.');
          if (match.status !== 'finished') {
            onPitch(db, match, assistId, creditedTeamId);
          } else {
            ensureSquadPlayer(db, match, assistId, creditedTeamId);
          }
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
        if (match.status !== 'finished') requireLivePeriod(match);
        let cardType = String(input.cardType || '');
        if (!['yellow', 'second_yellow', 'red'].includes(cardType)) throw new RuleError('Choose a card.');
        const teamId = sideTeam(match, input.side);
        if (!input.playerId) throw new RuleError('Choose the player.');
        if (match.status !== 'finished') {
          onPitch(db, match, input.playerId, teamId);
        } else {
          ensureSquadPlayer(db, match, input.playerId, teamId);
        }
        const yellows = yellowCount(activeEvents(db, match.id), input.playerId);
        if (cardType === 'yellow' && yellows >= 1) cardType = 'second_yellow';
        if (cardType === 'second_yellow' && yellows < 1) throw new RuleError('A second yellow needs one yellow card first.');
        const saved = insertEvent(db, match, actor, { ...base, type: 'card', teamId, playerId: input.playerId, cardType }, false);
        if (!saved.duplicate) audit(db, actor, 'card.record', 'match', match.id, null, { cardType, playerId: input.playerId, minute });
        return saved;
      }

      if (type === 'substitution') {
        if (match.status !== 'finished') {
          requireLivePeriod(match);
          if (match.period === 'penalties') throw new RuleError('Substitutions are closed in the shootout.');
        }
        const teamId = sideTeam(match, input.side);
        if (!input.playerId || !input.relatedPlayerId) throw new RuleError('Choose the player leaving and the player coming on.');
        if (input.playerId === input.relatedPlayerId) throw new RuleError('Choose two different players.');
        if (match.status !== 'finished') {
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
        } else {
          ensureSquadPlayer(db, match, input.playerId, teamId);
          ensureSquadPlayer(db, match, input.relatedPlayerId, teamId);
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
        const end = periodEndMinute(match);
        const saved = insertEvent(db, match, actor, { ...base, type: 'added_time', minute: end ?? clock.minute, addedMinute: minutes, detail: `Added time ${minutes}` }, false);
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
  if (!can(actor, 'match.correct') && !can(actor, 'match.write')) throw new RuleError('You do not have permission for that action.', 403);
  return transaction(db, () => {
    const match = matchRow(db, matchId);
    assertVersion(match, input.version);
    if (match.confirmed && !can(actor, 'match.correct')) throw new RuleError('This result is confirmed and locked.');
    const event = db.prepare('SELECT * FROM match_events WHERE id = ? AND match_id = ?').get(eventId, matchId);
    if (!event || event.voided) throw new RuleError('Event not found.', 404);
    const before = { ...event };
    if (event.type === 'goal') {
      const stamped = splitPlayedMinute(match, Number(input.minute ?? event.minute), Number(input.addedMinute ?? event.added_minute) || 0, event.period);
      const minute = stamped.minute;
      const goalType = String(input.goalType ?? event.goal_type);
      if (!GOAL_TYPES.has(goalType)) throw new RuleError('Choose a goal type.');
      const creditedTeamId = input.side ? sideTeam(match, input.side) : event.credited_team_id;
      const scorerTeamId = goalType === 'own_goal' ? (creditedTeamId === match.home_id ? match.away_id : match.home_id) : creditedTeamId;
      const playerId = input.playerId || event.player_id;
      if (match.status !== 'finished') {
        onPitch(db, match, playerId, scorerTeamId, event.id);
      } else {
        ensureSquadPlayer(db, match, playerId, scorerTeamId);
      }
      let assistId = input.assistId === '' ? null : input.assistId ?? event.assist_id;
      if (goalType === 'own_goal') assistId = null;
      if (assistId) {
        if (assistId === playerId) throw new RuleError('The scorer cannot also be the assister.');
        if (match.status !== 'finished') {
          onPitch(db, match, assistId, creditedTeamId, event.id);
        } else {
          ensureSquadPlayer(db, match, assistId, creditedTeamId);
        }
      }
      db.prepare(`UPDATE match_events SET team_id=?, credited_team_id=?, player_id=?, assist_id=?, minute=?, added_minute=?, goal_type=?, detail=? WHERE id=?`).run(
        scorerTeamId, creditedTeamId, playerId, assistId, minute, stamped.addedMinute, goalType, String(input.detail ?? event.detail), event.id,
      );
    } else if (event.type === 'card') {
      const stamped = splitPlayedMinute(match, Number(input.minute ?? event.minute), Number(input.addedMinute ?? event.added_minute) || 0, event.period);
      const minute = stamped.minute;
      let cardType = String(input.cardType ?? event.card_type ?? 'yellow');
      if (!['yellow', 'second_yellow', 'red'].includes(cardType)) throw new RuleError('Choose a card type.');
      const teamId = input.side ? sideTeam(match, input.side) : (input.teamId || event.team_id);
      const playerId = input.playerId || event.player_id;
      if (!playerId) throw new RuleError('Choose the player.');
      if (match.status !== 'finished') {
        onPitch(db, match, playerId, teamId, event.id);
      } else {
        ensureSquadPlayer(db, match, playerId, teamId);
      }
      const yellows = yellowCount(activeEvents(db, match.id, event.id), playerId);
      if (cardType === 'yellow' && yellows >= 1) cardType = 'second_yellow';
      if (cardType === 'second_yellow' && yellows < 1) throw new RuleError('A second yellow needs one yellow card first.');
      db.prepare('UPDATE match_events SET team_id=?, player_id=?, card_type=?, minute=?, added_minute=?, detail=? WHERE id=?').run(
        teamId, playerId, cardType, minute, stamped.addedMinute, String(input.detail ?? event.detail), event.id,
      );
    } else if (event.type === 'substitution') {
      const stamped = splitPlayedMinute(match, Number(input.minute ?? event.minute), Number(input.addedMinute ?? event.added_minute) || 0, event.period);
      const minute = stamped.minute;
      const teamId = input.side ? sideTeam(match, input.side) : (input.teamId || event.team_id);
      const playerId = input.playerId || event.player_id;
      const relatedPlayerId = input.relatedPlayerId || event.related_player_id;
      if (!playerId || !relatedPlayerId) throw new RuleError('Choose the player leaving and the player coming on.');
      if (playerId === relatedPlayerId) throw new RuleError('Choose two different players.');
      ensureSquadPlayer(db, match, playerId, teamId);
      ensureSquadPlayer(db, match, relatedPlayerId, teamId);
      db.prepare('UPDATE match_events SET team_id=?, player_id=?, related_player_id=?, minute=?, added_minute=?, detail=? WHERE id=?').run(
        teamId, playerId, relatedPlayerId, minute, stamped.addedMinute, String(input.detail ?? event.detail), event.id,
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
      if (!match.lineup_home_approved || !match.lineup_away_approved) throw new RuleError('Both teams need an approved lineup before kickoff.');
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
      patch.added_ms = 0;
    } else if (action === 'extra_second') {
      if (match.period !== 'extra_break') throw new RuleError('Start the second extra period from the break.');
      startRunning('live', 'extra_second', match.regulation_ms + match.et_half_ms);
    } else if (action === 'penalties') {
      if (!match.allow_extra && !can(actor, 'match.correct')) throw new RuleError('Enable extra time before a shootout.');
      patch.status = 'penalties';
      patch.period = 'penalties';
      patch.running_since = null;
      patch.added_ms = 0;
    } else if (action === 'full_time') {
      if (['scheduled', 'postponed', 'cancelled'].includes(match.status)) throw new RuleError('Kick off before ending the match.');
      patch.status = 'finished';
      patch.period = 'full_time';
      patch.running_since = null;
      patch.added_ms = 0;
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

    db.prepare(`UPDATE matches SET status=?, period=?, elapsed_ms=?, running_since=?, added_ms=?, confirmed=?, finished_at=COALESCE(finished_at, ?), version=version+1, updated_at=? WHERE id=?`).run(
      patch.status, patch.period, Math.round(patch.elapsed_ms), patch.running_since, patch.added_ms, patch.confirmed ? 1 : 0, action === 'full_time' ? now : null, now, matchId,
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
  if (result && typeof result.then === 'function') {
    return result.then((res) => {
      touch();
      return res;
    });
  }
  touch();
  return result;
}

export async function saveManOfTheMatch(db, actor, matchId, input) {
  deny(actor, 'match.write');
  const match = matchRow(db, matchId);
  assertVersion(match, input.version);

  const before = {
    motmPlayerId: match.motm_player_id || null,
    motmPhotoUrl: match.motm_photo_url || null,
  };

  if (!input.playerId) {
    let oldMotmPath = null;
    let oldMotmBucket = null;
    transaction(db, () => {
      const prevAsset = db.prepare('SELECT path, bucket, public_id FROM media_assets WHERE entity_type = ? AND entity_id = ? AND category = ?').get('matches', matchId, 'motm');
      if (prevAsset) {
        oldMotmPath = prevAsset.path || prevAsset.public_id;
        oldMotmBucket = prevAsset.bucket || DEFAULT_BUCKET;
        db.prepare('DELETE FROM media_assets WHERE entity_type = ? AND entity_id = ? AND category = ?').run('matches', matchId, 'motm');
      }
      db.prepare('UPDATE matches SET motm_player_id = NULL, motm_photo_url = NULL, version = version + 1, updated_at = ? WHERE id = ?').run(
        Date.now(),
        matchId,
      );
      audit(db, actor, 'match.motm.remove', 'match', matchId, before, null);
    });
    if (oldMotmPath) {
      const playerReuse = db.prepare('SELECT COUNT(*) AS total FROM players WHERE photo_url LIKE ?').get(`%${oldMotmPath}%`);
      if (!Number(playerReuse?.total)) {
        await deleteFromSupabaseStorage(oldMotmBucket || DEFAULT_BUCKET, oldMotmPath).catch(() => {});
      }
    }
    return { ok: true, motmPlayerId: null, motmPhotoUrl: null };
  }

  if (match.status !== 'finished') {
    throw new RuleError('Man of the Match can only be awarded for completed matches.');
  }

  const playerId = String(input.playerId).trim();
  const player = playerRow(db, playerId);

  if (player.team_id !== match.home_id && player.team_id !== match.away_id) {
    throw new RuleError('The selected player does not belong to either participating team.');
  }

  const team = db.prepare('SELECT id, name, short_name, group_id FROM teams WHERE id = ?').get(player.team_id);
  const image = input.image ? storedImage(input) : null;
  let photoUrl = null;
  let uploadedSupabase = null;
  let oldMotmPath = null;
  let oldMotmBucket = null;

  if (image) {
    photoUrl = saveMedia(db, 'motm', `${matchId}-${player.id}`, image);
  } else if (input.photoUrl) {
    let clean = String(input.photoUrl).trim();
    if (!clean.startsWith('http') && !clean.startsWith('/')) {
      clean = `/uploads/motm/${clean}`;
    }
    photoUrl = clean;
  } else if (match.motm_photo_url && match.motm_player_id === player.id) {
    photoUrl = match.motm_photo_url;
  }

  if (!photoUrl) {
    throw new RuleError('A photograph of the Man of the Match is required.');
  }

  try {
    transaction(db, () => {
      db.prepare('UPDATE matches SET motm_player_id = ?, motm_photo_url = ?, version = version + 1, updated_at = ? WHERE id = ?').run(
        player.id,
        photoUrl,
        Date.now(),
        matchId,
      );

      if (uploadedSupabase) {
        const assetId = `sb_${uploadedSupabase.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        db.prepare(`
          INSERT INTO media_assets (id, provider, bucket, path, public_url, public_id, secure_url, format, bytes, width, height, category, group_id, team_id, entity_type, entity_id, created_at)
          VALUES (?, 'supabase', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'motm', ?, ?, 'matches', ?, ?)
        `).run(
          assetId,
          uploadedSupabase.bucket,
          uploadedSupabase.path,
          uploadedSupabase.publicUrl,
          uploadedSupabase.path,
          uploadedSupabase.publicUrl,
          uploadedSupabase.format || null,
          uploadedSupabase.bytes || null,
          uploadedSupabase.width || null,
          uploadedSupabase.height || null,
          team?.group_id || null,
          player.team_id,
          matchId,
          Date.now(),
        );

        const prev = db.prepare('SELECT path, bucket, public_id FROM media_assets WHERE entity_type = ? AND entity_id = ? AND category = ? AND (path <> ? OR public_id <> ?)').get('matches', matchId, 'motm', uploadedSupabase.path, uploadedSupabase.path);
        if (prev) {
          oldMotmPath = prev.path || prev.public_id;
          oldMotmBucket = prev.bucket || DEFAULT_BUCKET;
          db.prepare('DELETE FROM media_assets WHERE entity_type = ? AND entity_id = ? AND category = ? AND (path = ? OR public_id = ?)').run('matches', matchId, 'motm', oldMotmPath, oldMotmPath);
        }
      } else if (image) {
        const assetId = `local_motm_${matchId}_${Date.now()}`;
        db.prepare(`
          INSERT INTO media_assets (id, provider, bucket, path, public_url, public_id, secure_url, format, bytes, width, height, category, group_id, team_id, entity_type, entity_id, created_at)
          VALUES (?, 'local', 'local', ?, ?, ?, ?, ?, ?, ?, ?, 'motm', ?, ?, 'matches', ?, ?)
        `).run(
          assetId,
          `motm/${matchId}`,
          photoUrl,
          `motm/${matchId}`,
          photoUrl,
          image.contentType.replace('image/', ''),
          image.bytes.length,
          null,
          null,
          team?.group_id || null,
          player.team_id,
          matchId,
          Date.now(),
        );
      }

      const after = { motmPlayerId: player.id, motmPhotoUrl: photoUrl };
      audit(db, actor, 'match.motm.set', 'match', matchId, before, after);
    });
  } catch (dbError) {
    if (uploadedSupabase) {
      await deleteFromSupabaseStorage(uploadedSupabase.bucket, uploadedSupabase.path).catch(() => {});
    }
    throw dbError;
  }

  if (oldMotmPath) {
    const playerReuse = db.prepare('SELECT COUNT(*) AS total FROM players WHERE photo_url LIKE ?').get(`%${oldMotmPath}%`);
    if (!Number(playerReuse?.total)) {
      deleteFromSupabaseStorage(oldMotmBucket || DEFAULT_BUCKET, oldMotmPath).catch(() => {});
    }
  }

  return { ok: true, motmPlayerId: player.id, motmPhotoUrl: photoUrl };
}
