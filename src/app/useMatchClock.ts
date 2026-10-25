import { useEffect, useRef, useState } from 'react';
import { matchClock, syncLiveClock } from '../data/editor';
import { getFixture } from '../data/supercup';

export function useMatchClock(id: string | undefined, onChange?: () => void) {
  const [now, setNow] = useState(() => Date.now());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const fixture = id ? getFixture(id) : undefined;
  const running = Boolean(fixture?.status === 'live' && fixture.runningSince != null);

  useEffect(() => {
    if (!id || !running) return;
    const timer = window.setInterval(() => {
      const changed = syncLiveClock(id);
      setNow(Date.now());
      if (changed) onChangeRef.current?.();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [id, running, fixture?.runningSince]);

  if (!fixture || fixture.status !== 'live') return null;
  return matchClock(fixture, now);
}
