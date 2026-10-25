import { newsArticles, type NewsArticle } from './news';
import {
  GROUP_COLLEGES,
  departments,
  fixtures,
  players,
  type Department,
  type Fixture,
  type Player,
} from './supercup';

const STORAGE_KEY = 'ddu-supercup-admin';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function replace<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next);
}

const seed = {
  departments: clone(departments),
  players: clone(players),
  fixtures: clone(fixtures),
  news: clone(newsArticles),
};

function uniqueId(base: string, taken: Set<string>) {
  const root = base || `item-${Date.now()}`;
  let id = root;
  let count = 2;
  while (taken.has(id)) {
    id = `${root}-${count}`;
    count += 1;
  }
  return id;
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function hydrateLeague() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Partial<typeof seed>;
    if (Array.isArray(data.departments)) replace(departments, data.departments);
    if (Array.isArray(data.players)) replace(players, data.players);
    if (Array.isArray(data.fixtures)) replace(fixtures, data.fixtures);
    if (Array.isArray(data.news)) replace(newsArticles, data.news);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function persistLeague() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    departments,
    players,
    fixtures,
    news: newsArticles,
  }));
}

export function resetLeague() {
  replace(departments, clone(seed.departments));
  replace(players, clone(seed.players));
  replace(fixtures, clone(seed.fixtures));
  replace(newsArticles, clone(seed.news));
  localStorage.removeItem(STORAGE_KEY);
}

export function saveDepartment(input: Department, isNew: boolean) {
  const name = input.name.trim();
  const shortName = input.shortName.trim().toUpperCase();
  if (!name || !shortName) return { ok: false as const, error: 'Name and short name are required.' };

  const id = isNew
    ? uniqueId(slugify(name), new Set(departments.map((department) => department.id)))
    : input.id;
  const next: Department = {
    ...input,
    id,
    name,
    shortName,
    college: GROUP_COLLEGES[input.group],
    pitch: input.pitch.trim() || 'DDU Main Pitch',
  };

  if (isNew) departments.push(next);
  else {
    const index = departments.findIndex((department) => department.id === id);
    if (index < 0) return { ok: false as const, error: 'Team not found.' };
    departments[index] = next;
  }

  persistLeague();
  return { ok: true as const };
}

export function deleteDepartment(id: string) {
  if (fixtures.some((fixture) => fixture.homeId === id || fixture.awayId === id)) {
    return { ok: false as const, error: 'Delete this team’s matches before deleting the team.' };
  }
  replace(players, players.filter((player) => player.departmentId !== id));
  replace(departments, departments.filter((department) => department.id !== id));
  persistLeague();
  return { ok: true as const };
}

export function savePlayer(input: Player, isNew: boolean) {
  const name = input.name.trim();
  if (!name || !input.departmentId) return { ok: false as const, error: 'Player name and team are required.' };

  const next: Player = {
    ...input,
    id: isNew ? `${input.departmentId}-${Date.now()}` : input.id,
    name,
    number: Math.max(0, Number(input.number) || 0),
    goals: Math.max(0, Number(input.goals) || 0),
    assists: Math.max(0, Number(input.assists) || 0),
  };

  if (isNew) players.push(next);
  else {
    const index = players.findIndex((player) => player.id === next.id);
    if (index < 0) return { ok: false as const, error: 'Player not found.' };
    players[index] = next;
  }

  persistLeague();
  return { ok: true as const };
}

export function deletePlayer(id: string) {
  replace(players, players.filter((player) => player.id !== id));
  persistLeague();
}

export function saveFixture(input: Fixture, isNew: boolean) {
  if (!input.homeId || !input.awayId) return { ok: false as const, error: 'Pick both teams.' };
  if (input.homeId === input.awayId) return { ok: false as const, error: 'Home and away must be different teams.' };
  const home = departments.find((department) => department.id === input.homeId);
  if (!home) return { ok: false as const, error: 'Home team not found.' };

  if (!isNew) {
    const current = fixtures.find((fixture) => fixture.id === input.id);
    if (!current) return { ok: false as const, error: 'Match not found.' };
    if (current.status === 'finished') return { ok: false as const, error: 'Full-time matches are locked.' };
    if (current.status === 'live') return { ok: false as const, error: 'Run a live match from the match control.' };
  }

  const next: Fixture = {
    ...input,
    id: isNew ? `${home.group.toLowerCase()}-md${input.matchday}-${Date.now()}` : input.id,
    group: home.group,
    date: input.date || new Date().toISOString().slice(0, 10),
    time: input.time || '15:00',
    stadium: input.stadium.trim() || home.pitch,
    status: 'upcoming',
    homeScore: undefined,
    awayScore: undefined,
    minute: undefined,
    elapsedSeconds: undefined,
    runningSince: undefined,
  };

  if (isNew) fixtures.push(next);
  else {
    const index = fixtures.findIndex((fixture) => fixture.id === next.id);
    if (index < 0) return { ok: false as const, error: 'Match not found.' };
    fixtures[index] = next;
  }

  persistLeague();
  return { ok: true as const };
}

export function deleteFixture(id: string) {
  const fixture = fixtures.find((item) => item.id === id);
  if (!fixture) return { ok: false as const, error: 'Match not found.' };
  if (fixture.status === 'finished') return { ok: false as const, error: 'Full-time matches are locked.' };
  replace(fixtures, fixtures.filter((item) => item.id !== id));
  persistLeague();
  return { ok: true as const };
}

export const MATCH_SECONDS = 90 * 60;
export const HALF_SECONDS = 45 * 60;

