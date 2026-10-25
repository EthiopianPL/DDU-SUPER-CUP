import { Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { leagueStatus, useLeagueVersion } from '../../data/live';

export function Layout() {
  const desk = useLocation().pathname.startsWith('/admin');
  const version = useLeagueVersion();
  const { ready, error } = leagueStatus();
  void version;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070d18] text-white">
      {!desk && (
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#2450c8]/25 blur-3xl" />
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#f5c518]/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#2f9e44]/15 blur-3xl" />
        </div>
      )}

      {!desk && <Header />}
      <main className="w-full">
        {!ready && (
          <p className="px-4 py-16 text-center text-sm text-white/60">{error || 'Connecting to the match server…'}</p>
        )}
        {ready && <Outlet />}
      </main>
      {!desk && ready && <BottomNav />}
    </div>
  );
}
