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

  const next: Fixture = {
    ...input,
    id: isNew ? `${home.group.toLowerCase()}-md${input.matchday}-${Date.now()}` : input.id,
    group: home.group,
    date: input.date || new Date().toISOString().slice(0, 10),
    time: input.time || '15:00',
    stadium: input.stadium.trim() || home.pitch,
    homeScore: input.status === 'upcoming' ? undefined : Math.max(0, Number(input.homeScore) || 0),
    awayScore: input.status === 'upcoming' ? undefined : Math.max(0, Number(input.awayScore) || 0),
    minute: input.status === 'live' ? Math.max(1, Number(input.minute) || 1) : undefined,
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
  replace(fixtures, fixtures.filter((fixture) => fixture.id !== id));
  persistLeague();
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

hydrateLeague();
