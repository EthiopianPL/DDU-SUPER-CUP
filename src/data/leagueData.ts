// src/data/leagueData.ts

// Team Interface
export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  secondaryColor?: string;
  stadium: string;
  capacity: number;
  founded: number;
  manager: string;
  logo?: string;
}

// Player Interface
export interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  number: number;
  nationality: string;
  age: number;
  teamId: string;
  goals: number;
  assists: number;
  appearances: number;
  minutesPlayed: number;
  yellowCards: number;
  redCards: number;
  image?: string;
}

// Match Event Interface
export interface MatchEvent {
  id: string;
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' | 'own_goal';
  minute: number;
  minuteExtra?: number;
  playerId: string;
  playerName: string;
  teamId: string;
  assistedBy?: string;
  isPenalty?: boolean;
  isOwnGoal?: boolean;
}

// Match Stats Interface
export interface MatchStats {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  offsides: { home: number; away: number };
  passes: { home: number; away: number };
  passAccuracy: { home: number; away: number };
}

// Match Interface
export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  status: 'live' | 'upcoming' | 'finished';
  time?: string;
  date: string;
  matchweek: number;
  stadium: string;
  referee?: string;
  attendance?: number;
  events?: MatchEvent[];
  stats?: MatchStats;
  manOfTheMatch?: string;
}

// Standings Entry Interface
export interface StandingsEntry {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[]; // Array of 'W', 'D', 'L' for last 5 matches
  homeStats?: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  awayStats?: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
  };
}

