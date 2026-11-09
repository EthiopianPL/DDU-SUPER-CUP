import {
  fixtures,
  players,
  matchEvents,
  departments,
  cardTeam,
  type Fixture,
  type Player,
  type Department,
  type MatchEventRecord,
} from './supercup';

export interface PlayerMatchStats {
  goals: number;
  assists: number;
  cleanSheet: boolean;
  yellowCard: boolean;
  redCard: boolean;
  summaryPills: string[];
}

export interface MatchdayHighlight {
  matchId: string;
  fixture: Fixture;
  matchday: number;
  stage: string;
  date: string;
  player: Player;
  photoUrl: string;
  department: Department;
  opponent: Department;
  homeTeam: ReturnType<typeof cardTeam>;
  awayTeam: ReturnType<typeof cardTeam>;
  homeScore: number;
  awayScore: number;
  stats: PlayerMatchStats;
}

/**
 * Computes individual player match statistics for a completed fixture.
 */
export function getPlayerMatchStats(
  fixture: Fixture,
  player: Player,
  eventPool: MatchEventRecord[] = matchEvents,
): PlayerMatchStats {
  const isHome = player.departmentId === fixture.homeId;
  const opponentScore = isHome ? (fixture.awayScore ?? 0) : (fixture.homeScore ?? 0);

  // Goals in this match
  const goals = eventPool.filter(
    (e) =>
      e.matchId === fixture.id &&
      !e.voided &&
      e.type === 'goal' &&
      e.countsForScore &&
      !e.shootout &&
      e.playerId === player.id &&
      e.goalType !== 'own_goal',
  ).length;

  // Assists in this match
  const assists = eventPool.filter(
    (e) =>
      e.matchId === fixture.id &&
      !e.voided &&
      e.type === 'goal' &&
      e.countsForScore &&
      !e.shootout &&
      e.assistId === player.id,
  ).length;

  // Cards in this match
  const yellowCard = eventPool.some(
    (e) =>
      e.matchId === fixture.id &&
      !e.voided &&
      e.type === 'card' &&
      e.playerId === player.id &&
      e.cardType === 'yellow',
  );

  const redCard = eventPool.some(
    (e) =>
      e.matchId === fixture.id &&
      !e.voided &&
      e.type === 'card' &&
      e.playerId === player.id &&
      (e.cardType === 'red' || e.cardType === 'second_yellow'),
  );

  // Clean sheet (for GK or DEF when opponent scored 0)
  const cleanSheet =
    (player.position === 'GK' || player.position === 'DEF') &&
    opponentScore === 0 &&
    (fixture.status === 'finished' || fixture.detail === 'finished');

  const summaryPills: string[] = [];
  if (goals > 0) {
    summaryPills.push(`⚽ ${goals} ${goals === 1 ? 'Goal' : 'Goals'}`);
  }
  if (assists > 0) {
    summaryPills.push(`🎯 ${assists} ${assists === 1 ? 'Assist' : 'Assists'}`);
  }
  if (cleanSheet) {
    summaryPills.push('🧤 Clean Sheet');
  }
  if (yellowCard) {
    summaryPills.push('🟨 Booked');
  }
  if (summaryPills.length === 0) {
    summaryPills.push('⭐ Match Winner');
  }

  return {
    goals,
    assists,
    cleanSheet,
    yellowCard,
    redCard,
    summaryPills,
  };
}

/**
 * Retrieves the official Man of the Match for a given fixture.
 *
 * Rules:
 * - The administrator's selection is the SINGLE SOURCE OF TRUTH.
 * - Never automatically awards Man of the Match based on statistics.
 * - Never publishes a poster without an official admin selection AND uploaded photograph.
 * - Validates that the selected player belongs to one of the two participating teams.
 * - Returns null if the match is not finished, selection is missing, or selection was removed.
 */
export function getManOfTheMatch(
  fixture: Fixture,
  playerPool: Player[] = players,
  eventPool: MatchEventRecord[] = matchEvents,
): { player: Player; photoUrl: string; stats: PlayerMatchStats } | null {
  const isFinished = fixture.status === 'finished' || fixture.detail === 'finished';
  if (!isFinished) return null;

  const playerId = fixture.motmPlayerId;
  const photoUrl = fixture.motmPhotoUrl;

  // An official admin selection requires both the winner and their photograph
  if (!playerId || !photoUrl) {
    return null;
  }

  const selectedPlayer = playerPool.find((p) => p.id === playerId);
  if (!selectedPlayer) return null;

  // Validate player belongs to one of the two participating teams
  if (selectedPlayer.departmentId !== fixture.homeId && selectedPlayer.departmentId !== fixture.awayId) {
    return null;
  }

  return {
    player: selectedPlayer,
    photoUrl,
    stats: getPlayerMatchStats(fixture, selectedPlayer, eventPool),
  };
}

/**
 * Identifies the current active matchday and returns its official Man of the Match highlights.
 *
 * Rules:
 * - Tournament has 2 matches scheduled per matchday.
 * - Identifies the active matchday:
 *   The latest matchday that has at least one finished match with an official admin-selected MOTM and photo.
 * - Displays up to two official Man of the Match posters for that matchday.
 * - Shows one poster if only one match has an official selection.
 * - Shows both posters once both matches have official selections.
 * - Keeps the first match's poster visible while the second match is live or upcoming.
 * - Never shows unselected players or automatically generated awards.
 * - Never combines matches from different matchdays.
 */
