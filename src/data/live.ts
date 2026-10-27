import { useSyncExternalStore } from 'react';
import { newsArticles } from './news';
import {
  departments,
  fixtures,
  leagueRules,
  manualStats,
  matchEvents,
  players,
  clockSync,
  squads,
  type Department,
  type Fixture,
  type GroupId,
  type ManualStat,
  type MatchEventRecord,
  type MatchStatus,
  type Player,
  type SquadRow,
} from './supercup';

let version = 0;
let leagueReady = false;
let leagueError = '';
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeLeague(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLeagueVersion() {
  return version;
}

export function useLeagueVersion() {
  return useSyncExternalStore(subscribeLeague, getLeagueVersion, getLeagueVersion);
}

export function leagueStatus() {
  return { ready: leagueReady, error: leagueError };
}

function replace<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next);
}

function bucket(detail: string): MatchStatus {
  if (['live', 'halftime', 'suspended', 'penalties'].includes(detail)) return 'live';
  if (['finished', 'abandoned', 'cancelled'].includes(detail)) return 'finished';
  return 'upcoming';
}

export interface Snapshot {
  serverNow: number;
  revision: number;
  competition: { rules: typeof leagueRules } | null;
  teams: Array<Department & { coach?: string; crestUrl?: string; status?: string }>;
  players: Player[];
  matches: Array<Fixture & {
    detail: string;
    period: string;
    elapsedMs: number;
    runningSince: number | null;
    addedMs: number;
    halfMs: number;
    allowExtra: boolean;
    pensHome: number | null;
    pensAway: number | null;
    confirmed: boolean;
    formationHome: string;
    formationAway: string;
    stage?: 'group' | 'r16' | 'qf' | 'sf' | 'final';
    slot?: number;
    version: number;
    updatedAt: number;
  }>;
  events: MatchEventRecord[];
  squads: SquadRow[];
  stats: ManualStat[];
  news: Array<{ id: string; title: string; category: string; time: string; summary: string; body: string; imageUrl?: string }>;
}

export function applySnapshot(data: Snapshot) {
  clockSync.offset = data.serverNow - Date.now();
  Object.assign(leagueRules, data.competition?.rules ?? {});
  replace(departments, data.teams.map((team) => ({
    ...team,
    group: team.group as GroupId,
  })));
  replace(players, data.players);
  replace(fixtures, data.matches.map((match) => ({
    ...match,
    status: bucket(match.detail),
    group: match.group as GroupId,
    minute: Math.floor(match.elapsedMs / 60000),
    elapsedSeconds: match.elapsedMs / 1000,
    addedSeconds: match.addedMs / 1000,
    halfSeconds: match.halfMs / 1000,
    runningSince: match.runningSince,
    stage: match.stage || 'group',
    slot: match.slot || 0,
  })));
  replace(newsArticles, data.news);
  replace(matchEvents, data.events);
  replace(squads, data.squads);
  replace(manualStats, data.stats);
  leagueReady = true;
  leagueError = '';
  emit();
}

function setOffset(value: number) {
  clockSync.offset = value;
}

export function applyClock(payload: { serverNow: number; matches: Array<{ id: string; elapsedMs: number; runningSince: number | null; period: string; detail: string; addedMs: number; homeScore: number; awayScore: number; version: number }> }) {
  setOffset(payload.serverNow - Date.now());
  let changed = false;
  for (const row of payload.matches) {
    const fixture = fixtures.find((item) => item.id === row.id);
    if (!fixture) continue;
    const minute = Math.floor(row.elapsedMs / 60000);
    if (fixture.minute !== minute || fixture.homeScore !== row.homeScore || fixture.runningSince !== row.runningSince || fixture.period !== row.period) changed = true;
    fixture.elapsedSeconds = row.elapsedMs / 1000;
    fixture.runningSince = row.runningSince;
    fixture.period = row.period;
    fixture.detail = row.detail;
    fixture.status = bucket(row.detail);
    fixture.addedSeconds = row.addedMs / 1000;
    fixture.homeScore = row.homeScore;
    fixture.awayScore = row.awayScore;
    fixture.version = row.version;
    fixture.minute = minute;
  }
  if (changed) emit();
}

export async function refreshLeague() {
  const response = await fetch('/api/snapshot', { cache: 'no-store' });
  if (!response.ok) throw new Error('The match server did not respond.');
  applySnapshot(await response.json());
}

export async function bootLeague() {
  try {
    await refreshLeague();
  } catch (error) {
    leagueReady = false;
    leagueError = error instanceof Error ? error.message : 'The match server is offline.';
    emit();
  }
  const source = new EventSource('/api/live');
  source.addEventListener('changed', () => {
    refreshLeague().catch(() => {
      leagueError = 'Reconnecting to the match server.';
      emit();
    });
  });
  source.addEventListener('clock', (event) => {
    applyClock(JSON.parse((event as MessageEvent).data));
  });
  source.onopen = () => {
    if (leagueError) {
      leagueError = '';
      emit();
    }
  };
  source.onerror = () => {
    leagueError = 'Reconnecting to the match server.';
    emit();
  };
}