// All Teams in Ethiopian Premier League
export const teams: Record<string, Team> = {
  'st-george': {
    id: 'st-george',
    name: 'St. George FC',
    shortName: 'St. George',
    color: '#ffc300',
    secondaryColor: '#000000',
    stadium: 'Addis Ababa Stadium',
    capacity: 35000,
    founded: 1935,
    manager: 'Ashenafi Ketema',
  },
  'fasil-kenema': {
    id: 'fasil-kenema',
    name: 'Fasil Kenema',
    shortName: 'Fasil',
    color: '#e63946',
    secondaryColor: '#ffffff',
    stadium: 'Gondar Stadium',
    capacity: 20000,
    founded: 1967,
    manager: 'Wubetu Abate',
  },
  'ethiopian-coffee': {
    id: 'ethiopian-coffee',
    name: 'Ethiopian Coffee',
    shortName: 'Coffee',
    color: '#8b4513',
    secondaryColor: '#d2b48c',
    stadium: 'Yidnekachew Tessema Stadium',
    capacity: 25000,
    founded: 1976,
    manager: 'Yonas Sahle',
  },
  'mechal-fc': {
    id: 'mechal-fc',
    name: 'Mechal FC',
    shortName: 'Mechal',
    color: '#2d6a4f',
    secondaryColor: '#ffd700',
    stadium: 'Adigrat Stadium',
    capacity: 15000,
    founded: 1980,
    manager: 'Gebremedhin Haile',
  },
  'defence-force': {
    id: 'defence-force',
    name: 'Defence Force',
    shortName: 'Defence',
    color: '#0077b6',
    secondaryColor: '#ffffff',
    stadium: 'Debre Zeit Stadium',
    capacity: 12000,
    founded: 1982,
    manager: 'Daniel Wondimu',
  },
  'sidama-coffee': {
    id: 'sidama-coffee',
    name: 'Sidama Coffee',
    shortName: 'Sidama',
    color: '#6a4c93',
    secondaryColor: '#ffd700',
    stadium: 'Hawassa Stadium',
    capacity: 25000,
    founded: 1985,
    manager: 'Tsegay Kidane',
  },
  'bahir-dar-kenema': {
    id: 'bahir-dar-kenema',
    name: 'Bahir Dar Kenema',
    shortName: 'Bahir Dar',
    color: '#ff6b35',
    secondaryColor: '#ffffff',
    stadium: 'Bahir Dar Stadium',
    capacity: 25000,
    founded: 1998,
    manager: 'Mulugeta Ayele',
  },
  'wolkite-kenema': {
    id: 'wolkite-kenema',
    name: 'Wolkite Kenema',
    shortName: 'Wolkite',
    color: '#1982c4',
    secondaryColor: '#ffffff',
    stadium: 'Wolkite Stadium',
    capacity: 15000,
    founded: 2005,
    manager: 'Tesfaye Taye',
  },
  'adama-city': {
    id: 'adama-city',
    name: 'Adama City',
    shortName: 'Adama',
    color: '#e63946',
    secondaryColor: '#ffffff',
    stadium: 'Adama Stadium',
    capacity: 15000,
    founded: 1985,
    manager: 'Kebede Getachew',
  },
  'arba-minch-kenema': {
    id: 'arba-minch-kenema',
    name: 'Arba Minch Kenema',
    shortName: 'Arba Minch',
    color: '#2d6a4f',
    secondaryColor: '#ffd700',
    stadium: 'Arba Minch Stadium',
    capacity: 10000,
    founded: 1990,
    manager: 'Mekonnen Ayele',
  },
  'hadiya-hossana': {
    id: 'hadiya-hossana',
    name: 'Hadiya Hossana',
    shortName: 'Hadiya',
    color: '#ff6b35',
    secondaryColor: '#ffffff',
    stadium: 'Hossana Stadium',
    capacity: 10000,
    founded: 1995,
    manager: 'Temesgen Tulu',
  },
  'dire-dawa-kenema': {
    id: 'dire-dawa-kenema',
    name: 'Dire Dawa Kenema',
    shortName: 'Dire Dawa',
    color: '#0077b6',
    secondaryColor: '#ffffff',
    stadium: 'Dire Dawa Stadium',
    capacity: 18000,
    founded: 1987,
    manager: 'Henok Getachew',
  },
  'hawassa-kenema': {
    id: 'hawassa-kenema',
    name: 'Hawassa Kenema',
    shortName: 'Hawassa',
    color: '#6a4c93',
    secondaryColor: '#ffd700',
    stadium: 'Hawassa Stadium',
    capacity: 25000,
    founded: 1982,
    manager: 'Yidnekachew Tesfaye',
  },
  'sebeta-kenema': {
    id: 'sebeta-kenema',
    name: 'Sebeta Kenema',
    shortName: 'Sebeta',
    color: '#8b4513',
    secondaryColor: '#d2b48c',
    stadium: 'Sebeta Stadium',
    capacity: 8000,
    founded: 2000,
    manager: 'Ermias Ayele',
  },
  'welayta-dicha': {
    id: 'welayta-dicha',
    name: 'Welayta Dicha',
    shortName: 'Welayta',
    color: '#e63946',
    secondaryColor: '#ffffff',
    stadium: 'Sodo Stadium',
    capacity: 12000,
    founded: 2010,
    manager: 'Tilahun Fikre',
  },
  'legetafo-legedadi': {
    id: 'legetafo-legedadi',
    name: 'Legetafo Legedadi',
    shortName: 'Legetafo',
    color: '#da121a',
    secondaryColor: '#ffffff',
    stadium: 'Legetafo Stadium',
    capacity: 5000,
    founded: 2015,
    manager: 'Biruk Zeleke',
  },
};

