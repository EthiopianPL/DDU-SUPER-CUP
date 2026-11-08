export type GroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type MatchStatus = 'live' | 'upcoming' | 'finished';

export interface Department {
  id: string;
  name: string;
  shortName: string;
  college: string;
  group: GroupId;
  color: string;
  pitch: string;
  coach?: string;
  coachPhotoUrl?: string;
  crestUrl?: string;
  status?: string;
}

export interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  number: number;
  departmentId: string;
  goals: number;
  assists: number;
  yellowCards?: number;
  redCards?: number;
  ownGoals?: number;
  appearances?: number;
  starts?: number;
  nationality?: string;
  registered?: boolean;
  active?: boolean;
  isCaptain?: boolean;
  photoUrl?: string;
}

export interface Fixture {
  id: string;
  group: GroupId;
  matchday: number;
  date: string;
  time: string;
  stadium: string;
  homeId: string;
  awayId: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  detail?: string;
  period?: string;
  minute?: number;
  elapsedSeconds?: number;
  runningSince?: number | null;
  addedSeconds?: number;
  halfSeconds?: number;
  regulationSeconds?: number;
  extraHalfSeconds?: number;
  allowExtra?: boolean;
  pensHome?: number | null;
  pensAway?: number | null;
  confirmed?: boolean;
  referee?: string;
  assistant1?: string;
  assistant2?: string;
  fourthReferee?: string;
  formationHome?: string;
  formationAway?: string;
  lineupHomeApproved?: boolean;
  lineupAwayApproved?: boolean;
  lineupApproved?: boolean;
  stage?: 'group' | 'r16' | 'qf' | 'sf' | 'final';
  slot?: number;
  version?: number;
  finishedAt?: number | null;
  motmPlayerId?: string | null;
  motmPhotoUrl?: string | null;
  updatedAt?: number;
}

export interface MatchEventRecord {
  id: number;
  matchId: string;
  type: string;
  teamId: string | null;
  creditedTeamId: string | null;
  playerId: string | null;
  assistId: string | null;
  relatedPlayerId: string | null;
  playerName: string;
  assistName: string;
  relatedName: string;
  minute: number;
  addedMinute: number;
  period: string;
  goalType: string | null;
  cardType: string | null;
  detail: string;
  countsForScore: boolean;
  shootout: boolean;
  scored: boolean | null;
  voided: boolean;
  voidReason: string;
}

export interface SquadRow {
  matchId: string;
  teamId: string;
  playerId: string;
  role: 'starter' | 'bench';
  sort: number;
}

export interface ManualStat {
  matchId: string;
  teamId: string;
  metric: string;
  value: number;
}

export const departments: Department[] = [];
export const fixtures: Fixture[] = [];
export const players: Player[] = [];
export const matchEvents: MatchEventRecord[] = [];
export const squads: SquadRow[] = [];
export const manualStats: ManualStat[] = [];
export let competitionName = 'Dire Dawa University Super Cup';

export function setCompetitionName(name: string) {
  competitionName = name || competitionName;
}

export let leagueRules = {
  pointsWin: 3,
  pointsDraw: 1,
  halfMinutes: 40,
  extraHalfMinutes: 15,
  maxSubs: 5,
  extraSubs: 1,
  tieBreak: ['points', 'goalDifference', 'goalsFor', 'name'],
  allowExtraTime: false,
};
export const clockSync = { offset: 0 };

export interface Standing {
  position: number;
  department: Department;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: Array<'W' | 'D' | 'L'>;
}

export const GROUPS: GroupId[] = ['A', 'B', 'C', 'D', 'E'];

export const GROUP_COLLEGES: Record<GroupId, string> = {
  A: '',
  B: '',
  C: '',
  D: '',
  E: '',
};

export function qualifyingSpotsForGroup(group: GroupId): number {
  return group === 'E' ? 4 : 3;
}

export function isTeamQualified(group: GroupId, position: number): boolean {
  return position >= 1 && position <= qualifyingSpotsForGroup(group);
}