export interface MatchClock {
  total: number;
  minute: number;
  seconds: number;
  running: boolean;
}

export function matchClock(fixture: Fixture, now = Date.now()): MatchClock {
  const base = fixture.elapsedSeconds ?? (fixture.status === 'live' ? (fixture.minute ?? 0) * 60 : 0);
  const running = fixture.status === 'live' && typeof fixture.runningSince === 'number';
  const extra = running ? Math.max(0, (now - (fixture.runningSince as number)) / 1000) : 0;
  const total = Math.min(MATCH_SECONDS, base + extra);
  return {
    total,
    minute: Math.floor(total / 60),
    seconds: Math.floor(total % 60),
    running: running && total < MATCH_SECONDS,
  };
}

export function formatMatchClock(clock: MatchClock) {
  return `${String(clock.minute).padStart(2, '0')}:${String(clock.seconds).padStart(2, '0')}`;
}

function findFixture(id: string) {
  return fixtures.find((fixture) => fixture.id === id);
}

function lockFullTime(fixture: Fixture) {
  fixture.status = 'finished';
  fixture.homeScore = fixture.homeScore ?? 0;
  fixture.awayScore = fixture.awayScore ?? 0;
  fixture.minute = undefined;
  fixture.elapsedSeconds = undefined;
  fixture.runningSince = undefined;
}

export function syncLiveClock(id: string) {
  const fixture = findFixture(id);
  if (!fixture || fixture.status !== 'live' || fixture.runningSince == null) return false;
  const clock = matchClock(fixture);
  if (clock.total >= MATCH_SECONDS) {
    lockFullTime(fixture);
    persistLeague();
    return true;
  }
  if (fixture.minute !== clock.minute) {
    fixture.minute = clock.minute;
    persistLeague();
    return true;
  }
  return false;
}

export function kickOff(id: string) {
  const fixture = findFixture(id);
  if (!fixture) return { ok: false as const, error: 'Match not found.' };
  if (fixture.status === 'finished') return { ok: false as const, error: 'Full-time matches are locked.' };
  if (fixture.status === 'live') return { ok: false as const, error: 'This match is already live.' };
  fixture.status = 'live';
  fixture.homeScore = 0;
  fixture.awayScore = 0;
  fixture.minute = 0;
  fixture.elapsedSeconds = 0;
  fixture.runningSince = Date.now();
  persistLeague();
  return { ok: true as const };
}

export function setClockRunning(id: string, running: boolean) {
  const fixture = findFixture(id);
  if (!fixture) return { ok: false as const, error: 'Match not found.' };
  if (fixture.status !== 'live') return { ok: false as const, error: 'Kick off before running the clock.' };
  const clock = matchClock(fixture);
  if (clock.total >= MATCH_SECONDS) {
    lockFullTime(fixture);
    persistLeague();
    return { ok: true as const };
  }
  fixture.elapsedSeconds = clock.total;
  fixture.minute = clock.minute;
  fixture.runningSince = running ? Date.now() : undefined;
  persistLeague();
  return { ok: true as const };
}

export function callHalfTime(id: string) {
  const fixture = findFixture(id);
  if (!fixture) return { ok: false as const, error: 'Match not found.' };
  if (fixture.status !== 'live') return { ok: false as const, error: 'Half time is only for a live match.' };
  const clock = matchClock(fixture);
  if (clock.total >= HALF_SECONDS) return { ok: false as const, error: 'The first half is already over.' };
  fixture.elapsedSeconds = HALF_SECONDS;
  fixture.minute = 45;
  fixture.runningSince = undefined;
  persistLeague();
  return { ok: true as const };
}

export function adjustScore(id: string, side: 'home' | 'away', delta: number) {
  const fixture = findFixture(id);
  if (!fixture) return { ok: false as const, error: 'Match not found.' };
  if (fixture.status !== 'live') return { ok: false as const, error: 'The score changes only while the match is live.' };
  const key = side === 'home' ? 'homeScore' : 'awayScore';
  fixture[key] = Math.max(0, (fixture[key] ?? 0) + delta);
  persistLeague();
  return { ok: true as const };
}

export function fullTime(id: string) {
  const fixture = findFixture(id);
  if (!fixture) return { ok: false as const, error: 'Match not found.' };
  if (fixture.status === 'finished') return { ok: false as const, error: 'Full-time matches are locked.' };
  if (fixture.status !== 'live') return { ok: false as const, error: 'Kick off before ending the match.' };
  lockFullTime(fixture);
  persistLeague();
  return { ok: true as const };
}

export function saveArticle(input: NewsArticle, isNew: boolean) {
  const title = input.title.trim();
  if (!title || !input.summary.trim() || !input.body.trim()) {
    return { ok: false as const, error: 'Title, summary, and story are required.' };
  }

  const next: NewsArticle = {
    ...input,
    id: isNew ? uniqueId(slugify(title), new Set(newsArticles.map((article) => article.id))) : input.id,
    title,
    category: input.category.trim() || 'News',
    time: input.time.trim() || 'Today',
    summary: input.summary.trim(),
    body: input.body.trim(),
  };

  if (isNew) newsArticles.unshift(next);
  else {
    const index = newsArticles.findIndex((article) => article.id === next.id);
    if (index < 0) return { ok: false as const, error: 'Story not found.' };
    newsArticles[index] = next;
  }

  persistLeague();
  return { ok: true as const };
}

export function deleteArticle(id: string) {
  replace(newsArticles, newsArticles.filter((article) => article.id !== id));
  persistLeague();
}