// Players Data
export const players: Player[] = [
  // St. George FC Players
  { id: 'p1', name: 'Getaneh Kebede', position: 'FWD', number: 9, nationality: 'Ethiopia', age: 32, teamId: 'st-george', goals: 18, assists: 7, appearances: 20, minutesPlayed: 1750, yellowCards: 2, redCards: 0 },
  { id: 'p2', name: 'Shimelis Bekele', position: 'MID', number: 10, nationality: 'Ethiopia', age: 28, teamId: 'st-george', goals: 8, assists: 12, appearances: 20, minutesPlayed: 1780, yellowCards: 3, redCards: 0 },
  { id: 'p3', name: 'Behailu Assefa', position: 'MID', number: 8, nationality: 'Ethiopia', age: 26, teamId: 'st-george', goals: 5, assists: 6, appearances: 18, minutesPlayed: 1520, yellowCards: 4, redCards: 0 },
  { id: 'p4', name: 'Aschenaki Dereje', position: 'DEF', number: 4, nationality: 'Ethiopia', age: 30, teamId: 'st-george', goals: 2, assists: 1, appearances: 19, minutesPlayed: 1710, yellowCards: 5, redCards: 1 },
  { id: 'p5', name: 'Mignot Debebe', position: 'DEF', number: 5, nationality: 'Ethiopia', age: 29, teamId: 'st-george', goals: 1, assists: 2, appearances: 20, minutesPlayed: 1800, yellowCards: 6, redCards: 0 },
  
  // Fasil Kenema Players
  { id: 'p6', name: 'Abubeker Nassir', position: 'FWD', number: 11, nationality: 'Ethiopia', age: 24, teamId: 'fasil-kenema', goals: 15, assists: 5, appearances: 19, minutesPlayed: 1650, yellowCards: 1, redCards: 0 },
  { id: 'p7', name: 'Gatoch Panom', position: 'MID', number: 7, nationality: 'South Sudan', age: 26, teamId: 'fasil-kenema', goals: 6, assists: 9, appearances: 20, minutesPlayed: 1750, yellowCards: 2, redCards: 0 },
  { id: 'p8', name: 'Tadele Mengesha', position: 'MID', number: 19, nationality: 'Ethiopia', age: 27, teamId: 'fasil-kenema', goals: 4, assists: 4, appearances: 18, minutesPlayed: 1400, yellowCards: 3, redCards: 0 },
  
  // Mech al FC Players
  { id: 'p9', name: 'Amanuel Gebremichael', position: 'FWD', number: 9, nationality: 'Ethiopia', age: 27, teamId: 'mechal-fc', goals: 13, assists: 4, appearances: 20, minutesPlayed: 1720, yellowCards: 2, redCards: 0 },
  { id: 'p10', name: 'Chernet Gugsa', position: 'MID', number: 10, nationality: 'Ethiopia', age: 25, teamId: 'mechal-fc', goals: 7, assists: 8, appearances: 19, minutesPlayed: 1650, yellowCards: 3, redCards: 0 },
];

// Top Scorers
export const topScorers = players
  .filter(p => p.position === 'FWD')
  .sort((a, b) => b.goals - a.goals)
  .slice(0, 10)
  .map(p => ({
    id: p.id,
    name: p.name,
    team: teams[p.teamId],
    goals: p.goals,
    assists: p.assists,
    appearances: p.appearances,
  }));

// Top Assists
export const topAssists = players
  .sort((a, b) => b.assists - a.assists)
  .slice(0, 10)
  .map(p => ({
    id: p.id,
    name: p.name,
    team: teams[p.teamId],
    assists: p.assists,
    goals: p.goals,
    appearances: p.appearances,
  }));

// Live Matches
export const liveMatches: Match[] = [
  {
    id: 'live-1',
    homeTeam: teams['ethiopian-coffee'],
    awayTeam: teams['wolkite-kenema'],
    homeScore: 2,
    awayScore: 1,
    status: 'live',
    date: new Date().toISOString(),
    matchweek: 21,
    stadium: teams['ethiopian-coffee'].stadium,
    referee: 'Tessema Bamlaku',
    events: [
      { id: 'e1', type: 'goal', minute: 23, playerId: 'p1', playerName: 'Getaneh Kebede', teamId: 'ethiopian-coffee', assistedBy: 'Shimelis Bekele' },
      { id: 'e2', type: 'goal', minute: 45, playerId: 'p6', playerName: 'Abubeker Nassir', teamId: 'wolkite-kenema' },
      { id: 'e3', type: 'goal', minute: 67, playerId: 'p2', playerName: 'Shimelis Bekele', teamId: 'ethiopian-coffee', assistedBy: 'Getaneh Kebede' },
    ],
  },
];

