import { Home, Compass, Calendar, Newspaper } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'discover', label: 'Discover', icon: Compass, path: '/discover' },
    { id: 'matches', label: 'Matches', icon: Calendar, path: '/matches' },
    { id: 'news', label: 'News', icon: Newspaper, path: '/news' },
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
    return location.pathname === path;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#070d18]/95 backdrop-blur-lg sm:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex flex-1 flex-col items-center px-1 py-2.5 transition-colors focus:outline-none"
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`mb-1 h-5 w-5 transition-colors ${isActive ? 'text-[#f5c518]' : 'text-white/40'}`} />
              <span className={`text-[11px] transition-colors ${isActive ? 'font-bold text-[#f5c518]' : 'font-medium text-white/45'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