export function getDepartment(id: string) {
  if (!id) return undefined;
  const decoded = decodeURIComponent(id).trim().toLowerCase();
  const slugified = decoded.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (
    departments.find((department) => department.id === id) ||
    departments.find((department) => department.id.toLowerCase() === decoded) ||
    departments.find((department) => department.name.toLowerCase() === decoded) ||
    departments.find((department) => department.shortName.toLowerCase() === decoded) ||
    departments.find((department) => department.id === slugified) ||
    departments.find((department) => department.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === slugified)
  );
}

export function departmentsInGroup(group: GroupId) {
  return departments.filter((department) => department.group === group);
}

export function getFixture(id: string) {
  return fixtures.find((fixture) => fixture.id === id);
}

export const STATUS_PRIORITY: Record<MatchStatus, number> = {
  live: 1,
  upcoming: 2,
  finished: 3,
};

/**
 * Sorts fixtures according to the smart match priority:
 * 1. LIVE matches — always appear at the top.
 * 2. UPCOMING matches — appear next, sorted by kickoff date and time ascending (earliest first).
 * 3. FINISHED matches — appear after upcoming matches, sorted by most recently finished first (latest date & time first).
 */
export function sortFixturesByPriority(fixtureList: Fixture[]): Fixture[] {
  return [...fixtureList].sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status] ?? 99;
    const priorityB = STATUS_PRIORITY[b.status] ?? 99;

    // 1. Primary ordering: status priority rank
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // 2. Both are LIVE
    if (a.status === 'live') {
      const minA = typeof a.minute === 'number' ? a.minute : -1;
      const minB = typeof b.minute === 'number' ? b.minute : -1;
      if (minA !== minB) {
        return minB - minA; // highest minute first
      }
      return (a.time || '').localeCompare(b.time || '');
    }

    // 3. Both are UPCOMING: earliest kickoff first (date ascending, then time ascending)
    if (a.status === 'upcoming') {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      const timeA = a.time || '';
      const timeB = b.time || '';
      if (timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }
      return (a.group || '').localeCompare(b.group || '');
    }

    // 4. Both are FINISHED: most recently finished first (latest date descending, then latest time descending)
    if (a.status === 'finished') {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // most recent date first
      }
      const timeA = a.time || '';
      const timeB = b.time || '';
      if (timeA !== timeB) {
        return timeB.localeCompare(timeA); // most recent kickoff time first
      }
      return (a.group || '').localeCompare(b.group || '');
    }

    return 0;
  });
}

export function fixturesForDepartment(id: string) {
  return sortFixturesByPriority(
    fixtures.filter((fixture) => fixture.homeId === id || fixture.awayId === id),
  );
}

export function playersForDepartment(id: string) {
  return players
    .filter((player) => player.departmentId === id && player.registered !== false && player.active !== false)
    .sort((a, b) => a.number - b.number);
}

export function cardTeam(id: string) {
  const department = getDepartment(id);
  if (!department) {
    return { id, name: 'Unknown', short_name: '?', color: '#334155' };
  }
  return {
    id: department.id,
    name: department.name,
    short_name: department.shortName,
    color: department.color,
    logo_url: department.crestUrl || undefined,
  };
}

export function standingsFor(group: GroupId): Standing[] {
  const rows = new Map<string, Standing>();

  departmentsInGroup(group).forEach((department) => {
    rows.set(department.id, {
      position: 0,
      department,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    });
  });

  const played = fixtures
    .filter((fixture) => {
      if ((fixture.stage ?? 'group') !== 'group' || fixture.group !== group) return false;
      if (fixture.homeScore == null || fixture.awayScore == null) return false;
      if (fixture.status === 'live') return true;
      if (fixture.status !== 'finished') return false;
      return !fixture.detail || fixture.detail === 'finished';
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  played.forEach((fixture) => {
    const home = rows.get(fixture.homeId);
    const away = rows.get(fixture.awayId);
    if (!home || !away) return;

    const homeScore = fixture.homeScore ?? 0;
    const awayScore = fixture.awayScore ?? 0;

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.won += 1;
      home.points += leagueRules.pointsWin;
      away.lost += 1;
      home.form.push('W');
      away.form.push('L');
    } else if (homeScore < awayScore) {
      away.won += 1;
      away.points += leagueRules.pointsWin;
      home.lost += 1;
      home.form.push('L');
      away.form.push('W');
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += leagueRules.pointsDraw;
      away.points += leagueRules.pointsDraw;
      home.form.push('D');
      away.form.push('D');
    }
  });

  const table = Array.from(rows.values()).map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
    form: row.form.slice(-5),
  }));

  table.sort((a, b) => {
    for (const key of leagueRules.tieBreak) {
      if (key === 'points' && b.points !== a.points) return b.points - a.points;
      if (key === 'goalDifference' && b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (key === 'goalsFor' && b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      if (key === 'name') return a.department.name.localeCompare(b.department.name);
    }
    return a.department.name.localeCompare(b.department.name);
  });

  return table.map((row, index) => ({ ...row, position: index + 1 }));
}

export function latestResults(limit = 2) {
  return fixtures
    .filter((fixture) => fixture.detail === 'finished')
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0) || b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
    .slice(0, limit);
}

