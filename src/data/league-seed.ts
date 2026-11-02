import type { Department, Fixture, MatchSheet, Player, Substitution, TimelineEvent } from './supercup';
import type { NewsArticle } from './news';

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export const GROUP_COLLEGES = {
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

const rawFixtures = [
  { group: 'A' as const, matchday: 1, homeId: 'software-engineering', awayId: 'electrical-engineering', score: [2, 0] as [number, number], status: 'finished' as const, date: '2026-10-10', time: '15:00', stadium: PITCH.iot },
  { group: 'A' as const, matchday: 1, homeId: 'computer-science', awayId: 'information-technology', score: [1, 1] as [number, number], status: 'finished' as const, date: '2026-10-10', time: '17:30', stadium: PITCH.iot },
  { group: 'A' as const, matchday: 2, homeId: 'software-engineering', awayId: 'information-technology', score: [1, 0] as [number, number], status: 'live' as const, minute: 62, date: '2026-10-24', time: '15:00', stadium: PITCH.iot },
  { group: 'A' as const, matchday: 2, homeId: 'electrical-engineering', awayId: 'computer-science', status: 'upcoming' as const, date: '2026-10-24', time: '18:00', stadium: PITCH.iot },
  { group: 'A' as const, matchday: 3, homeId: 'software-engineering', awayId: 'computer-science', status: 'upcoming' as const, date: '2026-10-31', time: '15:00', stadium: PITCH.iot },
  { group: 'A' as const, matchday: 3, homeId: 'information-technology', awayId: 'electrical-engineering', status: 'upcoming' as const, date: '2026-10-31', time: '17:30', stadium: PITCH.iot },

  { group: 'B' as const, matchday: 1, homeId: 'civil-engineering', awayId: 'chemical-engineering', score: [1, 0] as [number, number], status: 'finished' as const, date: '2026-10-10', time: '09:00', stadium: PITCH.main },
  { group: 'B' as const, matchday: 1, homeId: 'mechanical-engineering', awayId: 'architecture', score: [3, 1] as [number, number], status: 'finished' as const, date: '2026-10-10', time: '11:30', stadium: PITCH.main },
  { group: 'B' as const, matchday: 2, homeId: 'civil-engineering', awayId: 'architecture', score: [2, 1] as [number, number], status: 'finished' as const, date: '2026-10-24', time: '09:00', stadium: PITCH.main },
  { group: 'B' as const, matchday: 2, homeId: 'chemical-engineering', awayId: 'mechanical-engineering', status: 'upcoming' as const, date: '2026-10-24', time: '16:30', stadium: PITCH.main },
  { group: 'B' as const, matchday: 3, homeId: 'civil-engineering', awayId: 'mechanical-engineering', status: 'upcoming' as const, date: '2026-10-31', time: '09:00', stadium: PITCH.main },
  { group: 'B' as const, matchday: 3, homeId: 'architecture', awayId: 'chemical-engineering', status: 'upcoming' as const, date: '2026-10-31', time: '11:30', stadium: PITCH.main },

  { group: 'C' as const, matchday: 1, homeId: 'accounting-finance', awayId: 'marketing', score: [2, 1] as [number, number], status: 'finished' as const, date: '2026-10-11', time: '10:00', stadium: PITCH.sabian },
  { group: 'C' as const, matchday: 1, homeId: 'economics', awayId: 'management', score: [0, 0] as [number, number], status: 'finished' as const, date: '2026-10-11', time: '14:00', stadium: PITCH.sabian },
  { group: 'C' as const, matchday: 2, homeId: 'accounting-finance', awayId: 'management', score: [1, 1] as [number, number], status: 'finished' as const, date: '2026-10-24', time: '10:30', stadium: PITCH.sabian },
  { group: 'C' as const, matchday: 2, homeId: 'marketing', awayId: 'economics', status: 'upcoming' as const, date: '2026-10-24', time: '17:00', stadium: PITCH.sabian },
  { group: 'C' as const, matchday: 3, homeId: 'accounting-finance', awayId: 'economics', status: 'upcoming' as const, date: '2026-10-31', time: '10:00', stadium: PITCH.sabian },
  { group: 'C' as const, matchday: 3, homeId: 'management', awayId: 'marketing', status: 'upcoming' as const, date: '2026-10-31', time: '14:00', stadium: PITCH.sabian },

  { group: 'D' as const, matchday: 1, homeId: 'medicine', awayId: 'medical-laboratory', score: [3, 0] as [number, number], status: 'finished' as const, date: '2026-10-11', time: '09:00', stadium: PITCH.health },
  { group: 'D' as const, matchday: 1, homeId: 'nursing', awayId: 'midwifery', score: [2, 2] as [number, number], status: 'finished' as const, date: '2026-10-11', time: '11:30', stadium: PITCH.health },
  { group: 'D' as const, matchday: 2, homeId: 'medicine', awayId: 'midwifery', score: [2, 0] as [number, number], status: 'finished' as const, date: '2026-10-24', time: '11:00', stadium: PITCH.health },
  { group: 'D' as const, matchday: 2, homeId: 'medical-laboratory', awayId: 'nursing', status: 'upcoming' as const, date: '2026-10-24', time: '18:30', stadium: PITCH.health },
  { group: 'D' as const, matchday: 3, homeId: 'medicine', awayId: 'nursing', status: 'upcoming' as const, date: '2026-10-31', time: '09:00', stadium: PITCH.health },
  { group: 'D' as const, matchday: 3, homeId: 'midwifery', awayId: 'medical-laboratory', status: 'upcoming' as const, date: '2026-10-31', time: '11:30', stadium: PITCH.health },

  { group: 'E' as const, matchday: 1, homeId: 'sport-science', awayId: 'chemistry', score: [2, 2] as [number, number], status: 'finished' as const, date: '2026-10-10', time: '08:30', stadium: PITCH.main },
  { group: 'E' as const, matchday: 1, homeId: 'mathematics', awayId: 'biology', score: [1, 0] as [number, number], status: 'finished' as const, date: '2026-10-10', time: '13:00', stadium: PITCH.main },
  { group: 'E' as const, matchday: 2, homeId: 'sport-science', awayId: 'biology', score: [3, 1] as [number, number], status: 'finished' as const, date: '2026-10-24', time: '08:30', stadium: PITCH.main },
  { group: 'E' as const, matchday: 2, homeId: 'chemistry', awayId: 'mathematics', status: 'upcoming' as const, date: '2026-10-24', time: '16:00', stadium: PITCH.main },
  { group: 'E' as const, matchday: 3, homeId: 'sport-science', awayId: 'mathematics', status: 'upcoming' as const, date: '2026-10-31', time: '08:30', stadium: PITCH.main },
  { group: 'E' as const, matchday: 3, homeId: 'biology', awayId: 'chemistry', status: 'upcoming' as const, date: '2026-10-31', time: '13:00', stadium: PITCH.main },

  { group: 'F' as const, matchday: 1, homeId: 'law', awayId: 'psychology', score: [1, 0] as [number, number], status: 'finished' as const, date: '2026-10-11', time: '15:00', stadium: PITCH.sabian },
  { group: 'F' as const, matchday: 1, homeId: 'journalism', awayId: 'political-science', score: [2, 1] as [number, number], status: 'finished' as const, date: '2026-10-11', time: '17:30', stadium: PITCH.sabian },
  { group: 'F' as const, matchday: 2, homeId: 'law', awayId: 'political-science', score: [0, 0] as [number, number], status: 'finished' as const, date: '2026-10-24', time: '12:00', stadium: PITCH.sabian },
  { group: 'F' as const, matchday: 2, homeId: 'psychology', awayId: 'journalism', status: 'upcoming' as const, date: '2026-10-24', time: '19:00', stadium: PITCH.sabian },
  { group: 'F' as const, matchday: 3, homeId: 'law', awayId: 'journalism', status: 'upcoming' as const, date: '2026-10-31', time: '15:00', stadium: PITCH.sabian },
  { group: 'F' as const, matchday: 3, homeId: 'political-science', awayId: 'psychology', status: 'upcoming' as const, date: '2026-10-31', time: '17:30', stadium: PITCH.sabian },
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

export function matchSheet(departmentId: string): MatchSheet {
  const squad = players
    .filter((player) => player.departmentId === departmentId && player.registered !== false)
    .sort((a, b) => a.number - b.number || a.name.localeCompare(b.name));
  const used = new Set<string>();
  const pick = (position: Player['position'], count: number) => {
    const chosen = squad.filter((player) => player.position === position && !used.has(player.id)).slice(0, count);
    chosen.forEach((player) => used.add(player.id));
    return chosen;
  };
  const starters = [...pick('GK', 1), ...pick('DEF', 4), ...pick('MID', 5)];
  const forwards = squad.filter((player) => player.position === 'FWD' && !used.has(player.id));
  const striker = forwards.find((player) => player.number === 9) ?? forwards[0];
  forwards.filter((player) => player !== striker).forEach((player) => {
    if (starters.length >= 10) return;
    starters.push(player);
    used.add(player.id);
  });
  if (striker && starters.length < 11) {
    starters.push(striker);
    used.add(striker.id);
  }
  squad.forEach((player) => {
    if (starters.length >= 11 || used.has(player.id)) return;
    starters.push(player);
    used.add(player.id);
  });
  const taken = new Set(squad.map((player) => player.name));
  let slot = 0;
  while (starters.length < 11) {
    const player = fillerPlayer(departmentId, slot, slot === 0 ? 'GK' : 'MID', 30 + slot, taken);
    slot += 1;
    starters.push(player);
  }
  return {
    formation: '4-2-3-1',
    starters: starters.slice(0, 11),
    bench: squad.filter((player) => !starters.slice(0, 11).some((starter) => starter.id === player.id)),
  };
}

const GOAL_MINUTES = [9, 18, 27, 36, 44, 52, 61, 70, 77, 84];

function sampleGoalEvents(fixture: Fixture) {
  if (fixture.status === 'upcoming' || fixture.homeScore == null || fixture.awayScore == null) return [];
  const latestMinute = fixture.status === 'live' && fixture.minute != null ? fixture.minute : 90;
  const events: Array<{ minute: number; teamId: string; playerId: string; playerName: string }> = [];
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

export function matchTimeline(fixture: Fixture): TimelineEvent[] {
  if (fixture.status === 'upcoming') return [];
  const limit = fixture.status === 'live' && fixture.minute != null ? fixture.minute : 90;
  const events: TimelineEvent[] = sampleGoalEvents(fixture).map((goal) => {
    const mids = matchSheet(goal.teamId).starters.filter((player) => player.position === 'MID' && player.id !== goal.playerId);
    const assist = mids[hashString(`${fixture.id}:${goal.playerId}`) % Math.max(mids.length, 1)];
    return { ...goal, kind: 'goal' as const, assistId: assist?.id, assistName: assist?.name };
  });

  [fixture.homeId, fixture.awayId].forEach((teamId) => {
    const pool = matchSheet(teamId).starters.filter((player) => player.position !== 'GK');
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

export function matchSubstitutions(fixture: Fixture): Substitution[] {
  if (fixture.status === 'upcoming') return [];
  const limit = fixture.status === 'live' && fixture.minute != null ? fixture.minute : 90;
  const changes: Substitution[] = [];
  [fixture.homeId, fixture.awayId].forEach((teamId) => {
    const sheet = matchSheet(teamId);
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

export const news: NewsArticle[] = [
  {
    id: 'swe-lead-group-a',
    title: 'Software Engineering take control of Group A',
    category: 'Match report',
    time: 'Today',
    summary: 'SWE lead Information Technology 1-0 in the Matchday 2 live game at the Institute of Technology Ground.',
    body: 'Software Engineering are in front against Information Technology in the Super Cup group stage. The live lead, added to their Matchday 1 win over Electrical & Computer Engineering, puts SWE clear at the top of Group A. Computer Science and ECE meet later today.',
  },
  {
    id: 'medicine-perfect',
    title: 'Medicine stay perfect in Group D',
    category: 'Group D',
    time: 'Today',
    summary: 'Medicine beat Midwifery 2-0 and remain on six points from two games.',
    body: 'Medicine followed their 3-0 opening win over Medical Laboratory with a 2-0 result against Midwifery at Health Campus Field. Nursing and Midwifery shared points on Matchday 1, so Medicine are the only side in the group with a perfect record.',
  },
  {
    id: 'sport-science-three',
    title: 'Sport Science score three against Biology',
    category: 'Group E',
    time: 'Today',
    summary: 'A 3-1 win moves Sport Science to the top of the natural sciences group.',
    body: 'Sport Science beat Biology 3-1 on Matchday 2 at DDU Main Pitch. Mathematics still have a Matchday 2 game against Chemistry, while Sport Science sit on four points after drawing Chemistry on the opening day.',
  },
  {
    id: 'matchday-three',
    title: 'Matchday 3 closes the group stage on October 31',
    category: 'Fixtures',
    time: 'This week',
    summary: 'Every department plays its last group game on October 31. The top two in each group advance.',
    body: 'The Dire Dawa University Super Cup group stage finishes on October 31. Each group has four departments, and each department plays the other three once. The top two in every group advance. Kickoffs are spread across DDU Main Pitch, Sabian Campus Pitch, the Institute of Technology Ground, and Health Campus Field.',
  },
  {
    id: 'civil-engineering-pace',
    title: 'Civil Engineering set the pace in Group B',
    category: 'Group B',
    time: 'Today',
    summary: 'Civil Engineering have two wins from two after beating Architecture 2-1.',
    body: 'Civil Engineering beat Chemical Engineering 1-0 and then Architecture 2-1. Mechanical Engineering opened with a 3-1 win over Architecture and still have Chemical Engineering to play on Matchday 2.',
  },
];
