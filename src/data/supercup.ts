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

const PITCH = {
  main: 'DDU Main Pitch',
  sabian: 'Sabian Campus Pitch',
  iot: 'Institute of Technology Ground',
  health: 'Health Campus Field',
};

export const departments: Department[] = [
  { id: 'software-engineering', name: 'Software Engineering', shortName: 'SWE', college: GROUP_COLLEGES.A, group: 'A', color: '#2450c8', pitch: PITCH.iot },
  { id: 'computer-science', name: 'Computer Science', shortName: 'CS', college: GROUP_COLLEGES.A, group: 'A', color: '#0ea5e9', pitch: PITCH.iot },
  { id: 'information-technology', name: 'Information Technology', shortName: 'IT', college: GROUP_COLLEGES.A, group: 'A', color: '#6366f1', pitch: PITCH.iot },
  { id: 'electrical-engineering', name: 'Electrical & Computer Engineering', shortName: 'ECE', college: GROUP_COLLEGES.A, group: 'A', color: '#f5c518', pitch: PITCH.iot },

  { id: 'civil-engineering', name: 'Civil Engineering', shortName: 'CE', college: GROUP_COLLEGES.B, group: 'B', color: '#78716c', pitch: PITCH.main },
  { id: 'mechanical-engineering', name: 'Mechanical Engineering', shortName: 'ME', college: GROUP_COLLEGES.B, group: 'B', color: '#dc2626', pitch: PITCH.main },
  { id: 'architecture', name: 'Architecture', shortName: 'ARCH', college: GROUP_COLLEGES.B, group: 'B', color: '#d97706', pitch: PITCH.main },
  { id: 'chemical-engineering', name: 'Chemical Engineering', shortName: 'CHE', college: GROUP_COLLEGES.B, group: 'B', color: '#16a34a', pitch: PITCH.main },

  { id: 'accounting-finance', name: 'Accounting & Finance', shortName: 'ACF', college: GROUP_COLLEGES.C, group: 'C', color: '#15803d', pitch: PITCH.sabian },
  { id: 'economics', name: 'Economics', shortName: 'ECO', college: GROUP_COLLEGES.C, group: 'C', color: '#ca8a04', pitch: PITCH.sabian },
  { id: 'management', name: 'Management', shortName: 'MGT', college: GROUP_COLLEGES.C, group: 'C', color: '#1e3a8a', pitch: PITCH.sabian },
  { id: 'marketing', name: 'Marketing Management', shortName: 'MKT', college: GROUP_COLLEGES.C, group: 'C', color: '#db2777', pitch: PITCH.sabian },

  { id: 'medicine', name: 'Medicine', shortName: 'MED', college: GROUP_COLLEGES.D, group: 'D', color: '#b91c1c', pitch: PITCH.health },
  { id: 'nursing', name: 'Nursing', shortName: 'NUR', college: GROUP_COLLEGES.D, group: 'D', color: '#0f766e', pitch: PITCH.health },
  { id: 'midwifery', name: 'Midwifery', shortName: 'MID', college: GROUP_COLLEGES.D, group: 'D', color: '#ec4899', pitch: PITCH.health },
  { id: 'medical-laboratory', name: 'Medical Laboratory', shortName: 'MLAB', college: GROUP_COLLEGES.D, group: 'D', color: '#7c3aed', pitch: PITCH.health },

  { id: 'sport-science', name: 'Sport Science', shortName: 'SPT', college: GROUP_COLLEGES.E, group: 'E', color: '#ea580c', pitch: PITCH.main },
  { id: 'mathematics', name: 'Mathematics', shortName: 'MATH', college: GROUP_COLLEGES.E, group: 'E', color: '#2563eb', pitch: PITCH.main },
  { id: 'biology', name: 'Biology', shortName: 'BIO', college: GROUP_COLLEGES.E, group: 'E', color: '#15803d', pitch: PITCH.main },
  { id: 'chemistry', name: 'Chemistry', shortName: 'CHEM', college: GROUP_COLLEGES.E, group: 'E', color: '#9333ea', pitch: PITCH.main },

  { id: 'law', name: 'Law', shortName: 'LAW', college: GROUP_COLLEGES.F, group: 'F', color: '#3b82f6', pitch: PITCH.sabian },
  { id: 'journalism', name: 'Journalism & Communication', shortName: 'JOUR', college: GROUP_COLLEGES.F, group: 'F', color: '#e11d48', pitch: PITCH.sabian },
  { id: 'political-science', name: 'Political Science', shortName: 'POL', college: GROUP_COLLEGES.F, group: 'F', color: '#0369a1', pitch: PITCH.sabian },
  { id: 'psychology', name: 'Psychology', shortName: 'PSY', college: GROUP_COLLEGES.F, group: 'F', color: '#7e22ce', pitch: PITCH.sabian },
];