export function topScorers(limit = 5) {
  return players
    .filter((player) => player.registered !== false)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, limit)
    .map((player) => ({
      ...player,
      department: getDepartment(player.departmentId),
    }));
}

export function topAssists(limit = 5) {
  return players
    .filter((player) => player.registered !== false)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
    .slice(0, limit)
    .map((player) => ({
      ...player,
      department: getDepartment(player.departmentId),
    }));
}

export interface GoalEvent {
  minute: number;
  teamId: string;
  playerId: string;
  playerName: string;
}

export interface TimelineEvent {
  minute: number;
  teamId: string;
  playerId: string;
  playerName: string;
  kind: 'goal' | 'yellow' | 'red' | 'sub' | 'note';
  assistId?: string;
  assistName?: string;
  detail?: string;
  addedMinute?: number;
  period?: string;
  cardType?: string | null;
  goalType?: string | null;
}

export const TOURNAMENT_TIMEZONE = 'Africa/Addis_Ababa';

/**
 * Returns a date string formatted as YYYY-MM-DD in the tournament timezone (Africa/Addis_Ababa).
 */
export function getTournamentTodayString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TOURNAMENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns formatted time as HH:mm in the tournament timezone (Africa/Addis_Ababa).
 */
export function getTournamentTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TOURNAMENT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function goalEvents(fixture: Fixture): GoalEvent[] {
  return matchEvents
    .filter((event) => event.matchId === fixture.id && event.type === 'goal' && event.countsForScore && !event.voided && !event.shootout)
    .map((event) => ({
      minute: event.minute,
      teamId: event.creditedTeamId || event.teamId || '',
      playerId: event.playerId || '',
      playerName: event.goalType === 'own_goal' ? `${event.playerName} (OG)` : event.playerName,
    }))
    .sort((a, b) => a.minute - b.minute || a.playerName.localeCompare(b.playerName));
}

export function formatKickoff(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TOURNAMENT_TIMEZONE });
}

/**
 * Shifts a YYYY-MM-DD string by a given number of days.
 */
export function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return d.toISOString().slice(0, 10);
}

/**
 * Returns formatted date strings for display in the Date Navigator:
 * e.g. "Today, 25 Oct", "Yesterday, 24 Oct", "Saturday, 10 Oct"
 */
export function formatDateLabel(
  dateStr: string,
  todayStr: string = getTournamentTodayString(),
): { main: string; sub: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const dayFull = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const formattedShort = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const year = dateObj.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' });

  const yesterdayStr = shiftDate(todayStr, -1);
  const tomorrowStr = shiftDate(todayStr, 1);

  if (dateStr === todayStr) {
    return { main: `Today, ${formattedShort}`, sub: `${dayFull}, ${year}` };
  }
  if (dateStr === yesterdayStr) {
    return { main: `Yesterday, ${formattedShort}`, sub: `${dayFull}, ${year}` };
  }
  if (dateStr === tomorrowStr) {
    return { main: `Tomorrow, ${formattedShort}`, sub: `${dayFull}, ${year}` };
  }
  return { main: `${dayOfWeek}, ${formattedShort}`, sub: `${dayFull}, ${year}` };
}

export interface TeamStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
}

export interface MatchSheet {
  formation: string;
  starters: Player[];
  bench: Player[];
}

export interface Substitution {
  minute: number;
  addedMinute?: number;
  period?: string;
  teamId: string;
  offId: string;
  onPlayer: Player;
}

