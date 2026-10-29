import { Home, Compass, Calendar, Newspaper, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'matches', label: 'Matches', icon: Calendar, path: '/matches' },
    { id: 'discover', label: 'Discover', icon: Compass, path: '/discover' },
    { id: 'news', label: 'News', icon: Newspaper, path: '/news' },
    { id: 'contributors', label: 'Contributors', icon: Users, path: '/contributors' },
  ];

  const isItemActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/discover') {
      return (
        location.pathname.startsWith('/discover') ||
        location.pathname === '/groups' ||
        location.pathname === '/teams' ||
        location.pathname === '/departments' ||
        location.pathname === '/stats' ||
        location.pathname === '/statistics' ||
        location.pathname.startsWith('/team/')
      );
    }
    if (path === '/matches') {
      return location.pathname === '/matches' || location.pathname.startsWith('/match/');
    }
    if (path === '/news') {
      return location.pathname === '/news' || location.pathname.startsWith('/news/');
    }
    if (path === '/contributors') {
      return location.pathname === '/contributors';
    }
    return location.pathname === path;
  };

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md sm:hidden pointer-events-none"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-between rounded-full border border-white/10 bg-[#0c1424]/95 p-1.5 shadow-2xl shadow-black/70 backdrop-blur-xl pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-1.5 px-0.5 rounded-full transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#f5c518] text-[#102018] shadow-md font-bold'
                  : 'bg-transparent text-white/50 hover:text-white/80 active:scale-95 font-medium'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? 'text-[#102018]' : 'text-white/50'}`} />
              <span className={`text-[10px] leading-tight font-bold transition-colors truncate max-w-[62px] text-center ${isActive ? 'text-[#102018]' : 'text-white/50'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