// Upcoming Matches
export const upcomingMatches: Match[] = [
  {
    id: 'upcoming-1',
    homeTeam: teams['mechal-fc'],
    awayTeam: teams['defence-force'],
    status: 'upcoming',
    time: '15:00',
    date: '2026-04-18',
    matchweek: 21,
    stadium: teams['mechal-fc'].stadium,
  },
  {
    id: 'upcoming-2',
    homeTeam: teams['sidama-coffee'],
    awayTeam: teams['bahir-dar-kenema'],
    status: 'upcoming',
    time: '18:00',
    date: '2026-04-18',
    matchweek: 21,
    stadium: teams['sidama-coffee'].stadium,
  },
  {
    id: 'upcoming-3',
    homeTeam: teams['st-george'],
    awayTeam: teams['fasil-kenema'],
    status: 'upcoming',
    time: '20:00',
    date: '2026-04-19',
    matchweek: 21,
    stadium: teams['st-george'].stadium,
  },
];

// Generate Standings based on match results
export const generateStandings = (): StandingsEntry[] => {
  const standings: StandingsEntry[] = Object.values(teams).map(team => ({
    position: 0,
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
  }));

  // Update with mock data (in real app, calculate from matches)
  const mockData: Record<string, Partial<StandingsEntry>> = {
    'st-george': { played: 20, won: 15, drawn: 3, lost: 2, goalsFor: 45, goalsAgainst: 18, points: 48, form: ['W', 'W', 'W', 'D', 'W'] },
    'fasil-kenema': { played: 20, won: 13, drawn: 5, lost: 2, goalsFor: 42, goalsAgainst: 20, points: 44, form: ['W', 'W', 'D', 'W', 'L'] },
    'ethiopian-coffee': { played: 20, won: 12, drawn: 4, lost: 4, goalsFor: 38, goalsAgainst: 22, points: 40, form: ['W', 'L', 'W', 'W', 'D'] },
    'mechal-fc': { played: 20, won: 11, drawn: 5, lost: 4, goalsFor: 35, goalsAgainst: 24, points: 38, form: ['D', 'W', 'W', 'L', 'W'] },
    'defence-force': { played: 20, won: 10, drawn: 6, lost: 4, goalsFor: 32, goalsAgainst: 25, points: 36, form: ['W', 'D', 'L', 'W', 'D'] },
    'sidama-coffee': { played: 20, won: 9, drawn: 7, lost: 4, goalsFor: 30, goalsAgainst: 26, points: 34, form: ['D', 'W', 'D', 'W', 'L'] },
    'bahir-dar-kenema': { played: 20, won: 8, drawn: 6, lost: 6, goalsFor: 28, goalsAgainst: 27, points: 30, form: ['L', 'W', 'D', 'L', 'W'] },
    'wolkite-kenema': { played: 20, won: 7, drawn: 5, lost: 8, goalsFor: 26, goalsAgainst: 30, points: 26, form: ['L', 'D', 'W', 'L', 'L'] },
    'adama-city': { played: 20, won: 6, drawn: 7, lost: 7, goalsFor: 25, goalsAgainst: 28, points: 25, form: ['D', 'L', 'D', 'W', 'L'] },
    'arba-minch-kenema': { played: 20, won: 6, drawn: 6, lost: 8, goalsFor: 24, goalsAgainst: 29, points: 24, form: ['L', 'D', 'L', 'W', 'D'] },
    'hadiya-hossana': { played: 20, won: 5, drawn: 8, lost: 7, goalsFor: 23, goalsAgainst: 28, points: 23, form: ['D', 'L', 'D', 'L', 'W'] },
    'dire-dawa-kenema': { played: 20, won: 5, drawn: 6, lost: 9, goalsFor: 22, goalsAgainst: 31, points: 21, form: ['L', 'D', 'L', 'L', 'D'] },
    'hawassa-kenema': { played: 20, won: 4, drawn: 7, lost: 9, goalsFor: 20, goalsAgainst: 30, points: 19, form: ['L', 'L', 'D', 'D', 'L'] },
    'sebeta-kenema': { played: 20, won: 4, drawn: 5, lost: 11, goalsFor: 18, goalsAgainst: 35, points: 17, form: ['L', 'D', 'L', 'L', 'L'] },
    'welayta-dicha': { played: 20, won: 3, drawn: 6, lost: 11, goalsFor: 16, goalsAgainst: 34, points: 15, form: ['L', 'L', 'D', 'L', 'D'] },
    'legetafo-legedadi': { played: 20, won: 2, drawn: 4, lost: 14, goalsFor: 12, goalsAgainst: 39, points: 10, form: ['L', 'L', 'L', 'D', 'L'] },
  };

  // Apply mock data
  standings.forEach(entry => {
    const data = mockData[entry.team.id];
    if (data) {
      Object.assign(entry, data);
      entry.goalDifference = (entry.goalsFor || 0) - (entry.goalsAgainst || 0);
    }
  });

  // Sort by points, then goal difference, then goals for
  standings.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
    return (b.goalsFor || 0) - (a.goalsFor || 0);
  });

  // Assign positions
  standings.forEach((entry, index) => {
    entry.position = index + 1;
  });

  return standings;
};