type Score = [number, number];

interface RawFixture {
  group: GroupId;
  matchday: 1 | 2 | 3;
  homeId: string;
  awayId: string;
  score?: Score;
  status: MatchStatus;
  minute?: number;
  date: string;
  time: string;
  stadium: string;
}

const rawFixtures: RawFixture[] = [
  { group: 'A', matchday: 1, homeId: 'software-engineering', awayId: 'electrical-engineering', score: [2, 0], status: 'finished', date: '2026-10-10', time: '15:00', stadium: PITCH.iot },
  { group: 'A', matchday: 1, homeId: 'computer-science', awayId: 'information-technology', score: [1, 1], status: 'finished', date: '2026-10-10', time: '17:30', stadium: PITCH.iot },
  { group: 'A', matchday: 2, homeId: 'software-engineering', awayId: 'information-technology', score: [1, 0], status: 'live', minute: 62, date: '2026-10-24', time: '15:00', stadium: PITCH.iot },
  { group: 'A', matchday: 2, homeId: 'electrical-engineering', awayId: 'computer-science', status: 'upcoming', date: '2026-10-24', time: '18:00', stadium: PITCH.iot },
  { group: 'A', matchday: 3, homeId: 'software-engineering', awayId: 'computer-science', status: 'upcoming', date: '2026-10-31', time: '15:00', stadium: PITCH.iot },
  { group: 'A', matchday: 3, homeId: 'information-technology', awayId: 'electrical-engineering', status: 'upcoming', date: '2026-10-31', time: '17:30', stadium: PITCH.iot },

  { group: 'B', matchday: 1, homeId: 'civil-engineering', awayId: 'chemical-engineering', score: [1, 0], status: 'finished', date: '2026-10-10', time: '09:00', stadium: PITCH.main },
  { group: 'B', matchday: 1, homeId: 'mechanical-engineering', awayId: 'architecture', score: [3, 1], status: 'finished', date: '2026-10-10', time: '11:30', stadium: PITCH.main },
  { group: 'B', matchday: 2, homeId: 'civil-engineering', awayId: 'architecture', score: [2, 1], status: 'finished', date: '2026-10-24', time: '09:00', stadium: PITCH.main },
  { group: 'B', matchday: 2, homeId: 'chemical-engineering', awayId: 'mechanical-engineering', status: 'upcoming', date: '2026-10-24', time: '16:30', stadium: PITCH.main },
  { group: 'B', matchday: 3, homeId: 'civil-engineering', awayId: 'mechanical-engineering', status: 'upcoming', date: '2026-10-31', time: '09:00', stadium: PITCH.main },
  { group: 'B', matchday: 3, homeId: 'architecture', awayId: 'chemical-engineering', status: 'upcoming', date: '2026-10-31', time: '11:30', stadium: PITCH.main },

  { group: 'C', matchday: 1, homeId: 'accounting-finance', awayId: 'marketing', score: [2, 1], status: 'finished', date: '2026-10-11', time: '10:00', stadium: PITCH.sabian },
  { group: 'C', matchday: 1, homeId: 'economics', awayId: 'management', score: [0, 0], status: 'finished', date: '2026-10-11', time: '14:00', stadium: PITCH.sabian },
  { group: 'C', matchday: 2, homeId: 'accounting-finance', awayId: 'management', score: [1, 1], status: 'finished', date: '2026-10-24', time: '10:30', stadium: PITCH.sabian },
  { group: 'C', matchday: 2, homeId: 'marketing', awayId: 'economics', status: 'upcoming', date: '2026-10-24', time: '17:00', stadium: PITCH.sabian },
  { group: 'C', matchday: 3, homeId: 'accounting-finance', awayId: 'economics', status: 'upcoming', date: '2026-10-31', time: '10:00', stadium: PITCH.sabian },
  { group: 'C', matchday: 3, homeId: 'management', awayId: 'marketing', status: 'upcoming', date: '2026-10-31', time: '14:00', stadium: PITCH.sabian },

  { group: 'D', matchday: 1, homeId: 'medicine', awayId: 'medical-laboratory', score: [3, 0], status: 'finished', date: '2026-10-11', time: '09:00', stadium: PITCH.health },
  { group: 'D', matchday: 1, homeId: 'nursing', awayId: 'midwifery', score: [2, 2], status: 'finished', date: '2026-10-11', time: '11:30', stadium: PITCH.health },
  { group: 'D', matchday: 2, homeId: 'medicine', awayId: 'midwifery', score: [2, 0], status: 'finished', date: '2026-10-24', time: '11:00', stadium: PITCH.health },
  { group: 'D', matchday: 2, homeId: 'medical-laboratory', awayId: 'nursing', status: 'upcoming', date: '2026-10-24', time: '18:30', stadium: PITCH.health },
  { group: 'D', matchday: 3, homeId: 'medicine', awayId: 'nursing', status: 'upcoming', date: '2026-10-31', time: '09:00', stadium: PITCH.health },
  { group: 'D', matchday: 3, homeId: 'midwifery', awayId: 'medical-laboratory', status: 'upcoming', date: '2026-10-31', time: '11:30', stadium: PITCH.health },

  { group: 'E', matchday: 1, homeId: 'sport-science', awayId: 'chemistry', score: [2, 2], status: 'finished', date: '2026-10-10', time: '08:30', stadium: PITCH.main },
  { group: 'E', matchday: 1, homeId: 'mathematics', awayId: 'biology', score: [1, 0], status: 'finished', date: '2026-10-10', time: '13:00', stadium: PITCH.main },
  { group: 'E', matchday: 2, homeId: 'sport-science', awayId: 'biology', score: [3, 1], status: 'finished', date: '2026-10-24', time: '08:30', stadium: PITCH.main },
  { group: 'E', matchday: 2, homeId: 'chemistry', awayId: 'mathematics', status: 'upcoming', date: '2026-10-24', time: '16:00', stadium: PITCH.main },
  { group: 'E', matchday: 3, homeId: 'sport-science', awayId: 'mathematics', status: 'upcoming', date: '2026-10-31', time: '08:30', stadium: PITCH.main },
  { group: 'E', matchday: 3, homeId: 'biology', awayId: 'chemistry', status: 'upcoming', date: '2026-10-31', time: '13:00', stadium: PITCH.main },

  { group: 'F', matchday: 1, homeId: 'law', awayId: 'psychology', score: [1, 0], status: 'finished', date: '2026-10-11', time: '15:00', stadium: PITCH.sabian },
  { group: 'F', matchday: 1, homeId: 'journalism', awayId: 'political-science', score: [2, 1], status: 'finished', date: '2026-10-11', time: '17:30', stadium: PITCH.sabian },
  { group: 'F', matchday: 2, homeId: 'law', awayId: 'political-science', score: [0, 0], status: 'finished', date: '2026-10-24', time: '12:00', stadium: PITCH.sabian },
  { group: 'F', matchday: 2, homeId: 'psychology', awayId: 'journalism', status: 'upcoming', date: '2026-10-24', time: '19:00', stadium: PITCH.sabian },
  { group: 'F', matchday: 3, homeId: 'law', awayId: 'journalism', status: 'upcoming', date: '2026-10-31', time: '15:00', stadium: PITCH.sabian },
  { group: 'F', matchday: 3, homeId: 'political-science', awayId: 'psychology', status: 'upcoming', date: '2026-10-31', time: '17:30', stadium: PITCH.sabian },
];

