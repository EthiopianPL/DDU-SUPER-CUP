import { Home, Calendar, Trophy, Users, Newspaper, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'groups', label: 'Groups', icon: Trophy, path: '/groups' },
    { id: 'matches', label: 'Matches', icon: Calendar, path: '/matches' },
    { id: 'teams', label: 'Depts', icon: Users, path: '/teams' },
    { id: 'stats', label: 'Stats', icon: BarChart3, path: '/stats' },
    { id: 'news', label: 'News', icon: Newspaper, path: '/news' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#070d18]/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-3xl items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : item.path === '/teams'
              ? location.pathname === '/teams' || location.pathname.startsWith('/team/')
              : item.path === '/matches'
                ? location.pathname === '/matches' || location.pathname.startsWith('/match/')
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex flex-1 flex-col items-center px-1 py-2.5"
            >
              <Icon className={`mb-1 h-5 w-5 ${isActive ? 'text-[#f5c518]' : 'text-white/40'}`} />
              <span className={`text-[10px] ${isActive ? 'font-semibold text-[#f5c518]' : 'text-white/40'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
