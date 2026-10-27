import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { BrandLockup } from './BrandLockup';
import { leagueStatus, useLeagueVersion } from '../../data/live';

export function Layout() {
  const location = useLocation();
  const desk = location.pathname.startsWith('/admin');
  const spot = `${location.pathname}${location.search}`;
  const version = useLeagueVersion();
  const { ready, error } = leagueStatus();
  const [passing, setPassing] = useState(!desk);
  void version;

  useEffect(() => {
    if (desk) {
      setPassing(false);
      return;
    }
    setPassing(true);
    const timer = window.setTimeout(() => setPassing(false), 1500);
    return () => window.clearTimeout(timer);
  }, [spot, desk]);

  const waiting = passing || (!desk && !ready);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070d18] text-white">
      {!desk && (
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#2450c8]/25 blur-3xl" />
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#f5c518]/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#2f9e44]/15 blur-3xl" />
        </div>
      )}

      {!desk && !waiting && <Header />}
      <main className="w-full">
        {waiting && <MatchLoading error={passing ? '' : error} />}
        {!waiting && (desk || ready) && <Outlet />}
      </main>
      {!desk && !waiting && <BottomNav />}
    </div>
  );
}

function MatchLoading({ error }: { error: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6" role="status" aria-live="polite" aria-label={error || 'Loading'}>
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-[#f5c518]" />
        <span className="absolute inset-3 animate-spin rounded-full border-2 border-transparent border-b-[#2450c8] [animation-duration:1.4s]" />
        <img src="/brand/ddu-logo.png" alt="" className="h-14 w-14 object-contain" />
      </div>
      <div className="mt-6">
        <BrandLockup />
      </div>
      {error && <p className="mt-4 max-w-xs text-center text-sm text-white/55">{error}</p>}
    </div>
  );
}