export const fixtures: Fixture[] = rawFixtures.map((fixture, index) => ({
  id: `${fixture.group.toLowerCase()}-md${fixture.matchday}-${index}`,
  group: fixture.group,
  matchday: fixture.matchday,
  date: fixture.date,
  time: fixture.time,
  stadium: fixture.stadium,
  homeId: fixture.homeId,
  awayId: fixture.awayId,
  homeScore: fixture.score?.[0],
  awayScore: fixture.score?.[1],
  status: fixture.status,
  minute: fixture.minute,
}));

const FIRST_NAMES = ['Abel', 'Hana', 'Yonas', 'Meron', 'Dawit', 'Sara', 'Kalkidan', 'Nahom', 'Bethel', 'Robel', 'Lidya', 'Samuel', 'Mekdes', 'Yonatan', 'Helen', 'Biniam', 'Rahel', 'Fitsum', 'Selam', 'Henok', 'Tigist', 'Kaleb', 'Mahlet', 'Eyob'];
const LAST_NAMES = ['Tesfaye', 'Bekele', 'Alemu', 'Tadesse', 'Gebre', 'Worku', 'Desta', 'Haile', 'Kebede', 'Mohammed', 'Getachew', 'Assefa', 'Mulugeta', 'Tilahun', 'Negash', 'Abebe'];
const NUMBERS = [1, 2, 4, 5, 8, 10, 9, 11];
const POSITIONS: Player['position'][] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD', 'MID'];