// Latest News
export interface NewsItem {
  id: string;
  image: string;
  title: string;
  category: string;
  time: string;
  teamColor?: string;
  relatedTeam?: Team;
  content?: string;
}

export const latestNews: NewsItem[] = [
  {
    id: 'news-1',
    image: 'https://images.unsplash.com/photo-1698844013403-b7c4cf0d3b2f',
    title: 'St. George FC extends winning streak to 5 matches with dominant performance against Fasil Kenema',
    category: 'Match Report',
    time: '2 hours ago',
    teamColor: teams['st-george'].color,
    relatedTeam: teams['st-george'],
  },
  {
    id: 'news-2',
    image: 'https://images.unsplash.com/photo-1765046876564-aa4034b6c71a',
    title: 'Getaneh Kebede scores incredible hat-trick in dramatic comeback victory',
    category: 'Highlights',
    time: '5 hours ago',
    teamColor: '#e63946',
  },
  {
    id: 'news-3',
    image: 'https://images.unsplash.com/photo-1739550635585-484633b21450',
    title: 'Ethiopian Coffee signs promising young midfielder from local academy',
    category: 'Transfer News',
    time: '8 hours ago',
    teamColor: teams['ethiopian-coffee'].color,
    relatedTeam: teams['ethiopian-coffee'],
  },
  {
    id: 'news-4',
    image: 'https://images.unsplash.com/photo-1764408721535-2dcb912db83e',
    title: 'Fasil Kenema prepares for crucial CAF Champions League qualifier',
    category: 'International',
    time: '1 day ago',
    teamColor: teams['fasil-kenema'].color,
    relatedTeam: teams['fasil-kenema'],
  },
];

// Helper function to get matches by team
export const getMatchesByTeam = (teamId: string): Match[] => {
  const allMatches = [...liveMatches, ...upcomingMatches];
  return allMatches.filter(m => m.homeTeam.id === teamId || m.awayTeam.id === teamId);
};

// Helper function to get players by team
export const getPlayersByTeam = (teamId: string): Player[] => {
  return players.filter(p => p.teamId === teamId);
};

// Helper function to get team by id
export const getTeamById = (id: string): Team | undefined => {
  return teams[id];
};

// Helper function to get player by id
export const getPlayerById = (id: string): Player | undefined => {
  return players.find(p => p.id === id);
};