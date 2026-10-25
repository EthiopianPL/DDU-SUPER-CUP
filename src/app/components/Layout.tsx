import { Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export function Layout() {
  const desk = useLocation().pathname.startsWith('/admin');

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
        <Outlet />
      </main>
      {!desk && <BottomNav />}
    </div>
  );
}