export const players: Player[] = departments.flatMap((department, departmentIndex) =>
  POSITIONS.map((position, index) => {
    const seed = departmentIndex * 8 + index;
    const goals = position === 'FWD' ? (seed % 5) + 1 : position === 'MID' ? seed % 3 : 0;
    const assists = position === 'MID' ? (seed % 4) + 1 : position === 'FWD' ? seed % 2 : 0;
    return {
      id: `${department.id}-p${index + 1}`,
      name: `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[(seed * 3) % LAST_NAMES.length]}`,
      position,
      number: NUMBERS[index],
      departmentId: department.id,
      goals,
      assists,
    };
  }),
);

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

const GOAL_MINUTES = [9, 18, 27, 36, 44, 52, 61, 70, 77, 84];

function sampleGoalEvents(fixture: Fixture): GoalEvent[] {
  if (fixture.status === 'upcoming' || fixture.homeScore == null || fixture.awayScore == null) return [];
  const latestMinute = fixture.status === 'live' && fixture.minute != null ? fixture.minute : 90;
  const events: GoalEvent[] = [];
  const pushGoals = (teamId: string, count: number, offset: number) => {
    const scorers = ['FWD', 'MID', 'DEF'].flatMap((position) =>
      players.filter((player) => player.departmentId === teamId && player.position === position && player.registered !== false),
    );
    for (let index = 0; index < count; index += 1) {
      const scorer = scorers[index % scorers.length];
      if (!scorer) continue;
      events.push({
        minute: Math.min(GOAL_MINUTES[(offset + index) % GOAL_MINUTES.length], latestMinute),
        teamId,
        playerId: scorer.id,
        playerName: scorer.name,
      });
    }
  };
  pushGoals(fixture.homeId, fixture.homeScore, fixture.matchday);
  pushGoals(fixture.awayId, fixture.awayScore, fixture.matchday + 3);
  return events.sort((a, b) => a.minute - b.minute || a.playerName.localeCompare(b.playerName));
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

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fillerPlayer(departmentId: string, slot: number, position: Player['position'], number: number, taken: Set<string>): Player {
  const departmentIndex = Math.max(0, departments.findIndex((department) => department.id === departmentId));
  let seed = 480 + departmentIndex * 17 + slot * 3;
  let name = `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[seed % LAST_NAMES.length]}`;

  for (let attempt = 0; taken.has(name) && attempt < 40; attempt += 1) {
    seed += 5;
    name = `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[(seed + attempt) % LAST_NAMES.length]}`;
  }

  taken.add(name);
  return {
    id: `${departmentId}-x${slot}`,
    name,
    position,
    number,
    departmentId,
    goals: 0,
    assists: 0,
  };
}

export function sampleMatchSheet(departmentId: string): MatchSheet {
  const squad = players.filter((player) => player.departmentId === departmentId && player.registered !== false);
  const taken = new Set(squad.map((player) => player.name));
  const starters = [
    ...squad.filter((player) => player.position === 'GK'),
    ...squad.filter((player) => player.position === 'DEF'),
    fillerPlayer(departmentId, 0, 'DEF', 3, taken),
    fillerPlayer(departmentId, 1, 'DEF', 6, taken),
    ...squad.filter((player) => player.position === 'MID'),
    ...squad.filter((player) => player.position === 'FWD'),
    fillerPlayer(departmentId, 2, 'FWD', 7, taken),
  ];

  return {
    formation: '4-2-3-1',
    starters,
    bench: [
      fillerPlayer(departmentId, 3, 'GK', 12, taken),
      fillerPlayer(departmentId, 4, 'DEF', 14, taken),
      fillerPlayer(departmentId, 5, 'MID', 15, taken),
      fillerPlayer(departmentId, 6, 'MID', 16, taken),
      fillerPlayer(departmentId, 7, 'FWD', 17, taken),
    ],
  };
}

export function matchSheet(departmentId: string, matchId?: string): MatchSheet {
  const rows = matchId ? squads.filter((row) => row.matchId === matchId && row.teamId === departmentId) : [];
  if (!rows.length) return sampleMatchSheet(departmentId);
  const fixture = matchId ? getFixture(matchId) : undefined;
  const playerFor = (row: SquadRow) => players.find((player) => player.id === row.playerId);
  const formation = fixture && departmentId === fixture.awayId ? fixture.formationAway : fixture?.formationHome;
  return {
    formation: formation || '4-2-3-1',
    starters: rows.filter((row) => row.role === 'starter').sort((a, b) => a.sort - b.sort).map(playerFor).filter((player): player is Player => Boolean(player)),
    bench: rows.filter((row) => row.role === 'bench').sort((a, b) => a.sort - b.sort).map(playerFor).filter((player): player is Player => Boolean(player)),
  };
}

export function sampleTimeline(fixture: Fixture): TimelineEvent[] {
  if (fixture.status === 'upcoming') return [];
  const limit = fixture.status === 'live' && fixture.minute != null ? fixture.minute : 90;
  const events: TimelineEvent[] = sampleGoalEvents(fixture).map((goal) => {
    const mids = sampleMatchSheet(goal.teamId).starters.filter((player) => player.position === 'MID' && player.id !== goal.playerId);
    const assist = mids[hashString(`${fixture.id}:${goal.playerId}`) % Math.max(mids.length, 1)];
    return { ...goal, kind: 'goal' as const, assistId: assist?.id, assistName: assist?.name };
  });

  [fixture.homeId, fixture.awayId].forEach((teamId) => {
    const pool = sampleMatchSheet(teamId).starters.filter((player) => player.position !== 'GK');
    const seed = hashString(`${fixture.id}:${teamId}:cards`);
    const used = new Set<string>();
    const yellows = 1 + (seed % 3);
    for (let index = 0; index < yellows; index += 1) {
      const player = pool[(seed + index * 5) % pool.length];
      if (!player || used.has(player.id)) continue;
      used.add(player.id);
      const minute = 14 + ((seed >>> (index * 4)) % 68);
      if (minute > limit) continue;
      events.push({ minute, teamId, playerId: player.id, playerName: player.name, kind: 'yellow' });
    }
    if (seed % 13 === 0) {
      const player = pool.find((item) => !used.has(item.id)) ?? pool[0];
      const minute = Math.min(78, 55 + (seed % 20));
      if (player && minute <= limit) events.push({ minute, teamId, playerId: player.id, playerName: player.name, kind: 'red' });
    }
  });

  return events.filter((event) => event.minute <= limit).sort((a, b) => a.minute - b.minute || a.playerName.localeCompare(b.playerName));
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

export function sampleSubstitutions(fixture: Fixture): Substitution[] {
  if (fixture.status === 'upcoming') return [];
  const limit = fixture.status === 'live' && fixture.minute != null ? fixture.minute : 90;
  const changes: Substitution[] = [];
  [fixture.homeId, fixture.awayId].forEach((teamId) => {
    const sheet = sampleMatchSheet(teamId);
    const scorers = new Set(sampleGoalEvents(fixture).filter((goal) => goal.teamId === teamId).map((goal) => goal.playerId));
    const pool = sheet.starters.filter((player) => player.position !== 'GK' && !scorers.has(player.id));
    const seed = hashString(`${fixture.id}:${teamId}:subs`);
    const planned = limit >= 80 ? 3 : limit >= 60 ? 1 : 0;
    const minutes = [57 + (seed % 5), 69 + ((seed >>> 2) % 6), 79 + ((seed >>> 4) % 6)];
    const used = new Set<string>();
    for (let index = 0; index < planned; index += 1) {
      const minute = minutes[index];
      const off = pool[index];
      const onPlayer = sheet.bench.find((player) => !used.has(player.id) && player.position === off?.position)
        ?? sheet.bench.find((player) => !used.has(player.id) && player.position !== 'GK');
      if (!off || !onPlayer || minute > limit) continue;
      used.add(onPlayer.id);
      changes.push({ minute, teamId, offId: off.id, onPlayer });
    }
  });
  return changes;
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
