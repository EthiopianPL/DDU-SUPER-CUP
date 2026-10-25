import { useEffect, useState } from 'react';
import { getFixture, viewClock } from '../data/supercup';
import { useLeagueVersion } from '../data/live';

export function useMatchClock(id?: string) {
  const version = useLeagueVersion();
  const [now, setNow] = useState(() => Date.now());
  const fixture = id ? getFixture(id) : undefined;
  const running = Boolean(fixture?.status === 'live' && fixture.runningSince);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running, id, fixture?.runningSince]);

  void version;
  if (!fixture || fixture.status !== 'live') return null;
  return viewClock(fixture, now);
}
