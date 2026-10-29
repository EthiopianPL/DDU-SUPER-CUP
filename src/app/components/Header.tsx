import { useNavigate, useLocation } from 'react-router';
import { Home, Compass, Calendar, Newspaper, Users } from 'lucide-react';
import { BrandLockup } from './BrandLockup';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'discover', label: 'Discover', icon: Compass, path: '/discover' },
    { id: 'matches', label: 'Matches', icon: Calendar, path: '/matches' },
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
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070d18]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <BrandLockup size="sm" onClick={() => navigate('/')} />
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white/45 sm:hidden"
        >
          Admin
        </button>
        <nav className="hidden sm:flex items-center gap-1.5" aria-label="Desktop primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#f5c518] text-[#102018] shadow-sm'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-[#102018]' : 'text-white/60'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white/45 hover:bg-white/5 hover:text-white"
          >
            Admin
          </button>
        </nav>
      </div>
    </header>
  );
}
