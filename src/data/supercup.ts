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
}

export interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  number: number;
  departmentId: string;
  goals: number;
  assists: number;
}

export interface Fixture {
  id: string;
  group: GroupId;
  matchday: 1 | 2 | 3;
  date: string;
  time: string;
  stadium: string;
  homeId: string;
  awayId: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  minute?: number;
}

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
    .filter((player) => player.departmentId === id)
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
    .filter((fixture) => fixture.group === group && fixture.status !== 'upcoming' && fixture.homeScore != null && fixture.awayScore != null)
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
      home.points += 3;
      away.lost += 1;
      home.form.push('W');
      away.form.push('L');
    } else if (homeScore < awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
      home.form.push('L');
      away.form.push('W');
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
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
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.department.name.localeCompare(b.department.name);
  });

  return table.map((row, index) => ({ ...row, position: index + 1 }));
}

export function topScorers(limit = 5) {
  return [...players]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, limit)
    .map((player) => ({
      ...player,
      department: getDepartment(player.departmentId),
    }));
}

export function formatKickoff(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