export function matchSheet(departmentId: string, matchId?: string): MatchSheet {
  const fixture = matchId ? getFixture(matchId) : undefined;
  const formation = fixture && departmentId === fixture.awayId ? fixture.formationAway : fixture?.formationHome;
  const isApproved = fixture ? (
    fixture.status === 'live' ||
    fixture.detail === 'finished' ||
    (departmentId === fixture.homeId ? Boolean(fixture.lineupHomeApproved) : Boolean(fixture.lineupAwayApproved))
  ) : false;

  if (matchId && !isApproved) {
    return {
      formation: formation || '4-2-3-1',
      starters: [],
      bench: [],
    };
  }

  const rows = matchId ? squads.filter((row) => row.matchId === matchId && row.teamId === departmentId) : [];
  if (!rows.length) {
    return {
      formation: formation || '4-2-3-1',
      starters: [],
      bench: [],
    };
  }
  const playerFor = (row: SquadRow) => players.find((player) => player.id === row.playerId);
  return {
    formation: formation || '4-2-3-1',
    starters: rows.filter((row) => row.role === 'starter').sort((a, b) => a.sort - b.sort).map(playerFor).filter((player): player is Player => Boolean(player)),
    bench: rows.filter((row) => row.role === 'bench').sort((a, b) => a.sort - b.sort).map(playerFor).filter((player): player is Player => Boolean(player)),
  };
}

export function teamRedCards(matchId: string, teamId: string) {
  return matchEvents.filter((event) =>
    event.matchId === matchId
    && !event.voided
    && event.type === 'card'
    && event.teamId === teamId
    && event.cardType !== 'yellow'
  ).length;
}

export function matchTimeline(fixture: Fixture): TimelineEvent[] {
  const labels: Record<string, string> = {
    penalty_awarded: 'Penalty awarded',
    penalty_missed: 'Penalty missed',
    penalty_saved: 'Penalty saved',
    offside: 'Offside',
    foul: 'Foul',
    free_kick: 'Free kick',
    corner: 'Corner',
    save: 'Save',
    injury: 'Injury',
    added_time: 'Added time',
    var: 'VAR review',
    note: 'Note',
  };
  return matchEvents
    .filter((event) => event.matchId === fixture.id && !event.voided && event.type !== 'penalty_kick')
    .map((event) => {
      if (event.type === 'goal') {
        return {
          minute: event.minute,
          addedMinute: event.addedMinute || undefined,
          period: event.period,
          teamId: event.creditedTeamId || event.teamId || '',
          playerId: event.playerId || '',
          playerName: event.playerName,
          kind: 'goal' as const,
          assistId: event.goalType === 'own_goal' ? undefined : event.assistId || undefined,
          assistName: event.goalType === 'own_goal' ? undefined : event.assistName || undefined,
          goalType: event.goalType,
          detail: event.goalType || '',
        };
      }
      if (event.type === 'card') {
        return {
          minute: event.minute,
          addedMinute: event.addedMinute || undefined,
          period: event.period,
          teamId: event.teamId || '',
          playerId: event.playerId || '',
          playerName: event.playerName,
          kind: event.cardType === 'yellow' ? 'yellow' as const : 'red' as const,
          cardType: event.cardType,
          detail: event.detail,
        };
      }
      if (event.type === 'substitution') {
        return {
          minute: event.minute,
          addedMinute: event.addedMinute || undefined,
          period: event.period,
          teamId: event.teamId || '',
          playerId: event.playerId || '',
          playerName: `${event.playerName} for ${event.relatedName}`,
          kind: 'sub' as const,
          detail: event.detail,
        };
      }
      return {
        minute: event.minute,
        teamId: event.teamId || '',
        playerId: event.playerId || '',
        playerName: event.playerName || labels[event.type] || event.type,
        kind: 'note' as const,
        detail: event.detail || labels[event.type] || '',
      };
    })
    .sort((a, b) => a.minute - b.minute || a.playerName.localeCompare(b.playerName));
}

