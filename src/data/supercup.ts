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
  appearances?: number;
  starts?: number;
  nationality?: string;
  registered?: boolean;
  active?: boolean;
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
  allowExtra?: boolean;
  pensHome?: number | null;
  pensAway?: number | null;
  confirmed?: boolean;
  referee?: string;
  assistant1?: string;
  assistant2?: string;
  formationHome?: string;
  formationAway?: string;
  version?: number;
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

export const matchEvents: MatchEventRecord[] = [];
export const squads: SquadRow[] = [];
export const manualStats: ManualStat[] = [];
export let leagueRules = {
  pointsWin: 3,
  pointsDraw: 1,
  halfMinutes: 45,
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

export const GROUPS: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F'];

export const GROUP_COLLEGES: Record<GroupId, string> = {
  A: 'Institute of Technology',
  B: 'Engineering',
  C: 'Business & Economics',
  D: 'Medicine & Health Sciences',
  E: 'Natural & Computational Sciences',
  F: 'Social Sciences & Law',
};

export const departments: Department[] = [];
export const fixtures: Fixture[] = [];
export const players: Player[] = [];

export function getDepartment(id: string) {
  return departments.find((department) => department.id === id);
}

export function departmentsInGroup(group: GroupId) {
  return departments.filter((department) => department.group === group);
}

export function getFixture(id: string) {
  return fixtures.find((fixture) => fixture.id === id);
}

export function fixturesForDepartment(id: string) {
  return fixtures.filter((fixture) => fixture.homeId === id || fixture.awayId === id);
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
    .filter((fixture) => fixture.group === group && fixture.confirmed && fixture.detail === 'finished' && fixture.homeScore != null && fixture.awayScore != null)
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
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
}

export interface MatchSheet {
  formation: string;
  starters: Player[];
  bench: Player[];
}

export interface Substitution {
  minute: number;
  teamId: string;
  offId: string;
  onPlayer: Player;
}

export function matchSheet(departmentId: string, matchId?: string): MatchSheet {
  const rows = matchId ? squads.filter((row) => row.matchId === matchId && row.teamId === departmentId) : [];
  const fixture = matchId ? getFixture(matchId) : undefined;
  const playerFor = (row: SquadRow) => players.find((player) => player.id === row.playerId);
  const formation = fixture && departmentId === fixture.awayId ? fixture.formationAway : fixture?.formationHome;
  return {
    formation: formation || '4-2-3-1',
    starters: rows.filter((row) => row.role === 'starter').sort((a, b) => a.sort - b.sort).map(playerFor).filter((player): player is Player => Boolean(player)),
    bench: rows.filter((row) => row.role === 'bench').sort((a, b) => a.sort - b.sort).map(playerFor).filter((player): player is Player => Boolean(player)),
  };
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
          teamId: event.creditedTeamId || event.teamId || '',
          playerId: event.playerId || '',
          playerName: event.goalType === 'own_goal' ? `${event.playerName} (OG)` : event.playerName,
          kind: 'goal' as const,
          assistId: event.assistId || undefined,
          assistName: event.assistName || undefined,
          detail: event.goalType || '',
        };
      }
      if (event.type === 'card') {
        return {
          minute: event.minute,
          teamId: event.teamId || '',
          playerId: event.playerId || '',
          playerName: event.playerName,
          kind: event.cardType === 'yellow' ? 'yellow' as const : 'red' as const,
          detail: event.detail,
        };
      }
      if (event.type === 'substitution') {
        return {
          minute: event.minute,
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

export function viewClock(fixture: Fixture | undefined, now = Date.now()) {
  if (!fixture || fixture.status !== 'live') return null;
  const base = (fixture.elapsedSeconds ?? 0) * 1000;
  const elapsed = base + (fixture.runningSince ? Math.max(0, now + clockSync.offset - fixture.runningSince) : 0);
  const total = Math.max(0, Math.floor(elapsed / 1000));
  return {
    total,
    minute: Math.floor(total / 60),
    seconds: total % 60,
    running: Boolean(fixture.runningSince),
    period: fixture.period ?? '',
    added: Math.floor((fixture.addedSeconds ?? 0) / 60),
  };
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