export function getActiveMatchdayHighlights(
  fixtureList: Fixture[] = fixtures,
  playerPool: Player[] = players,
  eventPool: MatchEventRecord[] = matchEvents,
  deptPool: Department[] = departments,
): { matchday: number | null; highlights: MatchdayHighlight[] } {
  // Group fixtures by matchday
  const matchdays = new Map<number, Fixture[]>();
  for (const fixture of fixtureList) {
    if (typeof fixture.matchday === 'number') {
      const list = matchdays.get(fixture.matchday) || [];
      list.push(fixture);
      matchdays.set(fixture.matchday, list);
    }
  }

  const sortedMatchdayNumbers = Array.from(matchdays.keys()).sort((a, b) => a - b);
  if (sortedMatchdayNumbers.length === 0) {
    return { matchday: null, highlights: [] };
  }

  // Find matchdays that have at least one finished match with an official admin selection
  const matchdaysWithMotm = sortedMatchdayNumbers.filter((md) => {
    const matches = matchdays.get(md) || [];
    return matches.some((match) => {
      const isFinished = match.status === 'finished' || match.detail === 'finished';
      return isFinished && getManOfTheMatch(match, playerPool, eventPool) !== null;
    });
  });

  if (matchdaysWithMotm.length === 0) {
    return { matchday: null, highlights: [] };
  }

  // Active matchday is the latest matchday with available official MOTM highlights
  const activeMatchday = matchdaysWithMotm[matchdaysWithMotm.length - 1];
  const scheduledMatches = (matchdays.get(activeMatchday) || []).slice(0, 2);

  // Sort by kickoff time so game 1 is first, game 2 is second
  scheduledMatches.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const highlights: MatchdayHighlight[] = [];

  for (const match of scheduledMatches) {
    const isFinished = match.status === 'finished' || match.detail === 'finished';
    if (!isFinished) continue;

    const motm = getManOfTheMatch(match, playerPool, eventPool);
    if (!motm) continue;

    const homeDept = deptPool.find((d) => d.id === match.homeId);
    const awayDept = deptPool.find((d) => d.id === match.awayId);
    const playerDept = deptPool.find((d) => d.id === motm.player.departmentId) || homeDept;
    const opponentDept = motm.player.departmentId === match.homeId ? awayDept : homeDept;

    if (!playerDept || !opponentDept) continue;

    highlights.push({
      matchId: match.id,
      fixture: match,
      matchday: activeMatchday,
      stage: match.stage || (match.group ? `Group ${match.group}` : 'Super Cup'),
      date: match.date,
      player: motm.player,
      photoUrl: motm.photoUrl,
      department: playerDept,
      opponent: opponentDept,
      homeTeam: cardTeam(match.homeId),
      awayTeam: cardTeam(match.awayId),
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      stats: motm.stats,
    });
  }

  return {
    matchday: activeMatchday,
    highlights,
  };
}

/**
 * Returns the latest finished games that have an official awarded Man of the Match,
 * sorted by most recently played / finished (up to `limit`, default 2).
 */
export function getLatestMotmHighlights(
  limit = 2,
  fixtureList: Fixture[] = fixtures,
  playerPool: Player[] = players,
  eventPool: MatchEventRecord[] = matchEvents,
  deptPool: Department[] = departments,
): MatchdayHighlight[] {
  const finishedWithMotm = fixtureList.filter((m) => {
    const isFinished = m.status === 'finished' || m.detail === 'finished';
    return isFinished && getManOfTheMatch(m, playerPool, eventPool) !== null;
  });

  // Sort by newest finished:
  // 1. finishedAt timestamp if present
  // 2. date descending, time descending, id descending
  finishedWithMotm.sort((a, b) => {
    const finishA = a.finishedAt ?? 0;
    const finishB = b.finishedAt ?? 0;
    if (finishA && finishB && finishA !== finishB) {
      return finishB - finishA;
    }
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const timeA = a.time || '';
    const timeB = b.time || '';
    if (timeA !== timeB) return timeB.localeCompare(timeA);
    return b.id.localeCompare(a.id);
  });

  const chosen = finishedWithMotm.slice(0, limit);
  const highlights: MatchdayHighlight[] = [];

  for (const match of chosen) {
    const motm = getManOfTheMatch(match, playerPool, eventPool);
    if (!motm) continue;

    const homeDept = deptPool.find((d) => d.id === match.homeId);
    const awayDept = deptPool.find((d) => d.id === match.awayId);
    const playerDept = deptPool.find((d) => d.id === motm.player.departmentId) || homeDept;
    const opponentDept = motm.player.departmentId === match.homeId ? awayDept : homeDept;

    if (!playerDept || !opponentDept) continue;

    highlights.push({
      matchId: match.id,
      fixture: match,
      matchday: match.matchday ?? 1,
      stage: match.stage || (match.group ? `Group ${match.group}` : 'Super Cup'),
      date: match.date,
      player: motm.player,
      photoUrl: motm.photoUrl,
      department: playerDept,
      opponent: opponentDept,
      homeTeam: cardTeam(match.homeId),
      awayTeam: cardTeam(match.awayId),
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      stats: motm.stats,
    });
  }

  return highlights;
}
