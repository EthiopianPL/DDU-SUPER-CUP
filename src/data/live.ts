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
  viewClock,
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
  news: Array<{ id: string; title: string; category: string; time: string; summary: string; body: string; imageUrl?: string; createdAt?: number }>;
}

let currentRevision = 0;
const liveChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('ddu_supercup_live_sync')
  : null;

if (liveChannel) {
  liveChannel.onmessage = (event) => {
    if (event.data?.type === 'snapshot' && event.data.snapshot) {
      applySnapshot(event.data.snapshot, false);
    } else if (event.data?.type === 'changed') {
      refreshLeague().catch(() => {});
    }
  };
}

export function applySnapshot(data: Snapshot, broadcastCrossTab = true) {
  currentRevision = data.revision ?? currentRevision;
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
    minute: runningMinute(match.elapsedMs, match.runningSince, data.serverNow),
    elapsedSeconds: Number(match.elapsedMs) / 1000,
    runningSince: match.runningSince == null ? null : Number(match.runningSince),
    addedSeconds: match.addedMs / 1000,
    halfSeconds: match.halfMs / 1000,
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

  if (broadcastCrossTab && liveChannel) {
    try {
      liveChannel.postMessage({ type: 'snapshot', snapshot: data });
    } catch {
      // Ignore broadcast errors
    }
  }
}

function setOffset(value: number) {
  clockSync.offset = value;
}

function runningMinute(elapsedMs: number, runningSince: number | null, now: number) {
  const since = runningSince == null ? 0 : Number(runningSince);
  const elapsed = Number(elapsedMs) + (since ? Math.max(0, now - since) : 0);
  return Math.floor(elapsed / 60000);
}

export function applyClock(payload: { serverNow: number; matches: Array<{ id: string; elapsedMs: number; runningSince: number | null; period: string; detail: string; addedMs: number; homeScore: number; awayScore: number; version: number }> }) {
  setOffset(payload.serverNow - Date.now());
  let changed = false;
  for (const row of payload.matches) {
    const fixture = fixtures.find((item) => item.id === row.id);
    if (!fixture) continue;
    const since = row.runningSince == null ? null : Number(row.runningSince);
    const previousMinute = fixture.minute;
    const previousScore = `${fixture.homeScore}-${fixture.awayScore}`;
    const previousPeriod = fixture.period;
    fixture.elapsedSeconds = Number(row.elapsedMs) / 1000;
    fixture.runningSince = since;
    fixture.period = row.period;
    fixture.detail = row.detail;
    fixture.status = bucket(row.detail);
    fixture.addedSeconds = Number(row.addedMs) / 1000;
    fixture.homeScore = row.homeScore;
    fixture.awayScore = row.awayScore;
    fixture.version = row.version;
    const minute = viewClock(fixture, Date.now())?.minute ?? runningMinute(row.elapsedMs, since, payload.serverNow);
    fixture.minute = minute;
    if (previousMinute !== minute || previousScore !== `${row.homeScore}-${row.awayScore}` || previousPeriod !== row.period) changed = true;
  }
  if (changed) emit();
}

let refreshingPromise: Promise<void> | null = null;
export function refreshLeague(): Promise<void> {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    try {
      const response = await fetch('/api/snapshot', { cache: 'no-store' });
      if (!response.ok) throw new Error('The match server did not respond.');
      const data = await response.json();
      applySnapshot(data);
    } finally {
      refreshingPromise = null;
    }
  })();
  return refreshingPromise;
}

let booted = false;

export async function bootLeague() {
  if (booted) return;
  booted = true;

  try {
    await refreshLeague();
  } catch (error) {
    leagueReady = false;
    leagueError = error instanceof Error ? error.message : 'The match server is offline.';
    emit();
  }

  let source: EventSource | null = null;

  function connectSSE() {
    try {
      if (source) {
        source.close();
      }
      source = new EventSource('/api/live');

      source.addEventListener('hello', (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          if (payload.revision && payload.revision !== currentRevision) {
            refreshLeague().catch(() => {});
          }
        } catch {
          // ignore parse errors
        }
      });

      source.addEventListener('changed', () => {
        refreshLeague().catch(() => {
          leagueError = 'Reconnecting to the match server.';
          emit();
        });
      });

      source.addEventListener('clock', (event) => {
        try {
          applyClock(JSON.parse((event as MessageEvent).data));
        } catch {
          // ignore clock errors
        }
      });

      source.onopen = () => {
        if (leagueError) {
          leagueError = '';
          emit();
        }
        // Always verify latest state on connect/reconnect
        refreshLeague().catch(() => {});
      };

      source.onerror = () => {
        leagueError = 'Reconnecting to the match server.';
        emit();
      };
    } catch {
      // EventSource instantiation failed (e.g. offline)
    }
  }

  connectSSE();

  setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const fixture of fixtures) {
      if (fixture.status !== 'live' || !fixture.runningSince) continue;
      const minute = viewClock(fixture, now)?.minute;
      if (minute == null || fixture.minute === minute) continue;
      fixture.minute = minute;
      changed = true;
    }
    if (changed) emit();
  }, 1000);

  // Listen for tab focus and visibility change to immediately catch any missed updates
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      refreshLeague().catch(() => {});
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshLeague().catch(() => {});
      }
    });
  }

  // Periodic heartbeat polling fallback:
  // Checks /api/health every 4 seconds. If revision increased or SSE dropped, refreshes immediately.
  setInterval(async () => {
    try {
      if (source && source.readyState === EventSource.CLOSED) {
        connectSSE();
      }
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.revision && data.revision !== currentRevision) {
          await refreshLeague();
        }
      }
    } catch {
      // Ignore network hiccup in periodic check
    }
  }, 4000);
}