export function matchSubstitutions(fixture: Fixture): Substitution[] {
  return matchEvents
    .filter((event) => event.matchId === fixture.id && event.type === 'substitution' && !event.voided)
    .map((event) => ({
      minute: event.minute,
      addedMinute: event.addedMinute || undefined,
      period: event.period,
      teamId: event.teamId || '',
      offId: event.playerId || '',
      onPlayer: players.find((player) => player.id === event.relatedPlayerId) ?? {
        id: event.relatedPlayerId || 'unknown',
        name: event.relatedName || 'Substitute',
        position: 'MID' as const,
        number: 0,
        departmentId: event.teamId || '',
        goals: 0,
        assists: 0,
      },
    }));
}

export function formatMatchClock(clock: { minute: number; seconds: number }) {
  return `${String(clock.minute).padStart(2, '0')}:${String(clock.seconds).padStart(2, '0')}`;
}

export function formatLiveTime(clock: { minute: number; seconds: number; stoppage?: number }) {
  if (!clock.stoppage) return formatMatchClock(clock);
  const extraMinutes = Math.floor(clock.stoppage / 60);
  const extraSeconds = clock.stoppage % 60;
  return `${String(clock.minute).padStart(2, '0')}:00 +${String(extraMinutes).padStart(2, '0')}:${String(extraSeconds).padStart(2, '0')}`;
}

function periodEndSeconds(period: string | undefined, half: number, regulation: number, extra: number) {
  if (period === 'first_half') return half;
  if (period === 'second_half') return regulation;
  if (period === 'extra_first') return regulation + extra;
  if (period === 'extra_second') return regulation + extra * 2;
  return null;
}

export function viewClock(fixture: Fixture | undefined, now = Date.now()) {
  if (!fixture || fixture.status !== 'live') return null;
  const base = (fixture.elapsedSeconds ?? 0) * 1000;
  const elapsed = base + (fixture.runningSince ? Math.max(0, now + clockSync.offset - fixture.runningSince) : 0);
  const total = Math.max(0, Math.floor(elapsed / 1000));
  const half = fixture.halfSeconds ?? leagueRules.halfMinutes * 60;
  const regulation = fixture.regulationSeconds ?? half * 2;
  const extra = fixture.extraHalfSeconds ?? leagueRules.extraHalfMinutes * 60;
  const end = periodEndSeconds(fixture.period, half, regulation, extra);
  const stoppage = end == null ? 0 : Math.max(0, total - end);
  const shown = end == null ? total : Math.min(total, end);
  return {
    total,
    minute: Math.floor(shown / 60),
    seconds: shown % 60,
    running: Boolean(fixture.runningSince),
    period: fixture.period ?? '',
    added: Math.floor((fixture.addedSeconds ?? 0) / 60),
    stoppage,
  };
}

export interface CategorizedFixtures {
  previous: Fixture[];
  today: Fixture[];
  upcoming: Fixture[];
  unplayedHistorical: Fixture[];
}

/**
 * Categorizes fixtures into Previous, Today's, and Upcoming buckets.
 */
export function categorizeFixtures(
  fixtureList: Fixture[],
  referenceDate: string = getTournamentTodayString(),
): CategorizedFixtures {
  const previous: Fixture[] = [];
  const today: Fixture[] = [];
  const upcoming: Fixture[] = [];
  const unplayedHistorical: Fixture[] = [];

  for (const fixture of fixtureList) {
    if (fixture.date === referenceDate || fixture.status === 'live') {
      today.push(fixture);
    } else if (fixture.date < referenceDate) {
      previous.push(fixture);
      if (fixture.status === 'upcoming') {
        unplayedHistorical.push(fixture);
      }
    } else {
      upcoming.push(fixture);
    }
  }

  today.sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (b.status === 'live' && a.status !== 'live') return 1;
    return a.time.localeCompare(b.time);
  });

  previous.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  upcoming.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return { previous, today, upcoming, unplayedHistorical };
}

export function periodText(period?: string, running = false) {
  if (period === 'pre') return 'Kickoff';
  if (period === 'first_half') return running ? 'First half' : 'First half paused';
  if (period === 'halftime') return 'Half time';
  if (period === 'second_half') return running ? 'Second half' : 'Second half paused';
  if (period === 'extra_first' || period === 'extra_second') return running ? 'Extra time' : 'Extra time paused';
  if (period === 'extra_break') return 'Extra-time break';
  if (period === 'penalties') return 'Penalties';
  if (period === 'full_time') return 'Full time';
  return running ? 'Live' : 'Paused';
}
